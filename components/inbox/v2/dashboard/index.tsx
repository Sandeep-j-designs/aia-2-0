import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageDialog } from "@/components/inbox/v2/ui";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import {
  addForecastNote,
  exportMis,
  useDashboard,
} from "@/hooks/pages/inbox/use-dashboard";
import { rupees } from "@/utils/pages/inbox/ai-calculations";
import { companyOf } from "@/components/inbox/v2/store";
type Props = { company: string };
const chartMoney = (n: number) => `${Math.round(n / 100000)}L`;
const Dashboard = ({ company }: Props) => {
  const router = useRouter();
  const period = router.query.period === "2026-08" ? "2026-08" : "2026-09";
  const d = useDashboard(company, period);
  const [source, setSource] = useState(false),
    [week, setWeek] = useState<number>(),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  const overdue = d.overdue.reduce((n, x) => n + x.outstanding, 0);
  const aging = [
    {
      days: "1–30",
      amount: d.overdue
        .filter((x) => x.days <= 30)
        .reduce((n, x) => n + x.outstanding, 0),
    },
    {
      days: "31–60",
      amount: d.overdue
        .filter((x) => x.days > 30 && x.days <= 60)
        .reduce((n, x) => n + x.outstanding, 0),
    },
    {
      days: "61–90",
      amount: d.overdue
        .filter((x) => x.days > 60 && x.days <= 90)
        .reduce((n, x) => n + x.outstanding, 0),
    },
    {
      days: "90+",
      amount: d.overdue
        .filter((x) => x.days > 90)
        .reduce((n, x) => n + x.outstanding, 0),
    },
  ];
  return (
    <div className="dashboard-view flex min-h-0 min-w-0 flex-1">
      <FeaturePage
        title="Dashboard"
        tab="overview"
        tabs={[{ id: "overview", label: "Overview" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Report month"
              className="rounded-sm border border-pi-line bg-background p-2 text-sm"
              value={period}
              onChange={(e) =>
                void router.replace(
                  {
                    pathname: "/inbox",
                    query: { module: "DASH", period: e.target.value },
                  },
                  undefined,
                  { shallow: true }
                )
              }
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
            </select>
            <Button
              variant="outline"
              onClick={() => exportMis(company, period)}
            >
              Export MIS
            </Button>
          </div>
        }
      >
        <p className="text-sm text-pi-body">
          {companyOf(company)?.name} ·{" "}
          {period === "2026-09" ? "September" : "August"} 2026 · FY 26–27
        </p>
        {!d.data.postings.length ? (
          <p>No monthly report is available for this organisation.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Revenue", value: d.metrics.revenue },
                { label: "Gross profit", value: d.metrics.gross },
                { label: "Net profit", value: d.metrics.net },
                { label: "Cash today", value: d.forecast.actual },
              ].map((k) => (
                <button
                  key={k.label}
                  onClick={() =>
                    k.label === "Cash today" ? setWeek(0) : setSource(true)
                  }
                  className="min-w-0 rounded-lg border border-pi-line bg-background p-5 text-left"
                >
                  <p className="text-sm text-pi-body">{k.label}</p>
                  <p className="mt-3 break-words text-2xl font-semibold tabular-nums text-pi-ink">
                    {rupees(k.value)}
                  </p>
                </button>
              ))}
            </div>
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <section className="min-w-0 rounded-lg border border-pi-line bg-background p-5">
                <h2 className="mb-5 font-semibold">Revenue and expense</h2>
                <div className="h-64 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.data.revenueVsExpenseData}>
                      <CartesianGrid stroke="var(--pi-line)" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={chartMoney} width={42} />
                      <Tooltip formatter={(v: number) => rupees(v)} />
                      <Legend />
                      <Bar
                        isAnimationActive={false}
                        name="Revenue"
                        dataKey="revenue"
                        fill="var(--pi-brand)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        isAnimationActive={false}
                        name="Expense"
                        dataKey="expense"
                        fill="var(--pi-faint)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="rounded-lg border border-pi-line bg-background p-5">
                <h2 className="mb-4 font-semibold">What moved</h2>
                <div className="divide-y divide-pi-line text-sm leading-6">
                  <button
                    className="w-full py-4 text-left"
                    onClick={() => setSource(true)}
                  >
                    <p>
                      Gross margin{" "}
                      {period === "2026-09"
                        ? `moved from ${d.previous.margin.toFixed(1)}% in August to `
                        : "was "}
                      {d.metrics.margin.toFixed(1)}%. Cost of goods was{" "}
                      {rupees(d.metrics.cogs)} against revenue of{" "}
                      {rupees(d.metrics.revenue)}.
                    </p>
                    <span className="text-pi-brand">View report records →</span>
                  </button>
                  <button
                    className="w-full py-4 text-left"
                    onClick={() => void router.push("/inbox?module=AP")}
                  >
                    <p>
                      September freight rose by{" "}
                      {rupees(d.freight.september - d.freight.august)}:{" "}
                      {rupees(d.freight.september)} compared with{" "}
                      {rupees(d.freight.august)} in August.
                    </p>
                    <span className="text-pi-brand">
                      Open purchase records →
                    </span>
                  </button>
                  <button
                    className="w-full py-4 text-left"
                    onClick={() =>
                      void router.push("/inbox?module=AR&tab=overdue")
                    }
                  >
                    <p>
                      {d.overdue.length} overdue sales invoices leave{" "}
                      {rupees(overdue)} outstanding today.
                    </p>
                    <span className="text-pi-brand">
                      Open overdue invoices →
                    </span>
                  </button>
                </div>
                <p className="mt-3 text-xs text-pi-faint">
                  Calculated from the linked records. Gross margin = (revenue −
                  cost of goods) ÷ revenue.
                </p>
              </section>
            </div>
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <section className="min-w-0 rounded-lg border border-pi-line bg-background p-5">
                <h2 className="mb-5 font-semibold">Cash flow trend</h2>
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={d.data.cashFlowData.map((x) => ({
                        ...x,
                        cashIn: Number(x.cashIn),
                        cashOut: Number(x.cashOut),
                      }))}
                    >
                      <CartesianGrid stroke="var(--pi-line)" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={chartMoney} width={42} />
                      <Tooltip formatter={(v: number) => rupees(v)} />
                      <Legend />
                      <Line
                        isAnimationActive={false}
                        dataKey="cashIn"
                        name="Cash in"
                        stroke="var(--pi-brand)"
                        strokeWidth={2}
                      />
                      <Line
                        isAnimationActive={false}
                        dataKey="cashOut"
                        name="Cash out"
                        stroke="var(--pi-faint)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="min-w-0 rounded-lg border border-pi-line bg-background p-5">
                <h2 className="mb-5 font-semibold">
                  Receivables overdue by age
                </h2>
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging}>
                      <CartesianGrid stroke="var(--pi-line)" vertical={false} />
                      <XAxis dataKey="days" />
                      <YAxis tickFormatter={chartMoney} width={42} />
                      <Tooltip formatter={(v: number) => rupees(v)} />
                      <Bar
                        isAnimationActive={false}
                        dataKey="amount"
                        name="Outstanding"
                        fill="var(--pi-brand)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
            <section className="rounded-lg border border-pi-line bg-background p-5">
              <h2 className="font-semibold">Top outstanding customers</h2>
              <div className="mt-4 divide-y divide-pi-line">
                {d.overdue.length ? (
                  d.overdue
                    .slice()
                    .sort((a, b) => b.outstanding - a.outstanding)
                    .map((x) => (
                      <button
                        key={x.item.id}
                        className="flex w-full flex-wrap justify-between gap-3 py-4 text-left text-sm"
                        onClick={() =>
                          void router.push(`/inbox?id=${x.item.id}`)
                        }
                      >
                        <span>
                          {x.item.form.party} · {x.item.form.invoiceNo}
                        </span>
                        <span className="tabular-nums">
                          {rupees(x.outstanding)} · {x.days} days overdue
                        </span>
                      </button>
                    ))
                ) : (
                  <p className="py-4 text-sm text-pi-body">
                    No overdue approved sales invoices in this organisation.
                  </p>
                )}
              </div>
            </section>
            <section className="min-w-0 rounded-lg border border-pi-line bg-background p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="font-semibold">Cash forecast · next 10 weeks</h2>
                <span className="text-sm text-pi-body">
                  Actual today {rupees(d.forecast.actual)}
                </span>
              </div>
              <p className="mt-2 text-sm text-pi-faint">
                Scheduled comes from approved due dates, with no AI. Estimated
                includes recurring activity and your notes. Advisory only; never
                posts.
              </p>
              <div className="mt-6 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={d.forecast.weeks}
                    onClick={(s) => {
                      if (s?.activeTooltipIndex !== undefined)
                        setWeek(Number(s.activeTooltipIndex));
                    }}
                  >
                    <CartesianGrid stroke="var(--pi-line)" vertical={false} />
                    <XAxis dataKey="week" />
                    <YAxis tickFormatter={chartMoney} width={42} />
                    <Tooltip formatter={(v: number) => rupees(v)} />
                    <Legend />
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="scheduled"
                      name="Scheduled balance"
                      stroke="var(--pi-brand)"
                      strokeWidth={2}
                    />
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="estimated"
                      name="Including estimated"
                      stroke="var(--pi-faint)"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.forecast.weeks.map((w, i) => (
                  <Button
                    key={w.week}
                    variant="ghost"
                    onClick={() => setWeek(i)}
                  >
                    {w.week}
                  </Button>
                ))}
              </div>
              <form
                className="mt-5 flex flex-wrap gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    addForecastNote(company, note);
                    setNote("");
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <input
                  aria-label="Forecast assumption"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Paying ₹4L advance to SKF on 1 Nov"
                  className="min-w-0 flex-1 basis-64 rounded-sm border border-pi-line bg-background p-3 text-sm"
                />
                <Button type="submit" disabled={!note.trim()}>
                  Re-run with note
                </Button>
              </form>
              {error && (
                <p role="alert" className="mt-2 text-sm text-pi-danger">
                  {error}
                </p>
              )}
              {d.notes.map((n) => (
                <p key={n.id} className="mt-3 text-sm text-pi-body">
                  Assumption: {n.text}
                </p>
              ))}
            </section>
          </>
        )}
        <PageDialog
          open={source}
          title="Monthly report source records"
          onClose={() => setSource(false)}
        >
          <p className="mb-4 text-sm text-pi-body">
            Tally MIS ledger totals · {period}. Demo report records reconcile to
            the displayed KPIs.
          </p>
          {d.metrics.rows.map((p) => (
            <div
              key={p.id}
              className="space-y-1 border-t border-pi-line py-4 text-sm"
            >
              <p className="font-medium">
                {p.voucherNo} · {p.party}
              </p>
              <p>
                {p.ledger} · {rupees(p.amount)}
              </p>
            </div>
          ))}
        </PageDialog>
        <PageDialog
          open={week !== undefined}
          title="What was assumed"
          onClose={() => setWeek(undefined)}
        >
          {week !== undefined && (
            <div className="space-y-4 text-sm leading-6">
              <p>{d.forecast.weeks[week].reason}</p>
              <p>
                Scheduled balance: {rupees(d.forecast.weeks[week].scheduled)} ·
                Including estimates: {rupees(d.forecast.weeks[week].estimated)}
              </p>
              {d.forecast.weeks[week].records.map((x) => (
                <Button
                  key={x.id}
                  variant="ghost"
                  onClick={() => void router.push(`/inbox?id=${x.id}`)}
                >
                  {x.form.voucherNo} · {rupees(x.amount)}
                </Button>
              ))}
            </div>
          )}
        </PageDialog>
      </FeaturePage>
    </div>
  );
};
export default Dashboard;
