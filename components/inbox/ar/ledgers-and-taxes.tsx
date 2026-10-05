import React from "react";
import { cn } from "@/lib/utils";
import {
  INCOME_LEDGERS,
  TAXES,
  TAX_LEDGERS,
} from "@/config/pages/inbox/ar-masters";
import { COST_CENTRES } from "@/config/pages/inbox/journal-masters";
import {
  AddRowButton,
  CellInput,
  CellMoney,
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
import type { ArLedgerRow, ArTaxRow } from "@/types/pages/inbox/ar-invoice";

/**
 * Ledgers and Taxes. Figma nodes 12759:94702 and 12759:94734.
 *
 * Two tables the invoice needs beside its stock lines. Ledgers is where a
 * charge that is not an item goes — freight recovered, packing, a rebate —
 * and Taxes is what the lines above attract, posted to its own ledgers rather
 * than derived on the fly. Keeping tax as rows rather than a computed figure
 * is what lets an accountant correct a rate the extraction misread without
 * arguing with a formula.
 *
 * Both fit their frame's width, so unlike Item Details neither scrolls.
 */

export const Ledgers = ({
  rows,
  selected,
  readOnly,
  onRow,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
}: {
  rows: ArLedgerRow[];
  selected: string[];
  readOnly?: boolean;
  onRow: (id: string, patch: Partial<ArLedgerRow>) => void;
  onSelect: (ids: string[]) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const allSelected = rows.length > 0 && selected.length === rows.length;
  return (
    <section className="flex flex-col gap-6">
      <SectionHeading>Ledgers</SectionHeading>
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto border-b border-r border-t border-neutral-gray">
          <table className="w-full min-w-[820px] table-fixed border-collapse">
            <thead>
              <tr className={HEAD_ROW}>
                <th className={cn(HEAD_CELL, GUTTER_CELL, "border-l-0")}>
                  <GutterCheckbox
                    label="Select all ledgers"
                    checked={allSelected}
                    onChange={(on) => onSelect(on ? rows.map((r) => r.id) : [])}
                  />
                </th>
                <Th>Item Description</Th>
                <Th>Ledger</Th>
                <Th className="w-[168px]">Tax</Th>
                <Th className="w-[186px]">Cost Centre</Th>
                <Th className="w-[186px]" align="right">
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
                  <Td>
                    <CellInput
                      label="Item description"
                      placeholder="Enter Item Description"
                      disabled={readOnly}
                      value={row.description}
                      onChange={(v) => onRow(row.id, { description: v })}
                    />
                  </Td>
                  <Td>
                    <CellSelect
                      label="Ledger"
                      placeholder="Select Ledger"
                      options={INCOME_LEDGERS}
                      disabled={readOnly}
                      value={row.ledger}
                      onChange={(v) => onRow(row.id, { ledger: v })}
                    />
                  </Td>
                  <Td>
                    <CellSelect
                      label="Tax"
                      placeholder="Select a Tax"
                      options={TAXES}
                      disabled={readOnly}
                      value={row.tax}
                      onChange={(v) => onRow(row.id, { tax: v })}
                    />
                  </Td>
                  <Td>
                    <CellSelect
                      label="Cost centre"
                      placeholder="Select Cost Centre"
                      options={COST_CENTRES.map((c) => c.name)}
                      disabled={readOnly}
                      value={row.costCentre}
                      onChange={(v) => onRow(row.id, { costCentre: v })}
                    />
                  </Td>
                  <Td>
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
          <AddRowButton onClick={onAdd}>Add Ledger</AddRowButton>
        )}
      </div>
    </section>
  );
};

export const Taxes = ({
  rows,
  readOnly,
  onRow,
  onAdd,
  onDuplicate,
  onRemove,
}: {
  rows: ArTaxRow[];
  readOnly?: boolean;
  onRow: (id: string, patch: Partial<ArTaxRow>) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) => (
  <section className="flex flex-col gap-6">
    <SectionHeading>Taxes</SectionHeading>
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto border-b border-r border-t border-neutral-gray">
        <table className="w-full min-w-[720px] table-fixed border-collapse">
          <thead>
            <tr className={HEAD_ROW}>
              <Th className="border-l-0">Ledger Name</Th>
              <Th>Cost Centre</Th>
              <Th align="right">Amount</Th>
              <th className={cn(HEAD_CELL, "w-[43px] min-w-[43px] px-0")} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="bg-background">
                <Td className="border-l-0" />
                <Td />
                <Td />
                <Td className="w-[43px] px-0" />
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="bg-background">
                <Td className="border-l-0">
                  <CellSelect
                    label="Tax ledger"
                    placeholder="Select Ledger"
                    options={TAX_LEDGERS}
                    disabled={readOnly}
                    value={row.ledger}
                    onChange={(v) => onRow(row.id, { ledger: v })}
                  />
                </Td>
                <Td>
                  <CellSelect
                    label="Cost centre"
                    placeholder="Select Cost Centre"
                    options={COST_CENTRES.map((c) => c.name)}
                    disabled={readOnly}
                    value={row.costCentre}
                    onChange={(v) => onRow(row.id, { costCentre: v })}
                  />
                </Td>
                <Td>
                  <CellMoney
                    label="Tax amount"
                    disabled={readOnly}
                    value={row.amount}
                    onChange={(v) => onRow(row.id, { amount: v })}
                  />
                </Td>
                <Td className="w-[43px] px-0">
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
        <AddRowButton onClick={onAdd}>Add Ledger</AddRowButton>
      )}
    </div>
  </section>
);
