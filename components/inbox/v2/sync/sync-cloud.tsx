import React from "react";
import { Cloud, CloudOff } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { actor } from "@/components/inbox/v2/store";
import { cn } from "@/lib/utils";

/**
 * Where Tally stands on this document.
 *
 *   syncing  in a run right now
 *   synced   landed, and unchanged since
 *   stale    landed, then edited — Tally is holding an older copy
 *   pending  never went across
 */
export type SyncCloudState = "syncing" | "synced" | "stale" | "pending";

type SyncCloudProps = {
  state: SyncCloudState;
  /** The list draws it small; the detail header sits among 16px controls. */
  className?: string;
  side?: "top" | "bottom";
};

/**
 * The cloud beside a document's name — whether Tally has it yet.
 *
 * One glyph, coloured by state, as in the design: amber while the document is
 * in a run or carrying an edit Tally has not seen, muted once it has landed or
 * if it has never gone. It is a passive marker, so it never takes focus or a
 * click; the tooltip exists because "why is this one amber" is the only
 * question it raises.
 *
 * There is no re-sync: a voucher edited after posting simply becomes syncable
 * again, and goes across on the next ordinary run. The tooltip says so rather
 * than offering an action that does not exist.
 *
 * Built from Figma 25082:19760.
 */
const SyncCloud = ({ state, className, side = "top" }: SyncCloudProps) => {
  const amber = state === "syncing" || state === "stale";
  const Glyph = state === "pending" ? CloudOff : Cloud;

  // Its own provider, matching BlockedReason in the workspace — the list is not
  // wrapped in one, and a Radix tooltip without a provider renders nothing.
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex-none" aria-hidden>
            <Glyph
              className={cn(
                "h-3.5 w-3.5",
                amber ? "text-pi-warning-dot" : "text-pi-faint",
                className
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} align="start">
          {state === "syncing" ? (
            <div>
              <p className="font-medium">Syncing…</p>
              {/* DEV: the name comes from the job, not the session — a sync
                started by a colleague must show THEIR name, which is the whole
                point of the tooltip. */}
              <p>Sync initiated by {actor}</p>
            </div>
          ) : state === "stale" ? (
            <div>
              <p className="font-medium">Edited after syncing</p>
              <p>Sync again to update Tally.</p>
            </div>
          ) : state === "pending" ? (
            <div>
              <p className="font-medium">Not in Tally yet</p>
              <p>Sync to push it.</p>
            </div>
          ) : (
            <p>In Tally</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncCloud;
