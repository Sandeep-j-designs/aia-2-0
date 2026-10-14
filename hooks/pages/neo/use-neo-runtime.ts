import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { NEO_CAPABILITIES, pickTask } from "@/config/pages/neo/tasks";
import { suggestionsFor } from "@/config/pages/neo/suggestions";
import type {
  NeoAction,
  NeoCard,
  NeoContext,
  NeoMessage,
  NeoOption,
  NeoPresenceState,
  NeoRef,
  NeoRun,
  NeoRunStatus,
  NeoTaskApi,
} from "@/types/pages/neo";
import { subscribeNeoSelection } from "@/utils/pages/neo/selection";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import {
  getState,
  subscribeStore,
  useStore,
} from "@/components/inbox/v2/store";

/**
 * Neo's runtime: the conversation, the runs, and the loop that plays a task
 * against them.
 *
 * A task is written as a straight-line script — ask, wait for the answer,
 * show a card, wait for the choice — and this hook is what turns each of
 * those awaits into something on screen and a promise that resolves when the
 * user answers it. That is exactly the shape of an agent loop with
 * elicitation. A live backend must also enforce authorisation, validation,
 * idempotent writes and approval independently of the event stream.
 *
 * DEV: `startRun` calls the scripted `pickTask(...).run(api)`. Replace with a
 * stream from POST /api/neo/runs whose events map one-to-one onto the `api`
 * methods (step → step, ask → ask, card → card, say → say), and send answers
 * back on POST /api/neo/runs/:id/replies.
 */

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

