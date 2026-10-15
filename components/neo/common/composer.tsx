import React, { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowUp, FileText, Paperclip, Square, X } from "@/components/icons";
import type { NeoAttachment } from "@/types/pages/neo";

type Props = {
  value: string;
  busy: boolean;
  attachments: NeoAttachment[];
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttachFiles: (files: FileList) => void;
  onAttachSample: () => void;
  onRemoveAttachment: (name: string) => void;
};

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded-sm bg-pi-fill px-1 font-sans text-caption-1 font-semibold text-pi-ink">
    {children}
  </kbd>
);

/**
 * Where you ask. Enter sends, Shift+Enter breaks the line, and the key legend
 * stays on screen underneath — the Tally way, not a `?` away.
 *
 * Bills go in here too: the clip attaches files (or the prototype's sample
 * batch), they sit as chips above the line, and they go with the message.
 * A batch of bills plus one line of instruction is how voucher entry starts.
 */
const Composer = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      value,
      busy,
      attachments,
      onChange,
      onSend,
      onStop,
      onAttachFiles,
      onAttachSample,
      onRemoveAttachment,
    },
    ref
  ) => {
    const [menu, setMenu] = useState(false);
    const file = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (!menu) return;
      const close = (e: MouseEvent) => {
        if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
      };
      window.addEventListener("mousedown", close);
      return () => window.removeEventListener("mousedown", close);
    }, [menu]);
    const canSend = !!value.trim() || attachments.length > 0;
    return (
      <div className="flex-none border-t border-pi-line bg-background p-4">
        <div className="rounded-xl border border-pi-line-2 bg-background p-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          {attachments.length > 0 && (
            <ul
              aria-label="Attached files"
              className="mb-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto"
            >
              {attachments.map((a) => (
                <li
                  key={a.name}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-pi-line bg-pi-fill py-1 pl-2 pr-1 text-[11px] text-pi-ink"
                >
                  <FileText className="h-3 w-3 flex-none text-pi-body" />
                  <span className="code truncate">{a.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => onRemoveAttachment(a.name)}
                    className="grid size-4 flex-none place-items-center rounded-sm text-pi-body hover:bg-background hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <div ref={menuRef} className="relative flex-none">
              <button
                type="button"
                aria-label="Attach bills"
                aria-haspopup="menu"
                aria-expanded={menu}
                disabled={busy}
                onClick={() => setMenu((m) => !m)}
                className="grid h-8 w-8 place-items-center rounded-lg text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              {menu && (
                <div
                  role="menu"
                  className="absolute bottom-10 left-0 z-10 w-64 overflow-hidden rounded-md border border-pi-line bg-background py-1 shadow-popover-shadow"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      file.current?.click();
                    }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-pi-ink hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
                  >
                    Upload bills…
                    <span className="block text-caption-1 text-pi-body">
                      PDF, JPG or PNG
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      onAttachSample();
                    }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-pi-ink hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
                  >
                    Sample: 10 Harihar plant bills
                    <span className="block text-caption-1 text-pi-body">
                      September freight, courier and packing
                    </span>
                  </button>
                </div>
              )}
              <input
                ref={file}
                id="neo-attach"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  if (e.target.files?.length) onAttachFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
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
              placeholder={
                busy
                  ? "Neo is working…"
                  : attachments.length
                    ? "What should Neo know about these?"
                    : "Tell Neo what to do"
              }
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
                disabled={!canSend}
                onClick={onSend}
                className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
    );
  }
);
Composer.displayName = "Composer";

export default Composer;
