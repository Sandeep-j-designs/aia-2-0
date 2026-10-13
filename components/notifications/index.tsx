import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Check,
  CheckCheck,
  CircleCheck,
  Inbox,
  Settings,
} from "@/components/icons";
import FilterChip from "@/components/common/filter-chip";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import PageTopBar from "@/components/common/page-top-bar";
import {
  Pager,
  SearchBox,
  UNDERLINE_TAB,
} from "@/components/inbox/v2/banking/table-parts";
import EmptyState from "@/components/inbox/v2/empty-state";
import { CountPill } from "@/components/inbox/v2/ui";
import NotificationRow from "@/components/notifications/common/notification-row";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { MODULE_LABEL } from "@/config/pages/notifications/kinds";
import {
  notificationActions,
  useNotifications,
} from "@/hooks/pages/notifications/use-notifications";
import { cn } from "@/lib/utils";
import type {
  Notification,
  NotificationModule,
} from "@/types/pages/notifications";
import { groupByDay } from "@/utils/pages/notifications";

type Props = {
  companyId: string;
  companyIds: string[];
};

type Tab = "action" | "updates" | "all";

const TABS: { id: Tab; label: string }[] = [
  { id: "action", label: "Needs action" },
  { id: "updates", label: "Updates" },
  { id: "all", label: "All" },
];

/**
 * Notifications, the full history: everything the bell holds plus what has
 * been resolved, by day, with search, a module filter and unread only.
 *
 * Needs action lists open work only. All keeps resolved actions in their
 * place with "Done", so the page doubles as a record of what went wrong and
 * when it was put right.
 */
