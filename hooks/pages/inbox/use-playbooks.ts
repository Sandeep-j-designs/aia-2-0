import { useSyncExternalStore } from "react";
import {
  MOCK_PLAYBOOKS,
  MOCK_SCHEDULES,
} from "@/config/pages/inbox/mock-playbooks";
import type {
  AgentSchedule,
  PlaybookRun,
} from "@/types/pages/inbox/ai-features";
import { getState, companyOf, actor } from "@/components/inbox/v2/store";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import { getBankingState } from "@/hooks/pages/inbox/use-banking";
import { bankRuleActions } from "@/hooks/pages/inbox/use-bank-rules";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { runComplianceChecks } from "@/hooks/pages/inbox/use-compliance";
import { notificationActions } from "@/hooks/pages/notifications/use-notifications";
import {
  itcRisk,
  overdueInvoices,
  rupees,
} from "@/utils/pages/inbox/ai-calculations";
// DEV: GET /api/playbooks and GET /api/agents/schedules return these contracts.
let state = {
  playbooks: MOCK_PLAYBOOKS,
  schedules: structuredClone(MOCK_SCHEDULES),
  runs: [] as PlaybookRun[],
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const patchRun = (id: string, patch: Partial<PlaybookRun>) => {
  state = {
    ...state,
    runs: state.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  };
  emit();
};
export const usePlaybooks = () =>
  useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => state,
    () => state
  );
export const saveSchedule = (schedule: AgentSchedule) => {
  state = {
    ...state,
    schedules: [
      ...state.schedules.filter((s) => s.id !== schedule.id),
      schedule,
    ],
  };
  schedule.companies.forEach((company) =>
    logActivity({
      company,
      actor: { kind: "person", name: actor },
      kind: "rule",
      module: "Automation",
      action: "Saved schedule",
      subject: schedule.when,
      reason: `${schedule.channel} to ${schedule.recipient}`,
    })
  );
  emit();
};
export const playbookSummary = (companies: string[]) =>
  companies
    .map((company) => {
      const risk = itcRisk(Object.values(getGstState(company).invoices).flat());
      return `${companyOf(company)?.name}: ITC at risk ${rupees(risk.total)}`;
    })
    .join(" · ");
