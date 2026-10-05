import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SYNC_MASTERS_NOTE } from "@/config/pages/inbox/sync";
import { cn } from "@/lib/utils";
import type {
  SyncModule,
  SyncModuleKey,
  TallyConnection,
} from "@/types/pages/inbox/sync";

type SyncConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null on the Inbox, which carries no module scope. */
  currentModule: SyncModule | null;
  includedModules: SyncModule[];
  selectedKeys: Set<SyncModuleKey>;
  onToggleModule: (key: SyncModuleKey) => void;
  connection: TallyConnection;
  selectedCount: number;
  onConfirm: () => void;
};

/**
 * "Sync to Tally" — the confirmation step.
 *
 * The one decision this screen asks for is scope. The module you pressed Sync
 * on leads and starts checked, but it comes off like any other: pressing Sync
 * on Bills and then deciding to send only the Invoices sitting behind them is
 * a real thing to want, and a checkbox that refuses is worse than no checkbox.
 * The Sync button is what goes dead when nothing is left checked.
 *
 * Pressed from the Inbox there is no module to lead: `currentModule` is null,
 * the featured card and its two headings drop out, and every bucket sits in
 * one flat grid with the ones holding work already checked. The Inbox is all
 * the modules at once, so the question it asks is which of them to leave out.
 *
 * Built from Figma 23449:21922 (spec), 21436:17478 (in context) and
 * 21479:31139 (Tally offline).
 */

const ModuleCard = ({
  module,
  checked,
  featured,
  onToggle,
}: {
  module: SyncModule;
  checked: boolean;
  /** The current module's card — full width and a size up. */
  featured?: boolean;
  onToggle: () => void;
}) => {
  const empty = module.count === 0;

  return (
    <button
      type="button"
      onClick={empty ? undefined : onToggle}
      disabled={empty}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border text-left transition-colors",
        featured ? "px-4 py-3" : "px-4 py-3",
        checked
          ? "border-pi-brand-border bg-pi-brand-tint"
          : "border-pi-line-2 bg-pi-surface-panel shadow-contact hover:bg-pi-row-hover",
        // An empty bucket stays visible — its zero is information — but there
        // is nothing in it to send.
        empty ? "opacity-60" : "cursor-pointer"
      )}
    >
      <Checkbox
        checked={checked}
        disabled={empty}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none"
      />
      <span className="flex-1 truncate text-[13px] font-medium text-pi-ink">
        {module.label}
      </span>
      <Badge
        color={checked ? "primary" : "neutral"}
        size="md"
        className="flex-none tabular-nums"
      >
        {module.count} item{module.count === 1 ? "" : "s"}
      </Badge>
    </button>
  );
};

const SyncConfirmModal = ({
  open,
  onOpenChange,
  currentModule,
  includedModules,
  selectedKeys,
  onToggleModule,
  connection,
  selectedCount,
  onConfirm,
}: SyncConfirmModalProps) => {
  const isOffline = connection === "offline";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="refined-dialog max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[520px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
        <DialogHeader className="refined-dialog-header space-y-1 border-b border-pi-line px-7 pb-5 pt-7">
          <DialogTitle className="text-[22px] font-medium tracking-[-0.02em] text-pi-ink">
            Sync to Tally
          </DialogTitle>
          <DialogDescription className="text-[13px] text-pi-body">
            Choose what goes across in this run
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-7 py-6">
          {currentModule && (
            <div className="space-y-2">
              <p className="type-overline">This module</p>
              <ModuleCard
                module={currentModule}
                checked={selectedKeys.has(currentModule.key)}
                featured
                onToggle={() => onToggleModule(currentModule.key)}
              />
            </div>
          )}

          <div className="space-y-2">
            {/*
              The heading belongs to the lead card, not to the grid. With no
              current module there is nothing to include this sync *with*, and
              the dialog's own "Choose what goes across in this run" has already said
              what the grid is — a second label under it only repeats itself.
            */}
            {currentModule && (
              <p className="type-overline">
                Send along with it
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {includedModules.map((module) => (
                <ModuleCard
                  key={module.key}
                  module={module}
                  checked={selectedKeys.has(module.key)}
                  onToggle={() => onToggleModule(module.key)}
                />
              ))}
            </div>
          </div>

          <p className="rounded-md bg-pi-fill px-3 py-2 text-[12px] leading-[18px] text-pi-body">
            {SYNC_MASTERS_NOTE}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-pi-line bg-pi-head-bg px-7 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={selectedCount === 0}>
            {/* Offline, the action is not a push — it is a promise to push. */}
            {isOffline ? "Add to Sync Queue" : "Sync to Tally"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncConfirmModal;
