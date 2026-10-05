import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import FilterChip from "@/components/common/filter-chip";
import DateRangePanel from "./panel";
import {
  FY_PRESETS,
  formatRange,
  matchPreset,
  type DatePreset,
  type DateRangeValue,
} from "./presets";

export type { DatePreset, DateRangeValue };
export { FY_PRESETS };

/**
 * PROTOTYPE ADDITION — not in aiaccountant-app (whose nearest relatives are
 * common/period-picker and common/date-range-picker).
 *
 * A date-range filter for a filter bar, after the Bloocks DateFilter:
 * https://ajaymon12.github.io/Bloocks-Design-system/?path=/docs/components-datefilter--docs
 *
 * A FilterChip trigger, so it sits beside the other chips and clears the same
 * way, over a panel of presets and two months side by side. The chip
 * names a matching preset ("Received: This FY") and otherwise the dates.
 * onChange fires on Apply, or on the chip's × — never mid-pick.
 */
type Props = {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  presets?: DatePreset[];
  /** Label above the panel's preset dropdown. */
  presetsLabel?: string;
  /** Injectable so a demo or test can pin the date. */
  today?: Date;
  minDate?: Date;
  maxDate?: Date;
  /** Set false for a filter that must always hold a range. */
  showClearButton?: boolean;
  isDisabled?: boolean;
  className?: string;
};

const DateFilter = ({
  label,
  value,
  onChange,
  presets = FY_PRESETS,
  presetsLabel = "Date range",
  today = new Date(),
  minDate,
  maxDate,
  showClearButton = true,
  isDisabled = false,
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const shown = value.from
    ? (matchPreset(value, presets, today)?.label ?? formatRange(value))
    : undefined;

  return (
    <Popover open={open} onOpenChange={(next) => !isDisabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <FilterChip
          label={label}
          value={shown}
          showClearButton={showClearButton}
          onClearButtonClick={() => onChange({})}
          isDisabled={isDisabled}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden rounded-md border-pi-line p-0 shadow-pi-2"
      >
        {/* Keyed on open, so each opening starts from the applied range
            rather than whatever was abandoned last time. */}
        {open ? (
          <DateRangePanel
            value={value}
            presets={presets}
            presetsLabel={presetsLabel}
            today={today}
            minDate={minDate}
            maxDate={maxDate}
            onApply={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default DateFilter;
