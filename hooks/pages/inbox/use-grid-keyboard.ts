import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type GridCell = { row: number; col: number };

type UseGridKeyboardArgs = {
  /** The scroll container wrapping the table. Cells are found inside it. */
  gridRef: React.RefObject<HTMLElement>;
  rowCount: number;
  colCount: number;
  /** Shift+/ — the panel that lists all of this. */
  onOpenShortcuts: () => void;
  /** / — the search box. */
  onFocusSearch: () => void;
  /** Enter or Space on a body cell. */
  onActivateRow: (row: number) => void;
  /** Enter while the cursor is in the header. */
  onSortColumn: (col: number) => void;
  /** Space while the cursor is in the header. */
  onFilterColumn: (col: number) => void;
  /** PgUp / PgDn move by this many rows. */
  pageJump?: number;
};

/**
 * Unified Inbox — keyboard navigation for the grid.
 *
 * Implements exactly the list the shortcuts panel prints
 * (config/pages/inbox/keyboard-shortcuts.ts). Two scopes:
 *
 *   window   the entry points — `/`, `Shift+/`, `Alt+T`. These have to work
 *            from anywhere on the page, because their whole job is getting you
 *            somewhere without reaching for the mouse.
 *   grid     movement, selection and copy, which only mean anything once a
 *            cursor exists.
 *
 * Typing suppresses everything except Escape, per the note the panel carries:
 * a `/` typed into the search box is a slash, not a command.
 */

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
};

/**
 * The DOM id of one cell. A screen reader follows aria-activedescendant to
 * whatever this names, so the id has to exist on the element the cursor is on —
 * header row included, which is why -1 is spelled "head" rather than left to
 * stringify into a hyphen the selector would have to escape.
 */
export const gridCellId = (row: number, col: number) =>
  `inbox-grid-cell-${row < 0 ? "head" : row}-${col}`;

/**
 * The control inside a cell, if the cell has one.
 *
 * Vendor, Voucher type and AI Route render a Select in every row, and the
 * panel lists "Accept / activate focused control" as its own line: a cell with
 * a dropdown in it has something to activate that is not "open the document".
 * Only controls that do something else are counted — the File column's link
 * goes where opening the row goes, so treating it as a control would add a
 * code path to reach the same screen.
 */
const cellControl = (cell: HTMLElement | null): HTMLElement | null =>
  cell?.querySelector<HTMLElement>(
    '[role="combobox"], select, button:not([data-filter-trigger])'
  ) ?? null;

const clamp = (value: number, max: number) =>
  Math.max(0, Math.min(value, Math.max(0, max)));

