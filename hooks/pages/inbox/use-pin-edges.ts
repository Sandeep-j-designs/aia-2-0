import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Whether a table's columns are scrolled under its pinned left bookend, and
 * whether more are waiting under the pinned right one.
 *
 * Spread the result on any ancestor of the table's cells. The pinned cells
 * carry `.pin-edge-l` / `.pin-edge-r` (globals.css), which shade their inner
 * edge only while the matching attribute is set. A fixed hairline there
 * doubled up with the rule of whichever column was sliding beneath it.
 */
export const usePinEdges = (scroller: RefObject<HTMLElement | null>) => {
  const [edges, setEdges] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const l = el.scrollLeft > 0;
    const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((prev) => (prev.l === l && prev.r === r ? prev : { l, r }));
  }, [scroller]);

  // The scroller can mount late (views swap inside one page), so bind to
  // whichever element the ref holds after each render, and only rebind when
  // that element changes.
  const bound = useRef<HTMLElement | null>(null);
  const unbind = useRef<(() => void) | null>(null);
  useEffect(() => {
    // Every render: column widths, visibility and tabs all move the overflow.
    measure();
    const el = scroller.current;
    if (el === bound.current) return;
    unbind.current?.();
    unbind.current = null;
    bound.current = el;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    unbind.current = () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  });
  useEffect(() => () => unbind.current?.(), []);

  return {
    "data-pin-l": edges.l || undefined,
    "data-pin-r": edges.r || undefined,
  };
};

export default usePinEdges;
