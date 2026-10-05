import React from "react";
import { cn } from "@/lib/utils";
import {
  GODOWNS,
  INCOME_LEDGERS,
  STOCK_ITEMS,
  TAXES,
} from "@/config/pages/inbox/ar-masters";
import { COST_CENTRES } from "@/config/pages/inbox/journal-masters";
import {
  AddRowButton,
  CellInput,
  CellMoney,
  CellNumber,
  CellSelect,
  GUTTER_CELL,
  GutterCheckbox,
  HEAD_CELL,
  HEAD_ROW,
  RowMenu,
  SectionHeading,
  Td,
  Th,
} from "./tables";
import type { ArItemRow } from "@/types/pages/inbox/ar-invoice";

/**
 * Item Details. Figma node 12759:94656.
 *
 * Nine data columns at the frame's own widths, which sum to 1577 — wider than
 * the 974 the frame gives them, so the table scrolls sideways there and here.
 *
 * The `* Sales Ledger` picker sits above the table rather than in it: every
 * stock line on a sales invoice credits the same income ledger, so asking per
 * row would be asking the same question once per item.
 */

const W = {
  description: "w-[230px] min-w-[230px]",
  item: "w-[230px] min-w-[230px]",
  godown: "w-[230px] min-w-[230px]",
  costCentre: "w-[186px] min-w-[186px]",
  tax: "w-[168px] min-w-[168px]",
  quantity: "w-[88px] min-w-[88px]",
  unitRate: "w-[147px] min-w-[147px]",
  discount: "w-[91px] min-w-[91px]",
  amount: "w-[147px] min-w-[147px]",
};

