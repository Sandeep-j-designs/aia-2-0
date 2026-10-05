import type { Route } from "@/components/inbox/v2/store";
import type { SyncModuleKey, SyncOutcome } from "@/types/pages/inbox/sync";

/**
 * Unified Inbox — Tally sync config.
 *
 * Static shape and timings only; counts are computed from the workspace's own
 * items in utils/pages/inbox/sync.ts. Ported from the "Sync Management -
 * Phase 2" Figma page.
 */

type SyncModuleMeta = {
  /** The label Tally uses, not the Inbox's route code. */
  label: string;
  unit: string;
  unitPlural: string;
};

/**
 * Route → the bucket it lands in on the Tally side.
 *
 * The Inbox speaks in routes (AP / AR / JV); the sync modal speaks in what
 * Tally receives, which is what the accountant recognises.
 */
export const SYNC_ROUTE_MODULES: Record<Route, SyncModuleMeta> = {
  AP: { label: "Bills", unit: "Bill", unitPlural: "Bills" },
  AR: { label: "Invoices", unit: "Invoice", unitPlural: "Invoices" },
  JV: { label: "Journals", unit: "Journal", unitPlural: "Journals" },
};

/**
 * Masters ride along with a sync rather than being pushed on their own, which
 * is why they always sit in the "Include with this sync" grid and never in
 * "Current Module".
 *
 * DEV: counts come from the masters diff endpoint, not the Inbox. They are 0
 * here because the prototype has no masters data — and the zero state is the
 * one the Figma draws, so it is the honest default.
 */
export const SYNC_MASTER_MODULES: {
  key: Extract<SyncModuleKey, "ledgers" | "stock">;
  label: string;
  unit: string;
  unitPlural: string;
  count: number;
}[] = [
  {
    key: "ledgers",
    label: "Ledgers",
    unit: "Ledger",
    unitPlural: "Ledgers",
    count: 0,
  },
  {
    key: "stock",
    label: "Stock Items",
    unit: "Stock Item",
    unitPlural: "Stock Items",
    count: 0,
  },
];

export const SYNC_MASTERS_NOTE =
  "Ledgers and stock items that are not in Tally yet will be created for you.";

/**
 * PROTOTYPE ONLY — successive syncs walk this cycle, so a demo reaches all
 * three result cards without a rigged control sitting on the screen. First sync
 * succeeds, second comes back partial, third fails, then it repeats.
 *
 * DEV: delete this. The outcome is whatever the sync job reports.
 */
export const SYNC_OUTCOME_CYCLE: SyncOutcome[] = [
  "success",
  "partial",
  "failure",
];

/** How long each document appears to take. Tuned so a run reads, not crawls. */
export const SYNC_TICK_MS = 420;

/**
 * Floor on how long a whole run takes, spread across however many documents
 * it has.
 *
 * The Inbox syncs what has been approved, which early in a session is two or
 * three documents — at one tick each the progress modal would appear and be
 * gone before it could be read, and Continue in Background would be
 * unreachable. Stretching a short run is a prototype concession, not a claim
 * about how fast Tally is.
 *
 * DEV: delete this. Real progress arrives when it arrives.
 */
export const SYNC_MIN_RUN_MS = 5000;

/**
 * What the result card claims a run took. The Figma says "Done in 12 Seconds"
 * regardless of volume, so it is copy, not a measurement.
 *
 * DEV: report the job's real elapsed time.
 */
export const SYNC_DURATION_SECONDS = 12;

/**
 * Share of documents that fail on a `partial` run — 20 of 47 in the Figma.
 *
 * DEV: delete this. Failures are whatever Tally rejected.
 */
export const SYNC_PARTIAL_FAILURE_RATE = 20 / 47;
