import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FileIcon from "@/components/inbox/common/file-icon";
import { IMPORT_MODE_LABELS } from "@/config/pages/inbox/sales-upload";
import {
  useSalesBatches,
  useSalesBatch,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  type ResponseARVoucherImportBatch,
} from "@/types/pages/inbox/sales-upload";
import { batchStep } from "@/utils/pages/inbox/sales-upload";
import { PageButton, T } from "../ui";
import { BatchStatusPill } from "./common";
import ProcessingModal from "./processing-modal";

/**
 * The Sales register's Uploaded Invoice tab — production's
 * ARUploadedInvoicesTab, drawn as the Purchases register's Bill Uploads
 * table: file first with its mode underneath, the counts, then status.
 * A row opens the step its batch is waiting on; a batch still being read
 * opens its progress.
 */

type Props = {
  company: string;
  search: string;
  onOpen: (batchId: string, step: "mapping" | "preview") => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizes: number[];
};

/** Production: formatDisplayDate — "12 Sep 2026". */
const uploadDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const PendingRows = ({ batch }: { batch: ResponseARVoucherImportBatch }) => {
  if (batch.status === ARVoucherImportBatchStatus.PROCESSING) {
    // The AI pass reports rows done; the first read does not, so it waits
    // on a dash rather than a 0% bar that never moves.
    if (!batch.totalRows) return <span>-</span>;
    const pct = Math.round((batch.aiProcessedRowCount * 100) / batch.totalRows);
    return (
      <span className="flex w-full max-w-[140px] flex-col gap-1">
        <span className="flex items-center justify-between tabular-nums">
          <span>{batch.aiProcessedRowCount}</span>
          <span className="text-pi-faint">{pct}%</span>
        </span>
        <span className="h-1 w-full overflow-hidden rounded-[2px] bg-pi-fill">
          <span
            className="block h-full rounded-[2px] bg-pi-brand transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
    );
  }
  // Production compares status to (NEEDS_REVIEW || COMPLETE), which is only
  // ever NEEDS_REVIEW — so a complete batch showed "-". Both count here, and
  // a complete batch has nothing pending.
  if (
    batch.status === ARVoucherImportBatchStatus.NEEDS_REVIEW ||
    batch.status === ARVoucherImportBatchStatus.COMPLETE
  )
    return (
      <span className="tabular-nums">
        {Math.max(0, batch.totalRows - batch.createdRows)}
      </span>
    );
  return <span>-</span>;
};

