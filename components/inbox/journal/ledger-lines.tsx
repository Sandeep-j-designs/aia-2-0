import React, { useState } from "react";
import { Maximize, Plus, Trash2 } from "@/components/icons";
import Typography from "@/components/common/typography";
import RupeeInput from "@/components/common/rupee-input";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LEDGERS,
  ledgerTakesCostCentre,
} from "@/config/pages/inbox/journal-masters";
import AllocationCell from "./allocation-cell";
import CostAllocationPanel from "./cost-allocation-panel";
import type { Form, JournalLineError } from "@/components/inbox/v2/store";

/**
 * Ledger Lines.
 *
 * Ported from Prototypes/Journals (components/journal-voucher/ledger-lines).
 *
 * Debit and Credit are two cells holding one choice: typing into either clears
 * the other, so a line can never be both sides of its own entry.
 */

type Line = Form["lines"][number];

/**
 * The table's grid, in the Precision Indigo table pattern: one white card, a
 * head-bg strip in 12px/500 body ink, hairline row dividers and no vertical
 * rules. Body rows reserve a fixed control row so the primary field lines up
 * across the row whatever sits under it. Written once here rather than
 * repeated on ten cells.
 */
const HEAD_ROW = "border-b border-pi-line bg-pi-head-bg hover:bg-pi-head-bg";

// A table cell cannot be a flex container without collapsing the table's own
// layout, so alignment here is text-align, not justify-content.
const HEAD_CELL = cn(
  "px-3 py-3 align-middle",
  "h-[42px] text-[12px] font-medium text-pi-body whitespace-nowrap"
);

const BODY_ROW =
  "border-b border-pi-line last:border-b-0 hover:bg-pi-row-hover";

const BODY_CELL = "h-[64px] px-3 py-3 align-middle";

/**
 * Column widths, narrowed from the Journals page's.
 *
 * There they are 232/232/200/200/180/43 and sum to 1087, which a full-width
 * page seats comfortably. This form does not get a full-width page — it sits
 * beside the document the voucher was read from, so its own column is roughly
 * 820px at 1440. At the page's widths the last two columns fell off the right
 * edge, which meant Allocation and the remove control were only reachable by
 * finding a horizontal scrollbar under the table.
 *
 * So: the same order and the same proportions, trimmed to fit, with Line
 * Narration left to absorb whatever is going spare. It is the one column whose
 * content has no natural width — a ledger name, a rupee figure and a cost
 * centre pill all do. `table-fixed` is what hands it the remainder.
 *
 * The floor below is the sum of the fixed columns plus a readable narration.
 * Under that the table scrolls, which is the behaviour the page already had.
 */
const COL = {
  ledger: "w-[190px]",
  narration: "", // takes the remainder
  debit: "w-[140px]",
  credit: "w-[140px]",
  allocation: "w-[168px]",
  actions: "w-[44px]",
};
const TABLE_FLOOR = "min-w-[812px]";

type Props = {
  lines: Line[];
  /** Line indexes carrying a fault, and which cell it belongs to. */
  errors: JournalLineError[];
  /**
   * The header's class or cost centre, when one is set. It answers for every
   * line, so the Cost centre cells lock and name it.
   */
  costLock?: { label: string; detail: string } | null;
  readOnly?: boolean;
  onLineChange: (index: number, patch: Partial<Line>) => void;
  onAmountChange: (index: number, side: "dr" | "cr", value: number) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  /** Ledgers created this session; listed under "New" ahead of the masters. */
  createdLedgers?: string[];
  /**
   * "+ Create ledger" in the picker. Hands over the search text and the line
   * it came from; the caller opens the create dialog and assigns the result.
   */
  onCreateLedger?: (query: string, index: number) => void;
  /** Opens the entries in the wide sheet; absent inside that sheet. */
  onExpand?: () => void;
};

/**
 * The masters grouped as Tally groups them. A real chart of accounts runs to
 * hundreds, so the picker searches rather than scrolls.
 */
const LEDGER_GROUPS = [...new Set(LEDGERS.map((l) => l.group))].map(
  (group) => ({
    label: group,
    options: LEDGERS.filter((l) => l.group === group).map((l) => ({
      label: l.name,
      value: l.name,
    })),
  })
);

