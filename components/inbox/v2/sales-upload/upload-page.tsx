import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Download, FileSpreadsheet, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import {
  AR_IMPORT_ACCEPT_VALUE,
  AR_IMPORT_MAX_UPLOAD_SIZE_BYTES,
  AR_IMPORT_SAMPLE_TEMPLATES,
} from "@/config/pages/inbox/sales-upload";
import { sampleCsv } from "@/config/pages/inbox/mock-sales-upload";
import {
  salesUpload,
  useImportTemplates,
  useSalesBatch,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import { ARVoucherImportBatchStatus } from "@/types/pages/inbox/sales-upload";
import {
  formatFileSize,
  getArImportFileType,
} from "@/utils/pages/inbox/sales-upload";
import { Field, T } from "../ui";
import { FlowHeader } from "./common";

/**
 * Upload Invoice — production's BulkUploadPage: one spreadsheet, an optional
 * saved mapping template, then on to mapping.
 *
 * One card, one column (7 Oct 2026, user: "too complicated and bloated, keep
 * it simple and sharp"). The spreadsheet stage, mono captions, callout and
 * Page Tips strip are gone; a code-drawn folder is the one picture, and it
 * reacts — opens on drag-over, holds a sheet once a file is picked.
 */

type Props = {
  company: string;
  onMapping: (batchId: string) => void;
  onExit: () => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const UploadPage = ({ company, onMapping, onExit, notify }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [templateUuid, setTemplateUuid] = useState("");
  const [pendingId, setPendingId] = useState("");
  const templates = useImportTemplates();
  const pending = useSalesBatch(pendingId);
  const submitting = !!pendingId;

  // Production polls the new batch until the file is read, then moves on.
  useEffect(() => {
    if (!pending) return;
    if (pending.batch.status === ARVoucherImportBatchStatus.PROCESSING) return;
    if (pending.batch.status === ARVoucherImportBatchStatus.FAILED) {
      setPendingId("");
      notify(
        pending.batch.failureMessage ?? "Failed to upload invoice.",
        "error"
      );
      return;
    }
    onMapping(pending.batch.importBatchUuid);
  }, [pending?.batch.status]);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    if (list.length > 1) {
      notify("Only one file can be uploaded at a time.", "error");
      return;
    }
    const next = list[0];
    if (!getArImportFileType(next.name)) {
      notify("Only .xls, .xlsx and .csv files are supported.", "error");
      return;
    }
    if (next.size > AR_IMPORT_MAX_UPLOAD_SIZE_BYTES) {
      notify("This file is larger than 30MB.", "error");
      return;
    }
    setFile(next);
  };

  const onContinue = () => {
    if (!file) {
      notify("Select a file before continuing.", "error");
      return;
    }
    const template = templates.find((t) => t.templateUuid === templateUuid);
    setPendingId(
      salesUpload.createBatch(
        company,
        { name: file.name, size: file.size },
        template ?? null
      )
    );
  };

  /*
    Production links each button to /api/downloads/by-key. There is no file
    store here, so the button writes the first rows of the demo register as a
    CSV in the browser — a real download of the expected column structure.
  */
  const download = (key: (typeof AR_IMPORT_SAMPLE_TEMPLATES)[number]) => {
    const item = key.downloadKey === "arItemInvoiceTemplate";
    const blob = new Blob([sampleCsv(item ? "item" : "accounting")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item
      ? "ar-item-invoice-template.csv"
      : "ar-accounting-invoice-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify(`${key.label} template downloaded.`);
  };

  const folder = over ? "open" : file ? "filled" : "idle";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-pi-page">
      <FlowHeader title="Upload Sales" onClose={onExit} step={0} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col px-[var(--inset-page)] pb-10">
          {/* The card spans the header's width so it sits under the title
              and stepper; the content is one centred column inside it. */}
          <div className="rounded-lg border border-pi-line bg-background px-6 py-8 shadow-table sm:py-10">
            <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">
              {/* The whole zone is the target: drop on it, or click to browse.
                With a file in, a click replaces it and × clears it. */}
              <div
                role="button"
                tabIndex={submitting ? -1 : 0}
                aria-label={file ? "Replace selected file" : "Choose file"}
                className={cn(
                  "group/zone flex cursor-pointer flex-col items-center rounded-lg border border-dashed px-6 pb-8 pt-10 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  over
                    ? "border-pi-brand-vivid bg-pi-brand-tint"
                    : "border-pi-line-2 bg-pi-page hover:border-pi-brand-border"
                )}
                onClick={() => !submitting && input.current?.click()}
                onKeyDown={(e) => {
                  if (submitting) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    input.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!submitting) setOver(true);
                }}
                onDragLeave={(e) => {
                  // Moving onto a child fires dragleave too; only leaving the
                  // zone itself closes the folder.
                  if (!e.currentTarget.contains(e.relatedTarget as Node))
                    setOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  if (!submitting) take(e.dataTransfer.files);
                }}
              >
                <FolderArt state={folder} />
                <h2 className="mt-5 text-[18px] font-medium leading-7 text-pi-ink">
                  {over
                    ? "Release to add your file"
                    : "Upload your sales register"}
                </h2>
                {file ? (
                  <span className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-pi-line bg-background py-1 pl-3 pr-1 text-[13px] leading-5 shadow-contact">
                    <FileSpreadsheet
                      className="size-4 flex-none text-pi-brand"
                      aria-hidden
                    />
                    <span className="truncate font-medium text-pi-ink">
                      {file.name}
                    </span>
                    <span className="flex-none tabular-nums text-pi-faint">
                      {formatFileSize(file.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove selected file"
                      disabled={submitting}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-pi-faint hover:text-pi-ink"
                    >
                      <X />
                    </Button>
                  </span>
                ) : (
                  <p className="mt-1 text-[14px] leading-5 text-pi-body">
                    Drop a spreadsheet here or{" "}
                    <span className="font-medium text-pi-brand underline-offset-4 group-hover/zone:underline">
                      browse
                    </span>
                  </p>
                )}
                <p className="mt-2 text-[12px] leading-4 text-pi-faint">
                  {file
                    ? "Click to replace. You’ll match its columns next."
                    : "CSV, XLS or XLSX · up to 30 MB · one file per upload"}
                </p>
              </div>
              <input
                ref={input}
                type="file"
                accept={AR_IMPORT_ACCEPT_VALUE}
                hidden
                data-testid="sales-upload-input"
                onChange={(e) => {
                  take(e.target.files);
                  e.target.value = "";
                }}
              />

              {templates.length > 0 && (
                <Field label="Use a saved mapping" optional>
                  <ComboBox
                    title="Select a saved template"
                    options={templates.map((t) => ({
                      label: t.name,
                      value: t.templateUuid,
                    }))}
                    selectedValue={templateUuid}
                    onChange={(value) =>
                      setTemplateUuid(Array.isArray(value) ? value[0] : value)
                    }
                    isMultiSelect={false}
                    hasSearch={false}
                    disabled={submitting}
                    // ComboBox's trigger has no role="combobox", so the
                    // .modern-field rule misses it: the form box by hand.
                    triggerClassName="h-[38px] px-3 text-[14px]"
                  />
                  <p className={T.sub}>
                    Prefills the columns if this file matches one you&apos;ve
                    mapped before.
                  </p>
                </Field>
              )}

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-pi-line pt-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] leading-5">
                  <span className="text-pi-faint">Need a sample?</span>
                  {AR_IMPORT_SAMPLE_TEMPLATES.map((template) => (
                    <button
                      key={template.downloadKey}
                      type="button"
                      onClick={() => download(template)}
                      className="inline-flex items-center gap-1 rounded-xs text-pi-body transition-colors hover:text-pi-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                    >
                      <Download className="size-3.5" aria-hidden />
                      {template.label}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={onContinue}
                  disabled={!file}
                  loading={submitting}
                >
                  {submitting ? "Preparing upload..." : "Continue to mapping"}
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------- the folder
   Drawn in code after the reference folder icon, in brand indigo: back
   panel with its tab, a sheet, the front panel. Idle it sits closed; on
   drag-over the front dips and the sheet rises; with a file in, the
   sheet stands proud and shows a spreadsheet grid. Decorative. */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const FolderArt = ({ state }: { state: "idle" | "open" | "filled" }) => {
  const id = useId().replace(/:/g, "");
  const motion = {
    transition: `transform 320ms ${EASE}`,
    transformBox: "fill-box" as const,
  };
  return (
    <svg
      viewBox="0 0 120 96"
      className="h-[100px] w-[125px] overflow-visible drop-shadow-[0_6px_10px_rgba(49,70,176,0.18)] [&_*]:motion-reduce:!transition-none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--palette-blue-300)" />
          <stop offset="1" stopColor="var(--palette-blue-400)" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--palette-blue-200)" />
          <stop offset="1" stopColor="var(--palette-blue-300)" />
        </linearGradient>
      </defs>
      {/* back panel and tab */}
      <path
        d="M8 16a8 8 0 0 1 8-8h24a8 8 0 0 1 6.2 3l4.6 5.6a8 8 0 0 0 6.2 3H104a8 8 0 0 1 8 8V80a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8Z"
        fill={`url(#${id}b)`}
      />
      {/* the sheet */}
      <g
        style={{
          ...motion,
          transform:
            state === "open"
              ? "translateY(-12px)"
              : state === "filled"
                ? "translateY(-7px)"
                : "translateY(0)",
        }}
      >
        <rect x="18" y="22" width="84" height="50" rx="4" fill="#fff" />
        {state === "filled" ? (
          <g fill="var(--palette-blue-100)">
            <rect
              x="26"
              y="29"
              width="68"
              height="6"
              rx="1.5"
              fill="var(--palette-blue-200)"
            />
            <rect x="26" y="38" width="20" height="4" rx="1" />
            <rect x="50" y="38" width="20" height="4" rx="1" />
            <rect x="74" y="38" width="20" height="4" rx="1" />
            <rect x="26" y="45" width="20" height="4" rx="1" />
            <rect x="50" y="45" width="20" height="4" rx="1" />
            <rect x="74" y="45" width="20" height="4" rx="1" />
          </g>
        ) : (
          <g fill="var(--palette-blue-100)">
            <rect x="26" y="30" width="40" height="4" rx="2" />
            <rect x="26" y="38" width="56" height="4" rx="2" />
          </g>
        )}
      </g>
      {/* front panel: hinges at its bottom edge */}
      <g
        style={{
          ...motion,
          transformOrigin: "50% 100%",
          transform:
            state === "open"
              ? "scaleY(0.84) skewX(-3deg)"
              : "scaleY(1) skewX(0deg)",
        }}
      >
        <rect
          x="8"
          y="32"
          width="104"
          height="56"
          rx="8"
          fill={`url(#${id}f)`}
        />
        <rect
          x="8.5"
          y="32.5"
          width="103"
          height="55"
          rx="7.5"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.45"
        />
      </g>
    </svg>
  );
};

export default UploadPage;
