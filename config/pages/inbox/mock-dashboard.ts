import type {
  DashboardOverview,
  DashboardPosting,
  CashAssumption,
} from "@/types/pages/inbox/dashboard";
const postings = (company: string): DashboardPosting[] =>
  ["2026-08", "2026-09"].flatMap((month, m) => {
    const oil = company === "shakun",
      revenue = oil ? 10000000 : m ? 2850000 : 2700000,
      cogs = oil ? (m ? 8820000 : 8580000) : m ? 1950000 : 1800000,
      opex = oil ? (m ? 630000 : 580000) : m ? 520000 : 450000;
    return [
      {
        kind: "revenue" as const,
        amount: revenue,
        party: oil ? "Reliance Retail Ltd" : "Bharat Forge Ltd",
        ledger: oil ? "Sales - Refined Oils" : "Sales - Machined Components",
      },
      {
        kind: "cogs" as const,
        amount: cogs,
        party: oil ? "Adani Wilmar Ltd" : "Tata Steel Ltd",
        ledger: oil
          ? "Cost of crude oil and refining"
          : "Steel, tooling and job work",
      },
      {
        kind: "opex" as const,
        amount: opex,
        party: "Operating expenses",
        ledger: "Payroll, freight and plant overheads",
      },
    ].map((p, i) => ({
      ...p,
      id: `MIS-${company}-${month}-${i}`,
      voucherNo: `MIS/26-27/${month.slice(-2)}/${i + 1}`,
      date: `${month}-30`,
    }));
  });
export const MOCK_DASHBOARD: DashboardOverview[] = ["shakun", "acme"].map(
  (companyUuid) => {
    const rows = postings(companyUuid);
    return {
      companyUuid,
      postings: rows,
      cashFlowData: [
        {
          month: "2026-08",
          cashIn: companyUuid === "shakun" ? "9500000" : "2500000",
          cashOut: companyUuid === "shakun" ? "9100000" : "2300000",
        },
        {
          month: "2026-09",
          cashIn: companyUuid === "shakun" ? "9200000" : "2700000",
          cashOut: companyUuid === "shakun" ? "9400000" : "2800000",
        },
      ],
      revenueVsExpenseData: ["2026-08", "2026-09"].map((month) => ({
        month,
        revenue: rows
          .filter((p) => p.date.startsWith(month) && p.kind === "revenue")
          .reduce((n, p) => n + p.amount, 0),
        expense: rows
          .filter((p) => p.date.startsWith(month) && p.kind !== "revenue")
          .reduce((n, p) => n + p.amount, 0),
        revenueGrowth:
          companyUuid === "shakun"
            ? 0
            : month === "2026-09"
              ? 150000 / 2700000
              : 0,
      })),
    };
  }
);
export const CASH_ASSUMPTIONS: CashAssumption[] = [
  {
    company: "shakun",
    weeklyReceipts: 600000,
    weeklyPayments: 650000,
    reason:
      "Demo recurring assumption: weekly refinery receipts ₹6,00,000 and outgoings ₹6,50,000. Unissued activity is estimated; overdue invoices are not scheduled receipts.",
  },
  {
    company: "acme",
    weeklyReceipts: 220000,
    weeklyPayments: 250000,
    reason:
      "Demo recurring assumption: weekly job-work receipts ₹2,20,000 and payroll/vendor outgoings ₹2,50,000. Overdue invoices are excluded from scheduled receipts.",
  },
];
