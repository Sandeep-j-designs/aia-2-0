import React, { useMemo } from "react";
import { AlertTriangle, Clock, Search, Upload } from "@/components/icons";
import { withSession } from "@/hooks/withSession";
import SidebarLayout from "@/components/sidebar-layout";
import PageTopBar from "@/components/common/page-top-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INBOX_TABS,
  ROUTE_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
} from "@/config/pages/inbox";
import { useInboxList } from "@/hooks/pages/inbox/use-inbox-list";
import { cn } from "@/lib/utils";
import BulkBar from "./common/bulk-bar";
import InboxTable from "./table";

/**
 * Unified Inbox — the list screen.
 *
 * Every document that arrives by email, WhatsApp, upload or shared drive lands
 * here, gets classified to one of four posting routes (AP / AR / Banking / JV),
 * and waits for a human to approve it. This is the approval step the product is
 * built around.
 *
 * Composition only — filtering, selection and the same-type bulk rule live in
 * hooks/pages/inbox/use-inbox-list.ts. Ported from js/inbox-list.jsx.
 */
const InboxPage = () => {
  const {
    routeState,
    setTab,
    setFilter,
    tabCounts,
    visibleItems,
    now,
    selectedIds,
    allSelected,
    someSelected,
    isSameType,
    selectedRoute,
    toggleAll,
    toggleOne,
    clearSelection,
    openDetail,
    rowActions,
  } = useInboxList();

  const columnsMeta = useMemo(
    () => ({
      now,
      selectedIds,
      allSelected,
      someSelected,
      onToggleAll: toggleAll,
      onToggleOne: toggleOne,
      rowActions,
    }),
    [
      now,
      selectedIds,
      allSelected,
      someSelected,
      toggleAll,
      toggleOne,
      rowActions,
    ]
  );


  return (
    <SidebarLayout contentClassName="p-0" crumbs={["Inbox"]}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="px-6 pt-5">
          <PageTopBar
            title="Inbox"
            primaryText="Upload"
            primaryIcon={Upload}
            onPrimaryButtonClick={() => undefined}
            showExportButton={false}
          />
        </div>

        {/* Tabs */}
        <div className="mt-4 border-b border-neutral-gray px-6">
          <div className="flex items-center gap-1">
            {INBOX_TABS.map((tab) => {
              const isActive = routeState.tab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-3 py-3 text-sm",
                    isActive
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-secondary-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[12px] tabular-nums",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "bg-section text-secondary-foreground"
                    )}
                  >
                    {tabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 px-6 pt-3">
          <div className="relative max-w-[360px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-foreground" />
            <Input
              value={routeState.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Search file, vendor, sender, ID…"
              className="h-8 pl-8 text-sm"
            />
          </div>

          <Select
            value={routeState.source}
            onValueChange={(value) => setFilter("source", value)}
          >
            <SelectTrigger className="h-8 w-[170px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  Source: {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={routeState.route}
            onValueChange={(value) => setFilter("route", value)}
          >
            <SelectTrigger className="h-8 w-[190px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUTE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  Route: {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant={routeState.aged ? "secondary" : "outline"}
            onClick={() => setFilter("aged", !routeState.aged)}
            className="h-8"
          >
            <Clock className="h-3.5 w-3.5" />
            Aged 7d+
          </Button>

          <Button
            size="sm"
            variant={routeState.failed ? "secondary" : "outline"}
            onClick={() => setFilter("failed", !routeState.failed)}
            className="h-8"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Failed
          </Button>

          <span className="ml-auto text-sm text-secondary-foreground">
            {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Table */}
        <div className="relative min-h-0 flex-1 px-6 pb-5 pt-3">
          <InboxTable
            items={visibleItems}
            meta={columnsMeta}
            onRowClick={openDetail}
          />

          {selectedIds.size > 0 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
              <BulkBar
                count={selectedIds.size}
                isSameType={isSameType}
                route={selectedRoute ?? null}
                onApproveAll={() => undefined}
                onReassign={() => undefined}
                onDelete={() => undefined}
                onClear={clearSelection}
              />
            </div>
          ) : null}
        </div>
      </div>

    </SidebarLayout>
  );
};

export default withSession(InboxPage);
