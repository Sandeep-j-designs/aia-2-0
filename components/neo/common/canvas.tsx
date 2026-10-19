import React, { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "@/components/icons";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { canvasTitle, opensInCanvas } from "@/utils/pages/neo/canvas";
import { cn } from "@/lib/utils";
import { CardBody } from "./message";
import { useLiveMessage } from "./thread";

type Props = {
  /**
   * "page" sits beside the chat in Neo's page; "panel" opens over the work,
   * to the left of the docked panel, so the chat stays in view.
   */
  variant: "page" | "panel";
};

/**
 * The document Neo is working on, at full size beside the chat (19 Oct 2026,
 * the chat apps' artifact pattern): a voucher, a batch register, a change
 * set. It is the same card the thread used to draw — edits made here are the
 * edits the sign-off in the chat counts — with room to read every column.
 *
 * ‹ › steps through the other documents in this chat. Esc or × closes it;
 * the tile in the thread opens it again.
 */
const Canvas = ({ variant }: Props) => {
  const neo = useNeo();
  const live = useLiveMessage(neo);
  const docs = useMemo(
    () => neo.messages.filter((m) => opensInCanvas(m.card)),
    [neo.messages]
  );
  const index = docs.findIndex((m) => m.id === neo.canvas);
  const m = docs[index];

  useEffect(() => {
    if (!m) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement;
      if (t.closest("[role=dialog], [role=menu], [role=listbox]")) return;
      e.preventDefault();
      e.stopPropagation();
      neo.setCanvas(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [m, neo]);

  if (!m?.card) return null;
  const { title, meta } = canvasTitle(m.card);
  const waiting = live?.id === m.id;
  const panel = variant === "panel";

  return (
    <section
      aria-label={title}
      style={
        panel
          ? {
              right: neo.panelWidth,
              width: `min(760px, calc(100vw - ${neo.panelWidth}px - 64px))`,
            }
          : undefined
      }
      className={cn(
        "flex min-h-0 flex-col bg-pi-page",
        panel
          ? // Below 1024px there's no room beside the panel: it covers all.
            "fixed top-0 z-40 h-dvh border-l border-pi-line shadow-popover-shadow duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none max-lg:!right-0 max-lg:!w-full max-lg:z-50"
          : // Beside the chat from 1024px; over it, full screen, below that.
            "min-w-0 flex-[1.15] border-l border-pi-line duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:border-l-0"
      )}
    >
      <header className="flex h-14 flex-none items-center gap-3 border-b border-pi-line bg-background pl-4 pr-2">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-md border border-pi-line bg-pi-fill text-pi-body">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate text-[14px] font-semibold leading-5 text-pi-ink">
            {title}
          </h2>
          <p className="truncate text-caption-1 text-pi-body">
            {waiting ? (
              <span className="font-medium text-pi-brand">Waiting for you · </span>
            ) : null}
            {meta}
          </p>
        </div>
        {docs.length > 1 && (
          <div className="flex items-center text-[12px] tabular-nums text-pi-body">
            <button
              type="button"
              aria-label="Previous document"
              disabled={index <= 0}
              onClick={() => neo.setCanvas(docs[index - 1].id)}
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-pi-fill hover:text-pi-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {index + 1} / {docs.length}
            <button
              type="button"
              aria-label="Next document"
              disabled={index >= docs.length - 1}
              onClick={() => neo.setCanvas(docs[index + 1].id)}
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-pi-fill hover:text-pi-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label="Close document"
          title="Close (Esc)"
          onClick={() => neo.setCanvas(null)}
          className="grid h-8 w-8 flex-none place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="neo-canvas min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 [overflow-wrap:anywhere]">
        <div className="mx-auto max-w-[880px]">
          <CardBody
            message={m}
            live={waiting}
            running={!!m.runId && m.runId === neo.busy}
            paused={neo.paused}
            onEditCard={(card) => neo.editCard(m.id, card)}
            onRef={neo.goTo}
            onPause={neo.pause}
            onResume={neo.resume}
            onStop={neo.stop}
            expanded
          />
        </div>
        {waiting && (
          <p className="mx-auto mt-4 max-w-[880px] text-caption-1 text-pi-body">
            {panel ? "Sign off in the chat →" : "← Sign off in the chat"}
          </p>
        )}
      </div>
    </section>
  );
};

export default Canvas;
