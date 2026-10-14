import React from "react";
import type { AgentRunMode } from "@/types/pages/inbox/sources";
import { cn } from "@/lib/utils";
type Props = {
  value: AgentRunMode;
  onChange: (value: AgentRunMode) => void;
  disabled?: boolean;
};
const RunMode = ({ value, onChange, disabled }: Props) => (
  <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
    <legend className="mb-3 text-sm font-semibold text-pi-ink">
      When should your agent collect?
    </legend>
    {(
      [
        [
          "on-demand",
          "Run on demand",
          "Only when you select Run now or ask Neo.",
        ],
        [
          "continuous",
          "Run continuously",
          "Collect new arrivals automatically. Pause anytime.",
        ],
      ] as const
    ).map(([id, title, description]) => (
      <label
        key={id}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-pi-brand",
          value === id
            ? "border-pi-brand bg-pi-brand-tint"
            : "border-pi-line bg-background"
        )}
      >
        <input
          type="radio"
          name="agent-run-mode"
          value={id}
          checked={value === id}
          onChange={() => onChange(id)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--pi-brand)]"
        />
        <span>
          <span className="block text-sm font-medium text-pi-ink">{title}</span>
          <span className="mt-2 block text-xs leading-5 text-pi-body">
            {description}
          </span>
        </span>
      </label>
    ))}
  </fieldset>
);
export default RunMode;
