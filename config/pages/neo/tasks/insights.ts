import { getState, update, neoUndoChanges } from "@/components/inbox/v2/store";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import { learnedEvidence } from "@/hooks/pages/inbox/use-tally-learning";
import {
  freightSummary,
  itcRisk,
  rupees,
} from "@/utils/pages/inbox/ai-calculations";
import type { NeoTask } from "@/types/pages/neo";
export const freightInsight: NeoTask = {
  id: "freight-insight",
  title: "Explain freight movement",
  match: (p) =>
    /freight/i.test(p) && /why|spent|spend|up|September/i.test(p) ? 8 : 0,
  run: async (api) => {
    const f = freightSummary(
      getState().items,
      api.context.company || getState().company
    );
    await api.say(
      `September freight ${rupees(f.september)} minus August ${rupees(f.august)} = increase ${rupees(f.september - f.august)}. September has ${f.septemberRecords.length} bills; the nine Mahindra bills include the additional plant route. Amounts below exclude tax and sum directly from bill lines.`,
      f.records.map((x) => ({ label: x.form.invoiceNo, itemId: x.id }))
    );
    await api.card(
      {
        kind: "list",
        title: "Freight calculation records",
        groups: [
          {
            label: "August and September source bills",
            tone: "neutral",
            rows: f.records.map((x) => ({
              itemId: x.id,
              primary: x.form.party,
              secondary: `${x.form.date} · ${x.form.invoiceNo}`,
              amount: x.form.lines.reduce((n, l) => n + l.amount, 0),
            })),
          },
        ],
      },
      [{ id: "done", label: "Done" }]
    );
    return "Freight movement computed";
  },
};
export const itcInsight: NeoTask = {
  id: "itc-risk",
  title: "Compute Q2 ITC at risk",
  match: (p) => (/itc|input.*credit/i.test(p) ? 9 : 0),
  run: async (api) => {
    const company = api.context.company || getState().company;
    const rows = Object.entries(getGstState(company).invoices)
      .filter(([m]) => m >= "2026-07" && m <= "2026-09")
      .flatMap(([, r]) => r);
    const r = itcRisk(rows);
    await api.say(
      `Q2 (Jul–Sep 2026), available reconciled periods: Missing in 2B ${r.missingCount} invoices, ${rupees(r.missing)} + AI Probable ${r.probableCount}, ${rupees(r.probable)} = ${rupees(r.total)} at risk. Computed by summing purchase-register GST, without model arithmetic.`,
      [
        {
          label: "Open GST source records",
          href: "/inbox?module=GST&tab=invoices",
        },
      ]
    );
    return "ITC risk computed";
  },
};
export const mahindraReledger: NeoTask = {
  id: "mahindra-reledger",
  title: "Review Mahindra ledger changes",
  match: (p) =>
    /mahindra/i.test(p) && /move|code|ledger|transportation/i.test(p) ? 10 : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const bills = getState().items.filter(
      (x) =>
        x.company === company &&
        x.form.party === "Mahindra Logistics Ltd" &&
        x.status === "Needs Review" &&
        x.form.lines.some((l) => l.ledger === "Transportation")
    );
    await api.say(
      learnedEvidence(company, "Mahindra Logistics Ltd") ||
        "Mahindra bills will be prepared for Freight Inward; confirm each proposed change."
    );
    let count = 0;
    for (const bill of bills) {
      const choice = await api.card(
        {
          kind: "diff",
          title: bill.form.invoiceNo,
          field: "Ledger",
          rows: [
            {
              itemId: bill.id,
              party: bill.form.party,
              from: "Transportation",
              to: "Freight Inward",
              amount: bill.amount,
            },
          ],
        },
        [
          {
            id: "accept",
            label: "Accept this bill",
            primary: true,
            risk: "draft",
          },
          { id: "reject", label: "Reject this bill" },
        ]
      );
      if (choice !== "accept") continue;
      const current = getState().items.find((x) => x.id === bill.id);
      if (!current || JSON.stringify(current) !== JSON.stringify(bill))
        throw new Error("Bill changed since the preview. Run again.");
      const before = structuredClone(bill);
      update(
        bill.id,
        {
          form: {
            ...bill.form,
            lines: bill.form.lines.map((l) =>
              l.ledger === "Transportation"
                ? { ...l, ledger: "Freight Inward" }
                : l
            ),
          },
        },
        "ledger"
      );
      api.onUndo(neoUndoChanges([before], api.runId));
      api.touch([bill.id]);
      count++;
    }
    await api.say(
      `${count} bills updated and waiting for review. Undo is available in Runs.`,
      bills.map((x) => ({ label: x.form.invoiceNo, itemId: x.id }))
    );
    return `${count} bills changed`;
  },
};
