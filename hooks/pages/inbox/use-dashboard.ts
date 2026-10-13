import { useSyncExternalStore } from "react";
import {
  MOCK_DASHBOARD,
  CASH_ASSUMPTIONS,
} from "@/config/pages/inbox/mock-dashboard";
import { bankBalances } from "@/hooks/pages/inbox/use-banking";
import {
  getOpenDocuments,
  useOpenDocuments,
} from "@/hooks/pages/inbox/use-bank-matches";
import { getState, actor, useStore } from "@/components/inbox/v2/store";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import {
  DEMO_TODAY,
  freightSummary,
  overdueInvoices,
  rupees,
} from "@/utils/pages/inbox/ai-calculations";
import type {
  DashboardOverview,
  ForecastNote,
} from "@/types/pages/inbox/dashboard";
let notes: ForecastNote[] = [];
const listeners = new Set<() => void>();
export const getDashboard = (company: string): DashboardOverview =>
  MOCK_DASHBOARD.find((d) => d.companyUuid === company) || {
    companyUuid: company,
    postings: [],
    cashFlowData: [],
    revenueVsExpenseData: [],
  };
export const dashboardMetrics = (data: DashboardOverview, period: string) => {
  const rows = data.postings.filter((p) => p.date.startsWith(period));
  const sum = (kind: string) =>
    rows.filter((p) => p.kind === kind).reduce((n, p) => n + p.amount, 0);
  const revenue = sum("revenue"),
    cogs = sum("cogs"),
    opex = sum("opex");
  return {
    revenue,
    cogs,
    opex,
    gross: revenue - cogs,
    net: revenue - cogs - opex,
    margin: revenue ? ((revenue - cogs) / revenue) * 100 : 0,
    rows,
  };
};
export const addForecastNote = (company: string, text: string) => {
  // DEV: POST /api/dashboard/cash-forecast/notes returns parsed assumptions for review.
  const m = text.match(
    /₹?([\d,.]+)\s*(lakh|lakhs|l|k)?\b.*?(\d{1,2})\s*(oct|nov|dec)/i
  );
  if (!m)
    throw new Error(
      "Use an amount and date, for example: Paying ₹4L advance to SKF on 1 Nov."
    );
  const amount =
    Number(m[1].replaceAll(",", "")) *
    (/^l/i.test(m[2] || "") ? 100000 : /k/i.test(m[2] || "") ? 1000 : 1);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Enter a positive amount.");
  const month = { oct: 10, nov: 11, dec: 12 }[m[4].toLowerCase()]!;
  const date = `2026-${month}-${m[3].padStart(2, "0")}`;
  const at = new Date(`${date}T00:00:00+05:30`);
  if (at < DEMO_TODAY || at > new Date("2026-12-21"))
    throw new Error("Choose a date within the ten-week forecast.");
  const note = {
    id: crypto.randomUUID(),
    company,
    text,
    date,
    amount: /receiv|collect/i.test(text) ? amount : -amount,
  };
  notes = [...notes, note];
  listeners.forEach((f) => f());
  logActivity(
    {
      company,
      actor: { kind: "person", name: actor },
      kind: "override",
      module: "Automation",
      action: "Re-ran cash forecast",
      subject: text,
      reason: "Advisory assumption only; no voucher created",
      undoable: true,
    },
    () => {
      notes = notes.filter((n) => n.id !== note.id);
      listeners.forEach((f) => f());
    }
  );
  return note;
};
export const cashForecast = (company: string) => {
  const openDocuments = getOpenDocuments(company);
  const balance = (x: ReturnType<typeof getState>["items"][number]) =>
    openDocuments.find((d) => d.id === x.id || d.number === x.form.invoiceNo)
      ?.outstanding ?? x.amount;
  // DEV: GET /api/dashboard/cash-forecast returns actual balances, due-date flows and estimated layers.
  const actual = bankBalances(company).reduce(
      (n, b) => n + b.closingBalance,
      0
    ),
    assumption = CASH_ASSUMPTIONS.find((a) => a.company === company),
    items = getState().items.filter(
      (x) =>
        x.company === company &&
        x.status === "Approved" &&
        !x.priorVoucher &&
        x.original.paymentStatus !== "paid" &&
        (x.route === "AP" || x.route === "AR")
    );
  let scheduledBalance = actual,
    estimatedBalance = actual;
  return {
    actual,
    weeks: Array.from({ length: 10 }, (_, i) => {
      const start = new Date(+DEMO_TODAY + i * 7 * 86400000),
        end = new Date(+start + 7 * 86400000);
      const due = items.filter((x) => {
        const d = new Date(`${x.form.due}T00:00:00+05:30`);
        const date = Number.isNaN(+d) ? new Date(x.form.due) : d;
        return date >= start && date < end;
      });
      const incoming = due
          .filter((x) => x.route === "AR")
          .reduce((n, x) => n + balance(x), 0),
        outgoing = due
          .filter((x) => x.route === "AP")
          .reduce((n, x) => n + balance(x), 0);
      const adjustments = notes.filter(
        (n) =>
          n.company === company &&
          new Date(`${n.date}T00:00:00+05:30`) >= start &&
          new Date(`${n.date}T00:00:00+05:30`) < end
      );
      const estimate =
        (assumption?.weeklyReceipts || 0) -
        (assumption?.weeklyPayments || 0) +
        adjustments.reduce((n, x) => n + x.amount, 0);
      scheduledBalance += incoming - outgoing;
      estimatedBalance += incoming - outgoing + estimate;
      return {
        week: start.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          timeZone: "Asia/Kolkata",
        }),
        scheduled: Math.round(scheduledBalance),
        estimated: Math.round(estimatedBalance),
        incoming,
        outgoing,
        estimate,
        records: due,
        reason: `${due.length} approved documents due this week: receipts ${rupees(incoming)}, payments ${rupees(outgoing)}. ${assumption?.reason || "No historical estimate available."} ${adjustments.map((n) => n.text).join("; ")}`,
      };
    }),
  };
};
export const useDashboard = (company: string, period: string) => {
  useOpenDocuments(company);
  const state = useStore();
  const currentNotes = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => notes,
    () => notes
  );
  void state;
  // DEV: GET /api/dashboard/overview?companyUuid=…&period=…; direct fetch replaces this typed mock lookup.
  const data = getDashboard(company),
    metrics = dashboardMetrics(data, period),
    previous = dashboardMetrics(data, "2026-08"),
    freight = freightSummary(state.items, company),
    overdue = overdueInvoices(state.items, company);
  return {
    data,
    metrics,
    previous,
    freight,
    overdue,
    forecast: cashForecast(company),
    notes: currentNotes.filter((n) => n.company === company),
  };
};
export const exportMis = (company: string, period: string) => {
  const d = getDashboard(company),
    m = dashboardMetrics(d, period);
  const quote = (s: unknown) => `"${String(s).replaceAll('"', '""')}"`;
  const rows = [
    [
      "Company",
      "Period",
      "Revenue",
      "Cost of goods",
      "Gross profit",
      "Operating expense",
      "Net profit",
    ],
    [company, period, m.revenue, m.cogs, m.gross, m.opex, m.net],
    [],
    ["Voucher", "Date", "Party", "Ledger", "Amount"],
    ...m.rows.map((p) => [p.voucherNo, p.date, p.party, p.ledger, p.amount]),
  ];
  const blob = new Blob(
    ["\ufeff" + rows.map((r) => r.map(quote).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" }
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `MIS-${company}-${period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logActivity({
    company,
    actor: { kind: "person", name: actor },
    kind: "override",
    module: "Automation",
    action: "Exported monthly MIS",
    subject: period,
    reason: "CSV generated from the displayed report records",
  });
};
