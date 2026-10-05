import React from "react";
import { AlertTriangle, Check, Info } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One pre-flight check. Ported from PreflightLine in js/conversion-panel.jsx.
 *
 * These are the last thing between the accountant and an irreversible posting,
 * so each one states what was checked and what it found — never just a tick.
 */

type Props = {
  kind: "ok" | "warn" | "info";
  label: string;
  body: string;
  action?: string;
  onAction?: () => void;
};

const ICONS = {
  ok: Check,
  warn: AlertTriangle,
  info: Info,
} as const;

const TONES = {
  ok: "bg-success-green text-success-green-foreground",
  warn: "bg-warning text-warning-foreground",
  info: "bg-secondary text-secondary-foreground",
} as const;

const PreflightLine = ({ kind, label, body, action, onAction }: Props) => {
  const Icon = ICONS[kind];

  return (
    <div className="mb-2 flex items-start gap-3 rounded-md border border-neutral-gray bg-background px-3 py-3">
      <span
        className={cn(
          "mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full",
          TONES[kind]
        )}
      >
        <Icon className="h-3 w-3" strokeWidth={2.5} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-secondary-foreground">{body}</div>
      </div>

      {action ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="h-7 flex-none px-2 text-[12px]"
        >
          {action}
        </Button>
      ) : null}
    </div>
  );
};

export default PreflightLine;
