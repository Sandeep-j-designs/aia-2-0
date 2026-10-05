import { TAB_STATUSES, type InboxTabKey } from "@/config/pages/inbox";
import type { BankingTxn, InboxBanking, InboxItem } from "@/types/pages/inbox";

/** A statement line with its running balance. */
export type StatementRow = BankingTxn & { balance: number };

/**
 * Unified Inbox — page helpers.
 *
 * Ported from the formatters and `tabMatches` in the prototype's
 * js/inbox-list.jsx and js/app.jsx.
 */

/** ₹ with Indian digit grouping. Renders an em dash for null. */
export const formatInr = (value: number | null): string => {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/** "12 May 2026" */
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

/**
 * "2h ago". Relative to a caller-supplied `now`, never Date.now() at module
 * scope — the server and client would disagree and React would warn about a
 * hydration mismatch. Pass a value captured in an effect.
 */
export const formatAgo = (iso: string, now: number): string => {
  const diffMs = now - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
};

/**
 * Expands the statement's preview slice into a full-looking ledger with a
 * running balance. Ported from the `allTxns` useMemo in js/native-banking.jsx.
 *
 * DEV: delete this. The API returns the real transactions — this only exists
 *      because the mock carries five sample rows and the surface needs to look
 *      like a statement. `banking.txnCount` is the true count.
 */
export const expandStatementRows = (
  banking: InboxBanking,
  count = 24
): StatementRow[] => {
  // Naively cycling all five sample rows repeated the ₹4.12L salary debit five
  // times, which drove the running balance negative mid-month and never landed
  // on the stated closing figure. Two corrections: the large transactions
  // appear once each, and the final row is the balancing entry, so the last
  // row's balance equals `banking.closing` exactly.
  const LARGE = 100_000;
  const size = (txn: BankingTxn) => Math.max(txn.dr ?? 0, txn.cr ?? 0);

  const small = banking.sample.filter((txn) => size(txn) < LARGE);
  const large = banking.sample.filter((txn) => size(txn) >= LARGE);
  const spacing = Math.floor((count - 1) / (large.length + 1));

  let balance = banking.opening;

  const rows: StatementRow[] = Array.from({ length: count - 1 }, (_, i) => {
    const largeSlot = large.findIndex((_, li) => i === (li + 1) * spacing);
    const txn =
      largeSlot >= 0 ? large[largeSlot] : small[i % Math.max(small.length, 1)];

    balance += (txn.cr ?? 0) - (txn.dr ?? 0);

    return {
      ...txn,
      date: `${String((i % 28) + 1).padStart(2, "0")}-Apr-26`,
      narration: txn.narration + (i % 5 === 0 ? " — Apr batch" : ""),
      balance,
    };
  });

  const delta = banking.closing - balance;
  rows.push({
    date: `${String(count).padStart(2, "0")}-Apr-26`,
    narration:
      delta >= 0 ? "NEFT Cr · Sundry receipts" : "Dr · Sundry payments",
    dr: delta < 0 ? Math.abs(delta) : null,
    cr: delta >= 0 ? delta : null,
    balance: banking.closing,
  });

  return rows;
};

export const tabMatches = (tab: InboxTabKey, item: InboxItem): boolean => {
  if (tab === "all") return item.status !== "deleted";
  return TAB_STATUSES[tab].includes(item.status);
};

/** Fields the list's search box looks at. */
export const itemMatchesSearch = (item: InboxItem, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.file.name,
    item.vendor ?? "",
    item.customer ?? "",
    item.id,
    item.source.sender,
  ].some((field) => field.toLowerCase().includes(q));
};
