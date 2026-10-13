import React, { useEffect, useRef, useState } from "react";
import useSheetHeight from "@/hooks/pages/inbox/use-sheet-height";
import { prepareReviewMarkup } from "./review-layout";
import { useReviewAssistant } from "./review-assistant";
import { AR_SHEET_VERSION } from "@/components/inbox/v2/ar-sheet-version";
import { supersedeSheets } from "@/components/inbox/v2/sheet-generation";
import { asset } from "@/lib/base-path";

/**
 * The sales invoice sheet, mounted into the inbox's OWN document.
 *
 * The AP sheet's twin — see components/inbox/v2/ap-sheet.tsx for why this is
 * not an <iframe>: both sheets carry <dialog>s opened with showModal(), and a
 * modal dialog renders in the top layer of its own document, which inside a
 * frame is the frame's box.
 *
 * The three assets come from scripts/build-ar-sheet.cjs, which splits
 * public/ar/index.html — still the source of truth, still opens standalone:
 *
 *   sheet.css   the sheet's CSS with every selector scoped under .ar-sheet, so
 *               its `:root` tokens and `body` ground cannot reach the app's
 *   sheet.html  the markup, injected as-is
 *   sheet.js    the engine, wrapped in one function scope per evaluation
 *
 * DEV: on transplant this is the seam to replace. Production should render the
 * invoice form as React components against the same endpoints; this keeps the
 * shipped AR sheet byte-identical in the meantime.
 */

type Props = {
  /** Remount key material — a new invoice needs a fresh engine evaluation. */
  itemId: string;
};

const CSS_ID = "ar-sheet-css";

const ArSheet = ({ itemId }: Props) => {
  const host = useRef<HTMLDivElement>(null);
  // Sizes the document pane to the sheet, not the window.
  useSheetHeight(host);
  const [markup, setMarkup] = useState<string | null>(null);

  const reviewAssistant = useReviewAssistant(host, markup, "ar");

  // The stylesheet is document-wide and identical for every invoice, so it is
  // added once and never removed — re-adding it per invoice would restyle the
  // whole screen on every navigation.
  useEffect(() => {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = asset(`/ar/sheet.css?v=${AR_SHEET_VERSION}`);
    document.head.append(link);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(asset(`/ar/sheet.html?v=${AR_SHEET_VERSION}`))
      .then((r) => r.text())
      .then((html) => {
        if (!cancelled) setMarkup(prepareReviewMarkup(html, "ar"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Markup first, then the engine: it boots against the DOM on evaluation, so a
  // script appended before the markup exists would find none of its own nodes.
  useEffect(() => {
    if (!markup || !host.current) return;
    const w = window as unknown as {
      AR_PARAMS: Record<string, string>;
    };
    /*
      AR_PARAMS, not AP_PARAMS. Both sheets run in this one document — an
      accountant pages from a bill to an invoice without the page reloading —
      and one shared config global would have the bill's item id keying the
      invoice's draft.
    */
    w.AR_PARAMS = {
      embed: "1",
      inboxv2: "1",
      item: itemId,
    };
    /*
      Stamp a generation before the engine evaluates.

      Opening an invoice evaluates the engine, and an evaluation cannot be
      undone: removing the <script> element below drops the tag, not the
      listeners it registered on window and document. Paging through invoices
      would otherwise leave one live engine per invoice, all bound to the same
      ids in the same document, and every one of them would answer the next
      seed.

      The engine's integration block reads this and stands down when it no
      longer matches, so only the newest evaluation drives the sheet. It stands
      the AP engines down too; see ./sheet-generation.
    */
    supersedeSheets();
    const script = document.createElement("script");
    // The version is what actually busts the cache; the item is there so the
    // request is legible in the network panel next to the invoice it belongs to.
    script.src = asset(
      `/ar/sheet.js?v=${AR_SHEET_VERSION}&item=${encodeURIComponent(itemId)}`
    );
    document.body.append(script);
    return () => {
      script.remove();
    };
  }, [markup, itemId]);

  return (
    <>
      <div
        ref={host}
        className="ar-sheet min-h-0 flex-1 overflow-auto"
        // The sheet's own markup, verbatim. It is generated from a file in this
        // repo, never from user or network content.
        dangerouslySetInnerHTML={markup ? { __html: markup } : undefined}
      />
      {reviewAssistant}
    </>
  );
};

export default ArSheet;
