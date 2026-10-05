import React, { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildInboxColumns,
  type InboxColumnsMeta,
} from "@/config/pages/inbox/columns";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/types/pages/inbox";

/**
 * Ported from the <table className="tbl tbl--inbox"> block in js/inbox-list.jsx.
 *
 * DEV: production has richer shared table components at
 *      components/common/tanstack-data-table/ — column resizing, virtualisation,
 *      skeleton and empty rows. Swap this for those on transplant; the column
 *      defs in config/pages/inbox/columns.tsx carry over unchanged.
 *      Virtualisation matters here: the AR grids run to 1,000+ rows.
 */

type Props = {
  items: InboxItem[];
  meta: InboxColumnsMeta;
  onRowClick: (item: InboxItem) => void;
};

const InboxTable = ({ items, meta, onRowClick }: Props) => {
  const columns = useMemo(() => buildInboxColumns(meta), [meta]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="h-full overflow-auto rounded-lg border border-neutral-gray">
      {/*
        table-fixed, not the default table-auto. TanStack's `size` is only a
        hint under auto layout, so long filenames and sender addresses widened
        their columns and pushed Status — the column the accountant actually
        scans — off the right edge. Fixed layout honours the widths and the
        cells truncate instead.
      */}
      <Table className="table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-section">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="h-10 text-xs font-medium text-secondary-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-48 text-center text-sm text-secondary-foreground"
              >
                No items in this view. Try a different tab or clear filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const item = row.original;
              // Extraction is in flight — nothing to review yet.
              const disabled = item.status === "extracting";

              return (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick(item)}
                  data-state={
                    meta.selectedIds.has(item.id) ? "selected" : undefined
                  }
                  className={cn(
                    "min-h-[45px] cursor-pointer",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="py-3 align-middle text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InboxTable;
