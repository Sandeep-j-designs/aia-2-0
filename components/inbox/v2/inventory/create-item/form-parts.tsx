import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { T } from "@/components/inbox/v2/ui";

/**
 * The stock item form's small furniture: production's "label then switch"
 * rows, the panel a switch opens, and the grey helper line under a field.
 * Errors are the shared Field's `error` line now (7 Oct 2026); the truncating
 * ErrorText is gone, so a message reads whole under its box.
 */

export const HelperText = ({ children }: { children: React.ReactNode }) => (
  <span className={T.sub}>{children}</span>
);

/**
 * A field label that stays on one line (7 Oct 2026): the text ellipsises,
 * and a condition that used to be a helper line under the box ("Enter
 * opening balance to enable…") rides beside it as a small faint tag, shown
 * only while it applies, its full sentence on hover. A note under a box
 * pushed its row out of line with the boxes beside it. Required is unmarked;
 * an optional field says so through `<Field optional>`.
 */
export const FieldLabel = ({
  children,
  note,
  noteTitle,
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
  noteTitle?: string;
}) => (
  <span className="flex min-w-0 max-w-full items-center gap-2">
    {/* the label keeps its width; the tag gives way first */}
    <span className="max-w-full shrink-0 truncate">{children}</span>
    {note ? (
      <span
        title={noteTitle}
        className="min-w-0 truncate text-[12px] font-normal text-pi-faint"
      >
        {note}
      </span>
    ) : null}
  </span>
);

/** One grid cell per field: thirds, the card's two-column grid overridden
 *  from outside so the shared FieldCard stays as it is (7 Oct 2026). */
export const THIRDS = "sm:[&>div]:grid-cols-3";

/** Spans the whole section grid, whichever column count it has. */
export const FULL_ROW = "col-span-full";

/**
 * A run of switches as one bordered list (7 Oct 2026, the bill form's
 * pattern): rows split by a hairline, label left, switch right. Switches used
 * to sit as loose cells in the field grid, level with the boxes, which read
 * as three more fields.
 */
export const SwitchList = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-lg border border-pi-line bg-background [&>*+*]:border-t [&>*+*]:border-pi-line",
      FULL_ROW,
      className
    )}
  >
    {children}
  </div>
);

/** The fields a switch reveals: a tinted panel under it, the grid inside. */
export const RevealPanel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "grid grid-cols-1 items-start gap-x-5 gap-y-4 rounded-lg border border-pi-line bg-pi-head-bg p-4 sm:grid-cols-3",
      className
    )}
  >
    {children}
  </div>
);

/** One row of a SwitchList; `children` are the fields it opens. */
export const SwitchRow = ({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) => (
  <div>
    <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5">
      <Label
        htmlFor={id}
        className="min-w-0 text-[13px] font-normal leading-5 text-pi-ink"
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
    {children ? (
      <div className="px-4 pb-4">
        <RevealPanel>{children}</RevealPanel>
      </div>
    ) : null}
  </div>
);
