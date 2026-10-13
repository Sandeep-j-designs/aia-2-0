import React from "react";
import { Search, Slash } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import { CountPill } from "@/components/inbox/v2/ui";

/**
 * Precision Indigo master-register pieces, shared by Chart of Accounts and
 * Inventory so both read as the reference app's master registers
 * (ai-accountant-redesign-main: ChartOfAccountsScreen, InventoryScreen,
 * register/kit.tsx, workbench.css .summary-card / .master-row).
 *
 * Presentation only: every piece takes its values and handlers from the
 * screen that owns the state.
 */

/**
 * The register's meta line and its actions. Eyebrow and title are not drawn:
 * the top bar's trail names the page (8 Oct 2026), so the title is for
 * assistive tech only.
 */
export const MasterHeading = ({
  eyebrow: _eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow: string;
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 px-[var(--inset-page)] pb-5 pt-6">
    <div className="min-w-0">
      <h1 className="sr-only">{title}</h1>
      {meta ? (
        <p className="truncate text-[13px] text-pi-body">{meta}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    ) : null}
  </div>
);

/** The reference's .summary-grid: a wider first (hero) card, then two. */
export const SummaryGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="enter-up grid shrink-0 grid-cols-1 gap-4 px-[var(--inset-page)] pb-6 motion-reduce:animate-none md:grid-cols-[1.12fr_1fr_1fr]">
    {children}
  </div>
);

/**
 * The reference's .summary-card. `hero` is the navy .summary-review card.
 * Read-only here: the cards report what the register already knows and do
 * not filter it, so they are not buttons.
 */
