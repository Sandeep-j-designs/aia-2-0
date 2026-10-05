import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subMonths,
} from "date-fns";

export type DateRangeValue = { from?: Date; to?: Date };

export type DatePreset = {
  label: string;
  getValue: (today: Date) => { from: Date; to: Date };
};

/** April, as a 0-based month: the Indian financial year runs April–March. */
const FY_START_MONTH = 3;

const startOfFinancialYear = (date: Date) => {
  const year =
    date.getMonth() >= FY_START_MONTH
      ? date.getFullYear()
      : date.getFullYear() - 1;
  return new Date(year, FY_START_MONTH, 1);
};

/**
 * The Bloocks DateFilter's Indian set. "This …" presets run to today, not to
 * the period's end — a filter on received documents has nothing after today.
 * Quarters are calendar quarters, which the April year start keeps aligned
 * with FY quarters (Q1 = Apr–Jun).
 */
export const FY_PRESETS: DatePreset[] = [
  {
    label: "Today",
    getValue: (today) => ({ from: startOfDay(today), to: startOfDay(today) }),
  },
  {
    label: "Yesterday",
    getValue: (today) => {
      const day = startOfDay(addDays(today, -1));
      return { from: day, to: day };
    },
  },
  {
    label: "This week",
    getValue: (today) => ({
      from: startOfWeek(today),
      to: startOfDay(today),
    }),
  },
  {
    label: "This month",
    getValue: (today) => ({
      from: startOfMonth(today),
      to: startOfDay(today),
    }),
  },
  {
    label: "Last month",
    getValue: (today) => {
      const last = subMonths(today, 1);
      return { from: startOfMonth(last), to: startOfDay(endOfMonth(last)) };
    },
  },
  {
    label: "This quarter",
    getValue: (today) => ({
      from: startOfQuarter(today),
      to: startOfDay(today),
    }),
  },
  {
    label: "This FY",
    getValue: (today) => ({
      from: startOfFinancialYear(today),
      to: startOfDay(today),
    }),
  },
  {
    label: "Last FY",
    getValue: (today) => {
      const thisFy = startOfFinancialYear(today);
      return {
        from: new Date(thisFy.getFullYear() - 1, FY_START_MONTH, 1),
        to: addDays(thisFy, -1),
      };
    },
  },
];

export const sameRange = (a: DateRangeValue, b: DateRangeValue) =>
  (!a.from && !b.from) ||
  (!!a.from &&
    !!b.from &&
    isSameDay(a.from, b.from) &&
    ((!a.to && !b.to) || (!!a.to && !!b.to && isSameDay(a.to, b.to))));

/** The preset a range is, if any — so the chip can say "This FY". */
export const matchPreset = (
  range: DateRangeValue,
  presets: DatePreset[],
  today: Date
) =>
  range.from
    ? presets.find((preset) =>
        sameRange(preset.getValue(today), {
          from: range.from,
          to: range.to ?? range.from,
        })
      )
    : undefined;

/**
 * "12 Sep 2026", "1 – 15 Sep 2026", "28 Aug – 3 Sep 2026",
 * "28 Dec 2025 – 3 Jan 2026": a range keeps both months across a month
 * boundary and both years across a year.
 */
export const formatRange = ({ from, to }: DateRangeValue) => {
  if (!from) return "";
  if (!to || isSameDay(from, to)) return format(from, "d MMM yyyy");
  if (!isSameYear(from, to))
    return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
  if (!isSameMonth(from, to))
    return `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
  return `${format(from, "d")} – ${format(to, "d MMM yyyy")}`;
};
