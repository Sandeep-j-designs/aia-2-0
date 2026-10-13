import React from "react";
import { CircleAlert, CircleCheck, Loader2 } from "@/components/icons";
import type { NeoRef, NeoStep } from "@/types/pages/neo";
import { cn } from "@/lib/utils";

type Props = { steps: NeoStep[]; onRef: (ref: NeoRef) => void };

/**
 * What Neo is doing, one line per step, ticked as each lands. A step reads as
 * done only once the store has accepted the write behind it.
 */
const Steps = ({ steps, onRef }: Props) => (
  <ol className="flex flex-col gap-1.5 border-l border-surface-stroke py-0.5 pl-3">
    {steps.map((s) => (
      <li
        key={s.id}
        className={cn(
          "flex items-start gap-2 text-body-4",
          s.status === "running"
            ? "text-topnav-avatar-text"
            : "text-surface-foreground-muted",
          s.status === "failed" && "text-status-error"
        )}
      >
        {s.status === "running" ? (
          <Loader2 className="mt-px h-3.5 w-3.5 flex-none animate-spin text-border motion-reduce:animate-none" />
        ) : s.status === "failed" ? (
          <CircleAlert className="mt-px h-3.5 w-3.5 flex-none" />
        ) : (
          <CircleCheck className="mt-px h-3.5 w-3.5 flex-none text-status-success" />
        )}
        <span className="min-w-0">
          {s.label}
          {s.cite && (
            <button
              type="button"
              onClick={() => onRef(s.cite!)}
              className="ml-1.5 rounded-sm font-semibold text-border underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {s.cite.label}
            </button>
          )}
        </span>
      </li>
    ))}
  </ol>
);

export default Steps;