const UploadedInvoicesTable = ({
  company,
  search,
  onOpen,
  pageSize,
  onPageSizeChange,
  pageSizes,
}: Props) => {
  const entries = useSalesBatches(company);
  const [page, setPage] = useState(0);
  const [progressId, setProgressId] = useState("");
  const progress = useSalesBatch(progressId);

  const term = search.trim().toLowerCase();
  const rows = entries
    .map((e) => e.batch)
    .filter((b) => !term || b.originalFileName.toLowerCase().includes(term));
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);

  const head = cn("h-11 whitespace-nowrap px-4 py-0 align-middle", T.head);
  // Row hover wash across the whole row, the Inbox's.
  const cell = cn(
    "h-14 px-4 py-0 align-middle transition-colors duration-100 group-hover:bg-pi-row-hover group-focus-visible:bg-pi-row-hover motion-reduce:transition-none",
    T.cell
  );

  const open = (batch: ResponseARVoucherImportBatch) => {
    if (batch.status === ARVoucherImportBatchStatus.PROCESSING) {
      setProgressId(batch.importBatchUuid);
      return;
    }
    const step = batchStep(batch.status);
    if (step) onOpen(batch.importBatchUuid, step);
  };

  return (
    <>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <Table className="min-w-[860px] table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-pi-line [&_th]:border-b [&_th]:border-pi-line">
          <TableHeader className="sticky top-0 z-10 bg-pi-head-bg [&_tr]:shadow-none">
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(head, "pl-5")}>
                File Details
              </TableHead>
              <TableHead className={cn(head, "w-[136px]")}>Upload Date</TableHead>
              <TableHead className={cn(head, "w-[112px] text-right")}>
                Total Rows
              </TableHead>
              <TableHead className={cn(head, "w-[170px]")}>
                Pending Rows
              </TableHead>
              <TableHead className={cn(head, "w-[96px] text-right")}>
                Created
              </TableHead>
              <TableHead className={cn(head, "w-[156px] pr-5")}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((batch) => {
              const openable =
                !!batchStep(batch.status) ||
                batch.status === ARVoucherImportBatchStatus.PROCESSING;
              const failed = batch.status === ARVoucherImportBatchStatus.FAILED;
              return (
                <TableRow
                  key={batch.importBatchUuid}
                  tabIndex={openable ? 0 : undefined}
                  onClick={() => open(batch)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") open(batch);
                  }}
                  className={cn(
                    "hover:bg-transparent",
                    openable &&
                      "group cursor-pointer focus-visible:outline-none"
                  )}
                >
                  <TableCell className={cn(cell, "pl-5")}>
                    <div className="flex min-w-0 items-center gap-3">
                      <FileIcon ext={batch.fileType} />
                      <div className="min-w-0">
                        <span
                          className="block truncate font-medium text-pi-ink"
                          title={batch.originalFileName}
                        >
                          {batch.originalFileName}
                        </span>
                        <span
                          className={cn(
                            T.sub,
                            "block truncate",
                            failed && "text-pi-danger"
                          )}
                          title={
                            failed ? (batch.failureMessage ?? "") : undefined
                          }
                        >
                          {failed && batch.failureMessage
                            ? batch.failureMessage
                            : IMPORT_MODE_LABELS[batch.importMode]}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={cn(cell, "whitespace-nowrap")}>
                    {uploadDate(batch.createdAt)}
                  </TableCell>
                  <TableCell className={cn(cell, "fig text-right")}>
                    {batch.totalRows || "-"}
                  </TableCell>
                  <TableCell className={cell}>
                    <PendingRows batch={batch} />
                  </TableCell>
                  <TableCell className={cn(cell, "fig text-right")}>
                    {batch.createdRows}
                  </TableCell>
                  <TableCell className={cn(cell, "pr-5")}>
                    <BatchStatusPill status={batch.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!pageRows.length && (
          <div className="px-6 py-16 text-center">
            <h2 className="text-[16px] font-medium leading-[22px] text-pi-ink">
              No uploaded invoice batches found.
            </h2>
            <p className={cn(T.value, "mt-2")}>
              {term
                ? "Nothing matches that search."
                : "Spreadsheets you upload with Upload Sales are listed here while they are mapped and reviewed."}
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-pi-line bg-background px-6 py-2">
        <div className="flex items-center gap-2">
          <span className={cn(T.cell, "text-foreground")}>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className={cn(
                "h-auto w-[72px] rounded-md border-border px-2 py-1",
                T.cell,
                "text-foreground"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-0 sm:gap-1">
          <PageButton
            label="First page"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            <ChevronsLeft />
          </PageButton>
          <PageButton
            label="Previous page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
          </PageButton>
          <span className={cn(T.cell, "px-2 tabular-nums text-foreground")}>
            {rows.length
              ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, rows.length)} of ${rows.length}`
              : "0 of 0"}
          </span>
          <PageButton
            label="Next page"
            disabled={page >= lastPage}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight />
          </PageButton>
          <PageButton
            label="Last page"
            disabled={page >= lastPage}
            onClick={() => setPage(lastPage)}
          >
            <ChevronsRight />
          </PageButton>
        </div>
      </div>

      {progress && (
        <ProcessingModal
          key={progress.batch.importBatchUuid}
          batch={progress.batch}
          open
          onClose={() => setProgressId("")}
          onGoToUploads={() => setProgressId("")}
          onComplete={() => setProgressId("")}
        />
      )}
    </>
  );
};

export default UploadedInvoicesTable;
