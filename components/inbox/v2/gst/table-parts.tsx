import React, { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ListFilter,
  Search,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableHead } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateRangePanel from "@/components/common/date-filter/panel";
import { FY_PRESETS } from "@/components/common/date-filter";
import { cn } from "@/lib/utils";
import {
  GSTR2B_MATCH_TYPE,
  GSTR2B_MATCH_TYPE_LABELS,
  type Gstr2bMatchTypeValueType,
} from "@/config/pages/inbox/gst";
import {
  AmountFields,
  UNDERLINE_TAB,
} from "@/components/inbox/v2/banking/table-parts";
import type { SortDir } from "@/components/inbox/v2/banking/table-parts";
import { AmountText, CountPill, T } from "@/components/inbox/v2/ui";
import { isoDay } from "@/utils/pages/inbox/gst";

/**
 * GST reconciliation's table vocabulary.
 *
 * The grid is the Purchases register's (bill-register.tsx and Banking's
 * table-parts), on Precision Indigo: hairline row and column rules, the 44px
 * head strip with 16px cell padding, 20px sort and funnel buttons, the same
 * pager. What is added here is what the GST
 * tables need and the register never did — a group row over sub-columns, a
 * cell that stacks a 2B line over a PR line, and production's filter
 * popovers, which hold a draft until Apply.
 */

/** Two header rows: the hairline sits under each, the top edge only once. */
export const GROUPED_HEADER_CLASS =
  "sticky top-0 z-20 bg-pi-head-bg [&_tr]:shadow-none [&_th]:border-b [&_th]:border-pi-line";

/** A quiet 20px header icon button (sort, filter), as Banking's HeaderCell. */
const HEAD_ICON_BUTTON =
  "grid h-5 w-5 flex-none place-items-center rounded-xs transition-colors duration-100 hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

/* ------------------------------------------------------------ statuses
   The reconciliation ledger (13 Oct 2026): every status wears one colour,
   the same in the overview bar, its legend, the chips in every table and
   the mini bars on By Month and By Vendor. The order runs from settled to
   costly, so the bar reads left to right as "done, then what's left". */

type StatusLook = {
  /** the dot and the bar segment */
  dot: string;
  /** the chip's soft ground and ink */
  chip: string;
};

export const STATUS_ORDER: Gstr2bMatchTypeValueType[] = [
  GSTR2B_MATCH_TYPE.FULLY_MATCHED,
  GSTR2B_MATCH_TYPE.AI_MATCHED,
  GSTR2B_MATCH_TYPE.MANUALLY_MATCHED,
  GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH,
  GSTR2B_MATCH_TYPE.MISSING_IN_PR,
  GSTR2B_MATCH_TYPE.MISSING_IN_2B,
];

export const STATUS_LOOK: Record<Gstr2bMatchTypeValueType, StatusLook> = {
  [GSTR2B_MATCH_TYPE.FULLY_MATCHED]: {
    dot: "bg-pi-success-dot",
    chip: "bg-pi-success-bg text-pi-success",
  },
  [GSTR2B_MATCH_TYPE.AI_MATCHED]: {
    dot: "bg-pi-brand-vivid",
    chip: "bg-pi-brand-tint text-pi-brand",
  },
  [GSTR2B_MATCH_TYPE.MANUALLY_MATCHED]: {
    dot: "bg-pi-teal",
    chip: "bg-pi-teal-tint text-pi-teal",
  },
  [GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]: {
    dot: "bg-pi-warning-dot",
    chip: "bg-pi-warning-bg text-pi-warning",
  },
  [GSTR2B_MATCH_TYPE.MISSING_IN_PR]: {
    dot: "bg-pi-line-strong",
    chip: "bg-pi-fill text-pi-body",
  },
  [GSTR2B_MATCH_TYPE.MISSING_IN_2B]: {
    dot: "bg-pi-danger-dot",
    chip: "bg-pi-danger-bg text-pi-danger",
  },
};