export const SummaryCard = ({
  label,
  icon,
  value,
  unit,
  meta,
  hero,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  meta: React.ReactNode;
  hero?: boolean;
  danger?: boolean;
}) => (
  <div
    className={cn(
      "flex min-h-[112px] min-w-0 flex-col rounded-lg border px-5 py-5",
      hero
        ? "border-surface-stroke bg-gradient-to-br from-sidebar to-surface-muted"
        : "border-pi-line bg-background shadow-contact"
    )}
  >
    <span
      className={cn(
        "flex items-center gap-2 text-[13px] font-medium [&_svg]:size-[17px] [&_svg]:flex-none",
        hero ? "text-sidebar-foreground" : "text-pi-body"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </span>
    <span className="mt-3 flex min-w-0 items-baseline gap-2">
      <span
        className={cn(
          "truncate text-[28px] font-medium leading-tight tracking-[-0.02em] tabular-nums",
          hero
            ? "text-sidebar-primary-foreground"
            : danger
              ? "text-pi-danger"
              : "text-pi-ink"
        )}
      >
        {value}
      </span>
      {unit ? (
        <span
          className={cn(
            "flex-none text-[14px]",
            hero ? "text-sidebar-foreground" : "text-pi-body"
          )}
        >
          {unit}
        </span>
      ) : null}
    </span>
    <span
      className={cn(
        "mt-1 truncate text-[12px]",
        hero ? "text-sidebar-foreground" : "text-pi-faint"
      )}
    >
      {meta}
    </span>
  </div>
);

/** One underline tab with a count chip, as the Inbox draws its tabs. */
export const MasterTabs = ({
  value,
  tabs,
}: {
  value: string;
  tabs: { id: string; label: string; count?: number }[];
}) => (
  <Tabs value={value} className="min-w-0 shrink-0 overflow-x-auto">
    <TabsList className="h-auto gap-6 rounded-none bg-transparent p-0">
      {tabs.map((t) => (
        <TabsTrigger
          key={t.id}
          value={t.id}
          className="group h-[38px] gap-2 rounded-none border-b-2 border-transparent px-0 text-[14px] font-medium text-pi-body shadow-none hover:text-pi-ink data-[state=active]:border-pi-brand data-[state=active]:bg-transparent data-[state=active]:text-pi-ink data-[state=active]:shadow-none"
        >
          {t.label}
          {t.count !== undefined ? <CountPill>{t.count}</CountPill> : null}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

/** The reference's .list-search: a leading glass and the "/" hint. */
export const MasterSearch = ({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) => (
  <div className={cn("relative w-full sm:w-[280px]", className)}>
    <Search
      aria-hidden
      className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-pi-faint"
    />
    <Input
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 pl-9 pr-9 text-[13px] text-pi-ink"
    />
    {!value && (
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-xs border border-pi-line bg-pi-head-bg"
      >
        <Slash className="size-3 text-pi-faint" />
      </span>
    )}
  </div>
);

/** Tabs on the left, search and filters on the right. */
export const MasterToolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 px-[var(--inset-page)] pb-4">
    {children}
  </div>
);

/**
 * The scroller a master screen renders in: its root column, both axes. The
 * heading, summary and toolbar scroll away as a page, the table header sticks
 * at the top of the content area, and a widened table scrolls sideways here.
 * Not positioned, so nothing absolute inside it hangs off the scroller.
 * Native bars hidden: render it inside SCROLLER_BOX with OverlayScrollbars as
 * its next sibling, so the bars float over the rows instead of reserving a
 * strip under the last one.
 */
export const PAGE_SCROLLER =
  "table-scroller scrollbar-hide flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none";

/**
 * The scroller's own box: positioned, so the overlay bars (and anything
 * floating over the table) sit over it and end above the pager, which goes
 * after this box rather than inside the scroller.
 */
export const SCROLLER_BOX = "relative flex min-h-0 min-w-0 flex-1 flex-col";

/**
 * Everything above the table, pinned against the horizontal scroll so only
 * the table slides when it is wider than the page. Kept on its own compositor
 * layer so it stays painted in place during asynchronous scrolling.
 */
export const PAGE_CHROME = "sticky left-0 shrink-0 [transform:translateZ(0)]";

/**
 * The table region: edge to edge under one hairline, no card and no scroll of
 * its own. It fills the rest of the page so an empty state has room.
 */
export const TABLE_SHELL =
  "table-region flex min-w-0 flex-1 flex-col bg-background";

/** The table's own classes: fixed layout, hairline row dividers and a
 *  hairline rule on every column's right edge but the last (Actions, which
 *  shades its edge instead: `.pin-edge-r`). Its own white ground, because a
 *  widened table runs past the region's right edge. */
export const MASTER_TABLE_CLASS =
  "table-fixed border-separate border-spacing-0 bg-background [&_:is(th,td):not(:last-child)]:border-r [&_td]:border-b [&_td]:border-pi-line";

/** The head strip: sticky, opaque, one hairline under it. */
export const MASTER_HEADER_CLASS =
  "sticky top-0 z-10 bg-pi-head-bg [&_tr]:shadow-none [&_th]:border-b [&_th]:border-pi-line";

/** Pinned header bookends (checkbox, actions): opaque head strip. */
export const HEAD_BOOKEND =
  "sticky z-10 h-11 bg-pi-head-bg px-4 py-0 align-middle";

/**
 * A body cell's ground. Precision Indigo rows: a calm row-hover wash across
 * the whole row, the brand tint for a ticked row. Sticky bookends paint the
 * same grounds opaquely so scrolled columns never show through.
 */
export const cellGround = (
  selected: boolean,
  sticky: boolean,
  rest = "bg-background"
) =>
  selected
    ? "bg-pi-brand-tint"
    : cn(
        sticky && rest,
        "transition-colors duration-100 motion-reduce:transition-none group-hover:bg-pi-row-hover"
      );

/** The inset 2px brand edge a ticked row wears on its first cell. */
export const SELECTED_EDGE = "shadow-[inset_2px_0_0_var(--pi-brand)]";

export type SyncState = "synced" | "syncing" | "failed" | "not_synced";

/** production's ThirdPartySyncStatus collapsed to the four states shown. */
export const syncStateOf = (status?: string | null): SyncState =>
  status === "synced"
    ? "synced"
    : status === "in_progress" || status === "in_progress_initiated"
      ? "syncing"
      : status === "event_creations_failed" ||
          status === "event_processing_failed"
        ? "failed"
        : "not_synced";

const SYNC_LABEL: Record<SyncState, string> = {
  synced: "Synced",
  syncing: "Syncing",
  failed: "Failed",
  not_synced: "Not synced",
};
const SYNC_DOT: Record<SyncState, string> = {
  synced: "bg-pi-success-dot",
  syncing: "bg-pi-brand-vivid animate-pulse motion-reduce:animate-none",
  failed: "bg-pi-danger-dot",
  not_synced: "border-[1.5px] border-pi-faint bg-transparent",
};

/**
 * Tally sync as a Precision Indigo dot-chip: meaning in a 7px dot, the label
 * in body ink; a failure earns its red ground. The tooltip says when or why,
 * as production's SyncStatus tooltip does.
 */
export const SyncChip = ({
  status,
  title,
  detail,
  className,
}: {
  status?: string | null;
  /** Tooltip heading. Omit to draw the chip without a tooltip. */
  title?: string;
  detail?: string;
  /** `-ml-2` in a table cell, so the dot sits on the header's line. */
  className?: string;
}) => {
  const state = syncStateOf(status);
  const chip = (
    <span
      aria-label={title || SYNC_LABEL[state]}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full px-2 py-1 text-[13px] leading-4",
        state === "failed"
          ? "bg-pi-danger-bg text-pi-danger"
          : state === "not_synced"
            ? "text-pi-faint"
            : "text-pi-body",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("size-[7px] flex-none rounded-full", SYNC_DOT[state])}
      />
      <span className="min-w-0 truncate">{SYNC_LABEL[state]}</span>
    </span>
  );
  if (!title) return chip;
  return (
    <Tooltip
      message={
        <span className="flex flex-col">
          <span className="font-medium">{title}</span>
          {detail ? (
            <span className="text-xs text-pi-faint">{detail}</span>
          ) : null}
        </span>
      }
    >
      {chip}
    </Tooltip>
  );
};

/**
 * A master form's bar: back, then Cancel (outline) and Save (lit-edge
 * primary), above the form's own scroller so it stays. The page names itself
 * in the top bar's trail ("Accounting / Chart of Accounts / New Ledger"), so
 * the title here is for assistive tech only — an eyebrow and a 30px title
 * repeated the trail (8 Oct 2026). Like the bill form's bar, it runs on the
 * form panel's column.
 */
export const FormHeader = ({
  title,
  back,
  actions,
}: {
  title: string;
  /** The back chevron button. */
  back: React.ReactNode;
  actions: React.ReactNode;
}) => (
  <div className="sticky top-0 z-10 shrink-0 border-b border-pi-line bg-pi-page px-[var(--inset-page)] py-3">
    <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3">
      <div className="-ml-2">{back}</div>
      <h1 className="sr-only">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  </div>
);

/** The form column on the slate page: white field cards, 16px apart. */
export const FORM_BODY =
  "flex w-full max-w-none flex-col gap-4 px-[var(--inset-page)] py-6";
