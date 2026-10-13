import React, { forwardRef } from "react";
import { ArrowUp, Square } from "@/components/icons";

type Props = {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
};

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded-sm bg-surface-muted px-1 font-sans text-caption-1 font-semibold text-topnav-avatar-text">
    {children}
  </kbd>
);

/**
 * Where you ask. Enter sends, Shift+Enter breaks the line, and the key legend
 * stays on screen underneath — the Tally way, not a `?` away.
 */
const Composer = forwardRef<HTMLTextAreaElement, Props>(
  ({ value, busy, onChange, onSend, onStop }, ref) => (
    <div className="flex-none border-t border-surface-stroke px-3 pb-2.5 pt-3">
      <div className="flex items-end gap-2 rounded-xl border border-surface-stroke bg-surface-muted py-2 pl-3 pr-2 transition-colors focus-within:border-border">
        <label htmlFor="neo-composer" className="sr-only">
          Ask Neo
        </label>
        <textarea
          id="neo-composer"
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              !e.nativeEvent.isComposing &&
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.ctrlKey &&
              !e.metaKey
            ) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={busy ? "Neo is working…" : "Tell Neo what to do"}
          className="max-h-28 min-h-6 flex-1 resize-none bg-transparent py-0.5 text-body-3 text-topnav-avatar-text placeholder:text-surface-foreground-muted focus-visible:outline-none [field-sizing:content]"
        />
        {busy ? (
          <button
            type="button"
            aria-label="Stop"
            onClick={onStop}
            className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-surface-stroke text-topnav-avatar-text hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            disabled={!value.trim()}
            onClick={onSend}
            className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-background text-surface transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-caption-1 text-surface-foreground-muted">
        <span>
          <Key>Ctrl J</Key> panel
        </span>
        <span>
          <Key>1–9</Key> pick outside text fields
        </span>
        <span>
          <Key>Ctrl ↵</Key> draft action
        </span>
        <span>
          <Key>Esc</Key> {busy ? "stop" : "close"}
        </span>
      </p>
    </div>
  )
);
Composer.displayName = "Composer";

export default Composer;
