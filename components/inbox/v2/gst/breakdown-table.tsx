import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  nextSort,
  sortRows,
  type SortState,
} from "@/components/inbox/v2/banking/table-parts";
import { T } from "@/components/inbox/v2/ui";
import { ROW_GROUND } from "@/components/inbox/v2/banking/page-parts";
import {
  GROUPED_HEADER_CLASS,
  HeadCell,
  PIN_LEAD,
  PIN_LEAD_HEAD,
} from "./table-parts";

/**
 * The reconciliation ledger (13 Oct 2026), shared by Summary, By Month and
 * By Vendor: a leading column, then groups of figure columns (2B beside PR),
 * then single columns such as the tax gap.
 *
 * It reads as a ledger, not a spreadsheet: rows are ruled, columns are not,
 * except where a group begins. Group names are small caps over the 2B / PR
 * labels. Rows can sit in labelled sections with their own subtotal
 * (Summary's Matched / Needs attention), and a Total closes the table.
 */

export type LedgerColumn<R> = {
  id: string;
  label: string;
  /** The cell. `strong` is a subtotal or total row. */
  render: (row: R, strong: boolean) => React.ReactNode;
  /** Present: the column sorts by this figure (flat tables only). */
  sortValue?: (row: R) => number;
  /** A fixed width, for a column whose content is not a figure. */
  width?: number;
};

export type LedgerGroup<R> = {
  /** Absent: a single column whose own label spans both header rows. */
  label?: string;
  cols: LedgerColumn<R>[];
};

export type LedgerSection<R> = {
  label: string;
  subtotal: R;
  rows: R[];
};

type Props<R> = {
  lead: { label: string; width: number };
  groups: LedgerGroup<R>[];
  /** A flat table… */
  rows?: R[];
  /** …or one in labelled sections. */
  sections?: LedgerSection<R>[];
  rowKey: (row: R) => string;
  renderLead: (row: R) => React.ReactNode;
  total?: R;
  onRowClick?: (row: R) => void;
  rowTitle?: string;
  /** Two-line leads (vendor + GSTIN) get the taller row. */
  tall?: boolean;
  minWidth: number;
};

/** The small-caps voice the group names and section labels share. */
const CAPS =
  "text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-pi-faint";
/** Where a group begins: the one vertical rule a row carries. */
const GROUP_RULE = "border-l border-l-pi-line-2";

const LEDGER_TABLE =
  "table-auto border-separate border-spacing-0 bg-background [&_td]:border-b [&_td]:border-pi-line";

