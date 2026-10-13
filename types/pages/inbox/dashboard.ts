export type DashboardPosting = {
  id: string;
  voucherNo: string;
  date: string;
  party: string;
  ledger: string;
  kind: "revenue" | "cogs" | "opex";
  amount: number;
};
export type DashboardOverview = {
  companyUuid: string;
  postings: DashboardPosting[];
  cashFlowData: { month: string; cashIn: string; cashOut: string }[];
  revenueVsExpenseData: {
    month: string;
    revenue: number;
    expense: number;
    revenueGrowth: number;
  }[];
};
export type ForecastNote = {
  id: string;
  company: string;
  text: string;
  date: string;
  amount: number;
};
export type CashAssumption = {
  company: string;
  weeklyReceipts: number;
  weeklyPayments: number;
  reason: string;
};
export type FixedAsset = {
  id: string;
  company: string;
  name: string;
  openingWdv: number;
  rate: number;
  method: "Income-tax WDV";
  sourceVoucher: string;
  ledger: string;
};
export type Provision = {
  id: string;
  company: string;
  group: string;
  amount: number;
  reason: string;
  debit: string;
  credit: string;
  sources: string[];
  reverse: boolean;
};