const Notifications = ({ companyId, companyIds }: Props) => {
  const router = useRouter();
  const { all, needsAction, updates } = useNotifications(companyId, companyIds);
  const [tab, setTab] = useState<Tab>(needsAction.length ? "action" : "all");
  const [search, setSearch] = useState("");
  const [modules, setModules] = useState<NotificationModule[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const scroller = useRef<HTMLDivElement>(null);

  const base =
    tab === "action" ? needsAction : tab === "updates" ? updates : all;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter(
      (n) =>
        (!modules.length || modules.includes(n.module)) &&
        (!unreadOnly || !n.readAt) &&
        (!q || `${n.title} ${n.body ?? ""}`.toLowerCase().includes(q))
    );
  }, [base, search, modules, unreadOnly]);
  const shown = rows.slice(page * pageSize, (page + 1) * pageSize);
  const days = groupByDay(shown);

  /** Modules that have something on this tab, with how many. */
  const moduleCounts = useMemo(() => {
    const counts = new Map<NotificationModule, number>();
    base.forEach((n) => counts.set(n.module, (counts.get(n.module) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [base]);

  const unreadHere = rows.filter((n) => !n.readAt);
  const filtersOn = !!search.trim() || modules.length > 0 || unreadOnly;
  // Needs action counts open work, Updates what is unread, All everything.
  const tabCount = (id: Tab) =>
    id === "action"
      ? needsAction.length
      : id === "updates"
        ? updates.filter((n) => !n.readAt).length
        : all.length;

  const openOne = (n: Notification) => {
    notificationActions.markRead(n.id);
    void router.push(n.target.href);
  };
  const toggleRead = (n: Notification) =>
    n.readAt
      ? notificationActions.markUnread(n.id)
      : notificationActions.markRead(n.id);
  const clearFilters = () => {
    setSearch("");
    setModules([]);
    setUnreadOnly(false);
    setPage(0);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={scroller}
          className="table-scroller scrollbar-hide flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none"
        >
          <div className="shrink-0 bg-pi-page">
            <div className="px-[var(--inset-page)] pt-6">
              <PageTopBar
                title="Notifications"
                className="flex-wrap gap-x-4 gap-y-2"
                leading={
                  <div
                    role="tablist"
                    aria-label="Notification views"
                    className="flex shrink-0 gap-6 overflow-x-auto overflow-y-hidden border-b border-pi-line"
                  >
                    {TABS.map((entry) => (
                      <button
                        key={entry.id}
                        role="tab"
                        type="button"
                        aria-selected={tab === entry.id}
                        data-state={tab === entry.id ? "active" : "inactive"}
                        onClick={() => {
                          setTab(entry.id);
                          setModules([]);
                          setPage(0);
                        }}
                        className={cn(
                          UNDERLINE_TAB,
                          "inline-flex flex-none items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                        )}
                      >
                        {entry.label}
                        <CountPill>{tabCount(entry.id)}</CountPill>
                      </button>
                    ))}
                  </div>
                }
                leadingActions={
                  <Button
                    variant="outline"
                    disabled={!unreadHere.length}
                    onClick={() =>
                      notificationActions.markManyRead(
                        unreadHere.map((n) => n.id)
                      )
                    }
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark all as read
                  </Button>
                }
                secondaryButtonText="Settings"
                secondaryIcon={Settings}
                onSecondaryButtonClick={notificationActions.openSettings}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 px-[var(--inset-page)] py-4">
              <SearchBox
                label="Search notifications"
                placeholder="Search…"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(0);
                }}
              />
              <span aria-hidden className="h-6 w-px flex-none bg-pi-line" />
              <Popover>
                <PopoverTrigger asChild>
                  <FilterChip
                    label="Module"
                    value={modules.map((m) => MODULE_LABEL[m])}
                    selectionType="multiple"
                    onClearButtonClick={() => {
                      setModules([]);
                      setPage(0);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-60 rounded-md border-pi-line p-2 shadow-pi-2"
                >
                  {moduleCounts.map(([id, count]) => {
                    const on = modules.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setModules((m) =>
                            on ? m.filter((x) => x !== id) : [...m, id]
                          );
                          setPage(0);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          on
                            ? "bg-pi-brand-tint font-medium text-pi-brand"
                            : "text-pi-ink hover:bg-pi-fill"
                        )}
                      >
                        <span className="flex-1 truncate">
                          {MODULE_LABEL[id]}
                        </span>
                        {on ? (
                          <Check className="size-4" aria-hidden />
                        ) : (
                          <span className="text-[12px] tabular-nums text-pi-faint">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {!moduleCounts.length && (
                    <p className="px-2 py-2 text-[13px] text-pi-body">
                      Nothing to filter yet.
                    </p>
                  )}
                </PopoverContent>
              </Popover>
              <label className="ml-2 flex cursor-pointer items-center gap-2 text-[13px] font-medium text-pi-body">
                <Switch
                  checked={unreadOnly}
                  onCheckedChange={(v) => {
                    setUnreadOnly(v);
                    setPage(0);
                  }}
                />
                Unread only
              </label>
            </div>
          </div>

          {days.length ? (
            <div className="border-t border-pi-line bg-background">
              {days.map((day) => (
                <section key={day.label} aria-label={day.label}>
                  <h2 className="sticky top-0 z-[2] border-b border-pi-line bg-pi-head-bg px-6 py-2 text-[12px] font-medium text-pi-body">
                    {day.label}
                  </h2>
                  <ul className="divide-y divide-pi-line border-b border-pi-line">
                    {day.items.map((n) => (
                      <li key={n.id} className="[&>div]:max-w-[960px]">
                        <NotificationRow
                          notification={n}
                          roomy
                          onOpen={openOne}
                          onToggleRead={toggleRead}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex-1 border-t border-pi-line bg-background">
              {filtersOn ? (
                <EmptyState
                  title="No notifications match"
                  body="Nothing on this tab fits the search and filters."
                  filters={[
                    ...(search.trim() ? [{ label: `“${search.trim()}”` }] : []),
                    ...modules.map((m) => ({ label: MODULE_LABEL[m] })),
                    ...(unreadOnly ? [{ label: "Unread only" }] : []),
                  ]}
                  onClear={clearFilters}
                />
              ) : tab === "action" ? (
                <EmptyState
                  icon={CircleCheck}
                  title="Nothing needs you"
                  body="Unreadable files, duplicates, failed syncs and anything Tally turns away land here, and leave once they are dealt with."
                />
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No updates yet"
                  body="Documents arriving, statements read and syncs finishing show up here."
                />
              )}
            </div>
          )}
        </div>
        <OverlayScrollbars scroller={scroller} />
      </div>
      {rows.length > pageSize ? (
        <Pager
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
};

export default Notifications;
