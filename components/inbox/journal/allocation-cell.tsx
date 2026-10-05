import React, { useState } from "react";
import { Plus } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  COST_CENTRES,
  COST_CENTRE_CLASSES,
  costCentreClassByName,
} from "@/config/pages/inbox/journal-masters";

/**
 * The Allocation column.
 *
 * Ported from Prototypes/Journals (components/journal-voucher/common/
 * allocation-cell). One change: the Inbox's `Form` holds display strings
 * rather than master ids — `gst` is a branch name, `ledger` is a ledger name —
 * so the cost centre is stored and matched by name for the same reason.
 *
 * A line only offers an allocation once it carries a figure. There is nothing
 * to allocate before that, so an unfilled line shows a dash — the rule the
 * frames draw, where the 35,000 line offers "Cost Centre +" and the blank line
 * beside it shows "-".
 *
 * The pill is a control, not a badge: an unset line offers a brand-tint chip
 * ("Cost Centre +"), a set one reads as a neutral field-edge chip.
 */

type Props = {
  /** The line's current allocation, as a cost centre name. */
  value: string;
  hasAmount: boolean;
  /** The voucher's cost centre class, by name. Narrows what is on offer. */
  costClass: string;
  readOnly?: boolean;
  onChange: (costCentre: string) => void;
};

const AllocationCell = ({
  value,
  hasAmount,
  costClass,
  readOnly,
  onChange,
}: Props) => {
  const [open, setOpen] = useState(false);

  if (!hasAmount)
    return (
      <span
        className="text-[13px] text-pi-faint"
        aria-label="No allocation"
      >
        -
      </span>
    );

  // A read-only voucher still has to say what it was allocated to; it just has
  // no picker behind it.
  if (readOnly)
    return (
      <span className="text-[13px] text-pi-ink">
        {value || <span className="text-pi-faint">-</span>}
      </span>
    );

  // A chosen class narrows what the line may be allocated to; with no class on
  // the voucher, every centre is on offer.
  const klass = costCentreClassByName(costClass);
  const options = klass
    ? COST_CENTRES.filter((centre) => centre.classId === klass.id)
    : COST_CENTRES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 items-center gap-2 rounded-sm border px-3 text-[12px] font-medium shadow-contact",
            value
              ? "border-pi-line-2 bg-pi-surface-panel text-pi-ink hover:border-pi-line-strong"
              : "border-pi-brand-border bg-pi-brand-tint text-pi-brand hover:border-pi-brand"
          )}
        >
          {value || "Cost Centre"}
          {value ? null : <Plus className="h-3.5 w-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 rounded-md border-pi-line p-1 shadow-pi-2"
      >
        {options.map((centre) => (
          <button
            key={centre.id}
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-[13px] text-pi-ink",
              "hover:bg-pi-row-hover",
              centre.name === value && "bg-pi-brand-tint"
            )}
            onClick={() => {
              onChange(centre.name);
              setOpen(false);
            }}
          >
            {centre.name}
            <span className="text-[12px] text-pi-faint">
              {
                COST_CENTRE_CLASSES.find((k) => k.id === centre.classId)?.name
              }
            </span>
          </button>
        ))}
        {value ? (
          <button
            type="button"
            className="w-full rounded-sm px-2 py-2 text-left text-[13px] text-pi-danger hover:bg-pi-danger-bg"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear allocation
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default AllocationCell;
