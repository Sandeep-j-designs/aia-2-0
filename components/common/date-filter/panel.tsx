import React, { useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatRange,
  matchPreset,
  sameRange,
  type DatePreset,
  type DateRangeValue,
} from "./presets";

type Props = {
  value: DateRangeValue;
  onApply: (value: DateRangeValue) => void;
  presets: DatePreset[];
  presetsLabel: string;
  today: Date;
  /** Days before this cannot be picked. */
  minDate?: Date;
  /** Days after this cannot be picked, e.g. today for received documents. */
  maxDate?: Date;
};

const CUSTOM = "__custom";

type Months = { left: Date; right: Date };

/**
 * The DateFilter's panel, after the Bloocks DateRangePanel: a preset dropdown
 * over two months side by side, and Reset / Apply. The panel edits a draft and
 * nothing reaches the filter until Apply, so a half-picked range never filters
 * the list.
 *
 * One click picks a single day, which can be applied as is. A second click
 * extends it into a range, and the band runs unbroken across the two months.
 */
const DateRangePanel = ({
  value,
  onApply,
  presets,
  presetsLabel,
  today,
  minDate,
  maxDate,
}: Props) => {
  /** A month with no pickable day in it, which navigation never lands on. */
  const outOfBounds = (month: Date) =>
    (!!maxDate && isAfter(month, startOfDay(maxDate))) ||
    (!!minDate && isBefore(endOfMonth(month), startOfDay(minDate)));

  /**
   * The months to open on: the range's first month on the left, and its last
   * month (or the next one) on the right. When the right month is past
   * maxDate, both step back one, so a filter capped at today opens on last
   * month and this month rather than on an empty month.
   */
  const monthsFor = (range: DateRangeValue): Months => {
    const left = startOfMonth(range.from ?? range.to ?? today);
    const last = range.to ? startOfMonth(range.to) : left;
    const right = isAfter(last, left) ? last : addMonths(left, 1);
    if (outOfBounds(right) && !outOfBounds(addMonths(left, -1)))
      return { left: addMonths(left, -1), right: left };
    return { left, right };
  };

  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [months, setMonths] = useState<Months>(() => monthsFor(value));
  /** "Custom" chosen by hand: the dropdown keeps saying so even when the
      picked days happen to equal a preset. */
  const [custom, setCustom] = useState(false);

  /**
   * The months move independently but never show the same month: stepping one
   * onto the other pushes the other along. Null when the step would land on a
   * month with nothing pickable in it, which is what disables the arrow.
   */
  const step = (side: "left" | "right", by: number): Months | null => {
    let { left, right } = months;
    if (side === "left") {
      left = addMonths(left, by);
      if (!isBefore(left, right)) right = addMonths(left, 1);
    } else {
      right = addMonths(right, by);
      if (!isAfter(right, left)) left = addMonths(right, -1);
    }
    return outOfBounds(left) || outOfBounds(right) ? null : { left, right };
  };

  const preset = custom ? undefined : matchPreset(draft, presets, today);
  const customLabel = draft.from ? formatRange(draft) : "Custom";

  const canApply = !sameRange(draft, value);
  const canReset = !!draft.from;

  const disabled = [
    ...(minDate ? [{ before: startOfDay(minDate) }] : []),
    ...(maxDate ? [{ after: startOfDay(maxDate) }] : []),
  ];

  return (
    <div className="flex w-[604px] flex-col gap-2 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium leading-4 text-pi-body">
          {presetsLabel}
        </span>
        <Select
          value={preset?.label ?? CUSTOM}
          onValueChange={(next) => {
            if (next === CUSTOM) {
              setCustom(true);
              return;
            }
            const picked = presets.find((p) => p.label === next);
            if (!picked) return;
            const range = picked.getValue(today);
            setCustom(false);
            setDraft(range);
            setMonths(monthsFor(range));
          }}
        >
          <SelectTrigger className="h-[34px] rounded-sm text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.label} value={p.label}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>{customLabel}</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <div className="flex items-start gap-3">
        {(["left", "right"] as const).map((side) => {
          const month = months[side];
          const title = format(month, "MMMM yyyy");
          const previous = step(side, -1);
          const next = step(side, 1);
          return (
            <div key={side} className="flex w-[280px] shrink-0 flex-col gap-3">
              <div className="flex h-[34px] items-center justify-between rounded-sm border border-pi-line-2 bg-background px-2">
                <MonthButton
                  label={`Month before ${title}`}
                  onClick={previous ? () => setMonths(previous) : undefined}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </MonthButton>
                <span
                  aria-hidden
                  className="text-[13px] font-medium text-pi-ink"
                >
                  {title}
                </span>
                <MonthButton
                  label={`Month after ${title}`}
                  onClick={next ? () => setMonths(next) : undefined}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </MonthButton>
              </div>
              <div className="min-h-[240px]">
                <Calendar
                  mode="range"
                  month={month}
                  disableNavigation
                  // Neighbouring months' days are left empty, so a date never
                  // appears in both grids.
                  showOutsideDays={false}
                  weekStartsOn={0}
                  disabled={disabled}
                  selected={
                    draft.from ? { from: draft.from, to: draft.to } : undefined
                  }
                  onSelect={(range) => {
                    setCustom(false);
                    // The first click is a one-day range, so it can be
                    // applied without a second click on the same day.
                    setDraft(
                      range?.from
                        ? { from: range.from, to: range.to ?? range.from }
                        : {}
                    );
                  }}
                  className="w-full p-0"
                  classNames={dayGrid}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          isDestructive
          disabled={!canReset}
          onClick={() => {
            setDraft({});
            setCustom(false);
          }}
        >
          Reset
        </Button>
        <Button
          size="sm"
          className="w-[78px]"
          disabled={!canApply}
          onClick={() => onApply(draft)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

const MonthButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={!onClick}
    onClick={onClick}
    className="inline-flex size-6 items-center justify-center rounded-xs text-pi-faint hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
  >
    {children}
  </button>
);

/**
 * Bloocks' day grid on react-day-picker 8: 28px round days in 40px rows, and a
 * grey band across a range. The band is painted on the cell, not the day, so
 * it runs edge to edge between days while the ends stay round and filled.
 */
const dayGrid = {
  months: "w-full",
  month: "w-full",
  // The month bar above names the month; the grid keeps its caption only as
  // its accessible name.
  caption: "sr-only",
  table: "w-full border-collapse",
  head_row: "flex w-full",
  head_cell:
    "flex h-6 flex-1 items-center justify-center text-[12px] font-medium text-pi-faint",
  tbody: "flex flex-col gap-1",
  row: "flex w-full",
  cell: cn(
    "flex h-10 flex-1 items-center justify-center p-0",
    // The range band in the brand tint, edge to edge between the ends.
    "[&:has(.day-range-middle)]:bg-pi-brand-tint",
    "[&:has(.day-range-start)]:rounded-l-full [&:has(.day-range-start)]:bg-pi-brand-tint",
    "[&:has(.day-range-end)]:rounded-r-full [&:has(.day-range-end)]:bg-pi-brand-tint"
  ),
  day: "size-7 rounded-full text-[12px] tabular-nums text-pi-ink hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
  day_selected: "bg-primary text-primary-foreground hover:bg-primary-hover",
  day_range_start: "day-range-start",
  day_range_end: "day-range-end",
  day_range_middle:
    "day-range-middle !bg-transparent !text-pi-ink hover:!bg-pi-brand-border",
  day_today: "font-semibold",
  day_outside: "invisible",
  day_disabled:
    "cursor-not-allowed text-pi-faint opacity-40 hover:bg-transparent",
  day_hidden: "invisible",
};

export default DateRangePanel;
