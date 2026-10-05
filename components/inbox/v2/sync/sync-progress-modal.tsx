import React from "react";
import { CircleCheck, Loader2 } from "@/components/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RunCount, RunRowList } from "@/components/inbox/v2/progress-run";
import type { RunRow } from "@/components/inbox/v2/progress-run";
import { cn } from "@/lib/utils";
import type {
  SyncDoc,
  SyncModule,
  SyncModuleProgress,
} from "@/types/pages/inbox/sync";

type SyncProgressModalProps = {
  open: boolean;
  docs: SyncDoc[];
  settledCount: number;
  /** The modules this run is sending, in send order. */
  modules: SyncModule[];
  moduleProgress: SyncModuleProgress[];
  onStop: () => void;
  onContinueInBackground: () => void;
};

/**
 * "Syncing to Tally" — the run, while it is watchable.
 *
 * Two shapes, and which one you get is decided by how many modules the run
 * carries:
 *
 *   one module    a per-document list — "B-2026-002", "B-2026-003" — because
 *                 with a single noun in play the document IS the unit of
 *                 progress, and naming each one is what makes the count
 *                 trustworthy.
 *   two or more   a per-module rollup. A mixed list would be a stream of
 *                 voucher numbers from different modules with nothing saying
 *                 which was which, so the detail stops being detail.
 *
 * Deliberately not dismissable by Escape or a backdrop click. The two ways out
 * are the two buttons, and they mean different things: Stop Sync abandons the
 * rest of the queue, Continue in Background keeps it running. Letting the
 * overlay close the modal would make an accidental click ambiguous between
 * them.
 *
 * Built from Figma 21448:25930 (single module) and 25082:18536 (multi-module).
 */

const ModuleRow = ({ module }: { module: SyncModuleProgress }) => {
  const percent =
    module.total === 0 ? 0 : (module.settled / module.total) * 100;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border-l-2 border-l-transparent px-3 py-2",
        // The active module is marked the same way the active document is in
        // the single-module list — one idea, drawn once.
        module.state === "active" && "border-l-pi-brand bg-pi-brand-tint"
      )}
    >
      <span className="flex h-5 w-5 flex-none items-center justify-center">
        {module.state === "done" ? (
          <CircleCheck className="h-[18px] w-[18px] text-pi-success" />
        ) : module.state === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin text-pi-brand motion-reduce:animate-none" />
        ) : (
          <span className="size-[7px] rounded-full border border-pi-line-strong" />
        )}
      </span>

      <span className="flex-1 truncate text-[13px] font-medium text-pi-ink">
        {module.label}
      </span>

      <span className="fig flex-none text-[12px] text-pi-body">
        {module.settled} / {module.total}
      </span>

      <span className="h-0.5 w-[120px] flex-none overflow-hidden rounded-[2px] bg-pi-fill-2">
        <span
          className={cn(
            "block h-full rounded-[2px] transition-[width] duration-300 motion-reduce:transition-none",
            module.state === "done" ? "bg-pi-success-dot" : "bg-pi-brand"
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
};

/** The run list speaks in row states; a doc's own vocabulary maps onto them. */
const docRow = (doc: SyncDoc): RunRow => ({
  id: doc.id,
  label: doc.label,
  state:
    doc.state === "pushed"
      ? "done"
      : doc.state === "failed"
        ? "failed"
        : doc.state === "pushing"
          ? "active"
          : "queued",
});

const SyncProgressModal = ({
  open,
  docs,
  settledCount,
  modules,
  moduleProgress,
  onStop,
  onContinueInBackground,
}: SyncProgressModalProps) => {
  const total = docs.length;
  const isMulti = modules.length > 1;
  const unit = isMulti
    ? "items"
    : total === 1
      ? (modules[0]?.unit ?? "item")
      : (modules[0]?.unitPlural ?? "items");

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-[520px] gap-0 overflow-hidden rounded-xl p-0 sm:rounded-xl [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-pi-line bg-pi-head-bg px-6 pb-5 pt-6">
          <DialogTitle className="text-[22px] font-medium tracking-[-0.02em] text-pi-ink">
            Syncing to Tally
          </DialogTitle>
          <Badge
            color="information"
            icon={
              <Loader2
                aria-hidden
                className="size-2.5 animate-spin motion-reduce:animate-none"
              />
            }
          >
            Syncing
          </Badge>
        </div>

        <div className="space-y-5 px-6 py-6">
          <RunCount settled={settledCount} total={total} unit={unit} />

          {isMulti ? (
            <div className="space-y-2">
              <p className="type-overline">
                Progress by module
              </p>
              <div className="space-y-1">
                {moduleProgress.map((module) => (
                  <ModuleRow key={module.key} module={module} />
                ))}
              </div>
            </div>
          ) : (
            <RunRowList rows={docs.map(docRow)} settled={settledCount} />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-pi-line px-6 py-4">
          <Button variant="outline" onClick={onStop}>
            Stop Sync
          </Button>
          <Button onClick={onContinueInBackground}>
            Continue in Background
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncProgressModal;
