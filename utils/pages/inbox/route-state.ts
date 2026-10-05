import type { ParsedUrlQuery } from "querystring";
import { INBOX_TABS, type InboxTabKey } from "@/config/pages/inbox";

/**
 * Unified Inbox — URL state.
 *
 * Production syncs every list page's tab, filters and pagination to the URL via
 * `useRoutedListState` (hooks/useRoutedListState.ts), with QUERY_KEYS and a
 * parse/serialize pair per feature under utils/pages/<feature>/route-state.ts.
 * This file follows the transactions and dashboard pattern.
 *
 * DEV: wire these into useRoutedListState when this lands in the app —
 *      const { isRouteHydrated, syncRouteState } = useRoutedListState({
 *        router, managedKeys: Object.values(QUERY_KEYS), state,
 *        parse: parseInboxRouteState, serialize: serializeInboxRouteState,
 *        onRouteStateChange,
 *      });
 * The prototype holds this in useState instead, so the screen runs standalone.
 */

export const QUERY_KEYS = {
  tab: "tab",
  search: "q",
  source: "source",
  route: "route",
  aged: "aged",
  failed: "failed",
} as const;

export type InboxRouteState = {
  tab: InboxTabKey;
  search: string;
  source: string;
  route: string;
  aged: boolean;
  failed: boolean;
};

export const DEFAULT_INBOX_ROUTE_STATE: InboxRouteState = {
  tab: "all",
  search: "",
  source: "all",
  route: "all",
  aged: false,
  failed: false,
};

const isTabKey = (value: string): value is InboxTabKey =>
  INBOX_TABS.some((tab) => tab.key === value);

const readParam = (query: ParsedUrlQuery, key: string): string | undefined => {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
};

export const parseInboxRouteState = (
  query: ParsedUrlQuery
): InboxRouteState => {
  const tab = readParam(query, QUERY_KEYS.tab);

  return {
    tab: tab && isTabKey(tab) ? tab : DEFAULT_INBOX_ROUTE_STATE.tab,
    search: readParam(query, QUERY_KEYS.search) ?? "",
    source: readParam(query, QUERY_KEYS.source) ?? "all",
    route: readParam(query, QUERY_KEYS.route) ?? "all",
    aged: readParam(query, QUERY_KEYS.aged) === "1",
    failed: readParam(query, QUERY_KEYS.failed) === "1",
  };
};

/** Omits anything at its default so the URL stays short. */
export const serializeInboxRouteState = (
  state: InboxRouteState
): Record<string, string> => {
  const query: Record<string, string> = {};

  if (state.tab !== DEFAULT_INBOX_ROUTE_STATE.tab) {
    query[QUERY_KEYS.tab] = state.tab;
  }
  if (state.search.trim()) query[QUERY_KEYS.search] = state.search.trim();
  if (state.source !== "all") query[QUERY_KEYS.source] = state.source;
  if (state.route !== "all") query[QUERY_KEYS.route] = state.route;
  if (state.aged) query[QUERY_KEYS.aged] = "1";
  if (state.failed) query[QUERY_KEYS.failed] = "1";

  return query;
};
