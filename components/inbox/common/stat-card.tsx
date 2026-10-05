import React from "react";
import { cn } from "@/lib/utils";

/** Ported from StatCard in js/native-banking.jsx. */

type Props = {
  label: string;
  value: string;
  accent?: boolean;
  small?: boolean;
};

const StatCard = ({ label, value, accent, small }: Props) => (
  <div className="rounded-lg border border-neutral-gray bg-background px-4 py-3">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
      {label}
    </div>
    <div
      className={cn(
        "mt-1 font-bold tabular-nums",
        small ? "text-[13px]" : "text-lg",
        accent ? "text-primary" : "text-foreground"
      )}
    >
      {value}
    </div>
  </div>
);

export default StatCard;