/** A match type as a chip: a soft ground in its colour, the dot, the name. */
export const MatchStatusPill = ({
  matchType,
  className,
}: {
  matchType: string;
  className?: string;
}) => {
  const look = STATUS_LOOK[matchType as Gstr2bMatchTypeValueType];
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium leading-4",
        look?.chip ?? "bg-pi-fill text-pi-body",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 flex-none rounded-full", look?.dot)}
      />
      <span className="min-w-0 truncate">
        {GSTR2B_MATCH_TYPE_LABELS[matchType as Gstr2bMatchTypeValueType]}
      </span>
    </span>
  );
};

/** Whole rupees, for the views that compare totals; paise stay on Invoices. */
export const Rupees = ({
  value,
  signed,
  className,
}: {
  value: number;
  /** a gap: "+" or "−" in front */
  signed?: boolean;
  className?: string;
}) => {
  const rounded = Math.round(value);
  if (rounded === 0) return <Nil className={className} />;
  const sign = rounded < 0 ? "−" : signed ? "+" : "";
  return (
    <span
      className={cn(
        "fig block truncate text-right font-medium tabular-nums text-pi-ink",
        className
      )}
    >
      {sign}₹{new Intl.NumberFormat("en-IN").format(Math.abs(rounded))}
    </span>
  );
};

/**
 * How a vendor's or a month's invoices settled, drawn small: matched,
 * probable and missing as one bar, with "7 of 12" beside it.
 */
export const StatusMix = ({
  matched,
  probable,
  missing,
}: {
  matched: number;
  probable: number;
  missing: number;
}) => {
  const total = matched + probable + missing;
  const part = (n: number) => (total ? `${(n / total) * 100}%` : "0%");
  return (
    <span
      className="flex items-center justify-end gap-3"
      title={`${matched} matched · ${probable} probable · ${missing} missing`}
    >
      <span
        aria-hidden
        className="flex h-1.5 w-20 flex-none gap-px overflow-hidden rounded-full bg-pi-fill"
      >
        <span className="bg-pi-success-dot" style={{ width: part(matched) }} />
        <span className="bg-pi-warning-dot" style={{ width: part(probable) }} />
        <span className="bg-pi-line-strong" style={{ width: part(missing) }} />
      </span>
      <span className="fig w-14 text-right text-[13px] tabular-nums text-pi-body">
        <span className="font-medium text-pi-ink">{matched}</span> of {total}
      </span>
    </span>
  );
};

/** One status in the overview: its count and what opens it. */
export type OverviewStatus = {
  type: Gstr2bMatchTypeValueType;
  count: number;
};

/**
 * The period in one picture, above Summary's table: how many GSTR-2B
 * invoices matched, the ITC at risk, and every status as a share of one bar.
 * Each segment and each legend entry opens its invoices.
 */
