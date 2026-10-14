import { useSyncExternalStore } from "react";
import {
  getState,
  itemFromMock,
  neoCreate,
  neoLog,
  update,
  sourceFailure,
  neoReplaceFailed,
} from "@/components/inbox/v2/store";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
// DEV: direct fetch GET /api/inbox/sources/:id/candidates. Fixture hashes stand
// in for server-computed content hashes, never a model's duplicate judgement.
import {
  mockSourceCandidates,
  mockClearerSourceCopy,
  SOURCE_SCOPES,
  MOCK_SOURCE_CONTACT,
} from "@/config/pages/inbox/mock-sources";
import type {
  InboxSource,
  SourceProvider,
  SourceReceipt,
  SourceRequest,
  CollectionAgent,
  CollectionRun,
  AgentRunMode,
} from "@/types/pages/inbox/sources";

type State = {
  agents: CollectionAgent[];
  runs: CollectionRun[];
  sources: InboxSource[];
  receipts: SourceReceipt[];
  busy: string[];
  requests: SourceRequest[];
};
const empty: State = {
  sources: [],
  receipts: [],
  busy: [],
  requests: [],
  agents: [],
  runs: [],
};
const stopped = new Set<string>();
let state = empty;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const set = (next: State) => {
  state = next;
  emit();
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getSourceState = () => state;
export const useInboxSources = () =>
  useSyncExternalStore(subscribe, getSourceState, () => empty);
const guard = (company: string) => {
  if (getState().company !== company)
    throw new Error(
      "Organisation changed. Start a new task in the current organisation."
    );
};
export const collectionAgent = (company: string): CollectionAgent =>
  state.agents.find((a) => a.company === company) || {
    company,
    configured: false,
    runMode: "on-demand",
    paused: false,
  };
// DEV: direct fetch PUT /api/agents/document-collection/configuration.
export const configureCollectionAgent = (
  company: string,
  runMode: AgentRunMode,
  paused = false
) => {
  guard(company);
  if (!["continuous", "on-demand"].includes(runMode))
    throw new Error("Choose a valid run mode.");
  const agent: CollectionAgent = {
    company,
    configured: true,
    runMode,
    paused: runMode === "continuous" && paused,
  };
  set({
    ...state,
    agents: [...state.agents.filter((a) => a.company !== company), agent],
  });
  logActivity({
    company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action: "Updated Document Collection agent",
    subject: runMode === "continuous" ? "Continuous" : "On demand",
    reason: agent.paused
      ? "Future background collection paused; existing task is unaffected."
      : "Run mode changed explicitly in Agents. Approval and sending still require confirmation.",
  });
};
export const shouldWatchSources = (company: string) => {
  const agent = collectionAgent(company);
  return (
    agent.configured &&
    agent.runMode === "continuous" &&
    !agent.paused &&
    !state.busy.includes(company) &&
    state.sources.some((s) => s.company === company && s.status === "connected")
  );
};
export const stopCollection = (company: string) => {
  guard(company);
  stopped.add(company);
};
export const previewSource = (
  company: string,
  provider: SourceProvider,
  scope: string,
  since: string
) =>
  mockSourceCandidates(company)
    .map((x) =>
      state.requests.some(
        (r) =>
          r.company === company &&
          r.candidateKey === x.key &&
          r.status === "received"
      )
        ? mockClearerSourceCopy(x)
        : x
    )
    .filter(
      (x) =>
        x.provider === provider &&
        x.received >= since &&
        (!scope.endsWith("Freight") ||
          x.document.vendor === "Mahindra Logistics Ltd")
    );

// DEV: POST /api/inbox/sources delegates read + draft preparation only. OAuth
// tokens and access checks belong on the server; never in this browser store.
export const connectSource = (
  company: string,
  provider: SourceProvider,
  scope: string,
  since: string,
  options?: { account?: string; id?: string }
) => {
  guard(company);
  if (
    !SOURCE_SCOPES[provider].includes(scope) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(since)
  )
    throw new Error("Choose a valid source scope and start date.");
  const id =
    options?.id ||
    `source-${company}-${provider}${options?.account ? `-${options.account}` : ""}`;
  if (
    options?.id &&
    !state.sources.some((s) => s.id === options.id && s.company === company)
  )
    throw new Error("Connection unavailable in this organisation.");
  const previous = state.sources.find((s) => s.id === id);
  const source: InboxSource = {
    ...previous,
    id,
    company,
    provider,
    scope,
    since,
    status: "connected",
    account:
      options?.account || (provider === "WhatsApp Business"
        ? "Registered business number · demo"
        : `accounts@${getState().companies.find((c) => c.id === company)?.slug}.example`),
  };
  set({
    ...state,
    sources: [...state.sources.filter((s) => s.id !== id), source],
  });
  logActivity({
    company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action: "Saved simulated source connection",
    subject: provider,
    reason: `${scope} · from ${since} · prepare drafts only`,
  });
  return source;
};
export const setSourceStatus = (id: string, status: InboxSource["status"]) => {
  const source = state.sources.find((s) => s.id === id);
  if (!source) return;
  guard(source.company);
  set({
    ...state,
    sources: state.sources.map((s) => (s.id === id ? { ...s, status } : s)),
  });
  logActivity({
    company: source.company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action: `Collection ${status}`,
    subject: source.provider,
    reason: "Existing documents and source history are retained.",
  });
};

/** Shared by the session watcher and Neo: one company lock, exact-content
 * dedup, durable receipts at each completed step, and no approval calls.
 * DEV: POST /api/inbox/collection-tasks; execute in a server worker with a
 * unique company+contentHash constraint and transactional receipt writes.
 */
export const collectSources = async (
  company: string,
  runId: string,
  checkpoint: () => Promise<void>,
  report: (text: string) => void = () => {},
  onlySource?: string,
  onReceipt: (receipt: SourceReceipt) => void = () => {},
  trigger: "continuous" | "on-demand" = "on-demand"
) => {
  guard(company);
  if (!collectionAgent(company).configured)
    throw new Error("Set up Document Collection in Agents first.");
  if (state.busy.includes(company))
    throw new Error(
      "A collection is already running. Wait for it to finish, then retry."
    );
  const sources = state.sources.filter(
    (s) =>
      s.company === company &&
      s.status === "connected" &&
      (!onlySource || s.id === onlySource)
  );
  if (!sources.length) throw new Error("Connect or resume a source first.");
  if (trigger === "continuous" && !shouldWatchSources(company)) return [];
  stopped.delete(company);
  set({
    ...state,
    busy: [...state.busy, company],
    runs: [
      {
        id: runId,
        company,
        trigger,
        status: "running",
        startedAt: new Date().toISOString(),
        itemIds: [],
        summary: "Checking authorised sources",
      },
      ...state.runs,
    ],
  });
  const results: SourceReceipt[] = [];
  const finish = (status: CollectionRun["status"], summary: string) =>
    set({
      ...state,
      runs: state.runs.map((r) =>
        r.id === runId
          ? {
              ...r,
              status,
              summary,
              finishedAt: new Date().toISOString(),
              itemIds: [
                ...new Set(
                  results.flatMap((r) => (r.itemId ? [r.itemId] : []))
                ),
              ],
            }
          : r
      ),
    });
  try {
    for (const source of sources) {
      for (const candidate of previewSource(
        company,
        source.provider,
        source.scope,
        source.since
      )) {
        await checkpoint();
        guard(company);
        if (stopped.has(company)) throw new Error("Collection stopped by you");
        if (
          state.sources.find((s) => s.id === source.id)?.status !== "connected"
        )
          break;
        // Completed receipts survive retries, stops and concurrent requests.
        if (
          state.receipts.some(
            (r) =>
              r.company === company &&
              r.sourceId === source.id &&
              r.candidateKey === candidate.key
          )
        )
          continue;
        report(
          `Reading ${candidate.document.file.name} from ${source.provider}`
        );
        const existing = getState().items.find(
          (x) =>
            x.company === company &&
            x.file.hash === candidate.hash &&
            x.status !== "Failed"
        );
        const receipt: SourceReceipt = {
          company,
          sourceId: source.id,
          candidateKey: candidate.key,
          hash: candidate.hash,
          location: candidate.location,
          collectedAt: new Date().toISOString(),
          outcome: existing
            ? "linked"
            : candidate.problem === "unreadable"
              ? "failed"
              : candidate.problem
                ? "needs-decision"
                : "prepared",
          reason: existing
            ? "Identical content already in Inbox; kept the second source without creating another voucher."
            : candidate.problem === "unreadable"
              ? "Attachment is unreadable. A clearer copy is required; no amount or voucher was invented."
              : candidate.problem
                ? "Missing supplier invoice number. Draft retained for your decision."
                : "Invoice inside your delegated source scope; prepared for review, not approved.",
        };
        if (existing) {
          receipt.itemId = existing.id;
          neoLog("Linked another collection source", runId, existing, {
            reason: receipt.reason,
          });
        } else if (candidate.problem !== "unreadable") {
          const item = itemFromMock(candidate.document, 0);
          item.file.hash = candidate.hash;
          item.reason = receipt.reason;
          item.form.gst =
            getState().companies.find((c) => c.id === company)?.branches[0] ||
            "";
          item.routingAddress = "";
          if (candidate.problem === "missing-reference")
            item.form.invoiceNo = "";
          const created = getState().items.some(
            (x) =>
              x.id === item.id && x.company === company && x.status === "Failed"
          )
            ? neoReplaceFailed(item, runId)
            : neoCreate(item, runId);
          receipt.itemId = created.id;
        } else {
          const item = itemFromMock(candidate.document, 0);
          item.file.hash = candidate.hash;
          item.reason = receipt.reason;
          receipt.itemId = sourceFailure(item, runId).id;
        }
        set({ ...state, receipts: [...state.receipts, receipt] });
        results.push(receipt);
        onReceipt(receipt);
      }
      guard(company);
      set({
        ...state,
        sources: state.sources.map((s) =>
          s.id === source.id
            ? {
                ...s,
                lastChecked: new Date().toISOString(),
                summary: `${results.filter((r) => r.sourceId === s.id).length} new results on last check`,
              }
            : s
        ),
      });
    }
    finish(
      results.some(
        (r) => r.outcome === "failed" || r.outcome === "needs-decision"
      )
        ? "partial"
        : "completed",
      results.length
        ? `${results.filter((r) => r.outcome === "prepared").length} prepared · ${results.filter((r) => r.outcome === "linked").length} duplicates linked · ${results.filter((r) => r.outcome === "needs-decision" || r.outcome === "failed").length} need attention`
        : "No new documents found"
    );
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task interrupted";
    finish(
      /stop|abort|organisation changed/i.test(message) ? "stopped" : "failed",
      `${message || "Task stopped"} · ${results.length} completed results retained`
    );
    throw error;
  } finally {
    set({ ...state, busy: state.busy.filter((id) => id !== company) });
  }
};

// A failed receipt is deliberately retried only on user request; good results
// are never re-created. The same unreadable fixture honestly fails again.
export const retryFailedSources = (company: string) => {
  guard(company);
  if (state.busy.includes(company)) return;
  set({
    ...state,
    receipts: state.receipts.filter(
      (r) => r.company !== company || r.outcome !== "failed"
    ),
  });
};

export const sourceContact = () => MOCK_SOURCE_CONTACT;
export const requestSourceCopy = (
  receipt: SourceReceipt,
  runId: string,
  body: string
) => {
  guard(receipt.company);
  if (
    state.requests.some(
      (r) =>
        r.company === receipt.company &&
        r.candidateKey === receipt.candidateKey &&
        r.status === "waiting"
    )
  )
    return false;
  if (
    state.sources.find((s) => s.id === receipt.sourceId)?.status !== "connected"
  )
    throw new Error("Reconnect the source before requesting a copy.");
  set({
    ...state,
    requests: [
      ...state.requests,
      {
        company: receipt.company,
        sourceId: receipt.sourceId,
        candidateKey: receipt.candidateKey,
        runId,
        body,
        status: "waiting",
      },
    ],
  });
  logActivity({
    company: receipt.company,
    actor: { kind: "person", name: "You" },
    kind: "predicted",
    module: "Inbox",
    action: "Sent clearer-copy request (simulated)",
    subject: sourceContact(),
    reason: body,
  });
  return true;
};
export const receiveSourceReply = (runId: string) => {
  const request = state.requests.find(
    (r) => r.runId === runId && r.status === "waiting"
  );
  if (!request) return false;
  guard(request.company);
  set({
    ...state,
    requests: state.requests.map((r) =>
      r === request ? { ...r, status: "received" } : r
    ),
    receipts: state.receipts.filter(
      (r) =>
        !(
          r.company === request.company &&
          r.candidateKey === request.candidateKey &&
          r.outcome === "failed"
        )
    ),
  });
  logActivity({
    company: request.company,
    actor: { kind: "person", name: "You" },
    kind: "predicted",
    module: "Inbox",
    action: "Simulated supplier reply",
    subject: request.candidateKey,
    reason:
      "Clearer replacement is available for the next scoped collection check.",
  });
  return true;
};

export const resolveSourceReference = (itemId: string, reference: string) => {
  const item = getState().items.find(
    (x) => x.id === itemId && x.company === getState().company
  );
  if (
    !item ||
    item.status !== "Needs Review" ||
    !reference.trim() ||
    item.form.invoiceNo
  )
    return false;
  update(itemId, {
    form: { ...item.form, invoiceNo: reference.trim() },
    edited: [...new Set([...item.edited, "invoiceNo"])],
    preparedBy: undefined,
    reason:
      "Collected from your delegated source; invoice number supplied by the user. Awaiting review.",
  });
  set({
    ...state,
    receipts: state.receipts.map((r) =>
      r.itemId === itemId && r.outcome === "needs-decision"
        ? {
            ...r,
            outcome: "prepared",
            reason:
              "Supplier invoice number provided by the user. Still awaiting review.",
          }
        : r
    ),
  });
  logActivity({
    company: item.company,
    actor: { kind: "person", name: "You" },
    kind: "predicted",
    module: "Inbox",
    action: "Provided missing invoice number",
    subject: reference.trim(),
    ref: { kind: "document", id: itemId },
    reason: "User supplied the value; Neo did not infer it.",
  });
  return true;
};