const LedgerTable = <R,>({
  lead,
  groups,
  rows,
  sections,
  rowKey,
  renderLead,
  total,
  onRowClick,
  rowTitle,
  tall,
  minWidth,
}: Props<R>) => {
  const cols = groups.flatMap((g) =>
    g.cols.map((c, i) => ({ ...c, starts: i === 0 }))
  );
  const [sort, setSort] = useState<SortState<string>>(null);
  const flat = !sections;
  const sorted = useMemo(
    () =>
      flat && rows
        ? sortRows(
            rows,
            sort,
            Object.fromEntries(
              cols
                .filter((c) => c.sortValue)
                .map((c) => [c.id, c.sortValue as (r: R) => number])
            )
          )
        : (rows ?? []),
    [rows, sort, flat]
  );

  const height = tall ? "h-16" : "h-14";
  const figures = (row: R, strong: boolean) =>
    cols.map((c) => (
      <TableCell
        key={c.id}
        style={c.width ? { width: c.width } : undefined}
        className={cn(
          height,
          "whitespace-nowrap px-4 py-0 align-middle",
          T.cell,
          c.starts && GROUP_RULE,
          strong && "font-semibold [&_.fig]:font-semibold",
          !strong && ROW_GROUND
        )}
      >
        {c.render(row, strong)}
      </TableCell>
    ));

  const line = (row: R, indent = false) => (
    <TableRow
      key={rowKey(row)}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      title={rowTitle}
      className={cn(
        "group hover:bg-transparent",
        onRowClick && "cursor-pointer"
      )}
    >
      <TableCell
        className={cn(
          height,
          "whitespace-nowrap py-0 pr-4 align-middle",
          indent ? "pl-8" : "pl-6",
          T.cell,
          PIN_LEAD,
          ROW_GROUND
        )}
      >
        {renderLead(row)}
      </TableCell>
      {figures(row, false)}
    </TableRow>
  );

  return (
    <Table className={cn(LEDGER_TABLE, "w-full")} style={{ minWidth }}>
      <colgroup>
        <col style={{ width: lead.width }} />
        {cols.map((c) => (
          <col key={c.id} style={c.width ? { width: c.width } : undefined} />
        ))}
      </colgroup>
      <TableHeader className={GROUPED_HEADER_CLASS}>
        <TableRow className="hover:bg-transparent">
          <TableHead
            rowSpan={2}
            style={{ width: lead.width, minWidth: lead.width }}
            className={cn("h-9 px-6 py-0 align-middle", CAPS, PIN_LEAD_HEAD)}
          >
            {lead.label}
          </TableHead>
          {groups.map((g) =>
            g.label ? (
              <TableHead
                key={g.label}
                colSpan={g.cols.length}
                className={cn(
                  "h-9 px-4 py-0 text-center align-bottom",
                  CAPS,
                  GROUP_RULE
                )}
              >
                <span className="block pb-2">{g.label}</span>
              </TableHead>
            ) : (
              <TableHead
                key={g.cols[0].id}
                rowSpan={2}
                style={g.cols[0].width ? { width: g.cols[0].width } : undefined}
                className={cn(
                  "h-9 px-4 py-0 text-right align-middle",
                  CAPS,
                  GROUP_RULE
                )}
              >
                {g.cols[0].label}
              </TableHead>
            )
          )}
        </TableRow>
        <TableRow className="hover:bg-transparent">
          {groups
            .filter((g) => g.label)
            .flatMap((g) =>
              g.cols.map((c, i) => (
                <HeadCell
                  key={c.id}
                  label={c.label}
                  align="right"
                  className={cn("h-9", i === 0 && GROUP_RULE)}
                  sort={
                    flat && c.sortValue
                      ? sort?.key === c.id
                        ? sort.dir
                        : "none"
                      : undefined
                  }
                  onSort={() => setSort((s) => nextSort(s, c.id))}
                />
              ))
            )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections
          ? sections.map((sec) => (
              <React.Fragment key={sec.label}>
                <TableRow className="bg-pi-head-bg hover:bg-pi-head-bg">
                  <TableCell
                    className={cn(
                      "h-11 px-6 py-0 align-middle text-pi-ink",
                      CAPS,
                      "text-pi-ink",
                      PIN_LEAD,
                      "bg-pi-head-bg"
                    )}
                  >
                    {sec.label}
                  </TableCell>
                  {cols.map((c) => (
                    <TableCell
                      key={c.id}
                      className={cn(
                        "h-11 whitespace-nowrap px-4 py-0 align-middle",
                        T.cell,
                        c.starts && GROUP_RULE,
                        "font-semibold [&_.fig]:font-semibold"
                      )}
                    >
                      {c.render(sec.subtotal, true)}
                    </TableCell>
                  ))}
                </TableRow>
                {sec.rows.map((r) => line(r, true))}
              </React.Fragment>
            ))
          : sorted.map((r) => line(r))}
        {total && (
          <TableRow className="bg-pi-head-bg hover:bg-pi-head-bg [&>td]:border-t [&>td]:border-t-pi-line-strong">
            <TableCell
              className={cn(
                "h-14 px-6 py-0 align-middle text-[13px] font-semibold text-pi-ink",
                PIN_LEAD,
                "bg-pi-head-bg"
              )}
            >
              Total
            </TableCell>
            {figures(total, true)}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default LedgerTable;
