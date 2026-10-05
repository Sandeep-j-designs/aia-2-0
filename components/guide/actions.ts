/**
 * The one channel between a guided journey and the screen it is narrating.
 *
 * The Inbox walkthrough demonstrates the flow rather than waiting for the
 * user to supply a document: it sends sample bills in, and opens the one it
 * sent. Those are things only the screen can do, and the guide is mounted
 * above the routes — so it asks, on a window event, instead of reaching into
 * the workspace's state.
 *
 * DEV: production's guide service drives real user actions and has no need for
 * this. On transplant, delete this file and the listener in the workspace; the
 * steps that carry an `action` become ordinary "now do this" steps.
 */
export const GUIDE_ACTION_EVENT = "aia-guide-action";

export type GuideAction =
  /** Open the upload panel with nothing in it, at the drop zone. */
  | "open-upload"
  /** Send three sample bills through the real upload and extraction path. */
  | "demo-upload"
  /** Open the first document waiting for review. */
  | "open-record"
  /**
   * Put the Inbox back to the empty state the tour started from.
   *
   * Sent when the journey ends, however it ends. What the walkthrough
   * demonstrates begins on an empty Inbox, so leaving its own three documents
   * behind would mean the tour can only be watched once.
   */
  | "reset-demo";

export const runGuideAction = (action: GuideAction) =>
  window.dispatchEvent(
    new CustomEvent(GUIDE_ACTION_EVENT, { detail: { action } })
  );