export const ReconOverview = ({
  matched,
  of,
  statuses,
  atRisk,
  atRiskCount,
  onOpen,
}: {
  matched: number;
  of: number;
  statuses: OverviewStatus[];
  atRisk: number;
  atRiskCount: number;
  onOpen: (types: Gstr2bMatchTypeValueType[]) => void;
}) => {
  const total = statuses.reduce((n, s) => n + s.count, 0);
  const shown = statuses.filter((s) => s.count > 0);
  const pct = of ? Math.round((matched / of) * 100) : 0;
  return (
    <section className="mx-[var(--inset-page)] mb-5 rounded-lg border border-pi-line bg-background px-6 pb-5 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-pi-faint">
            Matched
          </p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="fig text-[32px] font-semibold leading-9 tracking-[-0.02em] text-pi-ink">
              {matched}
            </span>
            <span className="text-[15px] font-medium text-pi-body">
              of {of} GSTR-2B invoices
            </span>
            <span className="ml-1 rounded-full bg-pi-success-bg px-2 py-0.5 text-[12px] font-semibold text-pi-success">
              {pct}%
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={!atRiskCount}
          onClick={() => onOpen([GSTR2B_MATCH_TYPE.MISSING_IN_2B])}
          className="-m-2 rounded-md p-2 text-right transition-colors duration-100 enabled:hover:bg-pi-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <span className="block text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-pi-faint">
            ITC at risk
          </span>
          <span
            className={cn(
              "fig mt-1.5 block text-[24px] font-semibold leading-8 tracking-[-0.01em]",
              atRisk > 0 ? "text-pi-danger" : "text-pi-ink"
            )}
          >
            ₹{new Intl.NumberFormat("en-IN").format(Math.round(atRisk))}
          </span>
          <span className="block text-[12px] leading-4 text-pi-faint">
            {atRiskCount
              ? `Tax on ${atRiskCount} invoice${atRiskCount === 1 ? "" : "s"} your vendors haven't filed`
              : "Every purchase is in 2B"}
          </span>
        </button>
      </div>

      {/* the signature: the whole period as one bar, settled to costly */}
      <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-pi-fill">
        {shown.map((s) => (
          <button
            key={s.type}
            type="button"
            aria-label={`${GSTR2B_MATCH_TYPE_LABELS[s.type]}: ${s.count}`}
            title={`${GSTR2B_MATCH_TYPE_LABELS[s.type]} · ${s.count}`}
            onClick={() => onOpen([s.type])}
            className={cn(
              "h-full transition-opacity duration-100 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              STATUS_LOOK[s.type].dot
            )}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
        {statuses.map((s) => (
          <button
            key={s.type}
            type="button"
            disabled={!s.count}
            onClick={() => onOpen([s.type])}
            className="-ml-2 mr-2 inline-flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-pi-body transition-colors duration-100 enabled:hover:bg-pi-row-hover enabled:hover:text-pi-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <span
              aria-hidden
              className={cn("size-2 rounded-full", STATUS_LOOK[s.type].dot)}
            />
            {GSTR2B_MATCH_TYPE_LABELS[s.type]}
            <span className="fig font-semibold tabular-nums text-pi-ink">
              {s.count}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

/**
 * Nothing in a figure column is a faint dash, not "₹0.00" or "0" at full
 * ink: a column of zeros otherwise reads as heavily as one of figures
 * (13 Oct 2026, the same dash Diff uses).
 */
const Nil = ({ className }: { className?: string }) => (
  <span
    aria-label="None"
    className={cn("block text-right font-normal text-pi-faint", className)}
  >
    —
  </span>
);

/** A rupee figure in a numeric column. */
export const Money = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) =>
  Math.abs(value) < 0.005 ? (
    <Nil className={className} />
  ) : (
    // The figure takes the cell's ink, so a red difference reaches it.
    <span
      className={cn(
        "block truncate text-right text-pi-ink [&_.fig]:[color:inherit]",
        className
      )}
    >
      <AmountText value={value} />
    </span>
  );

/**
 * 2B minus PR, the way a reconciliation reads it: nothing to say is a faint
 * dash, a gap carries its sign and stays in the cell's ink. Red is kept for
 * the one figure that costs money — ITC at risk — so a column of differences
 * doesn't turn into a wall of alarms.
 */
export const Diff = ({
  value,
  kind,
  className,
}: {
  value: number;
  kind: "count" | "money";
  className?: string;
}) => {
  if (Math.abs(value) < 0.005)
    return (
      <span
        aria-label="No difference"
        className={cn("block text-right text-pi-faint", className)}
      >
        —
      </span>
    );
  const sign = value > 0 ? "+" : "−";
  return kind === "count" ? (
    <span className={cn("fig block text-right", className)}>
      {sign}
      {Math.abs(value)}
    </span>
  ) : (
    <span
      className={cn(
        "block truncate text-right [&_.fig]:[color:inherit]",
        className
      )}
    >
      {sign}
      <AmountText value={Math.abs(value)} />
    </span>
  );
};

/**
 * The leading column of a GST table stays put while the figures scroll under
 * it: the status, month or vendor is what every number in the row is about.
 * It shades its inner edge only while something is under it (usePinEdges).
 */
export const PIN_LEAD = "pin-edge-l sticky left-0 z-[1] bg-background";
export const PIN_LEAD_HEAD = "pin-edge-l sticky left-0 z-30 bg-pi-head-bg";

/** A count in a numeric column. */
export const Count = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) =>
  value === 0 ? (
    <Nil className={className} />
  ) : (
    <span className={cn("fig block text-right", className)}>{value}</span>
  );

/** A group label over its sub-columns. */
export const GroupHead = ({
  label,
  colSpan = 1,
  rowSpan,
  align = "center",
  className,
  style,
}: {
  label: string;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center";
  className?: string;
  style?: React.CSSProperties;
}) => (
  <TableHead
    colSpan={colSpan}
    rowSpan={rowSpan}
    style={style}
    className={cn(
      "h-9 whitespace-nowrap px-4 py-0 align-middle",
      T.head,
      // the group over its columns: semibold ink on a firmer rule, so the
      // sub-columns' grey labels read as belonging to it (13 Oct 2026)
      "font-semibold text-pi-ink !border-b-pi-line-2",
      align === "center" ? "text-center" : "text-left",
      className
    )}
  >
    {label}
  </TableHead>
);

type HeadCellProps = {
  label: string;
  align?: "left" | "center" | "right";
  width?: number;
  rowSpan?: number;
  /** Omit for an unsortable column. */
  sort?: SortDir | "none";
  onSort?: () => void;
  /** The funnel's popover body; `close` shuts the popover after Apply. */
  filter?: (close: () => void) => React.ReactNode;
  filterActive?: boolean;
  className?: string;
  /** For a pinned column: its offset from the edge. */
  style?: React.CSSProperties;
  /** A status column's dot, in the tone the status wears elsewhere. */
  dot?: string;
};

/**
 * A column header: label, 20px sort and funnel buttons — Banking's HeaderCell
 * without the resize handle, since these tables size by content.
 */
export const HeadCell = ({
  label,
  align = "left",
  width,
  rowSpan,
  sort,
  onSort,
  filter,
  filterActive,
  className,
  style,
  dot,
}: HeadCellProps) => {
  const [open, setOpen] = useState(false);
  return (
    <TableHead
      rowSpan={rowSpan}
      aria-sort={
        !sort
          ? undefined
          : sort === "none"
            ? "none"
            : sort === "asc"
              ? "ascending"
              : "descending"
      }
      style={{ ...(width ? { width, minWidth: width } : {}), ...style }}
      className={cn(
        "relative h-11 whitespace-nowrap px-4 py-0 align-middle",
        T.head,
        className
      )}
    >
      <div
        className={cn(
          "flex h-4 min-w-0 items-center gap-1",
          align === "right" && "justify-end",
          align === "center" && "justify-center"
        )}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={cn("mr-1 h-1.5 w-1.5 flex-none rounded-full", dot)}
          />
        ) : null}
        <span className="truncate" title={label}>
          {label}
        </span>
        {sort && (
          <button
            type="button"
            onClick={onSort}
            aria-label={`Sort by ${label}`}
            className={cn(
              HEAD_ICON_BUTTON,
              sort === "none" ? "text-pi-faint" : "text-pi-brand"
            )}
          >
            {sort === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : sort === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3" />
            )}
          </button>
        )}
        {filter && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-filter-trigger={label}
                aria-label={`Filter ${label}`}
                className={cn(
                  HEAD_ICON_BUTTON,
                  filterActive ? "text-pi-brand" : "text-pi-faint"
                )}
              >
                <ListFilter className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto overflow-hidden rounded-md border-pi-line p-0 shadow-pi-2"
            >
              {filter(() => setOpen(false))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TableHead>
  );
};

/** One table body cell holding a 2B line over a PR line. */
export const TwoLine = ({
  top,
  bottom,
  align = "left",
  className,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) => {
  const line = cn(
    "flex h-7 min-w-0 items-center px-4 [&_.fig]:[color:inherit]",
    align === "right" && "justify-end",
    align === "center" && "justify-center",
    className
  );
  return (
    <div className="flex flex-col">
      <div className={line}>{top}</div>
      <div className={cn(line, "border-t border-dashed border-pi-line")}>
        {bottom}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- filters */

/**
 * Production's FilterPopover shell: a titled head, the body, and a
 * Clear / Apply foot. Nothing reaches the table until Apply.
 */
const FilterShell = ({
  title,
  subtitle,
  children,
  onClear,
  clearLabel = "Clear",
  onApply,
  applyDisabled,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClear: () => void;
  clearLabel?: string;
  onApply: () => void;
  applyDisabled?: boolean;
}) => (
  <div className="flex w-[320px] flex-col">
    <div className="border-b border-pi-line px-4 pb-3 pt-4">
      <p className="text-[14px] font-medium text-pi-ink">{title}</p>
      {subtitle ? <p className={cn(T.sub, "mt-0.5")}>{subtitle}</p> : null}
    </div>
    <div className="px-4 py-3">{children}</div>
    <div className="flex items-center justify-between gap-3 border-t border-pi-line px-4 py-3">
      <Button variant="secondary" className="flex-1" onClick={onClear}>
        {clearLabel}
      </Button>
      <Button className="flex-1" disabled={applyDisabled} onClick={onApply}>
        Apply
      </Button>
    </div>
  </div>
);

export type FilterOption = { value: string; label: string };

/** A searchable multi-select with a draft — production's MultiSelectFilterPopover. */
export const MultiSelectFilter = ({
  title,
  subtitle,
  searchPlaceholder,
  options,
  value,
  onApply,
  close,
}: {
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  options: FilterOption[];
  value: string[];
  onApply: (next: string[]) => void;
  close: () => void;
}) => {
  const [draft, setDraft] = useState<string[]>(value);
  const [query, setQuery] = useState("");
  useEffect(() => setDraft(value), [value]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);
  const unchanged =
    draft.length === value.length && draft.every((v) => value.includes(v));

  return (
    <FilterShell
      title={title}
      subtitle={subtitle}
      clearLabel={draft.length ? "Clear" : "Cancel"}
      onClear={() => {
        setDraft([]);
        onApply([]);
        close();
      }}
      applyDisabled={unchanged}
      onApply={() => {
        onApply(draft);
        close();
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pi-faint" />
        <Input
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8"
        />
      </div>
      <div className="mt-3 flex max-h-[220px] flex-col gap-1 overflow-y-auto">
        {visible.length ? (
          visible.map((o) => (
            <Label
              key={o.value}
              className="flex h-8 flex-none cursor-pointer items-center gap-3 rounded-sm px-2 text-[13px] font-normal text-pi-ink hover:bg-pi-row-hover"
            >
              <Checkbox
                checked={draft.includes(o.value)}
                onCheckedChange={() =>
                  setDraft((d) =>
                    d.includes(o.value)
                      ? d.filter((v) => v !== o.value)
                      : [...d, o.value]
                  )
                }
              />
              <span className="flex-1 truncate">{o.label}</span>
            </Label>
          ))
        ) : (
          <p className="px-1 py-2 text-[13px] text-pi-faint">
            No results found.
          </p>
        )}
      </div>
    </FilterShell>
  );
};

/** Min / max, as the register's AmountFields, with a draft and Apply. */
export const AmountRangeFilter = ({
  title,
  subtitle,
  from,
  to,
  onApply,
  close,
}: {
  title: string;
  subtitle?: string;
  from?: string;
  to?: string;
  onApply: (from?: string, to?: string) => void;
  close: () => void;
}) => {
  const [min, setMin] = useState(from ?? "");
  const [max, setMax] = useState(to ?? "");
  const invalid = !!min && !!max && Number(max) < Number(min);
  return (
    <FilterShell
      title={title}
      subtitle={subtitle}
      onClear={() => {
        setMin("");
        setMax("");
        onApply(undefined, undefined);
        close();
      }}
      applyDisabled={invalid}
      onApply={() => {
        onApply(min || undefined, max || undefined);
        close();
      }}
    >
      <AmountFields
        min={min}
        max={max}
        onChange={(key, value) =>
          key === "min" ? setMin(value) : setMax(value)
        }
      />
      {invalid ? (
        <p className="mt-2 text-xs text-pi-danger">
          Maximum must be more than minimum.
        </p>
      ) : null}
    </FilterShell>
  );
};

/** Invoice Date: the Inbox's own date range panel, which has its own Apply. */
export const DateRangeFilter = ({
  from,
  to,
  onApply,
  close,
}: {
  from?: string;
  to?: string;
  onApply: (from?: string, to?: string) => void;
  close: () => void;
}) => (
  <DateRangePanel
    value={{
      from: from ? parseISO(from) : undefined,
      to: to ? parseISO(to) : undefined,
    }}
    onApply={(next) => {
      onApply(
        next.from ? isoDay(next.from) : undefined,
        next.to ? isoDay(next.to) : undefined
      );
      close();
    }}
    presets={FY_PRESETS}
    presetsLabel="Date range"
    today={new Date()}
  />
);

/* ----------------------------------------------------------------- tabs */

/* ------------------------------------------------------------ summary */

export type StripCell = {
  label: string;
  value: React.ReactNode;
  /** 0–1: a share to draw under the figure, as the allocation meters do. */
  progress?: number;
  meta?: React.ReactNode;
  /** Danger ink, for money at risk only. */
  danger?: boolean;
  /** Opens the invoices behind the figure. */
  onClick?: () => void;
};

/**
 * The period at a glance, in one line: a hairline panel of figures, each
 * opening the invoices behind it. It replaces three stat cards, so the table
 * starts where the other modules' tables do.
 */
export const SummaryStrip = ({ cells }: { cells: StripCell[] }) => (
  <div className="mx-[var(--inset-page)] mb-4 flex shrink-0 flex-wrap overflow-hidden rounded-lg border border-pi-line bg-background">
    {cells.map((cell) => {
      const body = (
        <>
          {/* label, figure, caption: three steps, as the dialogs (13 Oct 2026) */}
          <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-pi-faint">
            {cell.label}
          </span>
          <span
            className={cn(
              "fig mt-1.5 text-[24px] font-semibold leading-8 tracking-[-0.01em] [&_.fig]:[color:inherit]",
              cell.danger ? "text-pi-danger" : "text-pi-ink"
            )}
          >
            {cell.value}
          </span>
          {cell.progress !== undefined ? (
            <span
              aria-hidden="true"
              className="mt-2 block h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-pi-line-2"
            >
              <span
                className="block h-full rounded-full bg-pi-success-dot"
                style={{
                  width: `${Math.round(Math.min(1, Math.max(0, cell.progress)) * 100)}%`,
                }}
              />
            </span>
          ) : null}
          {cell.meta ? (
            <span className="mt-2 line-clamp-2 max-w-full text-[12px] leading-4 text-pi-faint">
              {cell.meta}
            </span>
          ) : null}
        </>
      );
      const box =
        "flex min-w-[200px] flex-1 basis-0 flex-col items-start justify-start overflow-hidden border-pi-line px-5 py-4 text-left [&:not(:first-child)]:border-l";
      return cell.onClick ? (
        <button
          key={cell.label}
          type="button"
          onClick={cell.onClick}
          className={cn(
            box,
            "transition-colors duration-100 hover:bg-pi-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
          )}
        >
          {body}
        </button>
      ) : (
        <div key={cell.label} className={box}>
          {body}
        </div>
      );
    })}
  </div>
);

/** The page's underline tabs, as the registers draw them. */
export const ResultTabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <Tabs
    value={value}
    onValueChange={onChange}
    className="mx-[var(--inset-page)] shrink-0 overflow-x-auto border-b border-pi-line"
  >
    <TabsList className="h-auto gap-6 rounded-none bg-transparent p-0">
      {tabs.map((entry) => (
        <TabsTrigger key={entry.id} value={entry.id} className={UNDERLINE_TAB}>
          {entry.label}
          {entry.count !== undefined ? (
            <CountPill>{entry.count}</CountPill>
          ) : null}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);
