# Inbox table sizing rules

- Measure the table container, not the window: sidebar changes also affect available space.
- Automatic layout distributes available width between the per-column minimum and maximum in `table-sizing.ts`. Below the combined minimum, scroll the table horizontally. Above the combined maximum, leave the remaining space unused.
- The selection column stays 40px. Hidden columns consume no space.
- The first manual resize snapshots the currently rendered widths. A 1px pointer movement changes only the selected column by 1px, bounded by its minimum and maximum. All other widths remain fixed, including after a viewport change.
- Manual widths survive hiding/showing and navigation within the browser session. Only user-chosen layouts are persisted; viewport-driven automatic measurements are never stored.
- Double-click or Enter restores one column to its preferred width. Reset widths clears the manual layout and resumes automatic sizing. Reset Default also restores column order and visibility.
- Left/Right arrows move 10px; Shift moves 40px; Home/End choose the limits. Escape, pointer cancellation, or loss of window focus cancels an active drag. Unmounting cleans up listeners and cursor styles.
- The table owns horizontal and vertical scrolling. Its header is sticky. Search, filters, View, tabs, and pagination remain outside horizontal table scrolling. Small screens can scroll tabs and wrap controls.
- Pinning continues to mean placing a column first in the order; it does not freeze columns during horizontal scrolling.
