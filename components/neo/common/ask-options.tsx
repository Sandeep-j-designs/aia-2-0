import React from "react";
import { Check } from "@/components/icons";
import type { NeoAsk } from "@/types/pages/neo";
import { cn } from "@/lib/utils";

type Props = {
  ask: NeoAsk;
  live: boolean;
  onPick: (id: string) => void;
};

/**
 * A question Neo can't answer from the data, with the likely answers as one
 * tap each — or one key: 1 to 4. Once answered it collapses to the pick, so
 * the conversation reads back as a record of what was decided.
 */
const AskOptions = ({ ask, live, onPick }: Props) => (
  <div className="flex flex-col gap-2">
    <p className="text-body-3 font-semibold text-pi-ink">{ask.question}</p>
    <div className="flex flex-col gap-1">
      {ask.options.map((o, i) => {
        const picked = ask.answer === o.id;
        if (!live && !picked) return null;
        return (
          <button
            key={o.id}
            type="button"
            disabled={!live}
            onClick={() => onPick(o.id)}
            className={cn(
              "group flex min-h-9 items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
              live
                ? "border-pi-line hover:border-border hover:bg-pi-fill"
                : "border-transparent px-0 py-0"
            )}
          >
            {live ? (
              <kbd className="grid h-5 min-w-5 flex-none place-items-center rounded-sm bg-pi-fill px-1 font-sans text-caption-1 font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                {i + 1}
              </kbd>
            ) : (
              <Check className="h-3.5 w-3.5 flex-none text-status-success" />
            )}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-label-3 font-semibold",
                  picked && !live ? "text-pi-body" : "text-pi-ink"
                )}
              >
                {o.label}
              </span>
              {o.hint && live && (
                <span className="block truncate text-caption-1 text-pi-body tabular-nums">
                  {o.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

export default AskOptions;
