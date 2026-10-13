import React, { useState } from "react";
import { format } from "date-fns";
import { Download, FileSpreadsheet, FileWarning } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  PR_ALLOWED_EXTENSIONS,
  PR_FILE_STATUS_CONFIG,
  PR_TEMPLATE_FILE_NAME,
  PR_TEMPLATE_HEADERS,
  PrFileStatusEnums,
} from "@/config/pages/inbox/gst";
import { gst } from "@/hooks/pages/inbox/use-gst";
import type {
  GstPeriod,
  MappingConfig,
  PrFileStatus,
} from "@/types/pages/inbox/gst";
import { downloadText, toCsv } from "@/utils/pages/inbox/gst";
import ColumnsMappingModal from "./columns-mapping-modal";
import { DropZone, StatusItem } from "./sheet-parts";

/**
 * The sheet's Purchase Register block — production's purchase-register
 * section: upload, map the file's columns, then the backend extracts it.
 *
 * Production's multi-file "Upload Summary" modal and its duplicate / conflict
 * modals are not built: one PR file per run is enough to show the flow.
 */

type Props = {
  company: string;
  gstin: string;
  period: GstPeriod;
  files: PrFileStatus[];
  mappings: Record<string, MappingConfig>;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const PurchaseRegisterSection = ({
  company,
  gstin,
  period,
  files,
  mappings,
  notify,
}: Props) => {
  const [mappingFile, setMappingFile] = useState<PrFileStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const mappable = files.filter(
    (f) => f.status === PrFileStatusEnums.MAPPING_REQUIRED
  );

  const upload = (list: File[]) => {
    const added = list.map((file) =>
      gst.uploadPr(company, gstin, period, file)
    );
    // As production: an upload goes straight to its mapping.
    if (added[0]) setMappingFile(added[0]);
  };

  const downloadTemplate = () => {
    downloadText(PR_TEMPLATE_FILE_NAME, toCsv([PR_TEMPLATE_HEADERS]));
  };

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => {
        const config = PR_FILE_STATUS_CONFIG[file.status];
        const failed = file.status === PrFileStatusEnums.EXTRACTION_FAILED;
        const busy = file.status === PrFileStatusEnums.IN_PROGRESS;
        const needsMapping = file.status === PrFileStatusEnums.MAPPING_REQUIRED;
        return (
          <StatusItem
            key={file.fileStatusUuid}
            icon={
              failed || file.status === PrFileStatusEnums.EXTRACTED_PARTIALLY
                ? FileWarning
                : FileSpreadsheet
            }
            title={file.fileName}
            status={config}
            busy={busy}
            error={failed}
            detail={
              file.errorPayload?.error ??
              (file.status === PrFileStatusEnums.EXTRACTION_SUCCESSFUL
                ? `Uploaded ${format(new Date(file.creationDate), "dd MMM yyyy, h:mm a")}`
                : needsMapping
                  ? "Map the file's columns to import it."
                  : busy
                    ? "Extracting invoices…"
                    : undefined)
            }
            onClick={needsMapping ? () => setMappingFile(file) : undefined}
            onRetry={failed ? () => gst.retryPr(company, file) : undefined}
            onDelete={
              config.showDeleteButton
                ? () => {
                    gst.deletePr(company, file);
                    notify(`${file.fileName} removed`, "success");
                  }
                : undefined
            }
          />
        );
      })}

      {mappable.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7"
            onClick={() => setMappingFile(mappable[0])}
          >
            {mappable.length > 1 ? "Map Files" : "Map File"}
          </Button>
        </div>
      )}

      <DropZone
        stacked
        title={
          files.length ? "Add Another Register" : "Upload Purchase Register"
        }
        tooltip="Purchase, Journal and Debit/Credit Note registers. Only the first sheet is read."
        hint={
          <span className="text-[12px] leading-4 text-pi-body">
            {PR_ALLOWED_EXTENSIONS.join(" or ")} · up to 20 MB
          </span>
        }
        extensions={PR_ALLOWED_EXTENSIONS}
        onError={(message) => notify(message, "error")}
        onFiles={upload}
      />

      <Button
        variant="link-secondary"
        className="ml-auto h-auto gap-1.5 py-1 text-[12px] text-pi-body no-underline hover:text-pi-brand hover:no-underline"
        onClick={downloadTemplate}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Download Template
      </Button>

      {mappingFile && (
        <ColumnsMappingModal
          open
          fileName={mappingFile.fileName}
          initialMapping={mappings[mappingFile.fileUuid]}
          saving={saving}
          onClose={() => setMappingFile(null)}
          onSave={(mapping) => {
            setSaving(true);
            gst.mapAndImport(company, mappingFile, mapping);
            setSaving(false);
            setMappingFile(null);
          }}
        />
      )}
    </div>
  );
};

export default PurchaseRegisterSection;
