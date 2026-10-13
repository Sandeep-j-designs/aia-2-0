import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { setPrecisionToTwoDecimals } from "@/hooks/pages/inbox/use-stock-item-form";
import type {
  AllocationLike,
  GodownAllocationDraftRow,
  Option,
} from "@/types/pages/inbox/inventory";
import { Pill, T } from "@/components/inbox/v2/ui";
import NumericInput from "./numeric-input";
import styles from "./create-item.module.css";

type Props = {
  /** Referenced by the opener's aria-controls. */
  id: string;
  /** The control that opened the split; the notch points at it. */
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  /** The opening balance line being split. */
  quantity: number;
  rate: number;
  amount: number;
  allocations: AllocationLike[];
  godownOptions: Option[];
  /** Unit "Not Applicable": quantity and rate are 0, amounts are typed. */
  forceAmountEditableMode: boolean;
  onSave: (allocations: AllocationLike[]) => void;
};

const COLUMNS = [
  { key: "godown", label: "Godown/Location", className: "w-[36%]" },
  { key: "quantity", label: "Qty", className: "text-right" },
  { key: "rate", label: "Rate", className: "text-right" },
  { key: "amount", label: "Amount", className: "w-[22%] text-right" },
  { key: "actions", label: "", className: "w-12" },
];

let rowSeq = 0;
const newRowId = () => `draft-${Date.now().toString(36)}-${rowSeq++}`;

/**
 * The split now opens as a panel under the godown field, the full width of
 * the card, instead of a dialog (7 Oct 2026): the bill form's sub-forms all
 * moved inline so the line being split stays in view. The draft and its
 * checks are unchanged — rows only reach the form through Apply, which stays
 * disabled until the split adds up; Cancel, or the opener again, drops it.
 *
 * production's AP godown-split-modal (accounts-payable/tally/create-voucher/
 * line-items-section/item-details-section/godown-split-modal*.tsx), as the
 * stock item's opening balance uses it. The Discount column is left out: an
 * opening balance has none.
 */
