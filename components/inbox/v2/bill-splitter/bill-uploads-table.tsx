import React from "react";
import { MoreVertical, RotateCcw, Scissors } from "@/components/icons";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FileIcon from "@/components/inbox/common/file-icon";
import { cn } from "@/lib/utils";
import type { SplitPacket } from "@/types/pages/inbox/bill-splitter";
import { billsOf } from "@/utils/pages/inbox/bill-splitter";
import { StatusPill, T } from "../ui";
import { DotChip } from "../sales-upload/common";
import type { Item } from "../store";

type Props = {
  packets: SplitPacket[];
  /** Bills uploaded one at a time through Upload Bills. */
  uploads: Item[];
  onOpenUpload: (item: Item) => void;
  onReview: (packet: SplitPacket) => void;
  onRetry: (packet: SplitPacket) => void;
  onRemove: (packet: SplitPacket) => void;
  onRemoveUpload: (item: Item) => void;
};

const stamp = (iso: string) => format(new Date(iso), "d MMM yyyy, h:mm aaa");

/** The PRD's four packet states, in the words it gives them, as dot-chips. */
const PacketStatus = ({ packet }: { packet: SplitPacket }) => {
  switch (packet.status) {
    case "inProgress":
      return <DotChip tone="progress">In progress</DotChip>;
    case "splitReady":
      return <DotChip tone="warn">Split ready</DotChip>;
    case "failed":
      return <DotChip tone="error">Failed</DotChip>;
    case "completed":
      return <DotChip tone="ok">Completed</DotChip>;
  }
};

/** The line under the file name: what the packet is doing, in words. */
const packetDetail = (packet: SplitPacket) => {
  if (packet.status === "inProgress")
    return "Reading pages and finding where each bill starts";
  if (packet.status === "failed") return packet.failure?.reason ?? "";
  if (packet.status === "completed")
    return `Split into ${packet.billCount} ${packet.billCount === 1 ? "bill" : "bills"} · sent to Needs Review`;
  const bills = packet.plan ? billsOf(packet.plan).length : 0;
  return `${bills} ${bills === 1 ? "bill" : "bills"} found across ${packet.pageCount} pages`;
};

/**
 * Bill Uploads — files on their way in. A multi-bill packet lives here, not
 * in Needs Review, until its split is confirmed (PRD); single bills sit here
 * beside it with the Inbox's own status.
 */
const BillUploadsTable = ({
  packets,
  uploads,
  onOpenUpload,
  onReview,
  onRetry,
  onRemove,
  onRemoveUpload,
}: Props) => {
  const head = cn("h-11 whitespace-nowrap px-4 py-0 align-middle", T.head);
  // Row hover wash across the whole row, the Inbox's.
  const cell = cn(
    "h-14 px-4 py-0 align-middle transition-colors duration-100 group-hover:bg-pi-row-hover motion-reduce:transition-none",
    T.cell
  );

  return (
    // No scroll of its own: the register page scrolls both axes, and the
    // header sticks against it.
    <div className="min-w-0 flex-1">
      <Table className="min-w-[880px] table-fixed border-separate border-spacing-0 bg-background [&_td]:border-b [&_td]:border-pi-line [&_th]:border-b [&_th]:border-pi-line">
        <TableHeader className="sticky top-0 z-10 bg-pi-head-bg [&_tr]:shadow-none">
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(head, "pl-5")}>File</TableHead>
            <TableHead className={cn(head, "w-20 text-right")}>Pages</TableHead>
            <TableHead className={cn(head, "w-[136px]")}>Status</TableHead>
            <TableHead className={cn(head, "w-[176px]")}>Uploaded</TableHead>
            <TableHead className={cn(head, "w-[140px]")}>User</TableHead>
            <TableHead className={cn(head, "w-[196px] pr-5 text-right")}>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packets.map((packet) => (
            <TableRow
              key={packet.id}
              className={cn(
                "group hover:bg-transparent",
                packet.status === "splitReady" && "cursor-pointer"
              )}
              onClick={() => packet.status === "splitReady" && onReview(packet)}
            >
              <TableCell className={cn(cell, "pl-5")}>
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon ext="pdf" />
                  <div className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="truncate font-medium text-pi-ink"
                        title={packet.fileName}
                      >
                        {packet.fileName}
                      </span>
                      <span className="flex-none rounded-xs bg-pi-fill px-2 py-px text-[12px] font-medium leading-4 text-pi-body">
                        Multi-bill
                      </span>
                    </span>
                    <span
                      className={cn(
                        T.sub,
                        "block truncate",
                        packet.status === "failed" && "text-pi-danger"
                      )}
                      title={packetDetail(packet)}
                    >
                      {packetDetail(packet)}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className={cn(cell, "fig text-right")}>
                {packet.pageCount || "—"}
              </TableCell>
              <TableCell className={cell}>
                <PacketStatus packet={packet} />
              </TableCell>
              <TableCell className={cn(cell, "whitespace-nowrap text-pi-body")}>
                {stamp(packet.uploadedAt)}
              </TableCell>
              <TableCell className={cn(cell, "text-pi-body")}>
                <span className="block truncate whitespace-nowrap" title={packet.uploadedBy}>
                  {packet.uploadedBy}
                </span>
              </TableCell>
              <TableCell
                className={cn(cell, "pr-5 text-right")}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="inline-flex items-center gap-1">
                  {packet.status === "splitReady" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onReview(packet)}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Review split
                    </Button>
                  )}
                  {/* Retry only where it can help (PRD) — a locked or
                      oversized file fails the same way twice. */}
                  {packet.status === "failed" && packet.failure?.retryable && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRetry(packet)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  )}
                  {packet.status !== "inProgress" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${packet.fileName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onRemove(packet)}>
                          {packet.status === "completed"
                            ? "Remove from this list"
                            : "Remove"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {uploads.map((item) => (
            <TableRow
              key={item.id}
              className="group cursor-pointer hover:bg-transparent"
              onClick={() => onOpenUpload(item)}
            >
              <TableCell className={cn(cell, "pl-5")}>
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon ext={item.file.ext || "pdf"} />
                  <div className="min-w-0">
                    <span
                      className="block truncate font-medium text-pi-ink"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </span>
                    <span className={cn(T.sub, "block truncate")}>
                      {item.file.size}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className={cn(cell, "text-right text-pi-faint")}>
                —
              </TableCell>
              <TableCell className={cell}>
                <StatusPill status={item.status} />
              </TableCell>
              <TableCell className={cn(cell, "whitespace-nowrap text-pi-body")}>
                {stamp(item.received)}
              </TableCell>
              <TableCell className={cn(cell, "text-pi-body")}>
                <span className="block truncate whitespace-nowrap" title={item.sender}>
                  {item.sender}
                </span>
              </TableCell>
              <TableCell
                className={cn(cell, "pr-5 text-right")}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${item.file.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpenUpload(item)}>
                      Open in Inbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onRemoveUpload(item)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!packets.length && !uploads.length && (
        <div className="px-6 py-16 text-center">
          <h2 className="text-[16px] font-medium leading-[22px] text-pi-ink">
            Nothing uploaded yet
          </h2>
          <p className={cn(T.value, "mt-2")}>
            Bills you upload appear here while they are read. A PDF with several
            bills in it goes through Upload Purchases ▾ → Split Purchases.
          </p>
        </div>
      )}
    </div>
  );
};

export default BillUploadsTable;
