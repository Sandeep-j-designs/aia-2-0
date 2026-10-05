import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Item, Route } from "@/components/inbox/v2/store";
import {
  SYNC_DURATION_SECONDS,
  SYNC_OUTCOME_CYCLE,
  SYNC_MIN_RUN_MS,
  SYNC_PARTIAL_FAILURE_RATE,
  SYNC_TICK_MS,
} from "@/config/pages/inbox/sync";
import {
  buildSyncModules,
  buildSyncQueue,
  countSelected,
  defaultSelectedKeys,
  runModulesFor,
  syncModuleList,
} from "@/utils/pages/inbox/sync";
import type {
  SyncDoc,
  SyncModule,
  SyncModuleKey,
  SyncModuleProgress,
  SyncPhase,
  SyncRun,
  TallyConnection,
} from "@/types/pages/inbox/sync";

type UseTallySyncArgs = {
  /** Every item for the current company, approved or not. */
  items: Item[];
  /** The route the workspace is scoped to; null on the Inbox proper. */
  route: Route | null;
};

/**
 * Unified Inbox — Tally sync orchestration.
 *
 * Owns the whole flow the "Sync Management - Phase 2" Figma page designs:
 * confirm → push → outcome, with Continue in Background and Stop Sync as the
 * two exits from the middle. Components only render what comes back from here.
 *
 * The one thing this hook fakes is the push itself. It walks the queue on a
 * timer instead of streaming job events, which is why the seams are marked DEV
 * rather than hidden — swapping the timer for a subscription is the whole
 * integration.
 *
 * DEV: production replaces the timer with
 *   POST /api/tally/sync { modules }  → { jobId }
 *   then an Ably subscription on the job channel for per-document progress.
 * Everything else here — phase, the doc list, the outcome, which ids are in
 * flight — is state derived from those events and survives the swap unchanged.
 */
