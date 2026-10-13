import type { FixedAsset, Provision } from "@/types/pages/inbox/dashboard";
export type ProvisionSource = {
  id: string;
  company: string;
  title: string;
  date: string;
  detail: string;
  amount: number;
};
export const MOCK_PROVISION_SOURCES: ProvisionSource[] = [
  "shakun",
  "acme",
].flatMap((company) => {
  const audit = company === "shakun" ? 165000 : 90000;
  return [
    {
      id: `AUDIT/24-25/${company}`,
      company,
      title: "Prior-year audit fee journal",
      date: "31 Mar 2025",
      amount: audit,
      detail: `Debit Audit Fees / Credit Audit Fee Payable; ${audit.toLocaleString("en-IN")} on each side. FY 24–25 approved source voucher.`,
    },
    {
      id: `ENGAGEMENT/25-26/${company}`,
      company,
      title: "Audit engagement letter",
      date: "1 Apr 2025",
      amount: Math.round(audit * 1.09),
      detail:
        "Agreed fee: prior-year fee plus 9%. Excludes GST; invoice and tax credit are recognised when received.",
    },
    {
      id: `PAYROLL/25-26/${company}`,
      company,
      title: "March bonus accrual schedule",
      date: "31 Mar 2026",
      amount: company === "shakun" ? 420000 : 180000,
      detail:
        "HR-approved earned bonus, unpaid at year-end. Debit Staff Bonus; credit Bonus Payable. Reverse against April payroll.",
    },
    {
      id: `WORK-ACCEPTANCE/25-26/${company}`,
      company,
      title: "Maintenance work acceptance",
      date: "28 Mar 2026",
      amount: company === "shakun" ? 120000 : 45000,
      detail:
        "Plant maintenance completed and accepted in March; invoice pending. Provision excludes unbilled GST. Reverse when supplier invoice is booked.",
    },
  ];
});
// IT Rules Appendix I, general machinery 15% WDV. Full-year opening blocks;
// no additions/disposals or half-year adjustment. Tax estimate for review,
// not a claim that Companies Act book depreciation uses the same rate.
// https://www.incometaxindia.gov.in/w/appendix-i-1
export const MOCK_FIXED_ASSETS: FixedAsset[] = [
  {
    id: "plant-shakun",
    company: "shakun",
    name: "Refining plant and machinery",
    openingWdv: 12000000,
    rate: 0.15,
    method: "Income-tax WDV",
    sourceVoucher: "FA/25-26/001",
    ledger: "Plant & Machinery",
  },
  {
    id: "plant-acme",
    company: "acme",
    name: "CNC machinery",
    openingWdv: 4200000,
    rate: 0.15,
    method: "Income-tax WDV",
    sourceVoucher: "FA/25-26/002",
    ledger: "Plant & Machinery",
  },
];
export const MOCK_PROVISIONS: Provision[] = ["shakun", "acme"].flatMap(
  (company) => {
    const audit = company === "shakun" ? 165000 : 90000,
      bonus = company === "shakun" ? 420000 : 180000,
      unbilled = company === "shakun" ? 120000 : 45000;
    return [
      {
        id: `audit-${company}`,
        company,
        group: "Audit fee",
        amount: Math.round(audit * 1.09),
        reason: `Last year’s fee ₹${audit.toLocaleString("en-IN")} × 1.09, per the engagement letter.`,
        debit: "Audit Fees",
        credit: "Audit Fee Payable",
        sources: [`AUDIT/24-25/${company}`, `ENGAGEMENT/25-26/${company}`],
        reverse: true,
      },
      {
        id: `bonus-${company}`,
        company,
        group: "Bonus",
        amount: bonus,
        reason:
          "Approved March payroll accrual schedule; unpaid bonus estimate.",
        debit: "Staff Bonus",
        credit: "Bonus Payable",
        sources: [`PAYROLL/25-26/${company}`],
        reverse: true,
      },
      {
        id: `unbilled-${company}`,
        company,
        group: "Expenses not yet billed",
        amount: unbilled,
        reason:
          "March maintenance work accepted; supplier invoice not yet received.",
        debit: "Repairs & Maintenance",
        credit: "Provision for Expenses",
        sources: [`WORK-ACCEPTANCE/25-26/${company}`],
        reverse: true,
      },
    ];
  }
);
