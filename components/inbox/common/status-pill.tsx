import React from "react";
import { Loader2 } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { AGED_AFTER_DAYS, STATUS_META } from "@/config/pages/inbox";
import { cn } from "@/lib/utils";
import type { InboxStatus } from "@/types/pages/inbox";

/**
 * Ported from StatusPill in js/icons.jsx.
 *
 * Colour here is load-bearing — it is the one column the accountant scans to
 * decide what to open. Every value comes from STATUS_META so the vocabulary
 * cannot drift between the list, the detail header and the bulk bar.
 */

type Props = {
  status: InboxStatus;
  aged?: boolean;
};

const StatusPill = ({ status, aged }: Props) => {
  const meta = STATUS_META[status];

  return (
    <span className="inline-flex items-center gap-2">
      <Badge
        variant="secondary"
        className={cn(
          "w-fit gap-1 px-2 py-1 text-xs font-normal",
          meta.className
        )}
      >
        {status === "extracting" || status === "retrying" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : null}
        {meta.label}
      </Badge>

      {aged ? (
        <Badge
          variant="secondary"
          className="w-fit bg-warning px-2 py-1 text-xs font-normal text-warning-foreground"
          title={`In queue ${AGED_AFTER_DAYS}+ days`}
        >
          {AGED_AFTER_DAYS}d
        </Badge>
      ) : null}
    </span>
  );
};

export default StatusPill;