type Props = {
  rows: ArItemRow[];
  salesLedger: string;
  selected: string[];
  readOnly?: boolean;
  /** True once Approve has been pressed with no Sales Ledger chosen. */
  ledgerError?: boolean;
  onSalesLedger: (v: string) => void;
  onRow: (id: string, patch: Partial<ArItemRow>) => void;
  onSelect: (ids: string[]) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

const ItemDetails = ({
  rows,
  salesLedger,
  selected,
  readOnly,
  ledgerError,
  onSalesLedger,
  onRow,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
}: Props) => {
  const allSelected = rows.length > 0 && selected.length === rows.length;

  /**
   * Amount follows quantity, rate and discount — it is the product of the
   * three, not a fourth independent figure. The frames show it as a field
   * rather than a read-out, so it stays editable: overriding it is how an
   * accountant books a negotiated line the arithmetic does not describe.
   */
  const recalc = (row: ArItemRow, patch: Partial<ArItemRow>) => {
    const next = { ...row, ...patch };
    if (
      patch.quantity !== undefined ||
      patch.unitRate !== undefined ||
      patch.discount !== undefined
    ) {
      const gross = next.quantity * next.unitRate;
      next.amount = Math.round(gross * (1 - next.discount / 100) * 100) / 100;
    }
    return next;
  };

  return (
    <section className="flex flex-col gap-6">
      <SectionHeading>Item Details</SectionHeading>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm leading-5 tracking-[-0.16px] text-foreground">
            <span className="text-destructive-foreground">*</span> Sales Ledger
          </p>
          <div className="w-[220px]">
            <CellSelect
              label="Sales ledger"
              value={salesLedger}
              options={INCOME_LEDGERS}
              placeholder="Select Ledger"
              disabled={readOnly}
              invalid={ledgerError}
              onChange={onSalesLedger}
            />
          </div>
          {ledgerError ? (
            <span className="text-xs text-destructive-foreground">
              Required Field
            </span>
          ) : null}
        </div>

        <div className="overflow-x-auto border-b border-r border-t border-neutral-gray">
          <table className="w-max border-collapse">
            <thead>
              <tr className={HEAD_ROW}>
                <th className={cn(HEAD_CELL, GUTTER_CELL, "border-l-0")}>
                  <GutterCheckbox
                    label="Select all items"
                    checked={allSelected}
                    onChange={(on) => onSelect(on ? rows.map((r) => r.id) : [])}
                  />
                </th>
                <Th className={W.description}>Item Description</Th>
                <Th className={W.item}>Item</Th>
                <Th className={W.godown}>Godown/Location</Th>
                <Th className={W.costCentre}>Cost Centre</Th>
                <Th className={W.tax}>Tax</Th>
                <Th className={W.quantity}>Quantity</Th>
                <Th className={W.unitRate} align="right">
                  Unit Rate
                </Th>
                <Th className={W.discount} align="right">
                  Discount
                </Th>
                <Th className={W.amount} align="right">
                  Amount
                </Th>
                <th className={cn(HEAD_CELL, GUTTER_CELL)} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="bg-background">
                  <Td className={cn(GUTTER_CELL, "border-l-0")}>
                    <GutterCheckbox
                      label={`Select ${row.description || "row"}`}
                      checked={selected.includes(row.id)}
                      onChange={(on) =>
                        onSelect(
                          on
                            ? [...selected, row.id]
                            : selected.filter((id) => id !== row.id)
                        )
                      }
                    />
                  </Td>
                  <Td className={W.description}>
                    <CellInput
                      label="Item description"
                      placeholder="Enter Item Description"
                      disabled={readOnly}
                      value={row.description}
                      onChange={(v) => onRow(row.id, { description: v })}
                    />
                  </Td>
                  <Td className={W.item}>
                    <CellSelect
                      label="Item"
                      placeholder="Type or Select Item"
                      options={STOCK_ITEMS}
                      disabled={readOnly}
                      value={row.item}
                      onChange={(v) => onRow(row.id, { item: v })}
                    />
                  </Td>
                  <Td className={W.godown}>
                    <CellSelect
                      label="Godown or location"
                      placeholder="Select Godown/Location"
                      options={GODOWNS}
                      disabled={readOnly}
                      value={row.godown}
                      onChange={(v) => onRow(row.id, { godown: v })}
                    />
                  </Td>
                  <Td className={W.costCentre}>
                    <CellSelect
                      label="Cost centre"
                      placeholder="Select Cost Centre"
                      options={COST_CENTRES.map((c) => c.name)}
                      disabled={readOnly}
                      value={row.costCentre}
                      onChange={(v) => onRow(row.id, { costCentre: v })}
                    />
                  </Td>
                  <Td className={W.tax}>
                    <CellSelect
                      label="Tax"
                      placeholder="Select a Tax"
                      options={TAXES}
                      disabled={readOnly}
                      value={row.tax}
                      onChange={(v) => onRow(row.id, { tax: v })}
                    />
                  </Td>
                  <Td className={W.quantity}>
                    <CellNumber
                      label="Quantity"
                      disabled={readOnly}
                      value={row.quantity}
                      onChange={(v) =>
                        onRow(row.id, recalc(row, { quantity: v }))
                      }
                    />
                  </Td>
                  <Td className={W.unitRate}>
                    <CellMoney
                      label="Unit rate"
                      disabled={readOnly}
                      value={row.unitRate}
                      onChange={(v) =>
                        onRow(row.id, recalc(row, { unitRate: v }))
                      }
                    />
                  </Td>
                  <Td className={W.discount}>
                    <CellNumber
                      label="Discount"
                      suffix="%"
                      disabled={readOnly}
                      value={row.discount}
                      onChange={(v) =>
                        onRow(row.id, recalc(row, { discount: v }))
                      }
                    />
                  </Td>
                  <Td className={W.amount}>
                    <CellMoney
                      label="Amount"
                      disabled={readOnly}
                      value={row.amount}
                      onChange={(v) => onRow(row.id, { amount: v })}
                    />
                  </Td>
                  <Td className={GUTTER_CELL}>
                    {readOnly ? null : (
                      <RowMenu
                        onDuplicate={() => onDuplicate(row.id)}
                        onRemove={() => onRemove(row.id)}
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {readOnly ? null : (
          <AddRowButton onClick={onAdd}>Add Line Item</AddRowButton>
        )}
      </div>
    </section>
  );
};

export default ItemDetails;
