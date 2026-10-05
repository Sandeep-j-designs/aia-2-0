import type { Route } from "@/components/inbox/v2/store";

/**
 * Unified Inbox — Tally sync contracts.
 *
 * Built from the "Sync Management - Phase 2" Figma page. That page designs the
 * flow on Accounts Payable ("47 Bills"); the Inbox is the same action over a
 * mixed set, so the single "Current Module" of the AP screen becomes the route
 * the workspace is scoped to, and the "Include with this sync" grid becomes the
 * remaining routes plus the two master types.
 *
 * Every field is camelCase — apiClient handles the snake_case conversion.
 */

/** Tally connection state, drawn as the dot on the Sync button. */
export type TallyConnection = "connected" | "offline";

/**
 * Where the sync flow is.
 *
 *   idle       nothing running
 *   confirm    "Sync to Tally" modal open, nothing pushed yet
 *   running    "Syncing to Tally" modal open, documents going across
 *   background user hit Continue in Background — same run, no modal
 *   result     run finished with the modal still open, showing the outcome
 */
export type SyncPhase =
  "idle" | "confirm" | "running" | "background" | "result";

/** The three terminal states the Figma designs result cards for. */
export type SyncOutcome = "success" | "partial" | "failure";

/** A syncable bucket: the three posting routes, plus the two master types. */
export type SyncModuleKey = Route | "ledgers" | "stock";

export type SyncModule = {
  key: SyncModuleKey;
  /** Tally's noun for the bucket — "Bills", "Invoices", "Journals". */
  label: string;
  /** Singular / plural of the unit, for "29 / 47 Bills". */
  unit: string;
  unitPlural: string;
  count: number;
};

/** Per-document state while a run is in flight. Drives the progress list. */
export type SyncDocState = "queued" | "pushing" | "pushed" | "failed";

export type SyncDoc = {
  /** The Item id, so the list row can be matched back. */
  id: string;
  /** What the progress list shows — the voucher no, falling back to the file. */
  label: string;
  route: Route;
  state: SyncDocState;
};

/**
 * One module's share of a run, for the multi-module progress rollup.
 *
 * A run sends its modules in order rather than interleaved, so at any moment
 * one module is active, the ones before it are done and the ones after are
 * waiting — which is what the three icon states say.
 */
export type SyncModuleProgress = {
  key: SyncModuleKey;
  label: string;
  settled: number;
  total: number;
  state: "done" | "active" | "pending";
};

/** What the run pushed, and how it ended. */
export type SyncRun = {
  outcome: SyncOutcome;
  pushed: number;
  failed: number;
  total: number;
  /** Seconds, as shown in "Done in 12 Seconds". */
  durationSeconds: number;
  /** The module whose unit names the result copy — "All 47 Bills Pushed". */
  unitPlural: string;
};
