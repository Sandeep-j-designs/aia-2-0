import { useMemo } from "react";
import { getState, useStore, type Item } from "@/components/inbox/v2/store";
import { BRIEF_DEADLINE, MOCK_FIRM_REST } from "@/config/pages/neo/mock-firm";
import { getGstState, useGstState } from "@/hooks/pages/inbox/use-gst";
import {
  getComplianceIssues,
  useCompliance,
} from "@/hooks/pages/inbox/use-compliance";
import { getChases, useChases } from "@/hooks/pages/neo/use-chases";
import type {
  BriefClient,
  BriefSignal,
  FirmBrief,
} from "@/types/pages/neo/brief";
import {
  DEMO_TODAY,
  itcRisk,
  overdueInvoices,
} from "@/utils/pages/inbox/ai-calculations";

/**
 * The firm brief, worked out from the same stores every screen reads — so a
 * figure here is the figure the client's own screen shows when opened.
 *
 * Ranking: clients that need a person first, then by rupees that need a
 * decision. Deadline is the same for every client in this prototype (one
 * monthly GSTR-3B), so it labels rather than sorts.
 *
 * DEV: GET /api/neo/brief replaces `firmBrief`; the hook keeps its shape.
 */

/** "₹2.4L", "₹38,000" — compact, as a partner says it aloud. */
export const lakhs = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, "")}L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;

const daysTo = (iso: string) =>
  Math.ceil((+new Date(`${iso}T00:00:00+05:30`) - +DEMO_TODAY) / 86400000);

const isWaiting = (x: Item) =>
  !x.priorVoucher && ["Needs Review", "Duplicate", "Failed"].includes(x.status);

export const firmBrief = (): FirmBrief => {
  const s = getState();
  const chases = getChases();
  const days = daysTo(BRIEF_DEADLINE.due);
  const due = new Date(
    `${BRIEF_DEADLINE.due}T00:00:00+05:30`
  ).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const clients: BriefClient[] = s.companies.map((c) => {
    const items = s.items.filter((x) => x.company === c.id);
    const waiting = items.filter(isWaiting);
    const dupes = waiting.filter((x) => x.status === "Duplicate");
    const failed = waiting.filter((x) => x.status === "Failed");
    const waitingSum = waiting.reduce((n, x) => n + x.amount, 0);

    const q2 = Object.entries(getGstState(c.id).invoices)
      .filter(([m]) => m >= "2026-07" && m <= "2026-09")
      .flatMap(([, rows]) => rows);
    const itc = itcRisk(q2).total;

    const overdue = overdueInvoices(s.items, c.id);
    const overdueSum = overdue.reduce((n, x) => n + x.outstanding, 0);

    const checks = getComplianceIssues(c.id).filter((x) => x.status === "open");
    const mine = chases.filter((x) => x.company === c.id);
    const replies = mine.filter((x) => x.status === "received");
    const out = mine.filter((x) => x.status === "waiting");

    const signals: BriefSignal[] = [];
    if (itc > 0)
      signals.push({
        id: "itc",
        text: `${lakhs(itc)} ITC at risk`,
        tone: "negative",
        href: "/inbox?module=GST&tab=invoices",
      });
    if (waiting.length)
      signals.push({
        id: "review",
        text: `${waiting.length} to review`,
        tone: "notice",
        href: "/inbox",
      });
    if (dupes.length)
      signals.push({
        id: "dupes",
        text: `${dupes.length} duplicate${dupes.length === 1 ? "" : "s"}`,
        tone: "notice",
        href: "/inbox",
      });
    if (failed.length)
      signals.push({
        id: "failed",
        text: `${failed.length} unreadable`,
        tone: "notice",
        href: "/inbox",
      });
    if (overdueSum > 0)
      signals.push({
        id: "overdue",
        text: `${lakhs(overdueSum)} overdue`,
        tone: "notice",
        href: "/inbox?module=AR&tab=overdue",
      });
    if (checks.length)
      signals.push({
        id: "checks",
        text: `${checks.length} compliance check${checks.length === 1 ? "" : "s"}`,
        tone: "notice",
        href: "/inbox?module=CHECKS",
      });
    if (replies.length)
      signals.push({
        id: "replies",
        text: `${replies.length} chase repl${replies.length === 1 ? "y" : "ies"} to read`,
        tone: "neutral",
        href: replies[0].itemId
          ? `/inbox?id=${encodeURIComponent(replies[0].itemId)}`
          : "/inbox",
      });
    if (out.length)
      signals.push({
        id: "out",
        text: `${out.length} chase${out.length === 1 ? "" : "s"} waiting`,
        tone: "neutral",
        href: out[0].itemId
          ? `/inbox?id=${encodeURIComponent(out[0].itemId)}`
          : "/inbox",
      });

    // Where to start: the deadline's work first, then the oldest money.
    const order = ["itc", "review", "replies", "overdue", "checks", "dupes"];
    const first = order
      .map((id) => signals.find((x) => x.id === id))
      .find(Boolean);
    const labels: Record<string, string> = {
      itc: "Open GST",
      review: "Open Inbox",
      replies: "Read replies",
      overdue: "Open overdue",
      checks: "Open checks",
      dupes: "Open Inbox",
    };

    const needs = signals.filter((x) => x.id !== "out");
    return {
      company: c.id,
      name: c.name,
      deadline: `${BRIEF_DEADLINE.label} due ${due} · ${days} day${days === 1 ? "" : "s"}`,
      impact: itc + overdueSum + waitingSum,
      signals,
      next: first ? { label: labels[first.id], href: first.href } : undefined,
      clear: !needs.length,
    };
  });

  clients.sort(
    (a, b) => Number(a.clear) - Number(b.clear) || b.impact - a.impact
  );

  const day = 86400000;
  const arrived = s.items.filter(
    (x) =>
      !x.priorVoucher && x.received && Date.now() - +new Date(x.received) < day
  ).length;
  const replies = chases.filter(
    (x) => x.reply && Date.now() - +new Date(x.reply.at) < 2 * day
  ).length;
  const needYou = clients.filter((x) => !x.clear).length;

  return {
    clients,
    rest: MOCK_FIRM_REST,
    overnight: [
      arrived
        ? `${arrived} document${arrived === 1 ? "" : "s"} arrived in the last day`
        : "No new documents since yesterday",
      replies
        ? `${replies} repl${replies === 1 ? "y" : "ies"} to chases`
        : "no chase replies",
      "nothing posted without you",
    ].join(" · "),
    needYou,
    total: clients.length + MOCK_FIRM_REST.clients,
  };
};

/** The brief, recomputed when any store it reads changes. */
export const useFirmBrief = () => {
  const s = useStore();
  const chases = useChases();
  // Subscribing is what matters; the values are read again in firmBrief.
  const gst = useGstState(s.company);
  const checks = useCompliance(s.company);
  return useMemo(() => firmBrief(), [s, chases, gst, checks]);
};
