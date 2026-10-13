import type {
  BankRule,
  BankRuleSuggestion,
} from "@/types/pages/inbox/bank-automation";

/**
 * Bank rules the accountants have already accepted, and the ones the AI has
 * proposed from repeated manual coding and not yet been answered.
 *
 * `contains` is matched against the narration as words, case-insensitive
 * ("CHRG" matches "CHRG: IMPS CHARGES INCL GST").
 *
 * DEV: GET /api/bank/rules?companyId=… and
 * GET /api/bank/rules/suggestions?companyId=…
 */
export const MOCK_BANK_RULES: BankRule[] = [
  {
    id: "rule-shakun-chrg",
    company: "shakun",
    contains: "CHRG",
    action: { kind: "categorise", type: "payment", ledger: "Bank Charges" },
    hits: 14,
    createdBy: "Priya Raghavan",
    createdAt: "2026-09-02T10:12:00+05:30",
    on: true,
  },
  {
    id: "rule-shakun-term-loan",
    company: "shakun",
    contains: "HDFC TERM LOAN",
    action: { kind: "categorise", type: "payment", ledger: "HDFC Term Loan" },
    hits: 6,
    createdBy: "Sandeep Balaji",
    createdAt: "2026-07-18T16:40:00+05:30",
    on: true,
  },
  {
    id: "rule-shakun-swiggy",
    company: "shakun",
    contains: "SWIGGY",
    action: { kind: "categorise", type: "payment", ledger: "Staff Welfare" },
    hits: 9,
    createdBy: "Priya Raghavan",
    createdAt: "2026-08-05T11:05:00+05:30",
    on: true,
  },
  {
    // Turned off when the broadband moved to the plant's own account.
    id: "rule-shakun-airtel",
    company: "shakun",
    contains: "AIRTEL BROADBAND",
    action: {
      kind: "categorise",
      type: "payment",
      ledger: "Telephone & Internet",
    },
    hits: 3,
    createdBy: "Priya Raghavan",
    createdAt: "2026-08-16T09:30:00+05:30",
    on: false,
  },
  {
    id: "rule-acme-chrg",
    company: "acme",
    contains: "CHRG",
    action: { kind: "categorise", type: "payment", ledger: "Bank Charges" },
    hits: 5,
    createdBy: "Priya Raghavan",
    createdAt: "2026-08-26T12:00:00+05:30",
    on: true,
  },
  {
    id: "rule-acme-msedcl",
    company: "acme",
    contains: "MSEDCL",
    action: { kind: "categorise", type: "payment", ledger: "Power & Fuel" },
    hits: 2,
    createdBy: "Sandeep Balaji",
    createdAt: "2026-08-23T15:20:00+05:30",
    on: true,
  },
];

export const MOCK_BANK_RULE_SUGGESTIONS: BankRuleSuggestion[] = [
  {
    id: "sug-shakun-slt",
    company: "shakun",
    contains: "SRI LAKSHMI TRADERS",
    action: { kind: "link-oldest-open", party: "Sri Lakshmi Traders" },
    evidence:
      "You linked the last 3 Sri Lakshmi Traders payments to their oldest open bill.",
    repeats: 3,
    status: "pending",
  },
  {
    id: "sug-shakun-mmt",
    company: "shakun",
    contains: "MAKEMYTRIP",
    action: {
      kind: "categorise",
      type: "payment",
      ledger: "Travelling Expenses",
    },
    evidence:
      "You've put 4 MakeMyTrip debits in Travelling Expenses since June, on HDFC and the Axis card.",
    repeats: 4,
    status: "pending",
  },
  {
    id: "sug-acme-sai",
    company: "acme",
    contains: "SAI LOGISTICS",
    action: { kind: "categorise", type: "payment", ledger: "Freight Outward" },
    evidence:
      "You've put 3 Sai Logistics Pune debits in Freight Outward since July.",
    repeats: 3,
    status: "pending",
  },
];