export const useGridKeyboard = ({
  gridRef,
  rowCount,
  colCount,
  onOpenShortcuts,
  onFocusSearch,
  onActivateRow,
  onSortColumn,
  onFilterColumn,
  pageJump = 10,
}: UseGridKeyboardArgs) => {
  /**
   * Row -1 is the header. Keeping it in the same coordinate space as the body
   * is what lets one set of arrow handlers walk from a value up into the
   * column that names it, which is how a spreadsheet behaves.
   */
  const [cursor, setCursor] = useState<GridCell | null>(null);
  /** Where a Shift+arrow selection started. Null means no range, just a cursor. */
  const [anchor, setAnchor] = useState<GridCell | null>(null);

  // Callbacks change every render in this codebase; hold them in a ref so the
  // window listener can be bound once instead of re-bound on every keystroke.
  const handlers = useRef({
    onOpenShortcuts,
    onFocusSearch,
    onActivateRow,
    onSortColumn,
    onFilterColumn,
  });
  handlers.current = {
    onOpenShortcuts,
    onFocusSearch,
    onActivateRow,
    onSortColumn,
    onFilterColumn,
  };

  /**
   * Alt+T resumes rather than restarts.
   *
   * It used to seat the cursor on the first cell every time, which made it
   * useless as a way back in: anyone who left the grid to edit a cell and
   * pressed it to carry on was thrown to the top of the table and had to walk
   * back down. Escape is what abandons a position — see `exitGrid`, which
   * clears the cursor, so the next Alt+T does start at the beginning.
   */
  const enterGrid = useCallback(() => {
    setCursor((prev) => prev ?? { row: 0, col: 0 });
    setAnchor(null);
    gridRef.current?.focus();
  }, [gridRef]);

  /**
   * Take focus back after something inside a cell had it.
   *
   * The cursor is the hook's own state and survives an edit; what does not is
   * DOM focus, which a dropdown hands to its trigger on close. The trigger sits
   * inside the cell, and the cell stops key events reaching the grid — so the
   * arrows went nowhere and the grid looked dead until it was re-entered.
   */
  const refocusGrid = useCallback(() => {
    gridRef.current?.focus({ preventScroll: true });
  }, [gridRef]);

  const exitGrid = useCallback(() => {
    setCursor(null);
    setAnchor(null);
  }, []);

  // A shorter page, a filter change or a new sort can strand the cursor past
  // the last row. Pull it back rather than leaving a highlight on nothing.
  useEffect(() => {
    setCursor((prev) => {
      if (!prev) return prev;
      if (rowCount === 0 || colCount === 0) return null;
      const row = prev.row < 0 ? -1 : clamp(prev.row, rowCount - 1);
      const col = clamp(prev.col, colCount - 1);
      return row === prev.row && col === prev.col ? prev : { row, col };
    });
  }, [rowCount, colCount]);

  /* ----------------------------------------------------- global entry keys */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Escape is the one key that has to survive a focused text field — it is
      // how you get back out of one.
      if (event.key === "Escape") {
        if (isTypingTarget(event.target)) (event.target as HTMLElement).blur();
        exitGrid();
        return;
      }
      if (isTypingTarget(event.target)) return;

      // Shift+/ is "?" on most layouts; match either so a layout that puts ?
      // elsewhere still works.
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        handlers.current.onOpenShortcuts();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        handlers.current.onFocusSearch();
        return;
      }
      // event.code, not event.key: macOS treats Option as a compose modifier,
      // so Option+T arrives with key "†" and a key comparison never matches on
      // the platform the panel's Mac tab is written for. `code` names the
      // physical key, which is what a chord like this actually means.
      //
      // Behind the typing guard, so it does nothing from inside a field. That
      // is a gap — getting back to the grid from the search box is exactly
      // what it is for — but moving it above the guard is not the fix: focus
      // lands on the grid and is taken straight back by the field, so the
      // shortcut only looks like it worked.
      if (event.altKey && event.code === "KeyT") {
        event.preventDefault();
        enterGrid();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterGrid, exitGrid]);

  /* ------------------------------------------------------ movement + copy */

  const copyRange = useCallback(async () => {
    const grid = gridRef.current;
    if (!grid || !cursor) return;

    const from = anchor ?? cursor;
    const top = Math.min(from.row, cursor.row);
    const bottom = Math.max(from.row, cursor.row);
    const left = Math.min(from.col, cursor.col);
    const right = Math.max(from.col, cursor.col);

    // Read the rendered text rather than the underlying values: what the user
    // selected is what they can see, including the formatting. A ₹ amount
    // pasted into a sheet should carry the grouping it had on screen.
    const lines: string[] = [];
    for (let row = top; row <= bottom; row += 1) {
      const cells: string[] = [];
      for (let col = left; col <= right; col += 1) {
        const cell = grid.querySelector<HTMLElement>(
          `[data-grid-row="${row}"][data-grid-col="${col}"]`
        );
        cells.push((cell?.innerText ?? "").replace(/\s+/g, " ").trim());
      }
      lines.push(cells.join("\t"));
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {
      // Clipboard permission is not something a prototype should nag about;
      // the selection is still on screen and still correct.
    }
  }, [anchor, cursor, gridRef]);

  const onGridKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isTypingTarget(event.target) && event.key !== "Escape") return;
      if (rowCount === 0 || colCount === 0) return;

      const move = (next: GridCell, extend: boolean) => {
        event.preventDefault();
        setAnchor((prev) => (extend ? (prev ?? cursor) : null));
        setCursor(next);
      };

      // No cursor yet: the first arrow puts one on the first cell rather than
      // moving a thing that is not there.
      if (!cursor) {
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          setCursor({ row: 0, col: 0 });
        }
        return;
      }

      const lastRow = rowCount - 1;
      const lastCol = colCount - 1;
      const ctrl = event.ctrlKey || event.metaKey;

      switch (event.key) {
        case "ArrowUp":
          // Up off the first row lands on the header, not nowhere.
          return move(
            { ...cursor, row: cursor.row <= 0 ? -1 : cursor.row - 1 },
            event.shiftKey
          );
        case "ArrowDown":
          return move(
            {
              ...cursor,
              row: cursor.row < 0 ? 0 : clamp(cursor.row + 1, lastRow),
            },
            event.shiftKey
          );
        case "ArrowLeft":
          return move(
            { ...cursor, col: clamp(cursor.col - 1, lastCol) },
            event.shiftKey
          );
        case "ArrowRight":
          return move(
            { ...cursor, col: clamp(cursor.col + 1, lastCol) },
            event.shiftKey
          );
        case "Home":
          return move(
            ctrl ? { row: 0, col: 0 } : { ...cursor, col: 0 },
            event.shiftKey
          );
        case "End":
          return move(
            ctrl ? { row: lastRow, col: lastCol } : { ...cursor, col: lastCol },
            event.shiftKey
          );
        case "PageUp":
          return move(
            { ...cursor, row: clamp(cursor.row - pageJump, lastRow) },
            event.shiftKey
          );
        case "PageDown":
          return move(
            { ...cursor, row: clamp(cursor.row + pageJump, lastRow) },
            event.shiftKey
          );
        case "c":
        case "C":
          if (!ctrl) return;
          event.preventDefault();
          void copyRange();
          return;
        case "Enter":
        case " ": {
          event.preventDefault();
          // Header: Enter reorders the column, Space opens the funnel that
          // narrows it — the panel's "Sort / filter a column" row is two keys
          // because a column has both.
          if (cursor.row < 0) {
            if (event.key === "Enter")
              handlers.current.onSortColumn(cursor.col);
            else handlers.current.onFilterColumn(cursor.col);
            return;
          }
          // Body: the cell's own control comes first. Opening the document is
          // what Enter means on a cell with nothing in it, not what it means
          // everywhere — a dropdown you cannot open from the keyboard is a
          // dropdown the keyboard cannot reach at all, since the grid is one
          // tab stop and Tab leaves it entirely.
          const control = cellControl(
            gridRef.current?.querySelector<HTMLElement>(
              `[data-grid-row="${cursor.row}"][data-grid-col="${cursor.col}"]`
            ) ?? null
          );
          if (control) {
            control.click();
            return;
          }
          handlers.current.onActivateRow(cursor.row);
          return;
        }
        default:
      }
    },
    [colCount, copyRange, cursor, gridRef, pageJump, rowCount]
  );

  /* --------------------------------------------------------------- render */

  // Keep the cursor on screen. A grid that scrolls under a highlight you
  // cannot see is worse than no keyboard navigation at all.
  useEffect(() => {
    if (!cursor) return;
    gridRef.current
      ?.querySelector(
        `[data-grid-row="${cursor.row}"][data-grid-col="${cursor.col}"]`
      )
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [cursor, gridRef]);

  const bounds = useMemo(() => {
    if (!cursor || !anchor) return null;
    return {
      top: Math.min(anchor.row, cursor.row),
      bottom: Math.max(anchor.row, cursor.row),
      left: Math.min(anchor.col, cursor.col),
      right: Math.max(anchor.col, cursor.col),
    };
  }, [anchor, cursor]);

  const isCursor = useCallback(
    (row: number, col: number) => cursor?.row === row && cursor?.col === col,
    [cursor]
  );

  const isSelected = useCallback(
    (row: number, col: number) =>
      !!bounds &&
      row >= bounds.top &&
      row <= bounds.bottom &&
      col >= bounds.left &&
      col <= bounds.right,
    [bounds]
  );

  return {
    cursor,
    /**
     * For aria-activedescendant on the focusable grid container. Undefined when
     * there is no cursor: the attribute has to be absent then, not empty, or a
     * screen reader announces a cell that is not there.
     */
    activeDescendant: cursor ? gridCellId(cursor.row, cursor.col) : undefined,
    isCursor,
    isSelected,
    onGridKeyDown,
    enterGrid,
    exitGrid,
    refocusGrid,
    setCursor,
  };
};
