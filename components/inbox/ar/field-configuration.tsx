import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AR_FIELD_DEFAULTS,
  AR_FIELD_SECTIONS,
  type ArFieldConfig,
} from "@/types/pages/inbox/ar-invoice";

/**
 * Field Configuration. Figma node 12759:96901.
 *
 * Which optional fields this voucher type shows. Eight sections down the left,
 * the chosen one's toggles on the right under a tinted header, and a footer
 * that puts Reset to Default at the opposite end from Cancel / Save — the
 * destructive action is the one you should have to travel to.
 *
 * The frames populate Basic Details only. The other seven are named in the
 * left nav with nothing drawn in them, so they render empty and say so rather
 * than being filled with invented fields.
 *
 * NOTE for the design: the modal's subtitle in the frame reads "Purchase —
 * Accounts Payable" on the Accounts Receivable screen. Read as a copy carry-
 * over from the AP frame; this says Sales — Accounts Receivable.
 */

type Props = {
  open: boolean;
  value: ArFieldConfig;
  onClose: () => void;
  onSave: (next: ArFieldConfig) => void;
};

const FieldConfiguration = ({ open, value, onClose, onSave }: Props) => {
  const [section, setSection] = useState(AR_FIELD_SECTIONS[0].id);
  const [draft, setDraft] = useState<ArFieldConfig>(value);

  // The modal is a draft surface — it has a Save, so nothing it does takes
  // effect until that is pressed, and re-opening starts from what is live.
  React.useEffect(() => {
    if (open) {
      setDraft(value);
      setSection(AR_FIELD_SECTIONS[0].id);
    }
  }, [open, value]);

  const active = AR_FIELD_SECTIONS.find((s) => s.id === section)!;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[760px] gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 px-7 pb-5 pt-7 text-left">
          <DialogTitle className="text-2xl font-medium leading-[30px] tracking-[-0.15px] text-foreground">
            Field Configuration
          </DialogTitle>
          <DialogDescription className="text-sm text-secondary-foreground">
            Sales — Accounts Receivable
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[420px] grid-cols-1 border-t border-neutral-gray sm:grid-cols-[212px_1fr]">
          <nav className="flex flex-col gap-1 border-b border-neutral-gray p-3 sm:border-b-0 sm:border-r">
            {AR_FIELD_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm",
                  s.id === section
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-foreground hover:bg-section"
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col">
            <h3 className="bg-accent px-5 py-3 text-sm font-semibold text-foreground">
              {active.label}
            </h3>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {active.fields.length === 0 ? (
                <p className="px-5 py-6 text-sm text-secondary-foreground">
                  No configurable fields in this section yet.
                </p>
              ) : (
                active.fields.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-6 border-b border-neutral-gray px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {f.label}
                      </p>
                      {f.description ? (
                        <p className="mt-0.5 text-xs leading-4 text-secondary-foreground">
                          {f.description}
                        </p>
                      ) : null}
                    </div>
                    <Switch
                      aria-label={f.label}
                      checked={!!draft[f.id]}
                      onCheckedChange={(on) =>
                        setDraft((d) => ({ ...d, [f.id]: on }))
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-neutral-gray px-5 py-4">
          <Button
            variant="ghost"
            className="text-danger-action hover:text-danger-action"
            onClick={() => setDraft({ ...AR_FIELD_DEFAULTS })}
          >
            Reset to Default
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="text-primary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(draft)}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FieldConfiguration;
