import React, { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  NeedsYou,
  TickAi,
  TickYou,
} from "@/components/icons";
import { AiMark } from "@/components/inbox/v2/ai-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CleanupStep } from "@/types/pages/inbox/cleanup";

type Props = {
  /** The file as uploaded. */
  fileName: string;
  steps: CleanupStep[];
  /** Apply a needs-you step's one-click fix. */
  onFix?: (step: CleanupStep) => void;
  className?: string;
};

/** The mark that leads each step: who settled it, or that it waits. */
const StateMark = ({ step }: { step: CleanupStep }) => {
  switch (step.state) {
    case "applied":
      return (
        <TickAi aria-label="Done by the AI" className="size-4 text-pi-brand" />
      );
    case "fixed":
      return (
        <TickYou aria-label="Fixed by you" className="size-4 text-pi-success" />
      );
    case "needs-you":
      return (
        <NeedsYou aria-label="Needs you" className="size-4 text-pi-warning" />
      );
    default:
      return (
        <CircleAlert
          aria-label="Held for you"
          className="size-4 text-pi-danger"
        />
      );
  }
};

/**
 * What the AI did to an uploaded spreadsheet before mapping, step by step.
 *
 * Formatting it could fix safely is already done (a brand tick); a fix that
 * changes the books, such as creating customers, waits for one click (a
 * dashed ring); anything it cannot fix safely is held with the row named (a
 * red ring). Each step opens to say why and show the rows it changed, so
 * nothing in the file was altered out of sight.
 */
const CleanupSteps = ({ fileName, steps, onFix, className }: Props) => {
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (id: string) =>
    setOpen((all) =>
      all.includes(id) ? all.filter((x) => x !== id) : [...all, id]
    );
  const done = steps.filter((s) => s.state === "applied").length;
  const waiting = steps.filter((s) => s.state === "needs-you").length;
  const held = steps.filter((s) => s.state === "held").length;

  return (
    <section
      aria-label="Cleaned up before mapping"
      className={cn(
        "rounded-lg border border-pi-line bg-background shadow-contact",
        className
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-pi-line px-4 py-3">
        <h3 className="text-[14px] font-semibold leading-5 text-pi-ink">
          Cleaned up before mapping
        </h3>
        <p className="min-w-0 flex-1 truncate text-[12px] leading-4 text-pi-body">
          {fileName} · {done} fixed by the AI
          {waiting ? ` · ${waiting} waiting on you` : ""}
          {held ? ` · ${held} held for you` : ""}
        </p>
      </header>
      <ol className="divide-y divide-pi-line">
        {steps.map((step) => {
          const expanded = open.includes(step.id);
          const hasMore = !!(step.detail || step.samples?.length);
          return (
            <li key={step.id}>
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="grid size-5 flex-none place-items-center">
                  <StateMark step={step} />
                </span>
                <button
                  type="button"
                  disabled={!hasMore}
                  aria-expanded={hasMore ? expanded : undefined}
                  onClick={() => toggle(step.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "min-w-0 truncate text-[13px] leading-5",
                      step.state === "held"
                        ? "font-medium text-pi-danger"
                        : "text-pi-ink"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.scope ? (
                    <span className="flex-none text-[12px] tabular-nums text-pi-faint">
                      {step.scope}
                    </span>
                  ) : null}
                  {hasMore ? (
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-3.5 flex-none text-pi-faint transition-transform duration-150 motion-reduce:transition-none",
                        expanded && "rotate-180"
                      )}
                    />
                  ) : null}
                </button>
                {step.decided && step.state !== "fixed" ? (
                  <AiMark reason={step.detail ?? "The AI decided this"} />
                ) : null}
                {step.fix ? (
                  step.state === "needs-you" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-none"
                      onClick={() => onFix?.(step)}
                    >
                      {step.fix.label}
                    </Button>
                  ) : step.state === "fixed" ? (
                    <span className="flex-none text-[12px] text-pi-success">
                      {step.fix.doneLabel}
                    </span>
                  ) : null
                ) : null}
              </div>
              {expanded ? (
                <div className="pb-3 pl-12 pr-4">
                  {step.detail ? (
                    <p className="text-[12px] leading-4 text-pi-body">
                      {step.detail}
                    </p>
                  ) : null}
                  {step.samples?.length ? (
                    <table className="mt-2 w-full max-w-[640px] border-separate border-spacing-0 text-[12px] leading-4">
                      <thead>
                        <tr className="text-left text-pi-faint">
                          <th className="w-14 pb-1 font-medium">Row</th>
                          <th className="pb-1 font-medium">In the file</th>
                          <th className="w-5 pb-1" aria-hidden />
                          <th className="pb-1 font-medium">Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {step.samples.map((sample, i) => (
                          <tr key={i} className="align-top">
                            <td className="py-1 tabular-nums text-pi-faint">
                              {sample.row ?? "—"}
                            </td>
                            <td className="py-1 font-mono text-pi-body">
                              {sample.before}
                            </td>
                            <td className="py-1 text-pi-faint">
                              <ArrowRight aria-hidden className="size-3" />
                            </td>
                            <td className="py-1 font-mono text-pi-ink">
                              {sample.after}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default CleanupSteps;
