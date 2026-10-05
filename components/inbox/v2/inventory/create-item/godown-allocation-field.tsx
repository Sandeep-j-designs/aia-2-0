import React from "react";
import { PencilLine, Split, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import type { AllocationLike, Option } from "@/types/pages/inbox/inventory";
import { AmountText, T } from "@/components/inbox/v2/ui";

type Props = {
  allocations: AllocationLike[];
  godownOptions: Option[];
  disabled?: boolean;
  hideSplitButton?: boolean;
  invalid?: boolean;
  onSelectSingleGodown: (godownUuid: string) => void;
  onOpenSplit: () => void;
  onClear: () => void;
};

/**
 * production's components/common/godown-allocation-field.tsx with
 * godown-split-summary.tsx: one godown picked inline, or — once split — a
 * summary chip that reopens the split.
 */
const GodownAllocationField = ({
  allocations,
  godownOptions,
  disabled = false,
  hideSplitButton = false,
  invalid,
  onSelectSingleGodown,
  onOpenSplit,
  onClear,
}: Props) => {
  const nameOf = (uuid?: string | null) =>
    godownOptions.find((o) => o.value === uuid)?.label || "Unassigned";

  if (allocations.length > 1) {
    return (
      <Tooltip
        message={
          <span className="flex min-w-[220px] flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.055em] text-pi-faint">
              Split allocation
            </span>
            {allocations.map((a, index) => (
              <span
                key={a.id || index}
                className="flex items-center justify-between gap-3 text-[12px]"
              >
                <span className="truncate">{nameOf(a.godownUuid)}</span>
                <span className="whitespace-nowrap text-pi-body">
                  Qty {a.quantity ?? 0} · <AmountText value={a.amount ?? 0} />
                </span>
              </span>
            ))}
          </span>
        }
      >
        <div
          className={cn(
            "group flex h-9 w-full items-center justify-between gap-2 rounded-sm border border-pi-line-2 bg-background px-3 shadow-contact",
            invalid && "border-pi-danger"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Split className="h-4 w-4 flex-none text-pi-brand" />
            <span className={cn(T.value, "truncate text-pi-brand")}>
              {allocations.length} Godowns/Locations
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!hideSplitButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Edit split"
                disabled={disabled}
                onClick={onOpenSplit}
                className="text-pi-faint hover:text-pi-brand"
              >
                <PencilLine className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear split"
              disabled={disabled}
              onClick={onClear}
              className="text-pi-faint hover:text-pi-brand"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="flex w-full items-center gap-3">
      <div className="min-w-0 flex-1">
        <ComboBox
          title="Select Godown"
          options={godownOptions}
          selectedValue={allocations[0]?.godownUuid || ""}
          onChange={(value) => onSelectSingleGodown(String(value))}
          isMultiSelect={false}
          hasSearch={false}
          disabled={disabled}
          invalid={invalid}
        />
      </div>
      {!hideSplitButton && (
        <>
          <span className="h-9 w-px flex-none bg-pi-line" />
          <Tooltip message="Split godown/location">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Split godown/location"
              disabled={disabled}
              onClick={onOpenSplit}
            >
              <Split className="h-4 w-4 text-pi-brand" />
            </Button>
          </Tooltip>
        </>
      )}
    </div>
  );
};

export default GodownAllocationField;
