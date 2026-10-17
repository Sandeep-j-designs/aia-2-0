import React, { useEffect, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
  ChevronDown,
  ChevronUp,
  History,
  Maximize,
  Minimize,
  Pencil,
  Trash2,
  X,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import JournalVoucher from "@/components/inbox/journal";
import { Item, getState, updatePosted } from "./store";
import { ApprovedDetails } from "./record-details";
import Sheet from "./sheet";
import InvoiceSheet from "./invoice-sheet";
import SyncCloud from "./sync/sync-cloud";
import Preview from "./preview";
import { PaneResizer } from "./pane-resizer";
import { StatusPill } from "./ui";
import s from "./record-panel.module.css";

type Props = {
  item: Item;
  company: string;
  /** The approved rows of the table it was opened from, in that order. */
  items: Item[];
  /** Where Tally stands on this voucher, for the marker in the toolbar. */
  syncState: React.ComponentProps<typeof SyncCloud>["state"];
  canEdit: boolean;
  onOpen: (id: string) => void;
  /** The full-page editor — still how a non-AP record is edited. */
  onEdit: () => void;
  /** An in-panel edit was kept; the workspace brings Tally level. */
  onEdited: (id: string) => void;
  onDelete: () => void;
  /** Opens the document's History sheet. */
  onHistory: () => void;
  /** Back to the table at full width. */
  onClose: () => void;
};

/** Matches the exit transition in record-panel.module.css. */
const EXIT_MS = 160;
/** The document column's slide, the longer (opening) of its two durations
    in record-panel.module.css. */
const SLIDE_MS = 300;
/** Its closing duration. */
const FOLD_MS = 220;

/** One round icon control in the panel's toolbar. */
const ToolButton = ({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(s.tool, danger && s.danger)}
  >
    {children}
  </button>
);

/**
 * An approved record, docked beside the table it was opened from — the table
 * stays where it was, narrowed, with this row lit. The toolbar sits on the
 * panel's grey ground and the voucher on a sheet above it, so the controls
 * never compete with the record.
 *
 * Up and Down move through the approved rows of that table (the keys do the
 * same while focus is in the panel); expand gives the record the full width.
 */
const RecordPanel = ({
  item,
  company,
  items,
  syncState,
  canEdit,
  onOpen,
  onEdit,
  onEdited,
  onDelete,
  onHistory,
  onClose,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /*
    A bill reads through its own form: the AP sheet runs in the panel with its
    controls flattened to text, so Edit only gives the controls back — every
    value is already where its field is. The sheet writes as it is edited, so
    the record as it stood is kept to put back on Cancel.
  */
  const inPanel = ["AP", "AR", "JV"].includes(item.route);
  const journal = item.route === "JV";
  const [before, setBefore] = useState<Pick<
    Item,
    "form" | "sheet" | "amount"
  > | null>(null);
  const editing = !!before;
  // A voucher raised by hand has nothing behind it to show.
  const hasDocument = !!item.file.name && !item.created;
  /*
    Edit gives the form its controls back where it stands. The source
    document only comes in beside it when the panel is expanded — docked,
    there is no room for both — so the document column slides in on Edit
    when expanded, or on Expand while editing, and out on the reverse.
  */
  const [folding, setFolding] = useState(false);
  const showDoc = editing && expanded && hasDocument && !folding;
  /*
    Back to the table while editing: the document folds away first and the
    panel docks after, so the document is never squeezed into the docked
    width on its way out.
  */
  const toggleExpanded = () => {
    if (!expanded) return setExpanded(true);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!showDoc || reduced) return setExpanded(false);
    setFolding(true);
    window.setTimeout(() => {
      setExpanded(false);
      setFolding(false);
    }, FOLD_MS);
  };
  /*
    The column animates only across a toggle, so dragging its splitter stays
    under the pointer. `sliding` is set in the same render as the toggle —
    an effect would land a frame late and the change would cut. The viewer
    stays mounted until the column has closed, so it never blanks mid-slide.
  */
  const [shownDoc, setShownDoc] = useState(showDoc);
  const [sliding, setSliding] = useState(false);
  const [docMounted, setDocMounted] = useState(showDoc);
  if (shownDoc !== showDoc) {
    setShownDoc(showDoc);
    setSliding(true);
    if (showDoc) setDocMounted(true);
  }
  useEffect(() => {
    if (!sliding) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const t = window.setTimeout(
      () => {
        setSliding(false);
        if (!showDoc) setDocMounted(false);
      },
      reduced ? 0 : SLIDE_MS + 40
    );
    return () => window.clearTimeout(t);
  }, [sliding, showDoc]);
  // Mounted, folded, from Edit on, so the slide only has to move it: a
  // viewer loading its page in the slide's first frame is what stutters.
  const docLive = (editing && hasDocument) || docMounted;
  const scrollRef = useRef<HTMLDivElement>(null);
  const docPanel = useRef<ImperativePanelHandle>(null);
  /*
    Reading, the panel scrolls; editing, the form's own pane does (the
    review screen's layout). Carry the reader's place across the switch so
    Edit doesn't jump back to the top.
  */
  const FORM_SCROLLER = ".ap-sheet, .ar-sheet, [data-form-scroller]";
  const carryScroll = (toForm: boolean) => {
    const outer = scrollRef.current;
    if (!outer) return;
    const inner = outer.querySelector<HTMLElement>(FORM_SCROLLER);
    const top = toForm ? outer.scrollTop : (inner?.scrollTop ?? 0);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (toForm) {
          if (inner) inner.scrollTop = top;
        } else outer.scrollTop = top;
      })
    );
  };
  // The Sales and Journal document column opens from nothing on Edit.
  useEffect(() => {
    const panel = docPanel.current;
    if (!panel) return;
    if (showDoc) panel.resize(36);
    else panel.collapse();
  }, [showDoc]);
  /*
    The sheet engine keeps its own copy of the bill. Edit marks it, and Cancel
    asks for it back in place — not a remount, which would blank the sheet
    while it boots and turn the way back into a flash instead of the same
    fade the way in had.
  */
  const tellSheet = (type: "checkpoint" | "restore") =>
    // A journal is React state, put back by the store alone.
    !journal &&
    window.postMessage(
      {
        // Each engine answers its own name; see invoice-sheet.tsx.
        source: item.route === "AR" ? "aia-inbox-ar-v2" : "aia-inbox-v2",
        type,
      },
      location.origin
    );
  useEffect(() => setBefore(null), [item.id]);
  const startEdit = () => {
    if (!inPanel) return onEdit();
    tellSheet("checkpoint");
    carryScroll(true);
    setBefore(
      structuredClone({
        form: item.form,
        sheet: item.sheet,
        amount: item.amount,
      })
    );
  };
  const cancelEdit = () => {
    if (!before) return;
    updatePosted(item.id, before, "Approved Voucher Edit Cancelled");
    tellSheet("restore");
    leaveEdit();
  };
  const leaveEdit = () => {
    carryScroll(false);
    setBefore(null);
  };
  const saveEdit = () => {
    if (!before) return;
    const now = getState().items.find((x) => x.id === item.id);
    const changed =
      !!now &&
      (JSON.stringify(now.form) !== JSON.stringify(before.form) ||
        now.amount !== before.amount);
    leaveEdit();
    if (changed) onEdited(item.id);
  };
  const at = items.findIndex((x) => x.id === item.id);
  const step = (by: number) => {
    if (editing) return;
    const next = items[at + by];
    if (next) onOpen(next.id);
  };
  // The panel slides out before the table takes its width back.
  const close = () => {
    if (leaving) return;
    setLeaving(true);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.setTimeout(onClose, reduced ? 0 : EXIT_MS);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // An open dialog (the document preview, a delete confirmation) takes
      // Escape for itself.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        document.querySelector(
          "[role=dialog], [role=alertdialog], dialog[open]"
        )
      )
        return;
      // Escape leaves the edit first, the panel second.
      if (editing) cancelEdit();
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /*
    The journal reads through its edit form too. `readOnly` would swap in
    different markup (no blank lines, plain allocation text), so the form
    always renders editable and the read skin does the rest; edits only land
    while Edit is open.
  */
  const journalForm = (
    <div data-form-scroller className={s.formScroller}>
      <JournalVoucher
        item={item}
        attempted={false}
        readOnly={false}
        onEdit={(patch) => {
          if (!editing) return;
          updatePosted(item.id, { form: { ...item.form, ...patch } });
        }}
      />
    </div>
  );
  const invoiceForm = (
    <InvoiceSheet
      item={item}
      allowEdits={editing}
      onApproved={() => {}}
      onReady={() => {}}
    />
  );

  return (
    <aside
      aria-label="Approved voucher"
      className={cn(s.panel, expanded && s.expanded, leaving && s.leaving)}
      // Reading, the form's controls are text: the pointer can't reach them
      // (record-panel.module.css), and focus arriving by Tab is turned away
      // too, so nothing can be typed into a record that isn't being edited.
      // More details stays reachable; it only opens a section.
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;
        if (
          inPanel &&
          !editing &&
          target.matches("input, select, textarea, [role=combobox]") &&
          target.closest(`.${s.form}`)
        )
          target.blur();
      }}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, [role=menu]")) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          step(event.key === "ArrowDown" ? 1 : -1);
        }
      }}
    >
      {editing ? (
        <div className={s.toolbar}>
          <h2 className={s.editTitle}>
            {item.route === "AR"
              ? "Edit invoice"
              : journal
                ? "Edit journal"
                : "Edit bill"}
          </h2>
          <div className={s.group}>
            {/* Docked, the document has no room; the way to it says so in
                words, where the icon alone would read as layout only. */}
            {hasDocument && !expanded ? (
              <button
                type="button"
                title="Expand to edit beside the document"
                onClick={() => setExpanded(true)}
                className={s.docHint}
              >
                <Maximize size={14} aria-hidden />
                Show document
              </button>
            ) : (
              <ToolButton
                label={expanded ? "Show the table" : "Expand to full width"}
                onClick={toggleExpanded}
              >
                {expanded ? (
                  <Minimize size={15} aria-hidden />
                ) : (
                  <Maximize size={15} aria-hidden />
                )}
              </ToolButton>
            )}
            <Button variant="outline" className="h-8" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button variant="primary" className="h-8" onClick={saveEdit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className={s.toolbar}>
          <div className={s.group}>
            <ToolButton
              label="Previous voucher"
              disabled={at <= 0}
              onClick={() => step(-1)}
            >
              <ChevronUp size={16} aria-hidden />
            </ToolButton>
            <ToolButton
              label="Next voucher"
              disabled={at < 0 || at >= items.length - 1}
              onClick={() => step(1)}
            >
              <ChevronDown size={16} aria-hidden />
            </ToolButton>
            <span className={s.divider} aria-hidden />
            <ToolButton
              label="Edit entry"
              disabled={!canEdit}
              onClick={startEdit}
            >
              <Pencil size={15} aria-hidden />
            </ToolButton>
            <ToolButton label="Delete voucher" danger onClick={onDelete}>
              <Trash2 size={15} aria-hidden />
            </ToolButton>
            <ToolButton label="History" onClick={onHistory}>
              <History size={15} aria-hidden />
            </ToolButton>
            <span className={s.sync}>
              <SyncCloud className="h-4 w-4" side="bottom" state={syncState} />
            </span>
          </div>
          <div className={s.group}>
            <ToolButton
              label={expanded ? "Show the table" : "Expand to full width"}
              onClick={() => setExpanded((on) => !on)}
            >
              {expanded ? (
                <Minimize size={15} aria-hidden />
              ) : (
                <Maximize size={15} aria-hidden />
              )}
            </ToolButton>
            <ToolButton label="Close" onClick={close}>
              <X size={16} aria-hidden />
            </ToolButton>
          </div>
        </div>
      )}
      {/* Keyed so each voucher opens at its top, not where the last one was
          left. */}
      <div
        key={item.id}
        ref={scrollRef}
        className={cn(s.scroll, editing && s.scrollEditing)}
      >
        <div className={cn(s.sheet, editing && s.sheetEditing)}>
          {inPanel ? (
            <div
              className={cn(
                "payable-review",
                s.form,
                journal && s.journalForm,
                editing ? s.editingForm : s.reading,
                showDoc ? s.docOpen : s.docClosed,
                sliding && s.docSliding
              )}
            >
              {/* The record's name over its form; it folds away on Edit,
                where the review screen has none. */}
              <header className={s.recordHead} aria-hidden={editing}>
                <h1 className={s.recordTitle}>
                  {item.form.voucherNo ||
                    (journal ? "Journal" : item.form.party)}
                </h1>
                <StatusPill status="Approved" />
                <span className={s.recordAmount}>
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(item.amount)}
                </span>
              </header>
              <div className={s.body}>
                {item.route === "AP" ? (
                  /* The AP sheet draws its own document pane, splitter and
                     source viewer — the review screen's, unchanged. Reading,
                     it is switched off; Edit switches it on in place. */
                  <Sheet
                    item={item}
                    noDocument={!showDoc}
                    slideDocument
                    documentMounted={docLive}
                    allowEdits={editing}
                    onApproved={() => {}}
                    onReady={() => {}}
                  />
                ) : hasDocument ? (
                  /* Sales and Journals: the review screen's split, the
                     source beside the form behind its resizer. The document
                     column is mounted throughout and sits collapsed while
                     reading, so Edit never remounts the form. */
                  <ResizablePanelGroup
                    direction="horizontal"
                    className={s.docSplit}
                  >
                    <ResizablePanel
                      ref={docPanel}
                      collapsible
                      collapsedSize={0}
                      defaultSize={0}
                      minSize={18}
                      className="min-w-0"
                    >
                      {docLive && <Preview item={item} />}
                    </ResizablePanel>
                    <PaneResizer />
                    <ResizablePanel
                      defaultSize={100}
                      minSize={40}
                      className="flex min-w-0 flex-col"
                    >
                      {journal ? journalForm : invoiceForm}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : journal ? (
                  journalForm
                ) : (
                  invoiceForm
                )}
              </div>
            </div>
          ) : (
            <ApprovedDetails item={item} company={company} />
          )}
        </div>
      </div>
    </aside>
  );
};

export default RecordPanel;
