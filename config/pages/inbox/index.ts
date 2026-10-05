import type {
  ChannelMeta,
  InboxChannel,
  InboxRoute,
  InboxStatus,
  RouteMeta,
} from "@/types/pages/inbox";

/**
 * Unified Inbox — static page config.
 *
 * Ported from the CHANNELS and ROUTES maps at the tail of the prototype's
 * js/data.js, plus the status vocabulary that was previously spread across
 * inbox-list.jsx as literal class names.
 *
 * Colour is expressed as production Tailwind token classes, never hex. The
 * prototype's css/tokens.css names map as follows:
 *   --bg-primary   → bg-section          --text-muted  → text-secondary-foreground
 *   --bg-secondary → bg-accent           --brand-soft  → border-border
 *   --brand-deep   → bg-primary          --stroke      → border-neutral-gray
 *   --chrome       → bg-surface          --hairline    → border-panel-border
 */

export const ROUTES: Record<InboxRoute, RouteMeta> = {
  AP: { short: "AP", label: "Accounts Payable", verb: "Bill" },
  AR: { short: "AR", label: "Accounts Receivable", verb: "Invoice batch" },
  Banking: { short: "Banking", label: "Banking", verb: "Statement" },
  JV: { short: "JV", label: "Journal Voucher", verb: "Journal" },
};

export const CHANNELS: Record<InboxChannel, ChannelMeta> = {
  email: { label: "Email" },
  whatsapp: { label: "WhatsApp" },
  upload: { label: "Upload" },
  drive: { label: "Drive" },
};

type StatusMeta = {
  label: string;
  /** Token classes only. A status is a signal, so it earns colour. */
  className: string;
  /** Terminal states cannot be actioned from the list. */
  isTerminal: boolean;
};

export const STATUS_META: Record<InboxStatus, StatusMeta> = {
  extracting: {
    label: "Extracting…",
    className: "bg-secondary text-secondary-foreground",
    isTerminal: false,
  },
  retrying: {
    label: "Retrying",
    className: "bg-warning text-warning-foreground",
    isTerminal: false,
  },
  failed: {
    label: "Failed",
    className: "bg-destructive text-destructive-foreground",
    isTerminal: true,
  },
  "needs-review": {
    label: "Needs Review",
    className: "bg-accent text-accent-foreground",
    isTerminal: false,
  },
  "duplicate-soft": {
    label: "Possible dup.",
    className: "bg-warning text-warning-foreground",
    isTerminal: false,
  },
  "duplicate-hard": {
    label: "Duplicate",
    className: "bg-destructive text-destructive-foreground",
    isTerminal: true,
  },
  "duplicate-cross-type": {
    label: "Cross-type duplicate",
    className: "bg-warning text-warning-foreground",
    isTerminal: false,
  },
  done: {
    label: "Done",
    className: "bg-success-green text-success-green-foreground",
    isTerminal: true,
  },
  deleted: {
    label: "Deleted",
    className: "bg-secondary text-secondary-foreground",
    isTerminal: true,
  },
};

export type InboxTabKey =
  "all" | "needs" | "done" | "failed" | "duplicate" | "deleted";

/**
 * Which statuses each tab collects.
 *
 * `all` is special-cased — it is everything except deleted — so it carries no
 * status list. The original also matched "low-confidence" and "unclassified"
 * under `needs`; neither status is ever produced, so those branches are dropped.
 */
export const INBOX_TABS: { key: InboxTabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs", label: "Needs Review" },
  { key: "done", label: "Done" },
  { key: "failed", label: "Failed" },
  { key: "duplicate", label: "Duplicate" },
  { key: "deleted", label: "Deleted" },
];

export const TAB_STATUSES: Record<
  Exclude<InboxTabKey, "all">,
  InboxStatus[]
> = {
  needs: ["needs-review", "duplicate-soft", "retrying"],
  done: ["done"],
  failed: ["failed"],
  duplicate: ["duplicate-hard", "duplicate-soft", "duplicate-cross-type"],
  deleted: ["deleted"],
};

export const SOURCE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "upload", label: "Upload" },
  { value: "drive", label: "Drive" },
];

export const ROUTE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All routes" },
  { value: "AP", label: "Accounts Payable" },
  { value: "AR", label: "Accounts Receivable" },
  { value: "Banking", label: "Banking" },
  { value: "JV", label: "Journal Voucher" },
];

/**
 * Below this, the classifier's guess is not shown as a recommendation.
 * The prototype exposed this as a tweakable slider (20–90%); production should
 * read it from app config.
 *
 * DEV: source from /api/app-config rather than hardcoding.
 */
export const AI_CONFIDENCE_THRESHOLD = 0.6;

/** Items older than this are marked aged in the list. */
export const AGED_AFTER_DAYS = 7;
