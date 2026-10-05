import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { X } from "@/components/icons";

/**
 * A review sheet: the Finops review form's centred dialog (title, a status
 * pill, one line of description, one scrolling body, a footer with Done), as
 * the bill and invoice forms draw it — the same `cr-sheet` markup and styles
 * (styles/bill-form.css), as a React component for the journal.
 *
 * Radix's dialog rather than a native <dialog>: the journal's pickers (Select,
 * the ledger ComboBox, the date Popover) portal to <body>, and a native modal
 * dialog makes everything outside it inert — their options rendered beneath
 * the sheet and could not be pressed. Radix stacks its own portals.
 *
 * The content carries `jv-form` so the form's scoped styles reach it in the
 * portal.
 */
export function Sheet({
  open,
  onClose,
  title,
  blurb,
  pill,
  wide,
  doneLabel = "Done",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  blurb?: string;
  pill?: { tone: "ok" | "warn"; label: string } | null;
  wide?: boolean;
  doneLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={`jv-form jv-sheet cr-sheet${wide ? " cr-sheet--wide" : ""}`}
          aria-describedby={undefined}
        >
          <header className="cr-sheet-head">
            <div className="cr-sheet-title">
              <DialogPrimitive.Title asChild>
                <h2>{title}</h2>
              </DialogPrimitive.Title>
              {pill ? (
                <span className="cr-pill" data-tone={pill.tone}>
                  {pill.label}
                </span>
              ) : null}
            </div>
            {blurb ? <p>{blurb}</p> : null}
            <DialogPrimitive.Close className="cr-x" aria-label="Close">
              <X size={16} />
            </DialogPrimitive.Close>
          </header>
          <div className="cr-sheet-body">{children}</div>
          <footer className="cr-sheet-foot">
            <DialogPrimitive.Close className="cr-done">{doneLabel}</DialogPrimitive.Close>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
