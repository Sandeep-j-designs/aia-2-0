/**
 * Supersede every embedded sheet engine currently alive in this document.
 *
 * Opening a bill or an invoice evaluates an engine, and an evaluation cannot be
 * undone: removing the <script> element drops the tag, not the listeners it
 * registered on window and document. So the host stamps a generation before
 * each evaluation, the engine captures it, and anything of the engine's that
 * fires later checks whether it is still the newest and stands down if not.
 *
 * Both counters move together, and that is the point. They used to be bumped
 * one apiece — an AP mount raised `__AP_GEN__`, an AR mount raised `__AR_GEN__`
 * — which meant paging from a bill to an invoice left the bill's engine
 * believing it was still the live one. It kept its listeners, and since the two
 * engines are siblings built from the same file they answer the same event
 * names on the same document. The bill's engine ran the invoice's seed against
 * a DOM that had been unmounted under it and threw on the first node it
 * reached for.
 *
 * There is one screen and one sheet on it. Whichever sheet mounts most recently
 * is the live one, and every engine of either kind that came before it is not.
 */
export const supersedeSheets = () => {
  const w = window as unknown as { __AP_GEN__?: number; __AR_GEN__?: number };
  const next = Math.max(w.__AP_GEN__ || 0, w.__AR_GEN__ || 0) + 1;
  w.__AP_GEN__ = next;
  w.__AR_GEN__ = next;
  /*
    The overlays go too. A picker, a tooltip or a row menu hangs off the sheet's
    portal on <body>, not off the sheet — that is the whole point of the portal,
    since neither can be clipped by the sheet's scroller. But it also means the
    sheet unmounting leaves them on screen: page to the next document with a
    dropdown still open and the previous document's list is still sitting over
    the new form, waiting for a click anywhere to notice it should not be.
    Superseding is exactly the moment nothing portalled can still be current.
  */
  document.getElementById("ap-sheet-portal")?.remove();
  document.getElementById("ar-sheet-portal")?.remove();
};
