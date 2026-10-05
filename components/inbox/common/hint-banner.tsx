import React, { ReactNode } from "react";
import { AlertTriangle, Check, Info } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Inline explanation above a review surface. Ported from HintBanner in
 * js/file-preview.jsx.
 *
 * Each one states a fact and what to do about it. A banner that only says
 * something is wrong, without saying what unblocks it, is the thing this
 * component exists to avoid.
 */

type Props = {
  kind: "info" | "warn" | "danger" | "success";
  title: string;
  body: ReactNode;
};

const TONES = {
  info: "border-border bg-accent text-accent-foreground",
  warn: "border-warning-border bg-warning text-warning-foreground",
  danger: "border-warning-border bg-destructive text-destructive-foreground",
  success: "border-neutral-gray bg-success-green text-success-green-foreground",
} as const;

const ICONS = {
  info: Info,
  warn: AlertTriangle,
  danger: AlertTriangle,
  success: Check,
} as const;

const HintBanner = ({ kind, title, body }: Props) => {
  const Icon = ICONS[kind];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        TONES[kind]
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-none" />
      <div className="min-w-0 text-sm">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 opacity-90">{body}</div>
      </div>
    </div>
  );
};

export default HintBanner;
