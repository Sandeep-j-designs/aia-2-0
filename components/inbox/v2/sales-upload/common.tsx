import React from "react";
import { Check, FileSpreadsheet, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { importBatchStatusConfig } from "@/config/pages/inbox/sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  type ResponseARVoucherImportPreviewRow,
} from "@/types/pages/inbox/sales-upload";
import {
  getPreviewStatusLabel,
  getPreviewStatusTone,
} from "@/utils/pages/inbox/sales-upload";
import { type PillTone, T } from "../ui";

/** The three steps of the flow, as the reference uploader numbers them. */
const STEPS = ["Upload", "Map fields", "Preview"] as const;

const FlowSteps = ({ step }: { step: 0 | 1 | 2 }) => (
  <ol
    aria-label="Upload progress"
    className="flex flex-none items-center gap-3 sm:gap-4"
  >
    {STEPS.map((label, i) => (
      <li
        key={label}
        aria-current={i === step ? "step" : undefined}
        className={cn(
          "flex items-center gap-2 text-[13px] leading-5",
          i === step ? "font-medium text-pi-ink" : "text-pi-faint"
        )}
      >
        {i > 0 && (
          <span aria-hidden className="mr-1 h-px w-4 bg-pi-line-2 sm:mr-0" />
        )}
        <span
          aria-hidden
          className={cn(
            "grid size-6 flex-none place-items-center rounded-full border text-[12px] font-semibold tabular-nums",
            i < step
              ? "border-transparent bg-pi-success-bg text-pi-success"
              : i === step
                ? "border-pi-brand bg-pi-brand text-pi-surface-panel shadow-[0_0_0_4px_var(--pi-brand-tint)]"
                : "border-pi-line-2"
          )}
        >
          {i < step ? <Check className="size-3" /> : `0${i + 1}`}
        </span>
        <span className="hidden md:inline">{label}</span>
      </li>
    ))}
  </ol>
);

/**
 * The head of each upload step, in the workbench page pattern: an eyebrow
 * over the 30px title, the file as a chip, the step track and Close on the
 * right. The words are production's BulkUploadPageHeader.
 */
export const FlowHeader = ({
  title,
  fileName,
  onClose,
  closeDisabled,
  step,
}: {
  title: string;
  fileName?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  /** Where the flow is; omitted on screens outside the three steps. */
  step?: 0 | 1 | 2;
}) => (
  <div className="flex shrink-0 flex-wrap items-end gap-x-6 gap-y-3 px-[var(--inset-page)] pb-5 pt-6">
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="page-title">{title}</h1>
        {fileName ? (
          <span
            className="inline-flex h-7 min-w-0 max-w-[360px] items-center gap-2 rounded-sm border border-pi-line bg-background px-3 text-[13px] leading-4 text-pi-body shadow-contact"
            title={fileName}
          >
            <FileSpreadsheet
              className="size-3.5 flex-none text-pi-faint"
              aria-hidden
            />
            <span className="truncate">{fileName}</span>
          </span>
        ) : null}
      </div>
    </div>
    {step !== undefined && <FlowSteps step={step} />}
    <Button variant="ghost" onClick={onClose} disabled={closeDisabled}>
      <X aria-hidden />
      Close
    </Button>
  </div>
);

export type DotTone = PillTone | "progress";

/* Precision Indigo dot-chip (StatusPill in ../ui.tsx): meaning lives in a
   7px dot, the word stays body ink; failures earn their ground. */
const DOT: Record<DotTone, string> = {
  info: "bg-pi-brand-vivid",
  progress: "bg-pi-brand-vivid animate-pulse motion-reduce:animate-none",
  warn: "bg-pi-warning-dot shadow-[0_0_0_2px_var(--pi-warning-bg)]",
  ok: "border-2 border-pi-success-dot bg-transparent",
  error: "bg-pi-danger-dot",
  neutral: "bg-pi-faint",
};

export const DotChip = ({
  tone,
  children,
  className,
}: {
  tone: DotTone;
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center gap-2 rounded-full px-2 py-1 text-[13px] leading-4 text-pi-body",
      tone === "error" && "bg-pi-danger-bg text-pi-danger",
      className
    )}
  >
    <span
      aria-hidden
      className={cn("size-[7px] flex-none rounded-full", DOT[tone])}
    />
    <span className="min-w-0 truncate">{children}</span>
  </span>
);

/* A batch's state as a dot: still being read pulses, waiting on you rings. */
const BATCH_DOT: Record<ARVoucherImportBatchStatus, DotTone> = {
  [ARVoucherImportBatchStatus.PROCESSING]: "progress",
  [ARVoucherImportBatchStatus.PENDING_MAPPING]: "warn",
  [ARVoucherImportBatchStatus.NEEDS_REVIEW]: "warn",
  [ARVoucherImportBatchStatus.COMPLETE]: "ok",
  [ARVoucherImportBatchStatus.FAILED]: "error",
};

/** A batch's status, in production's words. */
export const BatchStatusPill = ({
  status,
}: {
  status: ARVoucherImportBatchStatus;
}) => (
  <DotChip tone={BATCH_DOT[status]}>
    {importBatchStatusConfig[status].label}
  </DotChip>
);

/**
 * A preview row's status. Rows with issues open a card listing them, as
 * production's ErrorHoverCard does on the status cell.
 */
export const RowStatusPill = ({
  row,
}: {
  row: ResponseARVoucherImportPreviewRow;
}) => {
  const pill = (
    <DotChip tone={getPreviewStatusTone(row)}>
      {getPreviewStatusLabel(row)}
    </DotChip>
  );
  if (!row.issuePayload.length) return pill;
  return (
    <HoverCard openDelay={100} closeDelay={0}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${getPreviewStatusLabel(row)}: ${row.issuePayload
            .map((issue) => issue.message)
            .join(" ")}`}
        >
          {pill}
        </button>
      </HoverCardTrigger>
      <IssueCardContent issues={row.issuePayload} />
    </HoverCard>
  );
};

export const IssueCardContent = ({
  issues,
}: {
  issues: ResponseARVoucherImportPreviewRow["issuePayload"];
}) => (
  <HoverCardContent
    align="end"
    side="top"
    className="w-80 overflow-hidden rounded-md border-pi-line p-0 shadow-pi-2"
  >
    <div className="border-b border-pi-line bg-pi-head-bg px-3 py-2">
      <span className={cn(T.sub, "font-medium text-pi-ink")}>
        {issues.length === 1 ? "1 issue" : `${issues.length} issues`}
      </span>
    </div>
    <ul className="flex flex-col gap-2 px-3 pb-3 pt-2">
      {issues.map((issue, i) => (
        <li key={i} className="flex gap-2">
          <span
            aria-hidden
            className={cn(
              "mt-2 size-1.5 flex-none rounded-full",
              issue.severity === "error"
                ? "bg-pi-danger-dot"
                : "bg-pi-warning-dot"
            )}
          />
          <span className={cn(T.sub, "text-pi-body")}>{issue.message}</span>
        </li>
      ))}
    </ul>
  </HoverCardContent>
);
