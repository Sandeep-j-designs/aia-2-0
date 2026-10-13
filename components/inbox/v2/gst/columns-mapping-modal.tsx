import React, { useEffect, useMemo, useState } from "react";
import { Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import {
  COLUMN_MAPPING_CONFIG,
  COLUMN_MAPPING_KEYS,
  defaultColumnMapping,
  headerRowOptions,
  prDateFormatOptions,
  voucherTypeOptions,
} from "@/config/pages/inbox/gst";
import { MOCK_PR_COLUMN_MAPPING } from "@/config/pages/inbox/mock-gst";
import type { MappingConfig, Mappings } from "@/types/pages/inbox/gst";
import {
  Field,
  FieldError,
  OptionalTag,
  PageDialog,
  RequiredNote,
  T,
} from "@/components/inbox/v2/ui";
import { AiMark } from "../ai-mark";

/**
 * Map Your Columns — production's columns-mapping-modal: Header Row and
 * Voucher Type above, then each AIA field against the file's column that
 * feeds it. The backend's suggestion arrives pre-filled; a sparkle marks a
 * field still on its suggestion.
 */

type Props = {
  open: boolean;
  fileName: string;
  /** A mapping saved earlier for this file, if any. */
  initialMapping?: MappingConfig;
  onClose: () => void;
  onSave: (mapping: MappingConfig) => void;
  saving: boolean;
};

const normalize = (mapping?: MappingConfig): MappingConfig => ({
  ...defaultColumnMapping,
  ...mapping,
  mappings: { ...defaultColumnMapping.mappings, ...mapping?.mappings },
  columns: mapping?.columns ?? defaultColumnMapping.columns,
});

const isEmpty = (value: unknown) =>
  !value ||
  (Array.isArray(value)
    ? !value.some((v) => String(v).trim())
    : !String(value).trim());

const ColumnsMappingModal = ({
  open,
  fileName,
  initialMapping,
  onClose,
  onSave,
  saving,
}: Props) => {
  const [mapping, setMapping] = useState<MappingConfig>(() =>
    normalize(initialMapping)
  );
  const [loading, setLoading] = useState(!initialMapping);

  // DEV: POST /api/gst-reconciliation/column-mappings { fileUuid, companyId, headerOffset? }
  const load = (headerOffset = 0) => {
    setLoading(true);
    window.setTimeout(() => {
      setMapping(normalize({ ...MOCK_PR_COLUMN_MAPPING, headerOffset }));
      setLoading(false);
    }, 700);
  };

  useEffect(() => {
    if (!open) return;
    if (initialMapping) {
      setMapping(normalize(initialMapping));
      setLoading(false);
    } else load();
  }, [open]);

  const set = <K extends keyof Mappings>(key: K, value: Mappings[K]) =>
    setMapping((m) => ({ ...m, mappings: { ...m.mappings, [key]: value } }));

  const ready = useMemo(
    () =>
      !!mapping.mappings.documentType &&
      COLUMN_MAPPING_KEYS.every(
        (key) =>
          !COLUMN_MAPPING_CONFIG[key].isRequired ||
          !isEmpty(mapping.mappings[key as keyof Mappings])
      ),
    [mapping]
  );

  const options = mapping.columns.map((c) => ({ label: c, value: c }));
  const suggested = MOCK_PR_COLUMN_MAPPING.mappings;

  return (
    <PageDialog
      open={open}
      onClose={onClose}
      title="Map Your Columns"
      description={fileName}
      className="max-w-[1024px]"
      footer={
        <>
          {/* The disclaimer rides the footer's left edge, the actions its right. */}
          <p className="mr-auto text-[13px] text-pi-body">
            <span className="font-medium text-pi-danger">Disclaimer:</span>{" "}
            Rows/Invoices with 0 tax value are excluded from the reconciliation
            process
          </p>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={!ready || loading || saving}
            loading={saving}
            onClick={() => onSave(mapping)}
          >
            Map &amp; import
          </Button>
        </>
      }
    >
      {/* Form fields (7 Oct 2026): the 38px form box via Field; required is
          unmarked, the optional mappings say so in the table below. */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
          <Field label="Header Row" className="w-[160px]">
            <Select
              value={String(mapping.headerOffset)}
              onValueChange={(value) => load(Number(value))}
              disabled={loading}
            >
              <SelectTrigger aria-label="Header Row">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headerRowOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Voucher Type"
            className="w-[200px]"
            error={
              !loading && !mapping.mappings.documentType
                ? "Choose a voucher type"
                : undefined
            }
          >
            <Select
              value={mapping.mappings.documentType}
              onValueChange={(value) => set("documentType", value)}
              disabled={loading}
            >
              <SelectTrigger aria-label="Voucher Type">
                <SelectValue placeholder="Select Voucher Type" />
              </SelectTrigger>
              <SelectContent>
                {voucherTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <RequiredNote />
      </div>

      <div className="max-h-[52vh] min-h-0 overflow-auto overscroll-none rounded-lg border border-pi-line bg-background">
        <Table className="table-fixed border-separate border-spacing-0 [&_:is(th,td):not(:last-child)]:border-r [&_td]:border-b [&_td]:border-pi-line [&_th]:border-b [&_th]:border-pi-line [&_tr:last-child_td]:border-b-0">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[64%]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-pi-head-bg [&_tr]:shadow-none">
            <TableRow className="hover:bg-transparent">
              {["Fields", "Source column header"].map((label) => (
                <TableHead
                  key={label}
                  className={cn(
                    "h-11 whitespace-nowrap px-4 py-0 align-middle",
                    T.head
                  )}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {COLUMN_MAPPING_KEYS.map((key) => {
              const field = COLUMN_MAPPING_CONFIG[key];
              const multi = field.type === "multi";
              const value = mapping.mappings[key as keyof Mappings];
              const missing = field.isRequired && isEmpty(value);
              const isDate = key === "invoiceDate" || key === "voucherDate";
              const formatKey =
                key === "invoiceDate"
                  ? "invoiceDateFormat"
                  : ("voucherDateFormat" as const);
              const fromAi =
                !loading &&
                !isEmpty(value) &&
                JSON.stringify(value) ===
                  JSON.stringify(suggested[key as keyof Mappings]);
              return (
                <TableRow key={key} className="hover:bg-transparent">
                  <TableCell className={cn("h-14 px-4 align-middle", T.cell)}>
                    <span className="flex items-center gap-2">
                      {field.label}
                      {field.isRequired ? null : <OptionalTag />}
                      {key === "invoiceAmount" && (
                        <Tooltip
                          align="start"
                          message="add all TDS columns in invoice amount, if any"
                        >
                          <Info className="h-3 w-3 text-pi-faint" />
                        </Tooltip>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-2 align-middle">
                    {loading ? (
                      <span className="block h-3 w-2/3 animate-pulse rounded-xs bg-pi-fill motion-reduce:animate-none" />
                    ) : (
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <ComboBox<string>
                            title="Select Column"
                            searchPlaceholder="Search columns"
                            options={options}
                            selectedValue={
                              (multi
                                ? (value as string[])
                                : (value as string)) ?? ""
                            }
                            isMultiSelect={multi}
                            hideClearButton={!multi}
                            showSelectedValuesInTrigger
                            modal={false}
                            size="sm"
                            invalid={missing}
                            onChange={(next) =>
                              set(
                                key as keyof Mappings,
                                (multi
                                  ? Array.isArray(next)
                                    ? next
                                    : [next]
                                  : Array.isArray(next)
                                    ? (next[0] ?? "")
                                    : next) as never
                              )
                            }
                            wrapperClassName="w-[--radix-popover-trigger-width]"
                            triggerClassName={cn("h-8 min-w-0 flex-1", T.cell)}
                          />
                          {isDate && (
                            <ComboBox<string>
                              title={
                                key === "invoiceDate"
                                  ? "Select Invoice Date Format"
                                  : "Select Voucher Date Format"
                              }
                              options={prDateFormatOptions}
                              selectedValue={mapping.mappings[formatKey] ?? ""}
                              isMultiSelect={false}
                              hasSearch={false}
                              hideClearButton
                              modal={false}
                              size="sm"
                              onChange={(next) =>
                                set(
                                  formatKey,
                                  Array.isArray(next) ? next[0] : next
                                )
                              }
                              wrapperClassName="w-[180px]"
                              triggerClassName={cn("h-8 w-[150px]", T.cell)}
                            />
                          )}
                          <span className="grid size-4 flex-none place-items-center">
                            {fromAi && (
                              <AiMark reason="matched from the column header and sample values" />
                            )}
                          </span>
                        </div>
                        {missing ? <FieldError>Required</FieldError> : null}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </PageDialog>
  );
};

export default ColumnsMappingModal;
