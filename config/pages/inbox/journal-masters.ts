/**
 * The masters behind the journal voucher's pickers.
 *
 * Lifted from Prototypes/Journals (config/pages/journal-voucher/mock-masters),
 * which is the screen this form is a port of — same constants, same names, so
 * the two prototypes cannot drift into offering different ledgers for the same
 * entry.
 *
 * GST registrations are NOT here. The Inbox already knows a company's branches
 * (see `companies` in components/inbox/v2/store), the list has a GST
 * Registration column reading off them, and the bulk Reassign panel writes to
 * them. A second source of branches would be a second answer to the same
 * question.
 *
 * Cost centres are NOT here either: they are one set shared with the AP and
 * AR sheets, in config/pages/inbox/mock-cost-centres.
 *
 * DEV: in production this is a master endpoint —
 *   GET /api/ledgers              → LedgerAccount[]
 * Replace this file and nothing else; every picker reads through it.
 */

export type LedgerAccount = {
  id: string;
  name: string;
  group: string;
  /**
   * The ledger's "Cost centres are applicable". Left out, it follows Tally's
   * default for the group — see `ledgerTakesCostCentre`.
   */
  costCentre?: boolean;
};

/**
 * Voucher types that post as debits and credits rather than against a party.
 *
 * Journal is the default and what the route selector means by "Journal", but
 * the design shows a live picker rather than a fixed label — a contra or a
 * debit note is the same two-sided entry with a different Tally type on it.
 */
export const JOURNAL_VOUCHER_TYPES = [
  "Journal",
  "Contra",
  "Debit Note",
  "Credit Note",
];

export const LEDGERS: LedgerAccount[] = [
  {
    id: "led-insurance-exp",
    name: "Insurance Expense A/c",
    group: "Indirect Expenses",
  },
  {
    id: "led-prepaid-insurance",
    name: "Prepaid Insurance A/c",
    group: "Current Assets",
  },
  {
    id: "led-marketing",
    name: "Marketing & Advertising A/c",
    group: "Indirect Expenses",
  },
  { id: "led-rent", name: "Rent A/c", group: "Indirect Expenses" },
  {
    id: "led-salaries",
    name: "Salaries & Wages A/c",
    group: "Indirect Expenses",
  },
  {
    id: "led-depreciation",
    name: "Depreciation A/c",
    group: "Indirect Expenses",
  },
  {
    id: "led-accum-dep",
    name: "Accumulated Depreciation A/c",
    group: "Fixed Assets",
  },
  {
    id: "led-audit-fees",
    name: "Audit Fees Payable A/c",
    group: "Current Liabilities",
  },
  {
    id: "led-provision-exp",
    name: "Provision for Expenses A/c",
    group: "Current Liabilities",
  },
  { id: "led-tds-payable", name: "TDS Payable A/c", group: "Duties & Taxes" },
  { id: "led-round-off", name: "Round Off A/c", group: "Indirect Expenses" },
  { id: "led-suspense", name: "Suspense A/c", group: "Suspense A/c" },
  // The Inbox seeds journals from documents the AI has already read, and those
  // land on plainer ledger names than the masters above. Kept so a seeded
  // voucher opens with its ledger selected rather than blank.
  { id: "led-bank-charges", name: "Bank Charges", group: "Indirect Expenses" },
  {
    id: "led-general-exp",
    name: "General Expenses",
    group: "Indirect Expenses",
  },
  { id: "led-bank", name: "Bank", group: "Bank Accounts" },
  { id: "led-cash", name: "Cash", group: "Cash-in-hand" },
  { id: "led-ap", name: "Accounts Payable", group: "Sundry Creditors" },
  { id: "led-ar", name: "Accounts Receivable", group: "Sundry Debtors" },
  { id: "led-sales", name: "Sales", group: "Direct Income" },
  // The seeded journals' own ledgers. Filed under their real groups because
  // the group is what decides whether a line takes a cost centre: the
  // depreciation expense does, the accumulated-depreciation asset side and
  // the debtor do not.
  {
    id: "led-accum-dep-plant",
    name: "Accumulated Depreciation - Plant & Machinery",
    group: "Fixed Assets",
  },
  {
    id: "led-accum-dep-vehicles",
    name: "Accumulated Depreciation - Vehicles",
    group: "Fixed Assets",
  },
  {
    id: "led-accum-dep-computers",
    name: "Accumulated Depreciation - Computers",
    group: "Fixed Assets",
  },
  {
    id: "led-annapoorna",
    name: "Annapoorna Wholesale (Receivable)",
    group: "Sundry Debtors",
  },
  {
    id: "led-godown-rent-pass",
    name: "Godown Rent — Pass-through",
    group: "Indirect Income",
  },
];

/**
 * Tally's default for "Cost centres are applicable": Yes on the income and
 * expense side, No on assets, liabilities, duties & taxes, bank, cash and
 * parties. A ledger that states its own answer overrides the group.
 */
const COST_CENTRE_GROUPS = new Set([
  "Direct Expenses",
  "Indirect Expenses",
  "Direct Income",
  "Indirect Income",
  "Purchase Accounts",
  "Sales Accounts",
]);

/**
 * Whether a journal line posting to this ledger takes a cost centre. Lines
 * resolve their ledger by name, like everything else on the `Form`. A ledger
 * the masters do not hold keeps the cell open — its answer is not known yet.
 */
export function ledgerTakesCostCentre(name: string): boolean {
  const ledger = LEDGERS.find((l) => l.name === name);
  if (!ledger) return true;
  return ledger.costCentre ?? COST_CENTRE_GROUPS.has(ledger.group);
}