const LedgerLines = ({
  lines,
  errors,
  costLock,
  readOnly,
  onLineChange,
  onAmountChange,
  onAddLine,
  onRemoveLine,
  createdLedgers = [],
  onCreateLedger,
  onExpand,
}: Props) => {
  const errorAt = (index: number, kind: "amount" | "ledger") =>
    errors.some((e) => e.index === index && e.kind === kind);
  /*
    The line whose cost centre split is open, in a row of its own under it
    (7 Oct 2026) — the dialog it used to open is now this panel. One at a
    time, like every in-place panel on the form.
  */
  const [splitAt, setSplitAt] = useState<number | null>(null);
  const columns = readOnly ? 5 : 6;

  return (
    <section className="jv-lines">
      <div className="cr-items-head">
        <h3>
          Journal entries <span>{lines.length}</span>
        </h3>
        <div>
          <span className="cr-items-coded">
            {lines.filter((l) => l.ledger).length} of {lines.length} coded
          </span>
          <span className="cr-items-cur">INR</span>
          {onExpand ? (
            <button
              type="button"
              className="cr-expand"
              aria-label="Expand journal entries"
              onClick={onExpand}
            >
              <Maximize size={14} />
              <span>Expand</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* One white card is the scrollport, as every table in the app. */}
      <div className="overflow-x-auto rounded-lg border border-pi-line bg-pi-surface-panel shadow-table">
        <Table
          className={cn("w-full table-fixed border-collapse", TABLE_FLOOR)}
        >
          <TableHeader>
            <TableRow className={HEAD_ROW}>
              <TableHead className={cn(HEAD_CELL, COL.ledger)}>
                Ledger
              </TableHead>
              <TableHead className={cn(HEAD_CELL, COL.narration)}>
                Line narration
              </TableHead>
              <TableHead className={cn(HEAD_CELL, COL.debit, "text-right")}>
                Debit
              </TableHead>
              <TableHead className={cn(HEAD_CELL, COL.credit, "text-right")}>
                Credit
              </TableHead>
              <TableHead className={cn(HEAD_CELL, COL.allocation)}>
                Cost centre
              </TableHead>
              {!readOnly ? (
                <TableHead className={cn(HEAD_CELL, COL.actions)} />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const amountError = errorAt(index, "amount");
              const ledgerError = errorAt(index, "ledger");
              const splitting = splitAt === index;
              return (
                <React.Fragment key={index}>
                  <TableRow
                    className={cn(BODY_ROW, splitting && "border-b-0")}
                    data-source-line={index}
                  >
                    <TableCell
                      className={BODY_CELL}
                      data-source={`line.${index}.ledger`}
                      data-source-label={`Line ${index + 1} · Ledger`}
                    >
                      <ComboBox
                        title="Select ledger"
                        size="sm"
                        searchPlaceholder="Search ledgers…"
                        isMultiSelect={false}
                        hideClearButton
                        modal={false}
                        disabled={readOnly}
                        invalid={ledgerError}
                        selectedValue={line.ledger}
                        // Every name the list can hold, so the trigger can show
                        // a created or extracted ledger that is not a master.
                        options={[
                          ...new Set(
                            [
                              line.ledger,
                              ...createdLedgers,
                              ...LEDGERS.map((l) => l.name),
                            ].filter(Boolean)
                          ),
                        ].map((name) => ({ label: name, value: name }))}
                        optionGroups={[
                          ...(createdLedgers.length
                            ? [
                                {
                                  label: "New",
                                  options: createdLedgers.map((name) => ({
                                    label: name,
                                    value: name,
                                  })),
                                },
                              ]
                            : []),
                          // An extracted ledger that is not a master yet still
                          // has to be findable, or the trigger names a value the
                          // list cannot show.
                          ...(line.ledger &&
                          !createdLedgers.includes(line.ledger) &&
                          !LEDGERS.some((l) => l.name === line.ledger)
                            ? [
                                {
                                  label: "From the document",
                                  options: [
                                    {
                                      label: line.ledger,
                                      value: line.ledger,
                                    },
                                  ],
                                },
                              ]
                            : []),
                          ...LEDGER_GROUPS,
                        ]}
                        wrapperClassName="min-w-[280px]"
                        triggerClassName="text-sm jv-cell-trigger"
                        onChange={(value) =>
                          onLineChange(index, { ledger: String(value) })
                        }
                        actionLabel={
                          onCreateLedger
                            ? (query) =>
                                query
                                  ? `Create ledger “${query}”`
                                  : "Create ledger"
                            : undefined
                        }
                        onAction={
                          onCreateLedger
                            ? (query) => onCreateLedger(query, index)
                            : undefined
                        }
                      />
                      {ledgerError ? (
                        <Typography
                          variant="sm"
                          className="mt-1 text-[12px] text-pi-danger"
                        >
                          Required Field
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell
                      className={BODY_CELL}
                      data-source={`line.${index}`}
                      data-source-label={`Line ${index + 1} · Narration`}
                    >
                      <Input
                        aria-label="Line narration"
                        placeholder="Add a line narration"
                        readOnly={readOnly}
                        value={line.description}
                        onChange={(event) =>
                          onLineChange(index, {
                            description: event.target.value,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell
                      className={BODY_CELL}
                      data-source={`line.${index}.dr`}
                      data-source-label={`Line ${index + 1} · Debit`}
                    >
                      <RupeeInput
                        aria-label="Debit"
                        value={line.dr}
                        disabled={readOnly}
                        hasError={amountError}
                        onChange={(value) => onAmountChange(index, "dr", value)}
                      />
                      {amountError ? (
                        <Typography
                          variant="sm"
                          className="mt-1 text-right text-[12px] text-pi-danger"
                        >
                          Required Field
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell
                      className={BODY_CELL}
                      data-source={`line.${index}.cr`}
                      data-source-label={`Line ${index + 1} · Credit`}
                    >
                      <RupeeInput
                        aria-label="Credit"
                        value={line.cr}
                        disabled={readOnly}
                        hasError={amountError}
                        onChange={(value) => onAmountChange(index, "cr", value)}
                      />
                      {amountError ? (
                        <Typography
                          variant="sm"
                          className="mt-1 text-right text-[12px] text-pi-danger"
                        >
                          Required Field
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell className={BODY_CELL}>
                      <AllocationCell
                        value={line.costCentre}
                        allocation={line.costAllocation}
                        amount={line.dr || line.cr}
                        applicable={ledgerTakesCostCentre(line.ledger)}
                        locked={costLock}
                        readOnly={readOnly}
                        splitting={splitting}
                        onSplit={() => setSplitAt(index)}
                        onChange={(patch) => {
                          onLineChange(index, patch);
                          if (splitting) setSplitAt(null);
                        }}
                      />
                    </TableCell>

                    {!readOnly ? (
                      // px-0 and the 32px icon-sm button: under `table-fixed` this column
                      // is held at 44px, and the cell's usual 10px of side
                      // padding would leave a 40px control 24px to sit in.
                      <TableCell className={cn(BODY_CELL, "px-0")}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove line"
                          className="mx-auto"
                          onClick={() => onRemoveLine(index)}
                        >
                          <Trash2 className="h-4 w-4 text-pi-faint" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                  {splitting ? (
                    <TableRow
                      className={cn(
                        BODY_ROW,
                        "jv-split-row hover:bg-transparent"
                      )}
                    >
                      <TableCell colSpan={columns} className="px-3 pb-3 pt-0">
                        <CostAllocationPanel
                          amount={line.dr || line.cr}
                          initial={line.costAllocation ?? null}
                          seedCentre={line.costCentre}
                          // under the Cost centre cell: the actions column and
                          // half the allocation column in from the right
                          notchRight={readOnly ? 58 : 102}
                          onClose={() => setSplitAt(null)}
                          onSave={(next) =>
                            onLineChange(index, {
                              costCentre: "",
                              costAllocation: next,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
        {!readOnly ? (
          <div className="cr-grid-bar">
            <button type="button" className="cr-add" onClick={onAddLine}>
              <Plus className="h-4 w-4" />
              Add ledger line
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default LedgerLines;