const GodownSplitPanel = ({
  id,
  anchorRef,
  onClose,
  quantity,
  rate,
  amount,
  allocations,
  godownOptions,
  forceAmountEditableMode,
  onSave,
}: Props) => {
  const isAmountEditableMode = forceAmountEditableMode;
  const isQuantityDrivenMode = !isAmountEditableMode && quantity !== 0;
  const parentLineQuantity = setPrecisionToTwoDecimals(quantity);
  const parentLineAmount = setPrecisionToTwoDecimals(amount);

  const [draftRows, setDraftRows] = useState<GodownAllocationDraftRow[]>(() =>
    allocations.length
      ? allocations.map((a) => ({
          id: a.id || newRowId(),
          godownUuid: a.godownUuid || "",
          quantity: a.quantity ?? 0,
          rate,
          amount: a.amount ?? 0,
        }))
      : [
          {
            id: newRowId(),
            godownUuid: "",
            quantity: parentLineQuantity,
            rate,
            amount: parentLineAmount,
          },
        ]
  );

  const totalQuantity = setPrecisionToTwoDecimals(
    draftRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0)
  );

  // Quantity-driven rows price themselves; the last one takes the paise
  // the rounding leaves, as production's finalRows does.
  const finalRows = useMemo(() => {
    if (isAmountEditableMode) return draftRows;
    const rows = draftRows.map((row) => ({
      ...row,
      rate,
      amount: setPrecisionToTwoDecimals((row.quantity ?? 0) * rate),
    }));
    if (!rows.length || totalQuantity !== parentLineQuantity) return rows;
    const diff = setPrecisionToTwoDecimals(
      parentLineAmount - rows.reduce((sum, row) => sum + row.amount, 0)
    );
    if (diff !== 0) {
      const last = rows.length - 1;
      rows[last] = {
        ...rows[last],
        amount: setPrecisionToTwoDecimals(rows[last].amount + diff),
      };
    }
    return rows;
  }, [draftRows, isAmountEditableMode, rate, totalQuantity]);

  const totalAmount = setPrecisionToTwoDecimals(
    finalRows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  );

  const selectedGodowns = finalRows.map((r) => r.godownUuid).filter(Boolean);
  const hasDuplicateGodowns =
    new Set(selectedGodowns).size !== selectedGodowns.length;
  const hasIncompleteRows = finalRows.some(
    (row) =>
      !row.godownUuid ||
      (isQuantityDrivenMode ? row.quantity === 0 : row.amount === 0)
  );
  const shouldValidateQuantity =
    isQuantityDrivenMode || finalRows.some((r) => r.quantity !== 0);
  const quantityMatchesParent =
    !shouldValidateQuantity || totalQuantity === parentLineQuantity;
  const amountMatchesParent = totalAmount === parentLineAmount;
  const isSaveDisabled =
    hasIncompleteRows ||
    hasDuplicateGodowns ||
    !amountMatchesParent ||
    !quantityMatchesParent;

  const update = (id: string, patch: Partial<GodownAllocationDraftRow>) =>
    setDraftRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const addRow = () => {
    const remaining = setPrecisionToTwoDecimals(
      parentLineQuantity - totalQuantity
    );
    const remainingAmount = setPrecisionToTwoDecimals(
      parentLineAmount - totalAmount
    );
    setDraftRows((rows) => [
      ...rows,
      {
        id: newRowId(),
        godownUuid: "",
        quantity: isAmountEditableMode ? 0 : remaining,
        rate,
        amount: isAmountEditableMode ? remainingAmount : 0,
      },
    ]);
  };

  const save = () => {
    if (isSaveDisabled) return;
    onSave(
      finalRows.map((row) => ({
        id: row.id,
        godownUuid: row.godownUuid,
        quantity: isAmountEditableMode ? 0 : row.quantity,
        rate: isAmountEditableMode ? 0 : row.rate,
        discount: 0,
        amount: row.amount,
      }))
    );
    onClose();
  };

  // The notch sits over the opener's centre, re-aimed as the card resizes.
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const aim = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const a = anchor.getBoundingClientRect();
      const b = panel.getBoundingClientRect();
      if (!a.width || !b.width) return;
      const at = `${Math.round(a.left - b.left + a.width / 2 - 5)}px`;
      if (panel.style.getPropertyValue("--notch-x") !== at)
        panel.style.setProperty("--notch-x", at);
    };
    aim();
    const ro = new ResizeObserver(aim);
    ro.observe(panel);
    return () => ro.disconnect();
  });

  const formattedAmount = parentLineAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      ref={panelRef}
      id={id}
      role="region"
      aria-label="Split godown/location"
      className={cn(styles.panel, "sm:col-span-full")}
    >
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <h3 className={cn(T.label, "truncate text-pi-ink")}>
          Allocate Godown/Location
        </h3>
        <Pill tone="neutral" className="flex-none text-[12px]">
          Total Quantity: <span className="fig">{parentLineQuantity}</span> |
          Amount: <span className="fig">₹{formattedAmount}</span>
        </Pill>
      </div>

      <div className="overflow-x-auto rounded-lg border border-pi-line bg-background">
        <Table className="border-separate border-spacing-0 [&_td]:border-b [&_td]:border-pi-line [&_tr:last-child_td]:border-b-0">
          <TableHeader className="[&_tr]:shadow-none">
            <TableRow className="bg-pi-head-bg hover:bg-pi-head-bg [&_th]:border-b [&_th]:border-pi-line">
              {COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "h-9 whitespace-nowrap px-3",
                    T.head,
                    column.className
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalRows.map((row) => (
              <TableRow key={row.id} className="border-0 hover:bg-transparent">
                <TableCell className="px-3 py-2 align-top">
                  <ComboBox
                    title="Select Godown/Location"
                    options={godownOptions}
                    selectedValue={row.godownUuid}
                    onChange={(value) =>
                      update(row.id, { godownUuid: String(value) })
                    }
                    isMultiSelect={false}
                    hasSearch={false}
                  />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <NumericInput
                    aria-label="Quantity"
                    value={row.quantity}
                    onChange={(value) =>
                      update(row.id, { quantity: value ?? 0 })
                    }
                    allowNegative
                    disabled={isAmountEditableMode}
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <NumericInput
                    aria-label="Rate"
                    value={row.rate}
                    disabled
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <NumericInput
                    aria-label="Amount"
                    value={row.amount}
                    onChange={(value) => update(row.id, { amount: value ?? 0 })}
                    allowNegative
                    disabled={!isAmountEditableMode}
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove row"
                    className="h-9 w-9 text-pi-faint hover:text-pi-danger"
                    onClick={() =>
                      setDraftRows((rows) =>
                        rows.filter((r) => r.id !== row.id)
                      )
                    }
                    disabled={draftRows.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add row, the checks, then Cancel / Apply on one line: the split
          stays a draft until it adds up (7 Oct 2026). */}
      <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit flex-none px-2 text-pi-brand hover:bg-pi-brand-tint"
            onClick={addRow}
          >
            <Plus className="h-4 w-4" />
            Add New Row
          </Button>
          <div
            role="status"
            className="flex min-w-0 flex-col text-[12px] leading-4 text-pi-danger"
          >
            {hasDuplicateGodowns ? (
              <span>Duplicate godown selections are not allowed.</span>
            ) : null}
            {!amountMatchesParent ? (
              <span>Total allocation amount must match the line amount.</span>
            ) : null}
            {!quantityMatchesParent ? (
              <span>
                Total allocation quantity must match the line quantity.
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={isSaveDisabled}
          >
            Apply split
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GodownSplitPanel;
