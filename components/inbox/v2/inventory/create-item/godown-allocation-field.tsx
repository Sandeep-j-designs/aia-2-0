import React, { useLayoutEffect, useRef } from "react";
import { Split, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import type { AllocationLike, Option } from "@/types/pages/inbox/inventory";
import { AmountText, T } from "@/components/inbox/v2/ui";
import styles from "./create-item.module.css";

type Props = {
  allocations: AllocationLike[];
  godownOptions: Option[];
  disabled?: boolean;
  hideSplitButton?: boolean;
  invalid?: boolean;
  /** The split panel under the field: whether it is open, and its id. */
  splitOpen: boolean;
  splitPanelId: string;
  /** The control that opened the split, for the panel's notch to aim at. */
  openerRef: React.RefObject<HTMLButtonElement>;
  onSelectSingleGodown: (godownUuid: string) => void;
  onToggleSplit: () => void;
  onClear: () => void;
};

/**
 * Unboxed icon action, as on the bill form (7 Oct 2026): 28×28 hit area,
 * 16px brand glyph, brand-tint on hover — not an outlined square jammed
 * against the field's far edge.
 */
const ICON_ACTION =
  "grid h-7 w-7 flex-none place-items-center rounded-sm text-pi-brand hover:bg-pi-brand-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-pi-brand disabled:pointer-events-none disabled:opacity-40";

const SPLIT_TIP =
  "Split this stock across godowns. Opens the split under this field.";

/**
 * production's components/common/godown-allocation-field.tsx with
 * godown-split-summary.tsx: one godown picked inline, or — once split — a
 * summary that reopens the split. The split itself opens under the field
 * (godown-split-modal.tsx), no longer in a dialog (7 Oct 2026).
 */
const GodownAllocationField = ({
  allocations,
  godownOptions,
  disabled = false,
  hideSplitButton = false,
  invalid,
  splitOpen,
  splitPanelId,
  openerRef,
  onSelectSingleGodown,
  onToggleSplit,
  onClear,
}: Props) => {
  const nameOf = (uuid?: string | null) =>
    godownOptions.find((o) => o.value === uuid)?.label || "Unassigned";
  const isSplit = allocations.length > 1;
  const boxRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLSpanElement>(null);

  // The split icon follows the picked godown's name inside the box, as the
  // bill form's "create" actions follow their value (7 Oct 2026). The name
  // truncates before it reaches the clear and caret.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const action = actionRef.current;
    if (!box || !action || isSplit) return;
    const place = () => {
      const text = box.querySelector<HTMLElement>("button .truncate");
      if (!text) return;
      const b = box.getBoundingClientRect();
      const t = text.getBoundingClientRect();
      const at = `${Math.round(t.right - b.left + 4)}px`;
      if (action.style.getPropertyValue("--after-x") !== at)
        action.style.setProperty("--after-x", at);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [allocations, godownOptions, isSplit, hideSplitButton]);

  if (isSplit) {
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
            "group flex h-[38px] w-full items-center justify-between gap-2 rounded-sm border border-pi-line-2 bg-background pl-3 pr-1 shadow-contact",
            invalid && "border-pi-danger"
          )}
        >
          {/* The summary, then the action on it: "Edit" sits 12px after the
              count, not at the far right (7 Oct 2026). */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <Split className="h-4 w-4 flex-none text-pi-brand" />
              {/* "Godowns/Locations" ellipsised in a third; the short form
                  fits, and the tooltip lists every one (7 Oct 2026). */}
              <span
                title={`${allocations.length} Godowns/Locations`}
                className={cn(T.value, "truncate text-pi-ink")}
              >
                {allocations.length} Godowns
              </span>
            </span>
            {!hideSplitButton && (
              <button
                ref={openerRef}
                type="button"
                aria-expanded={splitOpen}
                aria-controls={splitPanelId}
                disabled={disabled}
                onClick={onToggleSplit}
                title={
                  splitOpen
                    ? "Close the split"
                    : "Edit the split under this field"
                }
                className="flex-none rounded-xs text-[12px] font-medium text-pi-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pi-brand disabled:opacity-40"
              >
                {splitOpen ? "Close" : "Edit"}
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Clear split"
            disabled={disabled}
            onClick={onClear}
            className="flex-none text-pi-faint hover:text-pi-brand"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Tooltip>
    );
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <ComboBox
        title="Select Godown"
        options={godownOptions}
        selectedValue={allocations[0]?.godownUuid || ""}
        onChange={(value) => onSelectSingleGodown(String(value))}
        isMultiSelect={false}
        hasSearch={false}
        disabled={disabled}
        invalid={invalid}
        // room after the name for the split icon
        singleTriggerContentClassName={hideSplitButton ? undefined : "mr-8"}
      />
      {!hideSplitButton && (
        <span ref={actionRef} className={styles.afterValue}>
          <Tooltip message={SPLIT_TIP}>
            <button
              ref={openerRef}
              type="button"
              aria-label="Split this stock across godowns"
              aria-expanded={splitOpen}
              aria-controls={splitPanelId}
              disabled={disabled}
              onClick={onToggleSplit}
              className={cn(ICON_ACTION, splitOpen && "bg-pi-brand-tint")}
            >
              <Split className="h-4 w-4" />
            </button>
          </Tooltip>
        </span>
      )}
    </div>
  );
};

export default GodownAllocationField;
