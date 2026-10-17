import React, { useState } from "react";
import { ChevronDown, Split, X } from "@/components/icons";
import ComboBoxPanel, {
  COMBO_BOX_POPOVER_CLASS,
} from "@/components/common/combo-box/panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  COST_CATEGORIES,
  type CostAllocation,
  allocationDetail,
  allocationLabel,
  allocationShortLabel,
  centresInCategory,
  costCentreTree,
} from "@/config/pages/inbox/mock-cost-centres";

/**
 * The Cost centre column.
 *
 * Ported from Prototypes/Journals (components/journal-voucher/common/
 * allocation-cell), then brought in line with Tally and production:
 *
 * - **Only lines whose ledger takes cost centres** offer one — the ledger's
 *   "Cost centres are applicable". Any other line shows a faint dash.
 * - **A header class or cost centre answers for every line**, so the cell is
 *   locked and names it; the split shows on hover.
 * - **One centre or a split.** The picker lists the centres by category, the
 *   tree indented; "Split cost centres", in the picker's footer like every
 *   create action, opens the split under the line (LedgerLines draws it — a
 *   panel in place since 7 Oct 2026, not a dialog), which divides the line
 *   per category. A split reads "Split · 3 centres"; the breakdown is on
 *   hover.
 * - **Empty reads as a field, not a call to action** (7 Oct): "Select cost
 *   centre" in the faint placeholder ink, the way the bill table's cells
 *   ask, rather than a tinted pill with a + in it.
 *
 * A line only offers an allocation once it carries a figure — there is
 * nothing to allocate before that.
 *
 * Values are names, as everywhere on the Inbox's `Form`.
 */

type Props = {
  /** One cost centre for the line, by name. */
  value: string;
  /** A split, when the line has one. Wins over `value`. */
  allocation?: CostAllocation | null;
  /** The line's amount — what a split divides. 0 means nothing to allocate. */
  amount: number;
  /** Whether the line's ledger takes cost centres at all. */
  applicable: boolean;
  /** The header's class or cost centre, when one is set: label and hover. */
  locked?: { label: string; detail: string } | null;
  readOnly?: boolean;
  /** Whether the line's split is open under it. */
  splitting?: boolean;
  /** Opens (or re-opens) the split under the line. */
  onSplit?: () => void;
  onChange: (patch: {
    costCentre: string;
    costAllocation: CostAllocation | null;
  }) => void;
};

const faint = "text-[13px] text-pi-faint";

/** The centres by category, each tree indented under the centre it sits in. */
const OPTION_GROUPS = COST_CATEGORIES.map((cat) => ({
  label: cat.name,
  options: costCentreTree(centresInCategory(cat.name)).map(
    ({ centre, depth }) => ({
      value: centre.name,
      label: depth ? (
        <span style={{ paddingLeft: depth * 16 }}>{centre.name}</span>
      ) : (
        centre.name
      ),
    })
  ),
}));

const AllocationCell = ({
  value,
  allocation,
  amount,
  applicable,
  locked,
  readOnly,
  splitting,
  onSplit,
  onChange,
}: Props) => {
  const [open, setOpen] = useState(false);

  if (!amount)
    return (
      <span className={faint} aria-label="No allocation">
        -
      </span>
    );

  if (!applicable)
    return (
      <span
        className={faint}
        aria-label="Not applicable"
        title="This ledger does not take cost centres"
      >
        —
      </span>
    );

  if (locked)
    return (
      <span
        className="block truncate text-[13px] text-pi-body"
        title={locked.detail}
      >
        {locked.label}
      </span>
    );

  const split = allocation?.length ? allocation : null;
  const shown = split ? allocationShortLabel(split) : value;
  const hover = split
    ? `${allocationLabel(split)} — ${allocationDetail(split)}`
    : undefined;

  // A read-only voucher still has to say what it was allocated to; it just has
  // no picker behind it.
  if (readOnly)
    return (
      <span className="block truncate text-[13px] text-pi-ink" title={hover}>
        {shown || <span className="text-pi-faint">-</span>}
      </span>
    );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={hover}
            aria-expanded={splitting || undefined}
            data-placeholder={shown ? undefined : ""}
            className={cn(
              "inline-flex h-8 w-full min-w-0 items-center gap-2 rounded-sm border border-transparent px-2 text-left text-[13px] hover:border-pi-line-2 hover:bg-pi-surface-panel",
              shown ? "text-pi-ink" : "text-pi-faint",
              splitting && "border-pi-brand bg-pi-surface-panel"
            )}
          >
            {split ? <Split className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className="min-w-0 flex-1 truncate">
              {shown || "Select cost centre"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 flex-none text-pi-faint" />
          </button>
        </PopoverTrigger>
        {/*
          The same panel every picker in the app opens (search, grouped list,
          fixed footer), so "Split cost centres" sits in the footer exactly
          where "Create ledger" sits in the ledger picker.
        */}
        <PopoverContent
          align="start"
          className={cn("w-72", COMBO_BOX_POPOVER_CLASS)}
        >
          <ComboBoxPanel<string>
            title="Cost centre"
            searchPlaceholder="Search cost centres"
            size="sm"
            isMultiSelect={false}
            options={[]}
            optionGroups={OPTION_GROUPS}
            selectedValues={split || !value ? [] : [value]}
            onSelect={(option) => {
              onChange({
                costCentre: String(option.value),
                costAllocation: null,
              });
              setOpen(false);
            }}
            actionLabel={split ? "Edit split" : "Split cost centres"}
            actionIcon={Split}
            onAction={() => {
              setOpen(false);
              onSplit?.();
            }}
          />
          {shown ? (
            <div className="border-t border-pi-line bg-background p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-[13px] font-medium text-pi-danger hover:bg-pi-danger-bg"
                onClick={() => {
                  onChange({ costCentre: "", costAllocation: null });
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 flex-none" />
                Clear cost centre
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </>
  );
};

export default AllocationCell;