export const runPlaybook = async (
  playbookId: string,
  companies: string[],
  resumeId?: string
) => {
  // DEV: POST /api/playbooks/:id/runs; server streams progress and pauses for portal authentication.
  const book = state.playbooks.find((p) => p.id === playbookId);
  if (!book) return;
  companies = companies.filter((c) =>
    getState().companies.some((x) => x.id === c)
  );
  if (!companies.length) return;
  const id = resumeId || crypto.randomUUID();
  const run: PlaybookRun = {
    id,
    playbookId,
    companies,
    at: new Date().toISOString(),
    status: "running",
    results: [],
    drafts: [],
  };
  state = { ...state, runs: [run, ...state.runs.filter((r) => r.id !== id)] };
  emit();
  let paused = false;
  for (const company of companies) {
    const rows = Object.values(getGstState(company).invoices).flat(),
      risk = itcRisk(rows),
      inbox = getState().items.filter((x) => x.company === company),
      bank = getBankingState(company);
    for (let step = 0; step < book.steps.length; step++) {
      await new Promise((r) => setTimeout(r, 350));
      let text = "";
      if (playbookId === "gst-close") {
        if (step === 0) {
          const september = inbox.filter(
            (x) => x.route === "AP" && /Sep|2026-09/.test(x.form.date)
          );
          text = `${september.filter((x) => x.status !== "Approved").length} of ${september.length} September bills still need approval. Sync must be confirmed in Sync Management.`;
        }
        if (step === 1 && !getGstState(company).portalAuthenticated) {
          paused = true;
          text =
            "Paused: GST portal session expired. Open GST Reconciliation and authenticate with OTP.";
          notificationActions.push(
            {
              companyId: company,
              kind: "gst_portal_session",
              data: { gstin: getGstState(company).profile.gstin },
              actor: { kind: "system" },
              target: {
                href: "/inbox?module=GST",
                label: "Authenticate GST portal",
              },
              refs: [id],
            },
            { toast: false }
          );
          run.results.push({ company, step, text, paused: true });
          patchRun(id, { results: [...run.results] });
          break;
        }
        if (step === 1)
          text = "Portal session active. Using the available GSTR-2B records.";
        if (step === 2)
          text = `${rows.length} reconciled rows available in the GST store.`;
        if (step === 3)
          text = `Missing in 2B: ${risk.missingCount}, ${rupees(risk.missing)}; missing in books: ${rows.filter((r) => r.matchType === "missing_in_pr").length}.`;
        if (step === 4) {
          const missing = rows.filter(
            (r) =>
              r.matchType === "missing_in_2b" || r.matchType === "missing_in_pr"
          );
          const drafts = missing.map((r) => ({
            company,
            to: (r.pr || r.gstr2b)!.vendorName,
            body: `Dear ${(r.pr || r.gstr2b)!.vendorName},\nPlease share or reconcile invoice ${(r.pr || r.gstr2b)!.invoiceNo} for our GST review. Tax amount: ${rupees((r.pr || r.gstr2b)!.totalGst)}.\nRegards, Accounts team`,
          }));
          run.drafts.push(...drafts);
          text = `${drafts.length} vendor follow-ups drafted for review.`;
        }
        if (step === 5) text = playbookSummary([company]);
      } else if (playbookId === "bank-tidy") {
        if (step === 0) bankRuleActions.run(company);
        const unmatched = bank.transactions.filter((t) => !t.accoutingReady);
        text =
          step === 0
            ? `${bank.transactions.filter((t) => t.ruleId).length} transactions already cite bank rules; review suggestions in Banking.`
            : step === 1
              ? `${unmatched.filter((t) => Number(t.transactionAmountLc) > 50000).length} unmatched lines above ₹50,000.`
              : step === 2
                ? `${unmatched.length} lines available for matching in Banking.`
                : "Bank tidy-up prepared. Review and accept matches in Banking.";
      } else if (playbookId === "tds") {
        if (step === 0) runComplianceChecks(company);
        text =
          step === 0
            ? "Vendor threshold checks completed."
            : step === 1
              ? "Review outstanding TDS issues in Compliance checks."
              : "Payment-run note prepared for Priya; no deduction posted.";
      } else {
        const overdue = overdueInvoices(inbox, company);
        text = `${overdue.length} overdue invoices · ${rupees(overdue.reduce((n, x) => n + x.outstanding, 0))}. Review reminders in Sales.`;
      }
      run.results.push({ company, step, text });
      patchRun(id, { results: [...run.results], drafts: [...run.drafts] });
    }
    logActivity({
      company,
      actor: { kind: "ai", name: "Neo · Routine" },
      kind: "predicted",
      module: "Automation",
      action: paused ? "Paused playbook" : "Ran playbook",
      subject: book.name,
      reason: run.results
        .filter((r) => r.company === company)
        .map((r) => r.text)
        .join("\n"),
    });
  }
  patchRun(id, { status: paused ? "paused" : "done" });
  return id;
};
export const sendPlaybookDraft = (
  runId: string,
  index: number,
  body: string
) => {
  const run = state.runs.find((r) => r.id === runId),
    draft = run?.drafts[index];
  if (!run || !draft || draft.sent) return;
  patchRun(runId, {
    drafts: run.drafts.map((d, i) =>
      i === index ? { ...d, body, sent: true } : d
    ),
  });
  logActivity({
    company: draft.company,
    actor: { kind: "person", name: actor },
    kind: "override",
    module: "Automation",
    action: "Sent vendor follow-up (simulated)",
    subject: draft.to,
    reason: body,
  });
};
