import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * PROTOTYPE STUB — production has components/common/rupee-input with a larger
 * API (currency prop, locale, controlled/uncontrolled modes). This is the
 * minimum the journal voucher needs, at the right import path, so the call
 * sites are already correct when the screen lands in the app.
 *
 * On handoff this file is DELETED and the real rupee-input takes over.
 *
 * The behaviour worth keeping either way: the field shows a formatted figure
 * when it is not being edited and a raw one while it is, so a user typing
 * "6000" is not fighting thousands separators appearing under the cursor.
 */

type Props = {
  value: number;
  onChange: (value: number) => void;
  hasError?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

const format = (value: number) =>
  value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const RupeeInput = ({
  value,
  onChange,
  hasError,
  disabled,
  className,
  "aria-label": ariaLabel,
}: Props) => {
  const [draft, setDraft] = useState<string | null>(null);

  // A figure changed elsewhere — cleared by the opposite column, or reset by
  // Discard — must not be masked by a stale draft.
  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
    onChange(Number.isFinite(parsed) ? parsed : 0);
    setDraft(null);
  };

  return (
    <div className="relative">
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm",
          disabled ? "text-secondary-foreground" : "text-muted-foreground"
        )}
      >
        ₹
      </span>
      <Input
        inputMode="decimal"
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "pl-7 text-right",
          hasError && "border-destructive-foreground focus-visible:ring-0",
          className
        )}
        value={draft ?? format(value)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setDraft(value ? String(value) : "")}
        onBlur={(event) => commit(event.target.value)}
      />
    </div>
  );
};

export default RupeeInput;
