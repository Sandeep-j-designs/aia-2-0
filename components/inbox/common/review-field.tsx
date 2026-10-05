import React, { ReactNode } from "react";
import { AlertTriangle, Check } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * One field on a review surface. Ported from APField in js/native-ap.jsx.
 *
 * The verification mechanic is the important part: a field the classifier was
 * unsure about is outlined, carries "Low confidence — please verify", and does
 * not clear until the accountant focuses or edits it. Approve stays disabled
 * until every flagged field has been touched.
 *
 * That is deliberately a *touch*, not a correction — the accountant is being
 * asked to look, not to retype something that was probably right. Auto-clearing
 * the warning would defeat the point, and blocking on an edit would make them
 * fake one.
 */

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  flagged?: boolean;
  touched?: boolean;
  suffix?: ReactNode;
  onTouch?: () => void;
};

const ReviewField = ({
  label,
  value,
  placeholder,
  required,
  flagged,
  touched,
  suffix,
  onTouch,
}: Props) => {
  const showWarning = Boolean(flagged) && !touched;

  return (
    <div className="flex flex-col gap-2">
      <Label className="flex items-center gap-1 text-xs text-secondary-foreground">
        {required ? (
          <span className="text-destructive-foreground" aria-hidden>
            *
          </span>
        ) : null}
        {label}
      </Label>

      <Input
        defaultValue={value}
        placeholder={placeholder}
        onFocus={onTouch}
        onChange={onTouch}
        className={cn(
          "h-9 text-sm",
          showWarning && "border-warning-border bg-warning"
        )}
        aria-invalid={showWarning || undefined}
      />

      {/*
        The suffix sits under the input, not inline in the label. Inline, a
        hint like "does not exist · + Add to masters" wrapped the label onto a
        second line and knocked that field out of alignment with its neighbour
        in the two-column grid.
      */}
      {suffix ? <div className="text-[12px]">{suffix}</div> : null}

      {showWarning ? (
        <div className="flex items-center gap-1 text-[12px] text-warning-foreground">
          <AlertTriangle className="h-3 w-3" />
          Low confidence — please verify
        </div>
      ) : null}

      {flagged && touched ? (
        <div className="flex items-center gap-1 text-[12px] text-success-green-foreground">
          <Check className="h-3 w-3" strokeWidth={2.5} />
          Verified
        </div>
      ) : null}
    </div>
  );
};

export default ReviewField;

/** Two-column field grid, matching the original's `.form-grid`. */
export const FieldGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-x-5 gap-y-4">{children}</div>
);
