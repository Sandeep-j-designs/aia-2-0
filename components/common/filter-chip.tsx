import React, { forwardRef } from "react";
import { ChevronDown, X } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * PROTOTYPE ADDITION — not in aiaccountant-app.
 *
 * The trigger for one filter in a filter bar, after the Bloocks FilterChip:
 * https://ajaymon12.github.io/Bloocks-Design-system/?path=/docs/components-filterchip--docs
 *
 * 28px and rounded, it reads "Source" at rest and "Source: WhatsApp" once set,
 * in the brand's subtle fill. Several values collapse to a count. The × clears
 * in place, without opening whatever the chip triggers.
 *
 * Used as a Popover trigger (`<PopoverTrigger asChild>`): the ref lands on the
 * outer box, so the popover anchors to the whole chip, and every other prop
 * — onClick, aria-expanded, data-state — lands on the label button.
 */
type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> & {
  label: string;
  /** What is applied. Empty string or empty array means nothing is. */
  value?: string | string[];
  selectionType?: "single" | "multiple";
  /** Set false for a filter that must always hold a value. */
  showClearButton?: boolean;
  onClearButtonClick?: () => void;
  isDisabled?: boolean;
};

const FilterChip = forwardRef<HTMLDivElement, Props>(
  (
    {
      label,
      value,
      selectionType = "single",
      showClearButton = true,
      onClearButtonClick,
      isDisabled = false,
      className,
      ...buttonProps
    },
    ref
  ) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    const hasValue = values.length > 0;
    const canClear = hasValue && showClearButton && !isDisabled;
    const many = selectionType === "multiple" && values.length > 1;

    return (
      <div
        ref={ref}
        className={cn(
          // Precision Indigo control: 6px corners, a line-2 hairline and the
          // contact shadow at rest; the brand tint and border once set.
          "inline-flex h-7 w-fit flex-none items-center overflow-hidden rounded-sm border shadow-contact transition-colors duration-150 motion-reduce:transition-none",
          hasValue
            ? "border-pi-brand-border bg-pi-brand-tint"
            : "border-pi-line-2 bg-background hover:border-pi-line-strong",
          isDisabled && "opacity-50",
          className
        )}
      >
        <button
          type="button"
          disabled={isDisabled}
          className={cn(
            "flex h-full max-w-[220px] items-center gap-1 pl-3 text-[13px] font-medium",
            canClear ? "pr-2" : "pr-3",
            hasValue ? "text-pi-brand" : "text-pi-ink",
            isDisabled
              ? "cursor-not-allowed"
              : cn("cursor-pointer", !hasValue && "hover:bg-pi-fill"),
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          )}
          {...buttonProps}
        >
          <span className="truncate">
            {label}
            {hasValue && !many ? ": " : ""}
          </span>
          {hasValue && !many ? (
            <span className="truncate font-semibold">{values.join(", ")}</span>
          ) : null}
          {many ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-pi-brand px-1 text-[12px] font-medium tabular-nums text-primary-foreground">
              {values.length}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 flex-none transition-transform duration-150 motion-reduce:transition-none [[data-state=open]_&]:rotate-180",
              hasValue ? "text-pi-brand" : "text-pi-faint"
            )}
          />
        </button>
        {canClear ? (
          <>
            <span
              aria-hidden
              className="h-full w-px flex-none bg-pi-brand-border"
            />
            <button
              type="button"
              aria-label={`Clear ${label} filter`}
              onClick={onClearButtonClick}
              className="flex h-full flex-none items-center px-2 text-pi-brand hover:bg-pi-brand-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
      </div>
    );
  }
);
FilterChip.displayName = "FilterChip";

export default FilterChip;
