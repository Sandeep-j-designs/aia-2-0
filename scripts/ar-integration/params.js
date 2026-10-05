/* ============================================================================
   0. PARAMS
   ----------------------------------------------------------------------------
   Opened standalone, this file is configured by its query string — ?embed=1,
   ?item=…, ?inboxv2=1, ?dev. Loaded into the inbox's own document there is no
   query string to read: the URL is /inbox/<id>. So the host may instead declare
   the same values on window.AR_PARAMS before this script runs, and the URL
   still wins when both are present.

   Read through this everywhere rather than touching location.search directly,
   or the engine half-configures itself under a host.

   Named AR_PARAMS rather than AP_PARAMS deliberately: both sheets now run in
   the same document, and one shared global would have the bill's config
   answering the invoice's questions the moment an accountant paged from an AP
   item to an AR one.
   ==========================================================================*/
const AR_PARAMS = (() => {
  const query = new URLSearchParams(location.search);
  const host = (typeof window !== "undefined" && window.AR_PARAMS) || null;
  return {
    get: (key) => query.get(key) ?? (host && key in host ? host[key] : null),
    has: (key) => query.has(key) || !!(host && key in host),
  };
})();

/* ----------------------------------------------------------------------------
   Is this evaluation still the one driving the sheet?

   The inbox evaluates this script again for every invoice it opens, and an
   evaluation cannot be taken back: removing the <script> element drops the tag,
   not the listeners and observers it registered. So a superseded engine is
   still running, and its nodes have been unmounted — anything of its own that
   fires late reaches for a document that is no longer there.

   The host stamps a generation before each evaluation. Async entry points that
   can outlive theirs check this and return. Standalone there is no stamp, the
   generation is 0 on both sides, and this is always true.
   -------------------------------------------------------------------------- */
const AR_GEN = (typeof window !== "undefined" && window.__AR_GEN__) || 0;
const arLive = () =>
  ((typeof window !== "undefined" && window.__AR_GEN__) || 0) === AR_GEN;
