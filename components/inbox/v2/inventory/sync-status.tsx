import React from "react";
import {
  SyncChip,
  syncStateOf,
} from "@/components/inbox/v2/chart-of-accounts/master-parts";

type Props = {
  status: string;
  syncDate?: string;
  syncProduct?: string;
  syncError?: string;
};

/**
 * production's components/common/table-column/sync-status.tsx: synced,
 * syncing and failed, each with a tooltip that says when or why; not synced
 * has no tooltip. Drawn as a Precision Indigo dot-chip (master-parts SyncChip).
 */
const SyncStatus = ({ status, syncDate, syncProduct, syncError }: Props) => {
  const product = syncProduct || "Tally";
  const state = syncStateOf(status);
  const [title, detail] =
    state === "synced"
      ? [
          `Synced to ${product}`,
          syncDate
            ? new Date(syncDate).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })
            : "",
        ]
      : state === "syncing"
        ? [`Syncing to ${product}...`, "Updates will appear shortly"]
        : state === "failed"
          ? ["Failed to Sync", syncError ?? ""]
          : [undefined, undefined];
  return <SyncChip status={status} title={title} detail={detail} />;
};

export default SyncStatus;
