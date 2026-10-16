import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  Maximize,
  Minimize,
  Pencil,
  Trash2,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import JournalVoucher from "@/components/inbox/journal";
import { Item } from "./store";
import { ApprovedDetails } from "./record-details";
import SyncCloud from "./sync/sync-cloud";
import s from "./record-panel.module.css";

type Props = {
  item: Item;
  company: string;
  /** The approved rows of the table it was opened from, in that order. */
  items: Item[];
  /** Where Tally stands on this voucher, for the marker in the toolbar. */
  syncState: React.ComponentProps<typeof SyncCloud>["state"];
  canEdit: boolean;
  onOpen: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Opens the document's History sheet. */
  onHistory: () => void;
  /** Back to the table at full width. */
  onClose: () => void;
};

/** Matches the exit transition in record-panel.module.css. */
const EXIT_MS = 160;

/** One round icon control in the panel's toolbar. */
const ToolButton = ({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(s.tool, danger && s.danger)}
  >
    {children}
  </button>
);

/**
 * An approved record, docked beside the table it was opened from — the table
 * stays where it was, narrowed, with this row lit. The toolbar sits on the
 * panel's grey ground and the voucher on a sheet above it, so the controls
 * never compete with the record.
 *
 * Up and Down move through the approved rows of that table (the keys do the
 * same while focus is in the panel); expand gives the record the full width.
 */
const RecordPanel = ({
  item,
  company,
  items,
  syncState,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
  onHistory,
  onClose,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const at = items.findIndex((x) => x.id === item.id);
  const step = (by: number) => {
    const next = items[at + by];
    if (next) onOpen(next.id);
  };
  // The panel slides out before the table takes its width back.
  const close = () => {
    if (leaving) return;
    setLeaving(true);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.setTimeout(onClose, reduced ? 0 : EXIT_MS);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // An open dialog (the document preview, a delete confirmation) takes
      // Escape for itself.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <aside
      aria-label="Approved voucher"
      className={cn(s.panel, expanded && s.expanded, leaving && s.leaving)}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, [role=menu]")) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          step(event.key === "ArrowDown" ? 1 : -1);
        }
      }}
    >
      <div className={s.toolbar}>
        <div className={s.group}>
          <ToolButton
            label="Previous voucher"
            disabled={at <= 0}
            onClick={() => step(-1)}
          >
            <ChevronUp size={16} aria-hidden />
          </ToolButton>
          <ToolButton
            label="Next voucher"
            disabled={at < 0 || at >= items.length - 1}
            onClick={() => step(1)}
          >
            <ChevronDown size={16} aria-hidden />
          </ToolButton>
          <span className={s.divider} aria-hidden />
          <ToolButton label="Edit entry" disabled={!canEdit} onClick={onEdit}>
            <Pencil size={15} aria-hidden />
          </ToolButton>
          <ToolButton label="Delete voucher" danger onClick={onDelete}>
            <Trash2 size={15} aria-hidden />
          </ToolButton>
          <ToolButton label="History" onClick={onHistory}>
            <History size={15} aria-hidden />
          </ToolButton>
          <span className={s.sync}>
            <SyncCloud className="h-4 w-4" side="bottom" state={syncState} />
          </span>
        </div>
        <div className={s.group}>
          <ToolButton
            label={expanded ? "Show the table" : "Expand to full width"}
            onClick={() => setExpanded((on) => !on)}
          >
            {expanded ? (
              <Minimize size={15} aria-hidden />
            ) : (
              <Maximize size={15} aria-hidden />
            )}
          </ToolButton>
          <ToolButton label="Close" onClick={close}>
            <X size={16} aria-hidden />
          </ToolButton>
        </div>
      </div>
      {/* Keyed so each voucher opens at its top, not where the last one was
          left. */}
      <div key={item.id} className={s.scroll}>
        <div className={s.sheet}>
          {item.route === "JV" ? (
            <JournalVoucher
              item={item}
              attempted={false}
              readOnly
              onEdit={() => {}}
            />
          ) : (
            <ApprovedDetails item={item} company={company} />
          )}
        </div>
      </div>
    </aside>
  );
};

export default RecordPanel;
