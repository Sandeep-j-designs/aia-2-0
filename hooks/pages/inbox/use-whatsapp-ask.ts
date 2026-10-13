import { useSyncExternalStore } from "react";
import {
  MOCK_WHATSAPP_NUMBERS,
  MOCK_OUTPUT_TAX,
} from "@/config/pages/inbox/mock-whatsapp";
import {
  REGISTERED_WHATSAPP,
  getState,
  actor,
} from "@/components/inbox/v2/store";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import {
  freightSummary,
  itcRisk,
  overdueInvoices,
  rupees,
} from "@/utils/pages/inbox/ai-calculations";
// DEV: GET /api/whatsapp/numbers returns registered numbers with company-scoped permissions.
let numbers = MOCK_WHATSAPP_NUMBERS.map((n, i) => ({
  ...n,
  number: i === 0 ? REGISTERED_WHATSAPP : n.number,
}));
const listeners = new Set<() => void>();
export const useWhatsAppNumbers = () =>
  useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => numbers,
    () => numbers
  );
export const toggleWhatsApp = (number: string, enabled: boolean) => {
  numbers = numbers.map((n) => (n.number === number ? { ...n, enabled } : n));
  const n = numbers.find((n) => n.number === number);
  if (n)
    logActivity({
      company: n.company,
      actor: { kind: "person", name: actor },
      kind: "rule",
      module: "Automation",
      action: enabled
        ? "Enabled WhatsApp answers"
        : "Disabled WhatsApp answers",
      subject: n.name,
    });
  listeners.forEach((f) => f());
};
export const gstPayable = (company: string) => {
  const rows = Object.values(getGstState(company).invoices).flat();
  const eligible = rows.filter((r) =>
    ["fully_matched", "ai_matched", "manually_matched"].includes(r.matchType)
  );
  const input =
      Math.round(
        eligible.reduce((n, r) => n + (r.pr?.totalGst || 0), 0) * 100
      ) / 100,
    output = MOCK_OUTPUT_TAX[company] || 0;
  return {
    input,
    output,
    net: Math.max(0, Math.round((output - input) * 100) / 100),
    risk: itcRisk(rows),
    rows,
  };
};
export const askWhatsApp = (
  number: string,
  question: string,
  company: string
) => {
  // DEV: POST /api/neo/whatsapp/inbound validates the sender server-side, then evaluates read tools only.
  const person = numbers.find(
    (n) => n.number === number && n.company === company && n.enabled
  );
  let answer: string;
  let links: { label: string; href: string }[] = [];
  if (!person)
    answer =
      "This number is not registered for answers in this organisation. Please ask your accountant to register it in AIA.";
  else if (/approve|post|edit|send|delete|change/i.test(question))
    answer =
      "I can’t approve, post or edit from WhatsApp — open AIA to approve.";
  else if (/gst|tax/i.test(question)) {
    const g = gstPayable(company);
    answer = `Available reconciled records: output tax ${rupees(g.output)}, eligible input credit ${rupees(g.input)}, net payable ${rupees(g.net)}. Computed: output minus eligible credit, floored at zero. September GSTR-3B due 20 Oct. ${rupees(g.risk.missing)} is missing in 2B across ${g.risk.missingCount} invoices. Your CA must confirm the September return.`;
    links = [
      { label: "GST reconciliation records", href: "/inbox?module=GST" },
    ];
  } else if (/owes|overdue|60 days/i.test(question)) {
    const rows = overdueInvoices(getState().items, company).filter(
      (x) => x.days > 60
    );
    answer = `${new Set(rows.map((x) => x.item.form.party)).size} customers, ${rupees(rows.reduce((n, x) => n + x.outstanding, 0))} outstanding more than 60 days. ${rows.map((x) => `${x.item.form.party}: ${rupees(x.outstanding)} (${x.days} days)`).join(" · ")}`;
    links = rows.map((x) => ({
      label: x.item.form.invoiceNo,
      href: `/inbox?id=${x.item.id}`,
    }));
  } else if (/freight/i.test(question)) {
    const f = freightSummary(getState().items, company);
    answer = `September freight: ${rupees(f.september)}, from ${f.septemberRecords.length} bills. August: ${rupees(f.august)}. Increase: ${rupees(f.september - f.august)}. Totals are computed from the linked bill lines.`;
    links = f.septemberRecords.map((x) => ({
      label: x.form.invoiceNo,
      href: `/inbox?id=${x.id}`,
    }));
  } else
    answer =
      "I can answer questions about GST, overdue customers and freight in this prototype.";
  logActivity({
    company,
    actor: { kind: "ai", name: "Neo" },
    kind: "predicted",
    module: "Automation",
    action: person
      ? "Answered WhatsApp question"
      : "Refused unregistered WhatsApp request",
    subject: person?.name || "Unregistered sender",
    reason: `${question}\n${answer}`,
  });
  return { question, answer, links };
};
