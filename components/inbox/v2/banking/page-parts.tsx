import React from "react";
import { ChevronLeft, type IconComponent } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { PillTone } from "@/components/inbox/v2/ui";

/**
 * Precision Indigo page furniture for the Banking and GST screens — the
 * Inbox's page pattern (components/inbox/v2/workspace.tsx) in pieces:
 * eyebrow + 30px title with actions right, the restrained KPI card, the one
 * white table card with the pager inside, the dot-chip status and the calm
 * empty state. Shape and colour only; no state.
 */

/** The 30px/500 workbench title (.page-title, with the shadcn ink). */
export const PAGE_TITLE =
  "text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground";

/** Eyebrow + title on the left, actions on the right. */
export const PageHead = ({
  eyebrow,
  title,
  sub,
  back,
  actions,
  className,
}: {
  eyebrow: string;
  /** A string, or a control that renders the title (the ledger switcher). */
  title: React.ReactNode;
  /** A quiet line under the title. */
  sub?: React.ReactNode;
  /** Turns the eyebrow into the way back, with this as its accessible name. */
  back?: { label: string; onClick: () => void };
  actions?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-3 px-[var(--inset-page)] pb-4 pt-6",
      className
    )}
  >
    <div className="min-w-0">
      {back ? (
        <button
          type="button"
          aria-label={back.label}
          title={back.label}
          onClick={back.onClick}
          className="workspace-eyebrow -ml-1 inline-flex items-center gap-0.5 rounded-xs px-1 transition-colors duration-150 hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pi-brand motion-reduce:transition-none"
        >
          <ChevronLeft aria-hidden className="size-3" />
          {eyebrow}
        </button>
      ) : (
        <span className="workspace-eyebrow">{eyebrow}</span>
      )}
      {typeof title === "string" ? (
        <h1 className={cn(PAGE_TITLE, "m-0 min-w-0 break-words")}>{title}</h1>
      ) : (
        title
      )}
      {sub ? (
        <p className="mt-1 truncate text-[13px] text-pi-body">{sub}</p>
      ) : null}
    </div>
    {actions ? (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    ) : null}
  </div>
);

/** The toolbar band under the tabs: search, quick filters, then the right side. */
export const TOOLBAR =
  "flex shrink-0 flex-wrap items-center gap-2 px-[var(--inset-page)] py-4";

/**
 * A body cell's ground: the calm row-hover wash across the whole row. Sticky
 * bookends add their own opaque `bg-background` underneath.
 */
export const ROW_GROUND =
  "transition-colors duration-100 group-hover:bg-pi-row-hover motion-reduce:transition-none";

/** The hairline between the search box and the quick filters. */
export const ToolbarRule = () => (
  <span aria-hidden className="h-6 w-px flex-none bg-pi-line-2" />
);

/**
 * The page's one scroller, both axes. Heading, table and pager scroll as a
 * page, and the table header's `sticky top-0` resolves against this box, so it
 * stops at the top of the content area. Not positioned: an absolute overlay
 * (a selection bar) hangs off a `relative` wrapper outside it, so it neither
 * scrolls nor clips.
 */
export const PAGE_SCROLL =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none";

/**
 * Holds still against the page's horizontal scroll while a widened table
 * slides under it: the heading, KPIs, toolbars and the pager. It has to be a
 * direct child of the scroller (or of a `contents` wrapper), since a sticky box
 * cannot leave its containing block. Kept on its own compositor layer so it
 * stays painted in place during asynchronous horizontal scrolling.
 */
export const Pinned = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "sticky left-0 shrink-0 [transform:translateZ(0)]",
      className
    )}
  >
    {children}
  </div>
);

/**
 * The table region: edge to edge and white, no card. It does not scroll — the
 * page does — and the pager sits after it in a `Pinned` block, outside it.
 */
export const TableCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex min-w-0 flex-1 flex-col border-t border-pi-line bg-background",
      className
    )}
  >
    {children}
  </div>
);

/** A row of restrained KPI cards — the reference SummaryStrip, read-only. */
export const KpiRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid shrink-0 grid-cols-1 gap-3 px-[var(--inset-page)] pb-4 sm:grid-cols-3">
    {children}
  </div>
);

export const KpiCard = ({
  icon: Icon,
  label,
  value,
  unit,
  meta,
  tone,
}: {
  icon: IconComponent;
  label: string;
  value: React.ReactNode;
  /** A word after the figure ("transactions"). */
  unit?: string;
  meta: React.ReactNode;
  /** Danger inks the figure; reserved for money at risk. */
  tone?: "danger";
}) => (
  <section className="min-w-0 rounded-lg border border-pi-line bg-background px-5 py-4 shadow-contact">
    <h2 className="flex items-center gap-2 text-[13px] font-medium text-pi-body">
      <Icon aria-hidden className="size-4 flex-none text-pi-faint" />
      <span className="truncate">{label}</span>
    </h2>
    <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={cn(
          "fig text-[28px] font-medium leading-tight tracking-[-0.02em] [&_.fig]:[color:inherit]",
          tone === "danger" ? "text-pi-danger" : "text-pi-ink"
        )}
      >
        {value}
      </span>
      {unit ? (
        <span className="text-[14px] font-normal text-pi-body">{unit}</span>
      ) : null}
    </p>
    <p className="mt-1 truncate text-[12px] text-pi-faint">{meta}</p>
  </section>
);

/* Meaning lives in a 7px dot; the label stays body ink. Open work wears a
   soft ring; only failures earn a ground (danger) and ink. */
const DOT: Record<PillTone, string> = {
  ok: "bg-pi-success-dot",
  info: "bg-pi-brand-vivid",
  warn: "bg-pi-warning-dot shadow-[0_0_0_2px_var(--pi-warning-bg)]",
  error: "bg-pi-danger-dot",
  neutral: "bg-pi-faint",
};
const GROUND: Partial<Record<PillTone, string>> = {
  error: "bg-pi-danger-bg text-pi-danger",
};

/** The Precision Indigo dot-chip for any PillTone status. */
export const DotChip = ({
  tone,
  live,
  className,
  children,
}: {
  tone: PillTone;
  /** Work in progress: the dot breathes (static under reduced motion). */
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-[13px] leading-4 text-pi-body",
      GROUND[tone],
      className
    )}
  >
    <span
      aria-hidden
      className={cn(
        "size-[7px] flex-none rounded-full",
        DOT[tone],
        live && "animate-pulse motion-reduce:animate-none"
      )}
    />
    <span className="min-w-0 truncate">{children}</span>
  </span>
);

/** The reference EmptyState: an icon tile, a title, one line, one action. */
export const EmptyState = ({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: IconComponent;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-center px-6 py-14 text-center",
      className
    )}
  >
    <span className="grid size-11 place-items-center rounded-lg border border-pi-line bg-pi-page text-pi-body">
      <Icon aria-hidden className="size-5" />
    </span>
    <h2 className="mt-4 text-[16px] font-medium text-pi-ink">{title}</h2>
    {body ? (
      <p className="mt-2 max-w-[340px] text-[13px] leading-relaxed text-pi-body">
        {body}
      </p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
