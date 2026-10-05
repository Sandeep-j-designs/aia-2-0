import React from "react";
import { ArrowLeftRight, Check, Trash2, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { InboxRoute } from "@/types/pages/inbox";

/**
 * Ported from BulkBar in js/inbox-list.jsx.
 *
 * The rule this encodes: bulk approve is same-type only. An AP bill, an AR
 * invoice batch and a bank statement have no single posting action between
 * them, so a mixed selection loses Approve and gains Reassign instead.
 *
 * The original wrote the mixed-type warning in #fca5a5 — a Tailwind red-300
 * that is in neither token set. It reads as a plain notice here: this is not an
 * error, it is the bar explaining why Approve is absent.
 */

const ROUTE_NOUNS: Record<InboxRoute, string> = {
  AP: "bills",
  AR: "invoice batches",
  Banking: "statements",
  JV: "journals",
};

type Props = {
  count: number;
  isSameType: boolean;
  route: InboxRoute | null;
  onApproveAll: () => void;
  onReassign: () => void;
  onDelete: () => void;
  onClear: () => void;
};

const BulkBar = ({
  count,
  isSameType,
  route,
  onApproveAll,
  onReassign,
  onDelete,
  onClear,
}: Props) => {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-surface px-4 py-3 text-primary-foreground shadow-floating-panel">
      <span className="text-sm font-semibold">{count} selected</span>

      {isSameType && route ? (
        <>
          <span className="text-xs text-surface-foreground-muted">
            All same type · {ROUTE_NOUNS[route]}
          </span>
          <Button
            size="sm"
            onClick={onApproveAll}
            className="h-8 bg-primary hover:bg-primary/90"
          >
            <Check className="h-3.5 w-3.5" />
            Approve all
          </Button>
        </>
      ) : (
        <>
          <span className="text-xs text-surface-foreground-muted">
            Mixed types · approve disabled
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReassign}
            className="h-8 hover:bg-surface-muted hover:text-primary-foreground"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Reassign
          </Button>
        </>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="h-8 text-destructive-foreground hover:bg-surface-muted hover:text-destructive-foreground"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-8 hover:bg-surface-muted hover:text-primary-foreground"
      >
        <X className="h-3.5 w-3.5" />
        Clear
      </Button>
    </div>
  );
};

export default BulkBar;
