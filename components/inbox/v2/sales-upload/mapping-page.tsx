import React, { useState } from "react";
import {
  ArrowRight,
  Clock,
  Info,
  RotateCcw,
  Save,
  Sparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
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
import { ComboBox } from "@/components/common/combo-box";
import { IMPORT_MODE_LABELS } from "@/config/pages/inbox/sales-upload";
import {
  salesUpload,
  type SalesBatchEntry,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ARBulkUploadFieldKey,
} from "@/types/pages/inbox/sales-upload";
import {
  columnSelections,
  getSuggestedTemplateName,
  missingRequiredFieldLabels,
  selectField,
} from "@/utils/pages/inbox/sales-upload";
import { Notice, PageDialog, T } from "../ui";
import { FlowHeader } from "./common";
import ProcessingModal from "./processing-modal";

/**
 * Map Fields — production's MappingPage: each spreadsheet column on the left,
 * the AIA field it feeds in the middle (the backend's suggestion pre-filled,
 * marked with a sparkle), and the column's first values on the right.
 */

type Props = {
  entry: SalesBatchEntry;
  onPreview: () => void;
  onExit: (tab?: "all" | "uploads") => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const MODES = [VoucherViewMode.ITEM_MODE, VoucherViewMode.ACCOUNTING_MODE];

/** Row hover wash, the Inbox's: the whole row, no lift, no edge. */
const ROW =
  "transition-colors duration-100 group-hover:bg-pi-row-hover motion-reduce:transition-none";

const MappingPage = ({ entry, onPreview, onExit, notify }: Props) => {
  const { batch, mapping, fieldMappings } = entry;
  const id = batch.importBatchUuid;
  const [showMissing, setShowMissing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(
    batch.status === ARVoucherImportBatchStatus.PROCESSING && !!mapping
  );
  const [confirmEdit, setConfirmEdit] = useState(false);

  const reading = !mapping;
  const missing = missingRequiredFieldLabels(batch.importMode, fieldMappings);
  const selections = columnSelections(fieldMappings);
  const suggested = mapping ? columnSelections(mapping.mappingPayload) : {};
  const fields = (mapping?.mappingSchema.fieldGroups ?? []).flatMap(
    (g) => g.fields
  );
  const busy = reading || predicting;

  const onClickPreview = () => {
    setShowMissing(true);
    if (missing.length) return;
    if (batch.status === ARVoucherImportBatchStatus.PENDING_MAPPING) {
      salesUpload.startPreview(id);
      setPredicting(true);
      return;
    }
    // Already previewed once: production asks before re-applying a mapping.
    setConfirmEdit(true);
  };

  const onSaveTemplate = () => {
    if (missing.length) {
      notify("Map mandatory fields before saving template.", "error");
      return;
    }
    const name = templateName.trim();
    salesUpload.saveTemplate(name, batch.importMode, fieldMappings);
    setSavedName(name);
    setSaveOpen(false);
    notify("Template saved.", "success");
  };

  const sheet = mapping?.sheets.find((x) => x.name === batch.selectedSheetName);
  const headerRows = Array.from({ length: 5 }, (_, i) => String(i + 1));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-pi-page">
      <FlowHeader
        title="Map Fields"
        fileName={batch.originalFileName}
        onClose={() => onExit("uploads")}
        step={1}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 w-full flex-col gap-4 px-[var(--inset-page)] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Item Mode | Accounting Mode — production's two-segment toggle. */}
              <div
                role="radiogroup"
                aria-label="Import mode"
                className="inline-flex rounded-sm border border-pi-line-2 bg-pi-fill p-0.5"
              >
                {MODES.map((mode) => {
                  const on = batch.importMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={busy}
                      onClick={() => {
                        if (on) return;
                        salesUpload.setImportMode(id, mode);
                        setShowMissing(false);
                        notify(
                          mode === VoucherViewMode.ITEM_MODE
                            ? "Switched to Item Mode."
                            : "Switched to Accounting Mode."
                        );
                      }}
                      className={cn(
                        "h-8 rounded-xs px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
                        on
                          ? "bg-background text-pi-ink shadow-contact"
                          : "text-pi-faint hover:text-pi-ink"
                      )}
                    >
                      {IMPORT_MODE_LABELS[mode]}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className={cn(T.cell, "text-pi-faint")}>
                    Sheet No.
                  </span>
                  <Select
                    value={batch.selectedSheetName ?? ""}
                    disabled={busy}
                    onValueChange={(value) => {
                      salesUpload.setSheet(id, value, 1);
                      notify("Sheet settings updated. Mapping refreshed.");
                    }}
                  >
                    <SelectTrigger
                      aria-label="Sheet No."
                      className={cn("h-9 w-[150px]", T.cell)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(mapping?.sheets ?? []).map((x, i) => (
                        <SelectItem key={x.name} value={x.name}>
                          {i + 1} · {x.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex items-center gap-2">
                  <span className={cn(T.cell, "text-pi-faint")}>
                    Header Row
                  </span>
                  <Select
                    value={String(batch.headerRowIndex ?? 1)}
                    disabled={busy}
                    onValueChange={(value) => {
                      salesUpload.setSheet(
                        id,
                        batch.selectedSheetName ?? "",
                        Number(value)
                      );
                      notify("Sheet settings updated. Mapping refreshed.");
                    }}
                  >
                    <SelectTrigger
                      aria-label="Header Row"
                      className={cn("h-9 w-[64px]", T.cell)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {headerRows.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <span className="h-6 w-px bg-pi-line-2" aria-hidden />
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    salesUpload.resetMapping(id);
                    notify("Mapping reset to backend suggestions.", "success");
                  }}
                >
                  <RotateCcw aria-hidden />
                  Reset Mapping
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setTemplateName(
                      getSuggestedTemplateName(
                        savedName ?? batch.selectedTemplateName
                      )
                    );
                    setSaveOpen(true);
                  }}
                >
                  <Save aria-hidden />
                  Save as Template
                </Button>
                <Button disabled={busy} onClick={onClickPreview}>
                  Preview
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1">
              <Clock className="size-3 text-pi-faint" aria-hidden />
              <HoverCard openDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      T.sub,
                      "underline decoration-dotted underline-offset-2"
                    )}
                  >
                    Estimated Time: 12–15 Mins
                  </button>
                </HoverCardTrigger>
                <HoverCardContent align="end" className="min-w-[336px] p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles
                      className="size-5 flex-none text-pi-ai-ink"
                      aria-hidden
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium leading-5 text-pi-ink">
                        We process your {sheet?.dataRowCount ?? batch.totalRows}{" "}
                        rows in the background.
                      </span>
                      <span className={T.sub}>
                        We match each entry to the right ledger, predict voucher
                        types and more.
                      </span>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>

          {showMissing && missing.length > 0 && (
            <Notice
              tone="danger"
              role="alert"
              className="flex flex-wrap items-start gap-x-2 gap-y-1 px-5"
            >
              <span className="flex items-start gap-2 font-medium text-foreground">
                <Info
                  className="mt-0.5 size-4 flex-none text-pi-danger"
                  aria-hidden
                />
                Please map all mandatory fields before previewing
              </span>
              <span>• {missing.join(", ")}.</span>
            </Notice>
          )}

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-pi-line bg-background shadow-table">
            <Table className="table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-pi-line [&_tr:last-child_td]:border-b-0">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[36%]" />
                <col className="w-[34%]" />
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-pi-head-bg [&_tr]:shadow-none [&_th]:border-b [&_th]:border-pi-line">
                <TableRow className="hover:bg-transparent">
                  {["Excel Header Fields", "AIA Fields", "Data Preview"].map(
                    (label) => (
                      <TableHead
                        key={label}
                        className={cn(
                          "h-11 whitespace-nowrap px-4 py-0 align-middle",
                          T.head
                        )}
                      >
                        {label}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reading
                  ? Array.from({ length: 8 }, (_, i) => (
                      <TableRow key={i} className="hover:bg-transparent">
                        {[0, 1, 2].map((c) => (
                          <TableCell key={c} className="h-14 px-4">
                            <span className="block h-3 w-2/3 animate-pulse rounded-xs bg-pi-fill motion-reduce:animate-none" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : mapping.detectedColumns.map((column) => {
                      const selected = selections[column];
                      const fromAi =
                        !!selected && suggested[column] === selected;
                      const values = (mapping.sampleRowPayload[column] ?? [])
                        .filter((v) => v !== "" && v !== null)
                        .map(String);
                      return (
                        <TableRow
                          key={column}
                          className="group hover:bg-transparent"
                        >
                          <TableCell
                            className={cn(
                              "h-14 px-4 align-middle font-medium text-pi-ink",
                              T.cell,
                              ROW
                            )}
                          >
                            <span className="block truncate" title={column}>
                              {column}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn("h-14 px-4 align-middle", ROW)}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <ComboBox<ARBulkUploadFieldKey | "">
                                title="Select..."
                                searchPlaceholder="Search fields"
                                options={fields.map((f) => ({
                                  label: f.label,
                                  value: f.key,
                                  disabled:
                                    !!fieldMappings[f.key] &&
                                    selected !== f.key,
                                }))}
                                optionGroups={(
                                  mapping.mappingSchema.fieldGroups ?? []
                                ).map((group) => ({
                                  label: group.label,
                                  options: group.fields.map((f) => ({
                                    label: f.required ? (
                                      <span>
                                        {f.label}
                                        <span className="ml-1 text-pi-danger">
                                          *
                                        </span>
                                      </span>
                                    ) : (
                                      f.label
                                    ),
                                    value: f.key,
                                    disabled:
                                      !!fieldMappings[f.key] &&
                                      selected !== f.key,
                                  })),
                                }))}
                                selectedValue={selected ?? ""}
                                onChange={(value) =>
                                  salesUpload.setFieldMappings(
                                    id,
                                    selectField(
                                      fieldMappings,
                                      column,
                                      (Array.isArray(value)
                                        ? value[0]
                                        : value) as ARBulkUploadFieldKey | ""
                                    )
                                  )
                                }
                                isMultiSelect={false}
                                modal={false}
                                disabled={busy}
                                size="sm"
                                emptyDataText="No fields found."
                                wrapperClassName="w-80"
                                triggerClassName={cn(
                                  "h-8 min-w-0 flex-1",
                                  T.cell
                                )}
                              />
                              <span
                                className="grid size-4 flex-none place-items-center"
                                title={fromAi ? "Suggested by AI" : undefined}
                              >
                                {fromAi && (
                                  <Sparkles
                                    className="size-3.5 text-pi-ai-ink"
                                    aria-label="Suggested by AI"
                                  />
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-14 px-4 align-middle",
                              T.cell,
                              "text-pi-faint",
                              ROW
                            )}
                          >
                            <span
                              className="block truncate"
                              title={values.join(", ")}
                            >
                              {values.length ? values.join(", ") : "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <PageDialog
        title="Save Mapping Template"
        description="Save this configuration to prefill mapping for similar files."
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        className="max-w-[520px]"
      >
        <label className="mt-2 flex flex-col gap-2">
          <span className={T.label}>Template Name</span>
          <Input
            value={templateName}
            placeholder="New Template"
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && templateName.trim()) onSaveTemplate();
            }}
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setSaveOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!templateName.trim()} onClick={onSaveTemplate}>
            Save Template
          </Button>
        </div>
      </PageDialog>

      <PageDialog
        title="Edit Mapping?"
        open={confirmEdit}
        onClose={() => setConfirmEdit(false)}
        className="max-w-[480px]"
      >
        <p className={T.value}>
          You&apos;ve changed the column mapping. AI prediction will not run
          again. Previously AI-mapped values for newly or updated mapped fields
          will be removed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmEdit(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              salesUpload.applyMappingWithoutPrediction(id);
              setConfirmEdit(false);
              onPreview();
            }}
          >
            Go to Preview
          </Button>
        </div>
      </PageDialog>

      {predicting && (
        <ProcessingModal
          batch={batch}
          open
          onGoToUploads={() => onExit("uploads")}
          onComplete={() => {
            notify("Preview generated.", "success");
            onPreview();
          }}
        />
      )}
    </div>
  );
};

export default MappingPage;
