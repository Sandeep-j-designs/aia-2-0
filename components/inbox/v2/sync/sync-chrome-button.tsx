import React from "react";
import { RefreshCcw } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { TallyConnection } from "@/types/pages/inbox/sync";

type SyncChromeButtonProps = {
  onClick: () => void;
  isSyncing: boolean;
  connection: TallyConnection;
};

/**
 * Sync, as it sits in the app bar.
 *
 * Moved out of the page header because syncing is not a property of whichever
 * screen you happen to be on — one Tally connection, one queue, one company.
 * In the page header it read as "sync this list"; up here it reads as what it
 * is, and it stops disappearing when you open a document.
 *
 * Styled off the company chip rather than the Button component: `variant`
 * outline is drawn for a light page and goes to dark-on-dark against the bar.
 * Filled chip, so it pairs with the company switcher beside it and still reads
 * as a control next to the ghost Guide and What's-new buttons.
 */
const SyncChromeButton = ({
  onClick,
  isSyncing,
  connection,
}: SyncChromeButtonProps) => {
  const status = isSyncing
    ? "syncing"
    : connection === "offline"
      ? "offline"
      : "connected";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        status === "syncing"
          ? "Syncing to Tally"
          : status === "offline"
            ? "Sync — Tally not connected"
            : "Sync to Tally"
      }
      title={
        status === "syncing"
          ? "Syncing to Tally"
          : status === "offline"
            ? "Tally not connected"
            : "Sync to Tally"
      }
      // The reference's "To sync" chip: a quiet bordered control whose state
      // lives in the dot on the glyph, not in a coloured fill.
      className={cn(
        "relative flex h-9 flex-none items-center gap-2 rounded-md border border-pi-line-2 bg-pi-surface-panel px-3 text-[13px] font-medium text-pi-body",
        "shadow-contact transition-[border-color,color] duration-150 hover:border-pi-line-strong hover:text-pi-ink"
      )}
    >
      <span className="relative">
        <RefreshCcw className={cn("size-4", isSyncing && "animate-spin motion-reduce:animate-none")} />
      </span>
      <span className="hidden sm:inline">Sync</span>

      {/* Whether Tally is reachable decides whether pressing this does
          anything, so the dot rides on the button. The ring is the BAR's
          colour, not the page's — it is punching a hole in dark chrome. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[18px] top-[7px] size-2 rounded-full ring-2 ring-pi-surface-panel",
          status === "connected" && "bg-pi-success-dot",
          status === "offline" && "bg-pi-danger-dot",
          status === "syncing" && "animate-pulse bg-pi-warning-dot motion-reduce:animate-none"
        )}
      />
    </button>
  );
};

export default SyncChromeButton;
