import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  FileSpreadsheet,
  Lightbulb,
  X,
} from "@/components/icons";
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
import { DropFileGlyph } from "../bill-splitter/glyphs";
import s from "../bill-splitter/split-dialogs.module.css";
import { T } from "../ui";
import { FlowHeader } from "./common";

/**
 * Upload Invoice — production's BulkUploadPage: one spreadsheet, an optional
 * saved mapping template, then on to mapping. The drop zone is Split
 * Purchases' (dashed edge, file glyph, browse link) rather than production's,
 * so the two upload surfaces in the prototype are one design.
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

const cx = (...names: (string | false | undefined)[]) =>
  names
    .filter(Boolean)
    .map((name) => s[name as string])
    .join(" ");

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

  const phase = submitting ? "reading" : over ? "drag" : file ? "ready" : "idle";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-pi-page">
      <FlowHeader title="Upload Sales" onClose={onExit} step={0} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col px-[var(--inset-page)] pb-8">
          {/* The reference upload studio: the document stage on the left,
              the control panel on the right, one card. */}
          <div
            className={cn(
              "grid overflow-hidden rounded-lg border bg-background shadow-table transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)]",
              over
                ? "border-pi-brand-vivid shadow-[0_0_0_4px_var(--pi-brand-tint)]"
                : "border-pi-line"
            )}
          >
            <SheetStage phase={phase} fileName={file?.name} />

            <div className="flex min-w-0 flex-col justify-center gap-5 p-6 sm:p-8">
              <div>
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-pi-faint">
                  <span
                    aria-hidden
                    className={cn(
                      "size-[5px] rounded-full",
                      file ? "bg-pi-success-dot" : "bg-pi-brand"
                    )}
                  />
                  {file ? "File ready" : "Sales register import"}
                </span>
                <h2 className="mt-3 text-[28px] font-medium leading-[1.17] tracking-[-0.02em] text-pi-ink">
                  Bring your sales register.
                  <br />
                  We&apos;ll map the columns.
                </h2>
                <p className="mt-3 max-w-[360px] text-[13px] leading-[1.6] text-pi-body">
                  One spreadsheet per upload. You map its columns and review
                  every row before any invoice is created.
                </p>
              </div>

              <div className={cx("scope")}>
                {file ? (
                  <div className="relative">
                    {/* Production: the filled zone stays the target — click to
                        replace the file, × to clear it. */}
                    <div
                      role="button"
                      tabIndex={submitting ? -1 : 0}
                      aria-label="Replace selected file"
                      className={cn(
                        cx("dz"),
                        "cursor-pointer flex-col gap-2 border-solid"
                      )}
                      onClick={() => !submitting && input.current?.click()}
                      onKeyDown={(e) => {
                        if (submitting) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          input.current?.click();
                        }
                      }}
                    >
                      <span className={cx("dz__ico")} aria-hidden>
                        <FileSpreadsheet className="!size-[18px]" />
                      </span>
                      <p className="max-w-full break-all px-8 text-center text-[14px] font-medium leading-5 text-pi-ink">
                        {file.name}
                      </p>
                      <p className="inline-flex items-center gap-2 text-[12px] leading-4 text-pi-faint">
                        <span className="tabular-nums">
                          {formatFileSize(file.size)}
                        </span>
                        <span
                          aria-hidden
                          className="size-[7px] rounded-full border-2 border-pi-success-dot"
                        />
                        Ready to process
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      aria-label="Remove selected file"
                      disabled={submitting}
                      onClick={() => setFile(null)}
                      className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-background text-pi-faint hover:text-pi-ink"
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Choose file"
                    className={cn(
                      cx("dz", over && "is-over"),
                      "cursor-pointer flex-col gap-3 text-center"
                    )}
                    onClick={() => input.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        input.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOver(true);
                    }}
                    onDragLeave={() => setOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setOver(false);
                      take(e.dataTransfer.files);
                    }}
                  >
                    <span className={cx("dz__ico")} aria-hidden>
                      <DropFileGlyph />
                    </span>
                    <div className={cn(cx("dz__txt"), "items-center")}>
                      <p className={cx("dz__h")}>
                        Drop your invoice file here{" "}
                        <span className={cx("link")}>or click to browse</span>
                      </p>
                      <p className={cx("dz__p")}>CSV, XLS, XLSX • max 30MB</p>
                    </div>
                  </div>
                )}
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
              </div>

              {templates.length > 0 && (
                <section className="flex flex-col gap-2">
                  <span className={T.label}>Load a saved mapping template</span>
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
                  />
                  <p className={T.sub}>
                    If this file matches a structure you&apos;ve mapped before,
                    select the template to prefill mapping before preview.
                  </p>
                </section>
              )}

              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <section className="flex flex-col gap-2">
                  <span className="text-[12px] leading-4 text-pi-faint">
                    Don&apos;t have your own file? Download a sample template
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {AR_IMPORT_SAMPLE_TEMPLATES.map((template) => (
                      <button
                        key={template.downloadKey}
                        type="button"
                        onClick={() => download(template)}
                        className="group inline-flex items-center gap-2 rounded-xs text-[12px] leading-5 text-pi-body transition-colors hover:text-pi-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      >
                        <Download className="size-3.5" aria-hidden />
                        {template.label}
                      </button>
                    ))}
                  </div>
                </section>
                <Button
                  onClick={onContinue}
                  disabled={!file}
                  loading={submitting}
                  className="min-w-48"
                >
                  {submitting ? "Preparing upload..." : "Continue to Mapping"}
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>
          </div>

          {/* Page Tips, as the reference's process notes under the studio. */}
          <section
            aria-labelledby="sales-upload-tips"
            className="mt-5 grid gap-x-6 gap-y-3 border-t border-pi-line px-0.5 pt-5 sm:grid-cols-[auto_repeat(3,minmax(0,1fr))]"
          >
            <h2
              id="sales-upload-tips"
              className="flex items-center gap-2 text-[12px] font-medium leading-5 text-pi-body"
            >
              <Lightbulb className="size-3.5 text-pi-faint" aria-hidden />
              Page Tips
            </h2>
            {[
              "Sync ledgers & customers before upload for auto-matching",
              "Use standard date formats (e.g., DD/MM/YYYY or YYYY-MM-DD)",
              "Download a sample template if you need the expected column structure.",
            ].map((tip, i) => (
              <p
                key={tip}
                className="flex gap-3 text-[12px] leading-5 text-pi-faint"
              >
                <span className="code flex-none pt-px text-[12px] text-pi-faint">
                  0{i + 1}
                </span>
                {tip}
              </p>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ the stage
   The reference DocumentStage, drawn for a spreadsheet: a code-drawn sales
   register on the workbench navy (global .source-stage), the column the
   mapping will read first lit. Decorative; the panel carries the meaning. */

const SHEET_HEAD = ["Date", "Invoice No", "Customer", "Taxable", "GST"];
const SHEET_ROWS = [
  ["01/09", "SOR/0412", "Sri Lakshmi Traders", "86,000", "4,300"],
  ["02/09", "SOR/0413", "Annapoorna Wholesale", "66,250", "3,312"],
  ["02/09", "SOR/0414", "Chennai Oil Depot", "34,800", "1,740"],
  ["05/09", "SOR/0416", "Vijaya Provisions", "1,12,400", "5,620"],
  ["06/09", "SOR/0417", "Malabar Foods", "48,900", "2,445"],
  ["09/09", "SOR/0419", "Hotel Mayura Group", "72,150", "3,607"],
];

const SheetStage = ({
  phase,
  fileName,
}: {
  phase: "idle" | "drag" | "ready" | "reading";
  fileName?: string;
}) => {
  const lit = phase === "ready" || phase === "reading";
  return (
    <div
      aria-hidden
      className="source-stage group/stage relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden p-6 lg:min-h-[480px]"
    >
      <div className="code flex items-center justify-between gap-4 text-[12px] tracking-[0.08em] text-pi-faint">
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="size-3.5" />
          SALES REGISTER INTAKE
        </span>
        <span className="rounded-xs border border-pi-line px-2 py-1 text-[9px]">
          {phase === "reading"
            ? "READING"
            : phase === "ready"
              ? "FILE SELECTED"
              : phase === "drag"
                ? "RELEASE"
                : "READY"}
        </span>
      </div>

      <div className="relative mx-auto my-6 w-[min(100%,360px)]">
        {/* the sheets behind */}
        <span className="absolute inset-0 translate-x-2 translate-y-1 rotate-[7deg] rounded-xs bg-[var(--palette-neutral-200)] shadow-pi-2" />
        <span className="absolute inset-0 -translate-x-1 rotate-[2.5deg] rounded-xs bg-[var(--palette-neutral-100)]" />
        <div
          className={cn(
            "relative rounded-xs bg-[var(--palette-neutral-0)] p-3 text-[var(--palette-neutral-700)] shadow-pi-2 transition-transform duration-500 motion-reduce:transition-none",
            phase === "idle"
              ? "-rotate-3 group-hover/stage:-translate-y-1 group-hover/stage:-rotate-2"
              : "rotate-0"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] font-semibold tracking-[0.04em]">
              SALES REGISTER · SEP 2026
            </span>
            <span className="code text-[8px] text-[var(--palette-neutral-500)]">
              Sheet1
            </span>
          </div>
          <div className="grid grid-cols-[0.8fr_1fr_1.7fr_1fr_0.8fr] overflow-hidden rounded-[2px] border border-[var(--palette-neutral-100)] text-[8px] leading-[18px]">
            {SHEET_HEAD.map((h, c) => (
              <span
                key={h}
                className={cn(
                  "truncate border-b border-r border-[var(--palette-neutral-100)] px-2 font-semibold last:border-r-0",
                  lit && c === 2
                    ? "bg-[var(--palette-blue-100)] text-[var(--palette-blue-700)]"
                    : "bg-[var(--palette-neutral-50)]"
                )}
              >
                {h}
              </span>
            ))}
            {SHEET_ROWS.flatMap((row, r) =>
              row.map((v, c) => (
                <span
                  key={`${r}-${c}`}
                  className={cn(
                    "truncate border-r border-[var(--palette-neutral-100)] px-2 last:border-r-0 [&:nth-child(5n)]:border-r-0",
                    r < SHEET_ROWS.length - 1 &&
                      "border-b border-[var(--palette-neutral-50)]",
                    c >= 3 && "text-right tabular-nums",
                    lit &&
                      c === 2 &&
                      "bg-[var(--palette-blue-50)] text-[var(--palette-blue-700)]"
                  )}
                >
                  {v}
                </span>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[7px] tracking-[0.06em] text-[var(--palette-neutral-400)]">
            <span>SAMPLE FILE</span>
            <span className="tabular-nums">25 ROWS</span>
          </div>
        </div>

        {/* the callout, as the reference's */}
        <div className="absolute -bottom-7 right-[-12px] flex min-w-[200px] max-w-[260px] items-center gap-3 rounded-md border border-pi-line bg-background px-4 py-3 shadow-pi-2">
          <span className="grid size-[30px] flex-none place-items-center rounded-sm bg-pi-fill text-pi-ink">
            {lit ? (
              <Check className="size-4" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
          </span>
          <span className="min-w-0">
            <b className="block truncate text-[12px] font-medium text-pi-ink">
              {phase === "reading"
                ? "Reading the header row"
                : phase === "ready"
                  ? (fileName ?? "File selected")
                  : phase === "drag"
                    ? "Ready to receive"
                    : "One spreadsheet per upload"}
            </b>
            <small className="mt-0.5 block text-[9px] text-pi-faint">
              {lit ? "Columns map in the next step" : "CSV, XLS or XLSX"}
            </small>
          </span>
        </div>
      </div>

      <div className="code flex items-center justify-between gap-4 text-[9px] tracking-[0.03em] text-pi-faint">
        <span>SPREADSHEET → SALES VOUCHERS</span>
        <span>{lit ? "01 / 03" : "CSV · XLS · XLSX"}</span>
      </div>
    </div>
  );
};

export default UploadPage;