export const useTallySync = ({ items, route }: UseTallySyncArgs) => {
  const [phase, setPhase] = useState<SyncPhase>("idle");

  // DEV: read from the accounting-tool connection status production already
  // polls — the same source that disables Sync app-wide.
  const [connection] = useState<TallyConnection>("connected");

  /** Ids already in Tally, so the list can draw the synced cloud on them. */
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());

  const { current, included } = useMemo(
    () => buildSyncModules(items, syncedIds, route),
    [items, syncedIds, route]
  );

  /**
   * Which modules go across. What starts checked is `defaultSelectedKeys` —
   * the pressed module on a module page, everything with work in it on the
   * Inbox. Either way every box comes off again: scope is the question this
   * modal asks, and a question with one un-answerable part is worse than no
   * question.
   */
  const [selectedKeys, setSelectedKeys] = useState<Set<SyncModuleKey>>(() =>
    defaultSelectedKeys(current, included)
  );

  /**
   * Re-seed while the modal is shut — when the route scope moves the current
   * module out from under us, or when approving a document puts work into a
   * bucket the Inbox's "everything with something in it" default should now
   * be ticking. Gated on `idle` so it can never reach in and re-tick a box
   * the user has just cleared with the modal open.
   */
  const defaultKeysSignature = [
    // The scope itself leads, and an empty string is the Inbox. Without it the
    // signature misses the one transition that matters most: `router.query` is
    // empty on a module page's first render, so the hook seeds Inbox-style —
    // everything with work in it — and the scope only arrives a render later.
    // The buckets holding work are usually the same on both sides of that, so
    // a signature made of counts alone reads as "nothing changed" and leaves
    // the Inbox default sitting on a page that asked for one module.
    current?.key ?? "",
    ...syncModuleList(current, included)
      .filter((module) => module.count > 0)
      .map((module) => module.key),
  ].join(",");
  useEffect(() => {
    if (phase !== "idle") return;
    setSelectedKeys(defaultSelectedKeys(current, included));
    // `defaultKeysSignature` stands in for the modules themselves: it changes
    // exactly when the default would, and not on every recount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKeysSignature, phase]);

  const toggleModule = useCallback((key: SyncModuleKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectedCount = useMemo(
    () => countSelected(syncModuleList(current, included), selectedKeys),
    [current, included, selectedKeys]
  );

  /* ------------------------------------------------------------ the run */

  const [docs, setDocs] = useState<SyncDoc[]>([]);
  const [run, setRun] = useState<SyncRun | null>(null);

  /**
   * The modules the run was launched with, frozen at launch and in send order.
   *
   * Frozen because `current` and the counts behind it are derived from what is
   * still unsynced, so they move the instant the first documents land — a run
   * started on Bills would relabel itself "Invoices" underneath the counter as
   * it drained. What the progress modal names has to be what was pressed Sync
   * on.
   */
  const [runModules, setRunModules] = useState<SyncModule[]>([]);

  /**
   * What Tally rejected on the last run. The result card's "See what failed"
   * is only worth pressing if it lands somewhere — it narrows the list to
   * exactly these, which is the nearest thing this prototype has to the Sync
   * Management history screen the Figma links to.
   */
  const [failedSyncIds, setFailedSyncIds] = useState<Set<string>>(new Set());
  const [reviewingFailures, setReviewingFailures] = useState(false);

  const timerRef = useRef<number | null>(null);
  // PROTOTYPE ONLY — advances the success → partial → failure cycle.
  const runCountRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  /**
   * Nothing approved and unsynced is a one-click-away state, not an edge case:
   * sync everything once and the next press has no work to offer. Opening a
   * modal of zeroes with a dead button says less than saying so.
   */
  /*
    Measured on what the modal would open checked, not on the whole board.
    Scoped to a module that has nothing approved, that is still nothing to send
    — the Bills sitting in another bucket are not what Sync was pressed on, and
    opening on a dead button to say so is worse than saying so. On the Inbox
    the default is every bucket holding work, so this is the whole board there,
    which is the point.
  */
  const hasSyncable =
    countSelected(
      syncModuleList(current, included),
      defaultSelectedKeys(current, included)
    ) > 0;

  const openConfirm = useCallback(() => {
    if (!hasSyncable) {
      toast.info("Everything approved is already in Tally.", {
        description:
          "Approve a document in the Inbox and it joins the next sync.",
      });
      return;
    }
    setPhase("confirm");
  }, [hasSyncable]);
  const closeConfirm = useCallback(() => setPhase("idle"), []);

  const start = useCallback(() => {
    const modules = runModulesFor(current, included, selectedKeys);
    const queue = buildSyncQueue(items, syncedIds, modules);
    if (queue.length === 0) return;

    /**
     * What the counter says it is sending. One module speaks its own noun
     * ("29 / 47 Bills"); more than one has no shared noun, so the design falls
     * back to "items" and moves the per-module detail into the rollup.
     */
    const unitPlural = modules.length === 1 ? modules[0].unitPlural : "items";

    // Offline: the run is parked rather than attempted. The confirm modal's
    // CTA already reads "Add to Sync Queue" in this state.
    if (connection === "offline") {
      setPhase("idle");
      toast.info(
        `${queue.length} ${
          queue.length === 1 && modules.length === 1
            ? modules[0].unit
            : unitPlural
        } queued — they'll sync when Tally reconnects.`
      );
      return;
    }

    // A queue of one cannot come back partial — "0 couldn't be pushed" is not
    // an outcome. Skip forward to the next state this run can actually express
    // rather than showing a card that contradicts itself.
    let index = runCountRef.current;
    while (
      SYNC_OUTCOME_CYCLE[index % SYNC_OUTCOME_CYCLE.length] === "partial" &&
      queue.length < 2
    )
      index += 1;
    const outcome = SYNC_OUTCOME_CYCLE[index % SYNC_OUTCOME_CYCLE.length];
    runCountRef.current = index + 1;

    // Which documents fail is decided up front, so the progress list and the
    // result card can never disagree about the count.
    const failedCount =
      outcome === "failure"
        ? queue.length
        : outcome === "partial"
          ? Math.min(
              queue.length - 1,
              Math.max(1, Math.round(queue.length * SYNC_PARTIAL_FAILURE_RATE))
            )
          : 0;
    // Failures land on the tail of the queue, so a run reads as "it was going
    // fine and then it wasn't" rather than scattering red at random.
    const failFrom = queue.length - failedCount;

    setDocs(
      queue.map((doc, i) => (i === 0 ? { ...doc, state: "pushing" } : doc))
    );
    setRunModules(modules);
    setRun(null);
    // A new run supersedes the last one's failures — leaving the list narrowed
    // to them would hide the documents this run is about to touch.
    setFailedSyncIds(new Set());
    setReviewingFailures(false);
    setPhase("running");

    // A long queue ticks at the normal rate; a short one is stretched so the
    // modal is readable. See SYNC_MIN_RUN_MS.
    const tick = Math.max(SYNC_TICK_MS, SYNC_MIN_RUN_MS / queue.length);

    let cursor = 0;
    timerRef.current = window.setInterval(() => {
      setDocs((prev) =>
        prev.map((doc, index) => {
          if (index < cursor) return doc;
          if (index === cursor)
            return { ...doc, state: index >= failFrom ? "failed" : "pushed" };
          if (index === cursor + 1) return { ...doc, state: "pushing" };
          return doc;
        })
      );

      cursor += 1;
      if (cursor < queue.length) return;

      clearTimer();
      setSyncedIds((prev) => {
        const next = new Set(prev);
        queue.slice(0, failFrom).forEach((doc) => next.add(doc.id));
        return next;
      });
      setFailedSyncIds(new Set(queue.slice(failFrom).map((doc) => doc.id)));
      setRun({
        outcome,
        pushed: queue.length - failedCount,
        failed: failedCount,
        total: queue.length,
        durationSeconds: SYNC_DURATION_SECONDS,
        unitPlural,
      });
      // A backgrounded run reports in a toast; a watched one shows the card.
      setPhase((currentPhase) =>
        currentPhase === "background" ? "background" : "result"
      );
    }, tick);
  }, [connection, current, included, items, selectedKeys, syncedIds]);

  /** Continue in Background — the run keeps going, the modal gets out of it. */
  const continueInBackground = useCallback(() => setPhase("background"), []);

  /** Stop Sync — what has landed stays landed; the rest is abandoned. */
  const stop = useCallback(() => {
    clearTimer();
    const pushed = docs.filter((doc) => doc.state === "pushed");
    setSyncedIds((prev) => {
      const next = new Set(prev);
      pushed.forEach((doc) => next.add(doc.id));
      return next;
    });
    setPhase("idle");
    setDocs([]);
    setRun(null);
    // The run's own modules, not `current`: the counts behind `current` have
    // already shifted under the documents this run pushed.
    const noun =
      runModules.length === 1
        ? pushed.length === 1
          ? runModules[0].unit
          : runModules[0].unitPlural
        : "items";
    toast.info(
      pushed.length > 0
        ? `Sync stopped. ${pushed.length} ${noun} already went through.`
        : "Sync stopped. Nothing went through."
    );
  }, [runModules, docs]);

  /** Done — dismisses the result card and leaves the list as it was. */
  const dismissResult = useCallback(() => {
    setPhase("idle");
    setDocs([]);
    setRun(null);
  }, []);

  /** See what failed / See what went wrong — dismisses, then narrows the list. */
  const reviewFailures = useCallback(() => {
    setReviewingFailures(true);
    dismissResult();
  }, [dismissResult]);

  const clearFailureReview = useCallback(() => setReviewingFailures(false), []);

  /**
   * A posted voucher that has been edited since.
   *
   * There is no re-sync flow, and deliberately so: the copy in Tally is simply
   * out of date, which is the same condition as a voucher that never went
   * across. Dropping the id puts it back in `syncableItems`, so the next
   * ordinary run picks it up with everything else.
   */
  const markForResync = useCallback((id: string) => {
    setSyncedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  /* ------------------------ how a backgrounded run reports what it did */

  const reportedRef = useRef<SyncRun | null>(null);
  useEffect(() => {
    if (phase !== "background" || !run || reportedRef.current === run) return;
    reportedRef.current = run;

    // Same singular guard as the result card — see sync-result-modal.
    const unit =
      run.total === 1 ? run.unitPlural.replace(/s$/, "") : run.unitPlural;

    if (run.outcome === "success") {
      toast.success(
        run.total === 1
          ? `${unit} is in Tally`
          : `All ${run.total} ${unit.toLowerCase()} are in Tally`,
        {
          description: `Done in ${run.durationSeconds} seconds`,
        }
      );
    } else if (run.outcome === "partial") {
      toast.warning(
        `${run.failed} ${
          run.failed === 1 ? run.unitPlural.replace(/s$/, "") : run.unitPlural
        } didn’t reach Tally`,
        {
          description: `${run.pushed} of ${run.total} went through. Check the rest and sync again.`,
        }
      );
    } else {
      toast.error("Sync failed", {
        description: `None of the ${run.total} ${unit.toLowerCase()} went through.`,
      });
    }

    setPhase("idle");
    setDocs([]);
    setRun(null);
  }, [phase, run]);

  /* ---------------------------------------------------------- derived */

  const isRunning = phase === "running" || phase === "background";
  const settledCount = docs.filter(
    (doc) => doc.state === "pushed" || doc.state === "failed"
  ).length;

  /**
   * The rollup the multi-module progress screen draws.
   *
   * Derived from the doc list rather than tracked separately, so it cannot
   * drift from the counter above it. Because the queue is grouped by module,
   * at most one module is ever active.
   */
  const moduleProgress = useMemo<SyncModuleProgress[]>(
    () =>
      runModules.map((module) => {
        const mine = docs.filter((doc) => doc.route === module.key);
        const settled = mine.filter(
          (doc) => doc.state === "pushed" || doc.state === "failed"
        ).length;
        const active = mine.some((doc) => doc.state === "pushing");
        return {
          key: module.key,
          label: module.label,
          settled,
          total: mine.length,
          state:
            mine.length > 0 && settled === mine.length
              ? "done"
              : active
                ? "active"
                : "pending",
        };
      }),
    [docs, runModules]
  );

  /** Ids currently going across, for the amber cloud on the list row. */
  const inFlightIds = useMemo(
    () =>
      isRunning
        ? new Set(
            docs
              .filter(
                (doc) => doc.state === "queued" || doc.state === "pushing"
              )
              .map((doc) => doc.id)
          )
        : new Set<string>(),
    [docs, isRunning]
  );

  return {
    phase,
    connection,
    isRunning,
    hasSyncable,

    // confirm
    currentModule: current,
    includedModules: included,
    selectedKeys,
    selectedCount,
    toggleModule,
    openConfirm,
    closeConfirm,
    start,

    // progress — runModules, not currentModule: see the note on runModules.
    runModules,
    moduleProgress,
    docs,
    settledCount,
    continueInBackground,
    stop,

    // result
    run,
    dismissResult,
    reviewFailures,

    // list decoration + the post-failure filter
    inFlightIds,
    syncedIds,
    markForResync,
    failedSyncIds,
    reviewingFailures,
    clearFailureReview,
  };
};
