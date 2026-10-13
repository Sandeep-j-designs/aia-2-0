import React, { useState } from "react";
import { CloudAlert, CloudDownload, FileJson } from "@/components/icons";
import {
  GSTR2B_ALLOWED_EXTENSIONS,
  GSTR2B_PORTAL_ENTITY,
  GSTR2B_STATUS_CONFIG,
  GST_FILE_CATEGORIES,
  Gstr2BStatusEnums,
} from "@/config/pages/inbox/gst";
import { gst, monthTitle } from "@/hooks/pages/inbox/use-gst";
import type {
  GstPeriod,
  gstr2BDataStatusType,
  SavedAuthDataResponse,
} from "@/types/pages/inbox/gst";
import { Spinner } from "@/components/inbox/v2/ui";
import PortalAuthCard from "./portal-auth-card";
import { DropZone, StatusItem } from "./sheet-parts";

/**
 * The sheet's GSTR-2B block — production's gstr-2b-section: fetch from the
 * portal or upload the portal's file, never both for one period, and a row
 * per fetch or file showing where it stands.
 */

type Props = {
  company: string;
  gstin: string;
  period: GstPeriod;
  items: gstr2BDataStatusType[];
  savedAuth: SavedAuthDataResponse;
  /** The GSTIN is locked while the portal card is open, as in production. */
  onAuthOpenChange: (open: boolean) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const Gstr2bSection = ({
  company,
  gstin,
  period,
  items,
  savedAuth,
  onAuthOpenChange,
  notify,
}: Props) => {
  const [showAuth, setShowAuth] = useState(false);
  const [fetching, setFetching] = useState(false);

  const hasFetched = items.some((i) => i.entityType === GSTR2B_PORTAL_ENTITY);
  const hasUploaded = items.some(
    (i) => i.entityType === GST_FILE_CATEGORIES.GSTR2B
  );

  const openAuth = (open: boolean) => {
    setShowAuth(open);
    onAuthOpenChange(open);
  };

  const fetch2b = async () => {
    setFetching(true);
    const result = await gst.fetch2b(company, gstin, period);
    setFetching(false);
    if (result === "auth_required") openAuth(true);
  };

  // The two ways in, side by side, until one of them has worked: a period
  // takes its 2B from the portal or from a file, never both.
  const settled = items.some(
    (i) => i.status !== Gstr2BStatusEnums.EXTRACTION_FAILED
  );

  return (
    <div className="flex flex-col gap-2">
      {!showAuth && !settled && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={fetching || hasUploaded}
            onClick={() => void fetch2b()}
            className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-pi-line-2 bg-background px-4 py-4 text-center shadow-contact transition-colors duration-150 hover:border-pi-brand-border hover:bg-pi-brand-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pi-brand disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {fetching ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <CloudDownload className="h-4 w-4 text-pi-brand" aria-hidden />
            )}
            <span className="text-[13px] font-medium text-pi-ink">
              Fetch from GST Portal
            </span>
            <span className="text-[12px] leading-4 text-pi-body">
              Asks for an OTP if the session has expired
            </span>
          </button>
          <DropZone
            stacked
            title="Upload GSTR-2B File"
            tooltip="Upload the GSTR-2B file exported from the GST portal."
            hint={
              <span className="text-[12px] leading-4 text-pi-body">
                .json (recommended) or .xlsx
              </span>
            }
            extensions={GSTR2B_ALLOWED_EXTENSIONS}
            disabled={fetching || hasFetched}
            onError={(message) => notify(message, "error")}
            onFiles={(files) =>
              files.forEach((file) =>
                gst.upload2b(company, gstin, period, file)
              )
            }
          />
        </div>
      )}

      {items.map((item) => {
        const config = GSTR2B_STATUS_CONFIG[item.status];
        const busy = item.status === Gstr2BStatusEnums.IN_PROGRESS;
        const failed = item.status === Gstr2BStatusEnums.EXTRACTION_FAILED;
        const file = item.entityType === GST_FILE_CATEGORIES.GSTR2B;
        return (
          <StatusItem
            key={item.fileStatusUuid}
            icon={failed ? CloudAlert : file ? FileJson : CloudDownload}
            title={file ? (item.fileName ?? "") : monthTitle(item.periodFrom)}
            status={config}
            busy={busy}
            error={failed}
            detail={
              item.errorMessage ??
              (item.status === Gstr2BStatusEnums.EXTRACTION_SUCCESSFUL
                ? `${item.gstr2bLineCount} invoice${item.gstr2bLineCount === 1 ? "" : "s"}`
                : file
                  ? "Reading the file…"
                  : "Fetching from the GST portal…")
            }
            onDelete={
              busy
                ? undefined
                : () => {
                    gst.delete2b(company, item);
                    notify("GSTR-2B data deleted successfully", "success");
                  }
            }
          />
        );
      })}

      {showAuth && (
        <PortalAuthCard
          company={company}
          gstin={gstin}
          savedAuth={savedAuth}
          notify={notify}
          onClose={() => openAuth(false)}
          onVerified={() => void fetch2b()}
        />
      )}
    </div>
  );
};

export default Gstr2bSection;
