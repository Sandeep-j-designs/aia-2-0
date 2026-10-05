import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { MOCK_INBOX_ITEMS } from "@/config/pages/inbox/mock-inbox";
import { INBOX_TABS, type InboxTabKey } from "@/config/pages/inbox";
import {
  DEFAULT_INBOX_ROUTE_STATE,
  parseInboxRouteState,
  serializeInboxRouteState,
  type InboxRouteState,
} from "@/utils/pages/inbox/route-state";
import { itemMatchesSearch, tabMatches } from "@/utils/pages/inbox";
import type { InboxItem } from "@/types/pages/inbox";

/**
 * Unified Inbox — list orchestration.
 *
 * All of the list's logic lives here; components/inbox/ only composes. Ported
 * from the reducer in the prototype's js/app.jsx plus the useMemo filtering in
 * js/inbox-list.jsx.
 *
 * There is ONE seam between this prototype and the real API, marked DEV below.
 */
export const useInboxList = () => {
  const router = useRouter();

  // DEV: replace with GET /api/inbox → InboxItem[].
  //   Production's dominant pattern is a direct fetch in the hook:
  //     const [items, setItems] = useState<InboxItem[]>([]);
  //     useEffect(() => {
  //       fetch("/api/inbox")
  //         .then((res) => res.json())
  //         .then(setItems);
  //     }, []);
  //   Expect server-side filtering by tab/source/route once the set is large —
  //   this prototype filters client-side because it holds everything in memory.
  const [items] = useState<InboxItem[]>(MOCK_INBOX_ITEMS);

  const [routeState, setRouteState] = useState<InboxRouteState>(
    DEFAULT_INBOX_ROUTE_STATE
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // "2h ago" needs a clock. Reading it in an effect rather than during render
  // keeps the server and client markup identical.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Hydrate from the URL once the router is ready.
  useEffect(() => {
    if (!router.isReady) return;
    setRouteState(parseInboxRouteState(router.query));
  }, [router.isReady]);

  const syncRouteState = useCallback(
    (next: InboxRouteState) => {
      setRouteState(next);
      void router.replace(
        { pathname: router.pathname, query: serializeInboxRouteState(next) },
        undefined,
        { shallow: true, scroll: false }
      );
    },
    [router]
  );

  const setTab = useCallback(
    (tab: InboxTabKey) => {
      setSelectedIds(new Set());
      syncRouteState({ ...routeState, tab });
    },
    [routeState, syncRouteState]
  );

  const setFilter = useCallback(
    <K extends keyof InboxRouteState>(key: K, value: InboxRouteState[K]) => {
      syncRouteState({ ...routeState, [key]: value });
    },
    [routeState, syncRouteState]
  );

  const tabCounts = useMemo(() => {
    const counts = {} as Record<InboxTabKey, number>;
    INBOX_TABS.forEach(({ key }) => {
      counts[key] = items.filter((item) => tabMatches(key, item)).length;
    });
    return counts;
  }, [items]);

  const visibleItems = useMemo(() => {
    const { tab, source, route, aged, failed, search } = routeState;
    return items
      .filter((item) => tabMatches(tab, item))
      .filter((item) => source === "all" || item.source.channel === source)
      .filter((item) => route === "all" || item.route === route)
      .filter((item) => !aged || item.aged)
      .filter((item) => !failed || item.status === "failed")
      .filter((item) => itemMatchesSearch(item, search));
  }, [items, routeState]);

  /* ----------------------------- selection ----------------------------- */

  // Items still extracting cannot be selected or opened.
  const selectableItems = useMemo(
    () => visibleItems.filter((item) => item.status !== "extracting"),
    [visibleItems]
  );

  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedIds.has(item.id));
  const someSelected = selectableItems.some((item) => selectedIds.has(item.id));

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const isAllSelected =
        selectableItems.length > 0 &&
        selectableItems.every((item) => next.has(item.id));
      selectableItems.forEach((item) =>
        isAllSelected ? next.delete(item.id) : next.add(item.id)
      );
      return next;
    });
  }, [selectableItems]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  /**
   * Bulk approve is same-type only — a mixed AP + AR + Banking selection has no
   * single posting action, so the bar offers Reassign instead.
   */
  const selectedRoutes = useMemo(
    () => new Set(selectedItems.map((item) => item.route)),
    [selectedItems]
  );
  const isSameType = selectedRoutes.size === 1;

  const openDetail = useCallback(
    (item: InboxItem) => {
      if (item.status === "extracting") return;
      void router.push(`/inbox/${item.id}`);
    },
    [router]
  );

  /**
   * Row actions. The original fired window.__toast for each of these; they are
   * sonner toasts here, which is what production mounts globally in _app.tsx.
   *
   * DEV: each of these is a mutation —
   *   onDelete            → DELETE /api/inbox/:id
   *   onRetry             → POST   /api/inbox/:id/retry
   *   onCancelExtraction  → POST   /api/inbox/:id/cancel
   *   onConvert           → POST   /api/inbox/:id/convert  { target }
   *   onReverse           → POST   /api/inbox/:id/reverse
   * All five should invalidate the inbox list on success.
   */
  const rowActions = useMemo(
    () => ({
      onOpen: openDetail,
      onDelete: (item: InboxItem) => {
        toast.success(`${item.id} moved to Deleted.`);
      },
      onRetry: (item: InboxItem) => {
        toast(`Retrying extraction for ${item.id}…`);
      },
      onCancelExtraction: (item: InboxItem) => {
        toast(`Extraction cancelled for ${item.id}.`);
      },
      onConvert: (item: InboxItem, target: "JV") => {
        void router.push(`/inbox/${item.id}?convert=${target}`);
      },
      onOpenRecord: (item: InboxItem) => {
        const ref =
          item.lineage?.convertedTo.id ??
          item.destination ??
          "the posted record";
        toast(`Opens ${ref} in its module.`);
      },
      onReverse: (item: InboxItem) => {
        void router.push(`/inbox/${item.id}?reverse=1`);
      },
    }),
    [openDetail, router]
  );

  return {
    routeState,
    setTab,
    setFilter,
    tabCounts,
    visibleItems,
    now,

    selectedIds,
    selectedItems,
    allSelected,
    someSelected,
    isSameType,
    selectedRoute: isSameType ? [...selectedRoutes][0] : null,
    toggleAll,
    toggleOne,
    clearSelection,

    openDetail,
    rowActions,
  };
};
