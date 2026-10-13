import {
  actor,
  getState,
  neoCreate,
  neoDiscard,
  type Item,
} from "@/components/inbox/v2/store";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import {
  day,
  findAmount,
  fyShort,
  has,
  money,
  round2,
} from "@/utils/pages/neo";

/**
 * "Book depreciation of ₹12,000 on office equipment."
 *
 * Month-end entries that have no document behind them. Neo picks the two
 * ledgers from what the entry is, asks what it cannot know — the period and
 * the cost centre — and shows a balanced Dr/Cr voucher before creating a
 * Journal draft.
 *
 * DEV: tools — list_ledgers, create_jv_draft. The recipes below become the
 * model's judgement plus the firm's saved rules.
 */

type Recipe = {
  id: string;
  label: string;
  match: RegExp;
  dr: string;
  cr: string;
  narration: (what: string, month: string) => string;
};

const RECIPES: Recipe[] = [
  {
    id: "depreciation",
    label: "Depreciation",
    match: /depreciat/i,
    dr: "Depreciation A/c",
    cr: "Accumulated Depreciation A/c",
    narration: (what, month) =>
      `Depreciation on ${what || "fixed assets"} for ${month}`,
  },
  {
    id: "rent",
    label: "Rent provision",
    match: /\brent\b/i,
    dr: "Rent A/c",
    cr: "Provision for Expenses A/c",
    narration: (what, month) => `Rent for ${month} provided, bill awaited`,
  },
  {
    id: "salary",
    label: "Salary provision",
    match: /salar|wages|payroll/i,
    dr: "Salaries & Wages A/c",
    cr: "Provision for Expenses A/c",
    narration: (what, month) => `Salaries for ${month} provided`,
  },
  {
    id: "insurance",
    label: "Prepaid insurance",
    match: /insurance/i,
    dr: "Insurance Expense A/c",
    cr: "Prepaid Insurance A/c",
    narration: (what, month) => `Insurance for ${month} charged out of prepaid`,
  },
  {
    id: "bank-charges",
    label: "Bank charges",
    match: /bank charge/i,
    dr: "Bank Charges",
    cr: "Bank",
    narration: (what, month) => `Bank charges for ${month}`,
  },
];

const monthEnd = (offset: number) => {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1 - offset, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
};
const monthName = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

