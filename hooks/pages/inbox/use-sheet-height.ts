import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Publishes an engine sheet's visible height as `--sheet-h` on its scroller.
 *
 * The AP/AR engines size their document pane from the window (100dvh minus
 * their own 51px top bar). Here the sheet scrolls inside the app shell, below
 * the app's top bar, so that sum ran the pane past the bottom of the screen.
 * `sheet-bridge.css` sizes the pane from this value instead.
 */
export const useSheetHeight = (host: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const publish = () =>
      el.style.setProperty("--sheet-h", `${el.clientHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);
};

export default useSheetHeight;
