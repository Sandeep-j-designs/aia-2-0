import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * A master page's form, the review form's way (8 Oct 2026, user: "make it look
 * a bit polished and similar to the patterns used in the AP, AR and Journal
 * forms"): one white panel of sections with brand headings and hairlines, no
 * "In this form" rail, no welcome heading. The required note sits once, on the
 * first section's heading line.
 *
 * `starter` is a row above the first section (the ledger's quick picks).
 */
export function FormJourney({
  children,
  starter,
}: {
  children: React.ReactNode;
  starter?: React.ReactNode;
}) {
  return (
    <div className="form-panel">
      {starter ? <div className="form-panel__starter">{starter}</div> : null}
      {children}
    </div>
  );
}

/**
 * Quick picks as a segmented control: one track, the chosen pick raised.
 * Each option is [value, label]; `value` is what `onPick` receives.
 */
export function StarterPicks({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[13px] leading-5 text-pi-body">{label}</span>
      <div role="group" aria-label={label} className="form-starters">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onPick(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Optional groups behind one toggle, as on the bill form: the collapsed line
 * names the groups it holds. A hidden field never hides a problem — once a
 * field inside fails, the fold opens and stays open.
 */
export function MoreDetails({
  groups,
  children,
}: {
  groups: string[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  // Layout effect: open before the save handler's frame looks for the first
  // invalid field to scroll to.
  useLayoutEffect(() => {
    if (!open && body.current?.querySelector('[data-invalid="true"]'))
      setOpen(true);
  });
  return (
    <section className="form-more">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-pi-line bg-pi-head-bg px-4 text-left text-[13px] leading-5 transition-colors hover:bg-pi-row-hover"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-pi-faint transition-transform motion-reduce:transition-none",
            open && "rotate-90"
          )}
        />
        <span className="shrink-0 font-medium text-pi-ink">More details</span>
        <span className="min-w-0 truncate text-pi-faint">
          {groups.join(" · ")}
        </span>
      </button>
      <div ref={body} hidden={!open} className="form-more__body">
        {children}
      </div>
    </section>
  );
}
