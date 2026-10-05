import * as ResizablePrimitive from "react-resizable-panels";

/**
 * The divider between a document's preview and its form, in every document
 * type. The grey/white edge is the divider: a hairline with a slim pill on
 * it, both brand while hovered, focused or dragged, the pill growing as it
 * does. A 12px hit zone straddles the line. The AP sheet's own splitter is
 * styled to match in styles/bill-form.css.
 */
export const PaneResizer = () => (
  <ResizablePrimitive.PanelResizeHandle className="group/resizer relative flex w-px shrink-0 items-center justify-center bg-pi-line outline-none transition-[background-color,box-shadow] duration-150 after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 focus-visible:bg-pi-brand focus-visible:shadow-[1px_0_0_var(--pi-brand)] data-[resize-handle-state=drag]:bg-pi-brand data-[resize-handle-state=hover]:bg-pi-brand data-[resize-handle-state=drag]:shadow-[1px_0_0_var(--pi-brand)] data-[resize-handle-state=hover]:shadow-[1px_0_0_var(--pi-brand)]">
    <span
      aria-hidden
      className="z-10 h-7 w-1 rounded-full bg-pi-line-strong transition-[height,background-color] duration-150 group-focus-visible/resizer:h-10 group-focus-visible/resizer:bg-pi-brand group-data-[resize-handle-state=drag]/resizer:h-10 group-data-[resize-handle-state=hover]/resizer:h-10 group-data-[resize-handle-state=drag]/resizer:bg-pi-brand group-data-[resize-handle-state=hover]/resizer:bg-pi-brand"
    />
  </ResizablePrimitive.PanelResizeHandle>
);
