import React from "react";
import { Crosshair, X } from "@/components/icons";
import { useStore } from "@/components/inbox/v2/store";
import type { NeoContext } from "@/types/pages/neo";

type Props = { context: NeoContext; onClear: () => void; locked?: boolean };

const MODULE_NAME = { AP: "Purchases", AR: "Sales", JV: "Journal Vouchers" };

/**
 * What "this" means right now. Neo reads the screen, and says so — the chip
 * is the difference between an agent that guesses and one that is pointing
 * at the same record you are. × detaches it, for a question about something
 * else.
 */
const ContextChip = ({ context, onClear, locked }: Props) => {
  const state = useStore();
  const item = state.items.find((x) => x.id === context.itemId);
  const label = item
    ? item.form.party || item.file.name
    : context.selectedIds.length
      ? `${context.selectedIds.length} selected row${context.selectedIds.length === 1 ? "" : "s"}`
      : context.module
        ? `${MODULE_NAME[context.module]} register`
        : "";
  return (
    <div className="flex min-h-11 flex-none items-center gap-2 border-b border-pi-line px-5 pb-3 pt-1 text-xs text-pi-body">
      <Crosshair className="h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="flex-none">{locked ? "Working on" : "Looking at"}</span>
      {label ? (
        <span className="flex min-w-0 items-center gap-1 rounded-md bg-pi-fill py-0.5 pl-2 pr-0.5 text-label-3 font-semibold text-pi-ink">
          <span
            className="truncate"
            title={item ? `${label} · ${item.id}` : label}
          >
            {label}
          </span>
          <button
            type="button"
            aria-label="Stop using this as context"
            disabled={locked}
            onClick={onClear}
            className="grid h-4 w-4 flex-none place-items-center rounded-sm text-pi-body hover:bg-background hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : (
        <span className="truncate font-semibold text-pi-ink">
          All documents
        </span>
      )}
    </div>
  );
};

export default ContextChip;
