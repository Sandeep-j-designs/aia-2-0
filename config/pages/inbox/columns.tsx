import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import ChannelPill from "@/components/inbox/common/channel-pill";
import FileIcon from "@/components/inbox/common/file-icon";
import RoutePill from "@/components/inbox/common/route-pill";
import StatusPill from "@/components/inbox/common/status-pill";
import RowKebab from "@/components/inbox/common/row-kebab";
import { formatAgo, formatDate, formatInr } from "@/utils/pages/inbox";
import type { InboxItem } from "@/types/pages/inbox";

export type RowActions = {
  onOpen: (item: InboxItem) => void;
  onDelete: (item: InboxItem) => void;
  onRetry: (item: InboxItem) => void;
  onCancelExtraction: (item: InboxItem) => void;
  onConvert: (item: InboxItem, target: "JV") => void;
  onOpenRecord: (item: InboxItem) => void;
  onReverse: (item: InboxItem) => void;
};

/**
 * Unified Inbox — table columns.
 *
 * Static config, so it lives here rather than in the component, matching
 * production's config/pages/<feature>/ convention. Ported from the <thead> and
 * row markup in js/inbox-list.jsx.
 *
 * Column widths were fixed px classes in the original (col-file, col-source…);
 * they are `size` values here so TanStack owns the layout.
 *
 * The sizes sum to 1189px, which is what a 1440px viewport leaves after the
 * 200px sidebar and the 24px page gutters. Status is the column the accountant
 * scans to decide what to open, so it must never be the one pushed off the
 * right edge — check that first if you widen anything.
 */

export type InboxColumnsMeta = {
  /** Wall clock for relative timestamps. null until the client mounts. */
  now: number | null;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  rowActions: RowActions;
};

export const buildInboxColumns = (
  meta: InboxColumnsMeta
): ColumnDef<InboxItem>[] => [
  {
    id: "select",
    size: 40,
    header: () => (
      <Checkbox
        checked={
          meta.allSelected ? true : meta.someSelected ? "indeterminate" : false
        }
        onCheckedChange={meta.onToggleAll}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => {
      const item = row.original;
      const disabled = item.status === "extracting";
      return (
        <span
          onClick={(event) => event.stopPropagation()}
          className="flex items-center"
        >
          <Checkbox
            checked={meta.selectedIds.has(item.id)}
            disabled={disabled}
            onCheckedChange={() => meta.onToggleOne(item.id)}
            aria-label={`Select ${item.file.name}`}
          />
        </span>
      );
    },
  },
  {
    id: "file",
    header: "File",
    size: 238,
    cell: ({ row }) => {
      const { file, id } = row.original;
      return (
        <div className="flex min-w-0 items-center gap-3">
          <FileIcon ext={file.ext} />
          <div className="min-w-0 flex-1 overflow-hidden">
            <div
              className="truncate font-semibold text-foreground"
              title={file.name}
            >
              {file.name}
            </div>
            <div className="truncate text-xs text-secondary-foreground">
              {file.size} · {id}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "source",
    header: "Source",
    size: 145,
    cell: ({ row }) => {
      const { source } = row.original;
      return (
        <div className="flex min-w-0 max-w-full flex-col items-start gap-1">
          <ChannelPill channel={source.channel} />
          <span
            className="w-full truncate text-xs text-secondary-foreground"
            title={source.sender}
          >
            {source.sender}
          </span>
        </div>
      );
    },
  },
  {
    id: "party",
    header: "Vendor / Customer",
    size: 150,
    cell: ({ row }) => {
      const { vendor, customer, bill } = row.original;
      const label = vendor || customer || "—";
      return (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate" title={label}>
            {label}
          </span>
          {bill?.vendorMissing ? (
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="flex-none text-xs font-medium text-primary hover:underline"
            >
              + Add
            </button>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "voucherType",
    header: "Voucher Type",
    size: 100,
    cell: ({ row }) => (
      <span className="block truncate" title={row.original.voucherType}>
        {row.original.voucherType || "—"}
      </span>
    ),
  },
  {
    id: "route",
    header: "AI Route",
    size: 112,
    cell: ({ row }) => <RoutePill route={row.original.route} />,
  },
  {
    id: "amount",
    header: () => <div className="text-right">Amount</div>,
    size: 125,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatInr(row.original.amount)}
      </div>
    ),
  },
  {
    id: "receivedAt",
    header: () => <div className="text-right">Received</div>,
    size: 105,
    cell: ({ row }) => {
      const { receivedAt } = row.original;
      return (
        <div className="flex flex-col items-end">
          <span className="text-sm text-foreground">
            {formatDate(receivedAt)}
          </span>
          <span className="text-xs text-secondary-foreground">
            {meta.now === null ? "—" : formatAgo(receivedAt, meta.now)}
          </span>
        </div>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    size: 130,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={row.original.status} aged={row.original.aged} />
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    size: 44,
    cell: ({ row }) => <RowKebab item={row.original} {...meta.rowActions} />,
  },
];
