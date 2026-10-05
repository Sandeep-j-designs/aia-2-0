/**
 * Unified Inbox — the keyboard shortcut table.
 *
 * Ported from Figma 24496:57272. The rows are the contract: what the panel
 * lists is what hooks/pages/inbox/use-grid-keyboard.ts actually binds, so a
 * change here without a change there is a lie printed on screen.
 *
 * A key group renders as keys side by side ("Ctrl C"); two groups render with
 * a slash between them ("Home / End"), which is the design's way of writing
 * "either of these".
 */

export type ShortcutPlatform = "windows" | "mac";

export type ShortcutRow = {
  id: string;
  label: string;
  /** One group = keys pressed together. Two groups = this one OR that one. */
  keys: string[][];
};

/** Arrow tokens the panel draws as icons rather than text. */
export const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const ARROWS = ARROW_KEYS;

const WINDOWS: ShortcutRow[] = [
  { id: "shortcuts", label: "Open Keyboard shortcuts", keys: [["Shift", "/"]] },
  { id: "search", label: "Focus the search box", keys: [["/"]] },
  { id: "cancel", label: "Cancel edit", keys: [["ESC"]] },
  { id: "grid", label: "Jump into the grid", keys: [["Alt", "T"]] },
  { id: "move", label: "Move between cells", keys: [ARROWS] },
  {
    id: "range",
    label: "Select a range of cells",
    keys: [["Shift", ...ARROWS]],
  },
  { id: "copy", label: "Copy the selected range", keys: [["Ctrl", "C"]] },
  { id: "col-ends", label: "First / last column", keys: [["Home"], ["End"]] },
  {
    id: "row-ends",
    label: "First / last row",
    keys: [["Ctrl", "Home"], ["End"]],
  },
  { id: "page", label: "Jump 10 rows", keys: [["PgUp"], ["PgDn"]] },
  { id: "sort", label: "Sort / filter a column", keys: [["Enter"], ["Space"]] },
  {
    id: "activate",
    label: "Accept / activate focused control",
    keys: [["Enter"], ["Space"]],
  },
];

/**
 * Mac differs only in which modifier carries each job, so it is derived rather
 * than written twice — two hand-maintained lists drift, and the one that
 * drifts is always the platform the designer is not using.
 *
 * DEV: the Figma's Mac tab was not available when this was built. Check it
 * before handoff; the mapping below is the platform convention, not a copy of
 * the design.
 */
const MAC_KEYS: Record<string, string> = {
  Ctrl: "⌘",
  Alt: "⌥",
  Shift: "⇧",
  ESC: "esc",
  PgUp: "⇞",
  PgDn: "⇟",
  Enter: "return",
  Home: "↖",
  End: "↘",
};

const toMac = (row: ShortcutRow): ShortcutRow => ({
  ...row,
  keys: row.keys.map((group) => group.map((key) => MAC_KEYS[key] ?? key)),
});

export const SHORTCUTS: Record<ShortcutPlatform, ShortcutRow[]> = {
  windows: WINDOWS,
  mac: WINDOWS.map(toMac),
};

/**
 * Only claims what use-grid-keyboard.ts binds. The previous wording promised a
 * Go To and Alt-prefixed Receipt, Stock journal, Features and Configure — none
 * of which exist on this screen; it came over from another panel's copy. Alt+T
 * does carry a prefix for the reason that sentence gave, so the reason stays
 * and the four phantom shortcuts go.
 */
export const SHORTCUTS_NOTE =
  "Disabled while typing in a text field, except Esc. Jumping into the grid uses an Alt prefix because browsers reserve the plain function keys for themselves.";

/** Mac gets the ⌘-flavoured list; everything else gets Ctrl. */
export const detectPlatform = (): ShortcutPlatform =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "mac"
    : "windows";