const journal: NeoTask = {
  id: "journal",
  title: "Book a journal",
  match: (p) =>
    has(p, /\bjournal\b|\bjv\b/i) ||
    (has(p, /\b(book|provide|post|record|pass)\b/i) &&
      RECIPES.some((r) => r.match.test(p)))
      ? 3
      : RECIPES.some((r) => r.match.test(p))
        ? 1
        : 0,
  run: async (api) => {
    let recipe = RECIPES.find((r) => r.match.test(api.prompt));
    if (!recipe) {
      const id = await api.ask(
        "What is the entry for?",
        RECIPES.slice(0, 4).map((r) => ({
          id: r.id,
          label: r.label,
          hint: `Dr ${r.dr} · Cr ${r.cr}`,
        }))
      );
      recipe = RECIPES.find((r) => r.id === id)!;
    }
    let amount = findAmount(api.prompt);
    if (!amount)
      amount = Number(
        await api.ask("How much?", [
          { id: "5000", label: money(5000) },
          { id: "12000", label: money(12000) },
          { id: "25000", label: money(25000) },
          { id: "50000", label: money(50000) },
        ])
      );
    amount = round2(amount);
    const what =
      api.prompt.match(/\bon (?:the )?([a-z &]+?)(?: for| in|$)/i)?.[1] || "";
    const monthMentioned = [0, 1].find((o) =>
      new RegExp(
        new Date(`${monthEnd(o)}T00:00:00`).toLocaleString("en-IN", {
          month: "long",
        }),
        "i"
      ).test(api.prompt)
    );
    const date =
      monthMentioned !== undefined
        ? monthEnd(monthMentioned)
        : await api.ask("For which month?", [
            {
              id: monthEnd(0),
              label: monthName(monthEnd(0)),
              hint: `Dated ${day(monthEnd(0))}`,
            },
            {
              id: monthEnd(1),
              label: monthName(monthEnd(1)),
              hint: `Dated ${day(monthEnd(1))}`,
            },
          ]);
    const centre = await api.ask("Charge it to a cost centre?", [
      { id: "Operations", label: "Operations" },
      { id: "Finance", label: "Finance" },
      { id: "Sales", label: "Sales" },
      { id: "", label: "No cost centre" },
    ]);

    const building = await api.step("Building the entry");
    await api.wait(450);
    const narration = recipe.narration(what.trim(), monthName(date));
    building(`Dr ${recipe.dr} / Cr ${recipe.cr} · ${money(amount)} · balanced`);
    const n = getState().items.filter((x) => x.route === "JV").length + 101;
    const voucherNo = `JV/${fyShort(date)}/${String(n).padStart(3, "0")}`;
    const preview: NeoCard = {
      kind: "voucher",
      voucherType: "Journal",
      state: "Preview",
      voucherNo,
      party: narration,
      date: day(date),
      lines: [
        {
          ledger: `${recipe.dr}${centre ? ` · ${centre}` : ""}`,
          side: "Dr",
          amount,
          inferred: true,
        },
        { ledger: recipe.cr, side: "Cr", amount, inferred: true },
      ],
      why: `Both ledgers follow the entry type (${recipe.label.toLowerCase()}). Check them against how this company books it.`,
    };
    const choice = await api.card(preview, [
      { id: "create", label: "Create draft", primary: true, risk: "draft" },
      { id: "discard", label: "Discard" },
    ]);
    if (choice !== "create") {
      await api.say("Discarded. Nothing was created.");
      return "Discarded";
    }
    const writing = await api.step("Creating the journal");
    const template =
      getState().items.find((x) => x.route === "JV" && x.original.jv) ||
      getState().items[0];
    const id = `NEO-JV-${String(n)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const item: Item = {
      ...structuredClone(template),
      id,
      route: "JV",
      aiRoute: "JV",
      topChoice: "JV",
      confidence: 1,
      reason: `Prepared by Neo for ${actor}.`,
      source: "upload",
      sender: actor,
      subject: narration,
      file: {
        name: `${voucherNo} · ${recipe.label}`,
        size: "Prepared by Neo",
        ext: "pdf",
      },
      received: new Date().toISOString(),
      form: {
        ...structuredClone(template.form),
        voucherType: "Journal",
        voucherNo,
        invoiceNo: "",
        date,
        due: "",
        party: "",
        costClass: centre ? "Department" : "",
        costMode: "centre",
        costCentre: "",
        narration,
        lines: [
          {
            description: "",
            ledger: recipe.dr,
            amount,
            dr: amount,
            cr: 0,
            costCentre: centre,
          },
          {
            description: "",
            ledger: recipe.cr,
            amount,
            dr: 0,
            cr: amount,
            costCentre: "",
          },
        ],
      },
      amount,
      original: {
        ...structuredClone(template.original),
        id,
        route: "JV",
        vendor: "—",
        jv: {
          narration,
          lines: [
            { ledger: recipe.dr, dr: amount, cr: null },
            { ledger: recipe.cr, dr: null, cr: amount },
          ],
        },
        bill: undefined,
        invoice: undefined,
      },
      arSheet: undefined,
      edited: [],
      hardRef: undefined,
      softRef: undefined,
      snapshot: undefined,
      sheet: undefined,
      routeDrafts: undefined,
      doneAt: undefined,
      doneBy: undefined,
      retries: 0,
      firstAttempt: true,
      error: undefined,
    };
    await api.wait(400);
    const created = neoCreate(item, api.runId);
    api.touch([created.id]);
    api.onUndo(() => neoDiscard([created], api.runId));
    writing(`Created ${voucherNo} · ${money(amount)} · Needs Review`);
    api.updateCard({ ...preview, state: "Draft created" }, []);
    await api.say(
      `${voucherNo} is in Journal Vouchers as a draft, waiting for your approval.`,
      [
        { label: `Open ${voucherNo}`, itemId: created.id, target: "open" },
        { label: "Show in Inbox", itemId: created.id, target: "inbox" },
      ]
    );
    return `${voucherNo} · ${money(amount)}`;
  },
};

export default journal;
