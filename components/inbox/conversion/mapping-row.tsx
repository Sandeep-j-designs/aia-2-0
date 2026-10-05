import React from "react";
import { AlertTriangle, Check, Plus, RotateCcw } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import MappingControl from "./mapping-control";
import type { MappingRow as MappingRowType } from "@/types/pages/inbox/conversion";

/**
 * One source→target field pair. Ported from MappingRow and MappingStatusChip in
 * js/conversion-panel.jsx.
 *
 * The status chip is the whole point of this table — it tells the accountant at
 * a glance which fields carried across cleanly and which ones are still waiting
 * on a decision from them.
 */

type Props = {
  row: MappingRowType;
  value: string | undefined;
  onResolve: (value: string) => void;
};

const StatusChip = ({
  status,
  resolved,
}: {
  status: MappingRowType["status"];
  resolved: boolean;
}) => {
  if (status === "mapped") {
    return (
      <Badge
        variant="secondary"
        className="w-fit gap-1 bg-success-green px-2 py-0.5 text-[12px] font-normal text-success-green-foreground"
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Mapped
      </Badge>
    );
  }

  if (status === "locked") {
    return (
      <Badge
        variant="secondary"
        className="w-fit gap-1 bg-accent px-2 py-0.5 text-[12px] font-normal text-accent-foreground"
      >
        <RotateCcw className="h-3 w-3" />
        Auto-derived
      </Badge>
    );
  }

  if (status === "needs") {
    return resolved ? (
      <Badge
        variant="secondary"
        className="w-fit gap-1 bg-success-green px-2 py-0.5 text-[12px] font-normal text-success-green-foreground"
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Resolved
      </Badge>
    ) : (
      <Badge
        variant="secondary"
        className="w-fit gap-1 bg-warning px-2 py-0.5 text-[12px] font-normal text-warning-foreground"
      >
        <AlertTriangle className="h-3 w-3" />
        Needs you
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="w-fit gap-1 bg-accent px-2 py-0.5 text-[12px] font-normal text-accent-foreground"
    >
      <Plus className="h-3 w-3" strokeWidth={2.5} />
      New
    </Badge>
  );
};

const MappingRow = ({ row, value, onResolve }: Props) => {
  const needsAttention = row.status === "needs" && !value;

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_1.4fr_auto] items-start gap-3 border-t border-panel-border px-3 py-3",
        // Only the rows still waiting on the user get a ground — everything
        // else stays flat so the eye lands on what is unfinished.
        needsAttention && "bg-warning/40"
      )}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground">
          {row.sourceLabel}
        </div>
        {row.sourceValue ? (
          <div
            className="mt-0.5 truncate text-[12px] text-secondary-foreground"
            title={row.sourceValue}
          >
            {row.sourceValue}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-xs font-semibold text-foreground">
          {row.targetLabel}
        </div>

        {row.status === "mapped" ? (
          <div className="text-xs text-foreground">{row.value}</div>
        ) : null}

        {row.status === "locked" ? (
          <div className="text-xs text-secondary-foreground">{row.value}</div>
        ) : null}

        {row.status === "needs" ? (
          <MappingControl row={row} value={value} onResolve={onResolve} />
        ) : null}

        {row.status === "new" ? (
          <>
            <Input
              value={value ?? ""}
              placeholder={row.placeholder}
              onChange={(event) => onResolve(event.target.value)}
              className="h-7 text-xs"
              aria-label={row.targetLabel}
            />
            {row.helper ? (
              <div className="mt-1 text-[12px] text-secondary-foreground">
                {row.helper}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex-none pt-0.5">
        <StatusChip status={row.status} resolved={Boolean(value)} />
      </div>
    </div>
  );
};

export default MappingRow;
