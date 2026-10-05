import React from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
} from "@/components/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHANNELS, ROUTES } from "@/config/pages/inbox";
import RoutePill from "@/components/inbox/common/route-pill";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/types/pages/inbox";

/**
 * The 40px strip above the review surface. Ported from OrientationStrip in
 * js/inbox-detail.jsx.
 *
 * It answers "where am I and how much is left" without reframing the surface
 * below it. There is deliberately no phase rail and no Classify/Prepare/Confirm
 * stepper — the accountant is looking at one document, not walking a wizard.
 *
 * The pager moves within the route cohort, not the whole inbox: after approving
 * a bill you want the next bill, not the next bank statement.
 */

export type Cohort = {
  index: number;
  total: number;
  prev: InboxItem | null;
  next: InboxItem | null;
};

type Props = {
  item: InboxItem;
  cohort: Cohort;
  onPrev: () => void;
  onNext: () => void;
  onConvert: (target: "JV" | "Invoice") => void;
  onAction: (label: string) => void;
};

const cohortLabel = (item: InboxItem): string => {
  if (!item.route) return "Unclassified";
  if (item.route === "AP") return "Bill";
  if (item.route === "AR") return "Invoice batch";
  if (item.route === "Banking") return "Statement";
  return "Journal voucher";
};

/**
 * AR and Banking describe a batch, so their position chip carries counts rather
 * than an "n of m" — knowing you are on statement 2 of 3 is less useful than
 * knowing this statement holds 47 transactions.
 */
const PositionLabel = ({
  item,
  cohort,
}: {
  item: InboxItem;
  cohort: Cohort;
}) => {
  if (item.route === "AR" && item.ar) {
    return (
      <>
        <strong>Invoice batch</strong>
        <span> · {item.ar.rowCount.toLocaleString("en-IN")} rows</span>
        <span className="text-success-green-foreground">
          {" "}
          · {item.ar.validRows.toLocaleString("en-IN")} valid
        </span>
        {item.ar.invalidRows ? (
          <span className="text-destructive-foreground">
            {" "}
            · {item.ar.invalidRows} issues
          </span>
        ) : null}
      </>
    );
  }

  if (item.route === "Banking" && item.banking) {
    return (
      <>
        <strong>Statement</strong>
        <span>
          {" "}
          · {item.banking.dateRange} · {item.banking.txnCount} txns
        </span>
      </>
    );
  }

  // An unrouted item has no cohort to be positioned within — the original
  // rendered "1 of 0 pending" here, which reads as a bug to the accountant.
  if (cohort.total === 0) {
    return <strong>{cohortLabel(item)}</strong>;
  }

  return (
    <>
      <strong>{cohortLabel(item)}</strong>
      <span>
        {" "}
        {cohort.index + 1} of {cohort.total} pending
      </span>
    </>
  );
};

/** Overflow contents vary per route — see the original's memo §4. */
const overflowActions = (
  item: InboxItem
): (
  | { kind: "divider" }
  | { kind: "item"; label: string; danger?: boolean; convert?: "JV" }
)[] => {
  const common = [
    { kind: "item" as const, label: "View source file" },
    { kind: "item" as const, label: "Reassign route" },
  ];

  if (item.route === "AP" || item.route === "JV") {
    return [
      ...(item.route === "AP"
        ? [
            {
              kind: "item" as const,
              label: "Convert this bill to Journal Voucher",
              convert: "JV" as const,
            },
          ]
        : [{ kind: "item" as const, label: "Re-route to AP / AR / Banking" }]),
      { kind: "divider" as const },
      ...common,
      { kind: "divider" as const },
      { kind: "item" as const, label: "Delete", danger: true },
    ];
  }

  if (item.route === "AR") {
    return [
      { kind: "item" as const, label: "Edit column mapping" },
      { kind: "divider" as const },
      ...common,
      { kind: "divider" as const },
      { kind: "item" as const, label: "Delete batch", danger: true },
    ];
  }

  if (item.route === "Banking") {
    return [
      ...common,
      { kind: "divider" as const },
      { kind: "item" as const, label: "Delete statement", danger: true },
    ];
  }

  return common;
};

const OrientationStrip = ({
  item,
  cohort,
  onPrev,
  onNext,
  onConvert,
  onAction,
}: Props) => {
  const channel = CHANNELS[item.source.channel];
  const isLowConfidence =
    item.ai.confidence != null && item.ai.confidence < 0.7;

  return (
    <div className="flex h-10 flex-none items-center gap-3 border-b border-neutral-gray px-5">
      <Link
        href="/inbox"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Inbox
      </Link>

      <span className="h-4 w-px flex-none bg-neutral-gray" />

      {item.route ? (
        <span className="flex items-center gap-2">
          <RoutePill route={item.route} />
          <span className="text-xs text-secondary-foreground">
            {ROUTES[item.route].label}
          </span>
        </span>
      ) : null}

      <span className="min-w-0 truncate text-xs text-secondary-foreground">
        <PositionLabel item={item} cohort={cohort} />
      </span>

      <span
        className="min-w-0 truncate text-xs text-secondary-foreground"
        title={item.source.sender}
      >
        from {channel?.label ?? "Upload"}
        {item.ar?.template ? " · template recognised" : ""}
        {isLowConfidence ? " · low confidence" : ""}
      </span>

      <div className="ml-auto flex flex-none items-center gap-2">
        {/* No cohort, nothing to page through — an unrouted item is on its own. */}
        {cohort.total > 0 ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onPrev}
              disabled={!cohort.prev}
              title="Previous in route cohort"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums text-secondary-foreground">
              {cohort.index + 1} / {cohort.total}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onNext}
              disabled={!cohort.next}
              title="Next in route cohort"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="More actions"
            >
              <EllipsisVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px]">
            {overflowActions(item).map((action, index) =>
              action.kind === "divider" ? (
                // eslint-disable-next-line react/no-array-index-key
                <DropdownMenuSeparator key={`divider-${index}`} />
              ) : (
                <DropdownMenuItem
                  key={action.label}
                  className={cn(action.danger && "text-destructive-foreground")}
                  onSelect={() =>
                    action.convert
                      ? onConvert(action.convert)
                      : onAction(action.label)
                  }
                >
                  {action.label}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default OrientationStrip;
