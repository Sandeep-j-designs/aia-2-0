import React from "react";
import { Undo2 } from "@/components/icons";
import type { NeoRef, NeoRun } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { companyOf } from "@/components/inbox/v2/store";

type Props = {
  runs: NeoRun[];
  busy: boolean;
  onUndo: (runId: string) => void;
  onRef: (ref: NeoRef) => void;
};

const STATUS: Record<NeoRun["status"], { label: string; className: string }> = {
  running: { label: "Running", className: "bg-border text-surface" },
  "needs-you": {
    label: "Needs you",
    className: "bg-status-warning text-surface",
  },
  done: {
    label: "Done",
    className: "bg-status-success text-surface",
  },
  failed: {
    label: "Failed",
    className: "bg-status-error text-surface",
  },
  stopped: {
    label: "Stopped",
    className: "bg-surface-muted text-surface-foreground-muted",
  },
  undone: {
    label: "Undone",
    className: "bg-surface-muted text-surface-foreground-muted",
  },
};

/**
 * Every run this session, newest first: what it was, where it got to, what it
 * touched, and the one-step Undo while nothing it made has been approved.
 */
const RunList = ({ runs, onUndo, onRef, busy }: Props) =>
  runs.length ? (
    <ul className="flex flex-col">
      {runs.map((r) => (
        <li key={r.id} className="border-b border-surface-stroke px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-label-3 font-semibold text-topnav-avatar-text">
              {r.title}
            </p>
            <span
              className={cn(
                "flex-none rounded-sm px-1.5 py-0.5 text-caption-1 font-semibold",
                STATUS[r.status].className
              )}
            >
              {STATUS[r.status].label}
            </span>
          </div>
          <p className="mt-0.5 text-caption-1 text-surface-foreground-muted tabular-nums">
            {companyOf(r.context.company || "")?.name} ·{" "}
            {new Date(r.startedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {r.summary ? ` · ${r.summary}` : ""}
          </p>
          {(r.touched.length > 0 || r.undoable) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {r.touched.slice(0, 4).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onRef({ label: id, itemId: id })}
                  className="rounded-sm border border-surface-stroke px-1.5 py-0.5 text-caption-1 font-semibold text-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  {id}
                </button>
              ))}
              {r.touched.length > 4 && (
                <span className="text-caption-1 text-surface-foreground-muted">
                  +{r.touched.length - 4}
                </span>
              )}
              {r.undoable && (
                <button
                  type="button"
                  disabled={busy}
                  className="ml-auto flex h-6 items-center gap-1 rounded-md px-1.5 text-label-3 font-semibold text-topnav-avatar-text hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  onClick={() => onUndo(r.id)}
                >
                  <Undo2 className="h-3 w-3" />
                  Undo run
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="px-3 py-6 text-body-4 text-surface-foreground-muted">
      Nothing yet. Every task Neo runs is listed here, with an Undo for what it
      created.
    </p>
  );

export default RunList;