class Stopped extends Error {
  constructor() {
    super("Task stopped");
  }
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Find a row in whatever list is on screen and mark it for a moment. */
const flashRow = (id: string, tries = 24): Promise<boolean> =>
  new Promise((resolve) => {
    const attempt = (n: number) => {
      const row = document.querySelector<HTMLElement>(
        `[data-item-id="${CSS.escape(id)}"]`
      );
      if (row) {
        row.scrollIntoView({
          block: "center",
          behavior: reducedMotion() ? "auto" : "smooth",
        });
        if (!reducedMotion())
          row.animate(
            [
              {
                outline: "2px solid hsl(var(--primary))",
                outlineOffset: "-2px",
              },
              {
                outline: "2px solid hsl(var(--primary))",
                outlineOffset: "-2px",
                offset: 0.7,
              },
              { outline: "2px solid transparent", outlineOffset: "-2px" },
            ],
            { duration: 1800, easing: "ease-out" }
          );
        resolve(true);
      } else if (n > 0) window.setTimeout(() => attempt(n - 1), 150);
      else resolve(false);
    };
    attempt(tries);
  });

export const useNeoRuntime = () => {
  const router = useRouter();
  const { company } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "runs">("chat");
  const [messages, setMessages] = useState<NeoMessage[]>([]);
  const [runs, setRuns] = useState<NeoRun[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detached, setDetached] = useState(false);
  const [launchers, setLaunchers] = useState(0);
  const [paused, setPaused] = useState(false);
  const [presence, setPresence] = useState<Record<string, NeoPresenceState>>(
    {}
  );
  const [liveStatus, setLiveStatus] = useState<{
    text: string;
    progress?: { done: number; total: number };
  } | null>(null);
  const pausedRef = useRef(false);
  const resumers = useRef<(() => void)[]>([]);

  const resolvers = useRef(new Map<string, (value: string) => void>());
  const rejecters = useRef(new Map<string, (e: Error) => void>());
  const controller = useRef<AbortController | null>(null);
  const undos = useRef(
    new Map<string, (() => { reversed: string[]; skipped: string[] })[]>()
  );
  const editableCards = useRef(new Map<string, NeoCard>());

  useEffect(() => subscribeNeoSelection(setSelectedIds), []);

  const itemId =
    typeof router.query.id === "string" ? router.query.id : undefined;
  const module = ["AP", "AR", "JV"].includes(String(router.query.module))
    ? (router.query.module as NeoContext["module"])
    : undefined;
  // A new screen is a new "this": whatever was detached re-attaches.
  useEffect(() => setDetached(false), [itemId, module]);

  const context: NeoContext = useMemo(
    () =>
      detached
        ? { company, selectedIds: [] }
        : { company, itemId, selectedIds: itemId ? [] : selectedIds, module },
    [detached, itemId, selectedIds, module, company]
  );

  /* ---------------------------------------------------- conversation ops */

  const patch = (id: string, f: (m: NeoMessage) => NeoMessage) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? f(m) : m)));

  const patchRun = (id: string, p: Partial<NeoRun>) =>
    setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const goTo = useCallback(
    async (ref: NeoRef) => {
      if (ref.href) {
        await router.push(ref.href);
        setOpen(false);
        return;
      }
      if (!ref.itemId) return;
      const target = getState().items.find((x) => x.id === ref.itemId);
      if (target && target.company !== getState().company) {
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            text: "This record belongs to another company. Switch to the run's company before opening it.",
          },
        ]);
        return;
      }
      if (ref.target === "inbox") {
        if (router.asPath !== "/inbox") await router.push("/inbox");
        const found = await flashRow(ref.itemId);
        if (found) return;
      }
      await router.push(`/inbox?id=${encodeURIComponent(ref.itemId)}`);
      setOpen(false);
    },
    [router]
  );

  /* ------------------------------------------------------------- runs */

  const startRun = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || controller.current) return;
      setTab("chat");
      const runId = uid("run");
      const ctx = structuredClone(context);
      logActivity({
        company: ctx.company || getState().company,
        actor: { kind: "ai", name: "Neo" },
        kind: "predicted",
        module: "Automation",
        action: "Started requested task",
        subject: text,
        reason: "User request; calculations read from company records",
      });
      setMessages((ms) => [...ms, { id: uid("m"), role: "user", text }]);

      const task = pickTask(text, ctx);
      if (!task) {
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            text: `I can't do that in this workspace yet. Here's what I can do: ${NEO_CAPABILITIES.map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join("; ")}.`,
            suggestions: suggestionsFor(ctx),
          },
        ]);
        return;
      }

      const abort = new AbortController();
      controller.current = abort;
      let stopReason = "Stopped by you";
      const touched = new Set<string>();
      const unsubscribe = subscribeStore(() => {
        if (getState().company !== ctx.company) {
          stopReason = "Stopped because the company changed";
          abort.abort();
          rejecters.current.forEach((reject) => reject(new Stopped()));
        }
      });
      setBusy(runId);
      undos.current.set(runId, []);
      setRuns((rs) => [
        {
          id: runId,
          context: ctx,
          title: task.title,
          status: "running",
          startedAt: new Date().toISOString(),
          touched: [],
          undoable: false,
        },
        ...rs,
      ]);

      let stepsMsg: string | null = null;
      let lastCard: string | null = null;
      const guard = () => {
        if (getState().company !== ctx.company) {
          stopReason = "Stopped because the company changed";
          abort.abort();
        }
        if (abort.signal.aborted) throw new Stopped();
      };
      const wait = (ms: number) =>
        new Promise<void>((resolve, reject) => {
          guard();
          const onAbort = () => {
            window.clearTimeout(t);
            reject(new Stopped());
          };
          const t = window.setTimeout(
            () => {
              abort.signal.removeEventListener("abort", onAbort);
              try {
                guard();
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            reducedMotion() ? Math.min(ms, 40) : ms
          );
          abort.signal.addEventListener("abort", onAbort, { once: true });
        });
      const push = (m: Omit<NeoMessage, "id" | "role" | "runId">) => {
        const id = uid("m");
        stepsMsg = null;
        setMessages((ms) => [...ms, { id, role: "neo", runId, ...m }]);
        return id;
      };
      const waitFor = (id: string, status: NeoRunStatus = "needs-you") =>
        new Promise<string>((resolve, reject) => {
          patchRun(runId, { status });
          resolvers.current.set(id, (v) => {
            patchRun(runId, { status: "running" });
            resolve(v);
          });
          rejecters.current.set(id, reject);
        });

      let outcome: NeoRunStatus = "done";
      const api: NeoTaskApi = {
        outcome: (status) => {
          outcome = status;
        },
        runId,
        prompt: text,
        context: ctx,
        signal: abort.signal,
        focus: (itemId) => {
          guard();
          if (
            !getState().items.some(
              (x) => x.id === itemId && x.company === ctx.company
            )
          )
            throw new Error("The record is not in this run's company.");
          ctx.itemId = itemId;
          ctx.selectedIds = [];
          patchRun(runId, { context: { ...ctx } });
        },
        wait,
        say: async (said, links) => {
          guard();
          if (task.id === "triage" || task.id === "explain") {
            push({ text: said, links });
            return;
          }
          const id = push({ text: "", links: undefined });
          const words = said.split(/(\s+)/);
          const chunk = Math.max(1, Math.ceil(words.length / 24));
          for (let i = 0; i < words.length; i += chunk) {
            const shown = words.slice(0, i + chunk).join("");
            patch(id, (m) => ({ ...m, text: shown }));
            if (!reducedMotion()) await wait(16);
          }
          patch(id, (m) => ({ ...m, text: said, links }));
        },
        step: async (label, cite) => {
          guard();
          const stepId = uid("s");
          if (!stepsMsg) {
            const id = uid("m");
            stepsMsg = id;
            setMessages((ms) => [
              ...ms,
              {
                id,
                role: "neo",
                runId,
                steps: [{ id: stepId, label, status: "running", cite }],
              },
            ]);
          } else {
            const id = stepsMsg;
            patch(id, (m) => ({
              ...m,
              steps: [
                ...(m.steps || []),
                { id: stepId, label, status: "running", cite },
              ],
            }));
          }
          const owner = stepsMsg!;
          await wait(120);
          return (done?: string) =>
            patch(owner, (m) => ({
              ...m,
              steps: m.steps?.map((s) =>
                s.id === stepId
                  ? { ...s, status: "done", label: done || s.label }
                  : s
              ),
            }));
        },
        fail: (label) => {
          push({
            steps: [{ id: uid("s"), label, status: "failed" }],
          });
        },
        ask: async (question: string, options: NeoOption[]) => {
          guard();
          const id = push({ ask: { question, options } });
          const answer = await waitFor(id);
          guard();
          patch(id, (m) => ({ ...m, ask: { ...m.ask!, answer } }));
          return answer;
        },
        card: async (card: NeoCard, actions: NeoAction[]) => {
          guard();
          const id = push({ card, actions });
          lastCard = id;
          editableCards.current.set(id, card);
          const choice = await waitFor(id);
          guard();
          const edited = editableCards.current.get(id);
          if (card.kind === "message" && edited?.kind === "message")
            card.body = edited.body;
          editableCards.current.delete(id);
          patch(id, (m) => ({ ...m, chosen: choice }));
          return choice;
        },
        show: (card) => {
          guard();
          const id = push({ card });
          return (next) => patch(id, (m) => ({ ...m, card: next }));
        },
        updateCard: (card, actions) => {
          if (!lastCard) return;
          patch(lastCard, (m) => ({
            ...m,
            card,
            actions: actions ?? m.actions,
          }));
        },
        touch: (ids) => {
          ids.forEach((id) => touched.add(id));
          setRuns((rs) =>
            rs.map((r) =>
              r.id === runId
                ? { ...r, touched: [...new Set([...r.touched, ...ids])] }
                : r
            )
          );
        },
        onUndo: (undo) => {
          undos.current.get(runId)?.push(undo);
          logActivity(
            {
              company: ctx.company || getState().company,
              actor: { kind: "ai", name: "Neo" },
              kind: "predicted",
              module: "Automation",
              action: "Prepared reversible change",
              subject: task.title,
              reason: text,
              undoable: true,
            },
            () => {
              const result = undo();
              if (!result.reversed.length)
                throw new Error(
                  "The records changed or were approved; Undo cannot overwrite them."
                );
            }
          );
          patchRun(runId, { undoable: true });
        },
        checkpoint: async () => {
          guard();
          if (!pausedRef.current) return;
          patchRun(runId, { status: "needs-you" });
          await new Promise<void>((resolve, reject) => {
            resumers.current.push(resolve);
            abort.signal.addEventListener("abort", () => reject(new Stopped()));
          });
          patchRun(runId, { status: "running" });
        },
        presence: (ids, state) =>
          setPresence((p) => {
            const next = { ...p };
            ids.forEach((id) => {
              if (state) next[id] = state;
              else delete next[id];
            });
            return next;
          }),
        status: (said, progress) =>
          setLiveStatus(said ? { text: said, progress } : null),
        navigate: async (path) => {
          guard();
          if (path.includes("neoReview=") || path.includes("neoSync="))
            setOpen(false);
          if (router.asPath !== path) await router.push(path);
        },
        chain: async (next) => {
          const t = pickTask(next, ctx);
          if (!t) return;
          const summary = await t.run({ ...api, prompt: next });
          if (summary) patchRun(runId, { title: t.title });
        },
      };

      try {
        const summary = await task.run(api);
        patchRun(runId, {
          status: outcome,
          summary: typeof summary === "string" ? summary : undefined,
        });
      } catch (error) {
        if (error instanceof Stopped || abort.signal.aborted) {
          patchRun(runId, {
            status: "stopped",
            summary: `${stopReason} · ${touched.size} records touched`,
          });
          setMessages((ms) => [
            ...ms,
            {
              id: uid("m"),
              role: "neo",
              runId,
              text: `${stopReason}. ${touched.size} records were created, linked or changed; completed changes remain. Tasks lists them. Eligible draft changes can be undone from document History.`,
            },
          ]);
        } else {
          console.error("[Neo]", error);
          patchRun(runId, {
            status: "failed",
            summary: "Something went wrong",
          });
          setMessages((ms) => [
            ...ms,
            {
              id: uid("m"),
              role: "neo",
              runId,
              steps: [
                {
                  id: uid("s"),
                  label: `${error instanceof Error ? error.message : "That didn't work."} ${touched.size} records were touched before this failure; check Runs for completed changes.`,
                  status: "failed",
                },
              ],
            },
          ]);
        }
      } finally {
        unsubscribe();
        editableCards.current.clear();
        // Any question still open on screen belongs to a run that has ended.
        resolvers.current.clear();
        rejecters.current.clear();
        controller.current = null;
        pausedRef.current = false;
        resumers.current = [];
        setPaused(false);
        setLiveStatus(null);
        // Rows keep their last mark for a moment, then let go.
        window.setTimeout(() => setPresence({}), 2500);
        setBusy(null);
      }
    },
    [busy, context, router]
  );

  /** Answer the open question or card. */
  const answer = useCallback((messageId: string, value: string) => {
    const resolve = resolvers.current.get(messageId);
    if (!resolve) return;
    resolvers.current.delete(messageId);
    rejecters.current.delete(messageId);
    resolve(value);
  }, []);

  const editCard = useCallback((messageId: string, card: NeoCard) => {
    if (!resolvers.current.has(messageId)) return;
    editableCards.current.set(messageId, card);
    setMessages((ms) =>
      ms.map((m) => (m.id === messageId ? { ...m, card } : m))
    );
  }, []);

  const pause = useCallback(() => {
    if (!controller.current) return;
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    const waiting = resumers.current;
    resumers.current = [];
    waiting.forEach((f) => f());
  }, []);

  const stop = useCallback(() => {
    if (!controller.current) return;
    controller.current.abort();
    rejecters.current.forEach((reject) => reject(new Stopped()));
  }, []);

  const undo = useCallback(
    (runId: string) => {
      if (controller.current) return;
      const owner = runs.find((r) => r.id === runId);
      if (owner?.context.company !== getState().company) {
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            text: "Switch to the run's company before undoing it. Nothing was changed.",
          },
        ]);
        setTab("chat");
        return;
      }
      const list = undos.current.get(runId) || [];
      if (!list.length) return;
      const results = [...list].reverse().map((f) => f());
      const reversed = [...new Set(results.flatMap((r) => r.reversed))];
      const skipped = [...new Set(results.flatMap((r) => r.skipped))];
      // Undoing what is on screen leaves nothing to show: go back to the queue.
      const run = runs.find((r) => r.id === runId);
      if (itemId && run?.touched.includes(itemId)) void router.push("/inbox");
      undos.current.set(runId, []);
      setRuns((rs) =>
        rs.map((r) =>
          r.id === runId
            ? {
                ...r,
                status: skipped.length ? r.status : "undone",
                summary: `${reversed.length} reversed · ${skipped.length} kept (changed, approved or unavailable)`,
                undoable: false,
              }
            : r
        )
      );
      setMessages((ms) => [
        ...ms,
        {
          id: uid("m"),
          role: "neo",
          runId,
          text: `Reversed ${reversed.length} records.${skipped.length ? ` Kept ${skipped.length} records because they changed, were approved or are unavailable: ${skipped.join(", ")}.` : " No later edits were overwritten."}`,
        },
      ]);
      setTab("chat");
    },
    [runs, itemId, router]
  );

  const reset = useCallback(() => {
    if (controller.current) return;
    setMessages([]);
  }, []);

  /* ---------------------------------------------------------- global keys */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.code === "KeyJ"
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const registerLauncher = useCallback(() => {
    setLaunchers((n) => n + 1);
    return () => setLaunchers((n) => n - 1);
  }, []);

  return {
    open,
    setOpen,
    tab,
    setTab,
    messages,
    runs,
    busy,
    context,
    runContext: runs.find((r) => r.id === busy)?.context,
    detach: () => setDetached(true),
    startRun,
    completeWaiting: (runId: string) =>
      setRuns((rs) =>
        rs.map((r) =>
          r.id === runId &&
          r.context.company === getState().company &&
          r.status === "waiting"
            ? {
                ...r,
                status: "done",
                summary:
                  "Supplier reply received (simulated); replacement queued for collection",
              }
            : r
        )
      ),
    answer,
    editCard,
    stop,
    undo,
    reset,
    goTo,
    hasLauncher: launchers > 0,
    paused,
    pause,
    resume,
    presence,
    liveStatus,
    registerLauncher,
  };
};

export type NeoRuntime = ReturnType<typeof useNeoRuntime>;
