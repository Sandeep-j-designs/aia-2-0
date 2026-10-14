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
  <kbd className="rounded-sm bg-pi-fill px-1 font-sans text-caption-1 font-semibold text-pi-ink">
    {children}
  </kbd>
);

/**
 * Where you ask. Enter sends, Shift+Enter breaks the line, and the key legend
 * stays on screen underneath — the Tally way, not a `?` away.
 */
const Composer = forwardRef<HTMLTextAreaElement, Props>(
  ({ value, busy, onChange, onSend, onStop }, ref) => (
    <div className="flex-none border-t border-pi-line bg-background p-4">
      <div className="flex items-end gap-3 rounded-xl border border-pi-line-2 bg-background p-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
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
          className="max-h-28 min-h-14 min-w-0 flex-1 resize-none bg-transparent py-0.5 text-sm leading-6 text-pi-ink placeholder:text-pi-body focus-visible:outline-none [field-sizing:content]"
        />
        {busy ? (
          <button
            type="button"
            aria-label="Stop"
            onClick={onStop}
            className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-pi-line text-pi-ink hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Send"
            disabled={!value.trim()}
            onClick={onSend}
            className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-2.5 flex flex-wrap justify-between gap-2 text-[11px] text-pi-body">
        <span>
          <Key>Enter</Key> send · <Key>Shift ↵</Key> new line
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
