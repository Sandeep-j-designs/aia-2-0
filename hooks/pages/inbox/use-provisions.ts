import {
  MOCK_FIXED_ASSETS,
  MOCK_PROVISIONS,
} from "@/config/pages/inbox/mock-provisions";
import {
  blankForm,
  getState,
  neoCreate,
  neoDiscard,
  type Item,
} from "@/components/inbox/v2/store";
import type { Provision } from "@/types/pages/inbox/dashboard";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
export const fixedAssets = (company: string) =>
  MOCK_FIXED_ASSETS.filter((a) => a.company === company);
export const suggestProvisions = (
  company: string,
  fy = "25-26"
): Provision[] => {
  // DEV: GET /api/fixed-assets and POST /api/journals/provisions/suggest.
  if (fy !== "25-26") return [];
  return [
    ...fixedAssets(company).map((a) => ({
      id: `dep-${a.id}`,
      company,
      group: "Depreciation",
      amount: Math.round(a.openingWdv * a.rate),
      reason: `${a.name}: opening WDV ₹${a.openingWdv.toLocaleString("en-IN")} × ${a.rate * 100}% = ₹${Math.round(a.openingWdv * a.rate).toLocaleString("en-IN")}. ${a.method}; reconcile book depreciation before approving.`,
      debit: "Depreciation",
      credit: "Accumulated Depreciation",
      sources: [a.sourceVoucher],
      reverse: false,
    })),
    ...structuredClone(MOCK_PROVISIONS.filter((p) => p.company === company)),
  ];
};
export const createProvisionDrafts = (
  company: string,
  lines: Provision[],
  runId: string
) => {
  const template = getState().items.find((x) => x.company === company);
  if (!template || getState().company !== company)
    throw new Error("Select an organisation with accounting records.");
  if (
    lines.some(
      (p) =>
        !Number.isFinite(p.amount) ||
        p.amount <= 0 ||
        !p.debit.trim() ||
        !p.credit.trim()
    )
  )
    throw new Error("Every provision needs a positive amount and two ledgers.");
  const created: Item[] = [];
  for (const [i, p] of lines.entries()) {
    for (const reversal of p.reverse ? [false, true] : [false]) {
      const id = `PROVISION-${crypto.randomUUID()}`,
        date = reversal ? "2026-04-01" : "2026-03-31",
        voucherNo = `JV/${reversal ? "26-27" : "25-26"}/${runId.slice(-6)}-${i + 1}${reversal ? "R" : ""}`;
      const form = {
        ...blankForm(),
        gst: template.form.gst,
        voucherType: "Journal",
        voucherNo,
        date,
        narration: `${reversal ? "Reversal of " : ""}${p.group} provision. ${p.reason}`,
        lines: [
          {
            description: p.group,
            ledger: reversal ? p.credit : p.debit,
            amount: p.amount,
            dr: p.amount,
            cr: 0,
            costCentre: "",
          },
          {
            description: p.group,
            ledger: reversal ? p.debit : p.credit,
            amount: p.amount,
            dr: 0,
            cr: p.amount,
            costCentre: "",
          },
        ],
      };
      const draft: Item = {
        ...structuredClone(template),
        id,
        route: "JV",
        aiRoute: "JV",
        topChoice: "JV",
        created: true,
        priorVoucher: false,
        form,
        amount: p.amount,
        reason: p.reason,
        source: "upload",
        sender: "Neo",
        file: {
          name: `${voucherNo} · ${p.group}`,
          size: "Prepared by Neo",
          ext: "pdf",
        },
        original: {
          ...structuredClone(template.original),
          id,
          route: "JV",
          bill: undefined,
          invoice: undefined,
          jv: {
            narration: form.narration,
            lines: form.lines.map((l) => ({
              ledger: l.ledger,
              dr: l.dr || null,
              cr: l.cr || null,
            })),
          },
        },
        arSheet: undefined,
        arSnapshot: undefined,
        sheet: undefined,
        snapshot: undefined,
        hardRef: undefined,
        softRef: undefined,
        doneBy: undefined,
        doneAt: undefined,
        edited: [],
        autoApproved: undefined,
        autoHold: undefined,
      };
      created.push(neoCreate(draft, runId));
    }
  }
  logActivity(
    {
      company,
      actor: { kind: "ai", name: "Neo" },
      kind: "predicted",
      module: "Journals",
      action: "Prepared year-end provisions",
      subject: `${created.length} balanced draft journals`,
      reason:
        "FY 25-26; reversals dated 1 Apr 2026 are separate drafts requiring approval",
      undoable: true,
    },
    () => {
      const result = neoDiscard(created, runId);
      if (!result.reversed.length)
        throw new Error("Drafts changed or were approved");
    }
  );
  return created;
};
