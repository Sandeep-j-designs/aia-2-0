import React from "react";
import {
  BookOpen,
  EllipsisVertical,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "@/components/icons";
import type { LucideIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/types/pages/inbox";

/**
 * Per-row actions. Ported from RowKebab in js/inbox-list.jsx.
 *
 * The action set is status-dependent, and that is the point — an item still
 * extracting can only be cancelled, a failed one can be retried or filled in by
 * hand, and a posted one offers to reverse the conversion that produced it.
 * Offering "Open" on a row with nothing extracted yet is the bug this guards.
 */

type Action =
  | { kind: "divider" }
  | {
      kind: "action";
      label: string;
      icon: LucideIcon;
      danger?: boolean;
      onSelect: () => void;
    };

type Props = {
  item: InboxItem;
  onOpen: (item: InboxItem) => void;
  onDelete: (item: InboxItem) => void;
  onRetry: (item: InboxItem) => void;
  onCancelExtraction: (item: InboxItem) => void;
  onConvert: (item: InboxItem, target: "JV") => void;
  onOpenRecord: (item: InboxItem) => void;
  onReverse: (item: InboxItem) => void;
};

const RowKebab = ({
  item,
  onOpen,
  onDelete,
  onRetry,
  onCancelExtraction,
  onConvert,
  onOpenRecord,
  onReverse,
}: Props) => {
  const open: Action = {
    kind: "action",
    label: "Open",
    icon: ExternalLink,
    onSelect: () => onOpen(item),
  };
  const del: Action = {
    kind: "action",
    label: "Delete",
    icon: Trash2,
    danger: true,
    onSelect: () => onDelete(item),
  };

  let actions: Action[];

  if (item.status === "extracting") {
    actions = [
      {
        kind: "action",
        label: "Cancel extraction",
        icon: X,
        onSelect: () => onCancelExtraction(item),
      },
      del,
    ];
  } else if (item.status === "failed") {
    actions = [
      {
        kind: "action",
        label: "Retry extraction",
        icon: RotateCcw,
        onSelect: () => onRetry(item),
      },
      {
        kind: "action",
        label: "Fill manually",
        icon: Pencil,
        onSelect: () => onOpen(item),
      },
      del,
    ];
  } else if (item.status === "done") {
    actions = [
      {
        kind: "action",
        label: "Open record",
        icon: ExternalLink,
        onSelect: () => onOpenRecord(item),
      },
    ];
    if (item.lineage) {
      actions.push({ kind: "divider" });
      actions.push({
        kind: "action",
        label: "Reverse this conversion",
        icon: RotateCcw,
        onSelect: () => onReverse(item),
      });
    }
  } else if (item.route === "AP") {
    actions = [
      open,
      {
        kind: "action",
        label: "Convert to Journal Voucher",
        icon: BookOpen,
        onSelect: () => onConvert(item, "JV"),
      },
      del,
    ];
  } else {
    actions = [open, del];
  }

  return (
    <span onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Row actions"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action, index) =>
            action.kind === "divider" ? (
              // eslint-disable-next-line react/no-array-index-key
              <DropdownMenuSeparator key={`divider-${index}`} />
            ) : (
              <DropdownMenuItem
                key={action.label}
                onSelect={action.onSelect}
                className={cn(action.danger && "text-destructive-foreground")}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
};

export default RowKebab;
