import { useDialogRefinements } from "./dialog-refinement";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BillReview } from "./bill-review";

/**
 * Mounts the review layer into the entry sheet's header slot.
 *
 * Both sheets — the bill (AP) and the sales invoice (AR) — are composed into
 * the Finops review form by review-layout.ts (composeBillForm), which leaves
 * an empty `.cr-head` for this to fill. BillReview does the rest: the header,
 * the checks, the sheets and Needs you.
 */
export function useReviewAssistant(
  host: React.RefObject<HTMLDivElement>,
  markup: string | null,
  kind: "ap" | "ar"
) {
  useDialogRefinements(host, markup);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const head = host.current?.querySelector<HTMLElement>(".form .cr-head");
    if (!markup || !head) return;
    setMount(head);
  }, [host, markup]);
  if (!mount) return null;
  return createPortal(<BillReview root={host.current!} kind={kind} />, mount);
}
