/* ============================================================================
   0. PARAMS
   ----------------------------------------------------------------------------
   Opened standalone, this file is configured by its query string — ?embed=1,
   ?mode=ar, ?item=…, ?inboxv2=1, ?dev. Loaded into the inbox's own document
   there is no query string to read: the URL is /inbox/<id>. So the host may
   instead declare the same values on window.AP_PARAMS before this script runs,
   and the URL still wins when both are present.

   Read through this everywhere rather than touching location.search directly,
   or the engine half-configures itself under a host.
   ==========================================================================*/
const AP_PARAMS = (() => {
  const query = new URLSearchParams(location.search);
  const host = (typeof window !== "undefined" && window.AP_PARAMS) || null;
  return {
    get: (key) => query.get(key) ?? (host && key in host ? host[key] : null),
    has: (key) => query.has(key) || !!(host && key in host),
  };
})();

/* ----------------------------------------------------------------------------
   Is this evaluation still the one driving the sheet?

   The inbox evaluates this script again for every bill it opens, and an
   evaluation cannot be taken back: removing the <script> element drops the tag,
   not the listeners and observers it registered. So a superseded engine is
   still running, and its nodes have been unmounted — anything of its own that
   fires late reaches for a document that is no longer there.

   The host stamps a generation before each evaluation. Async entry points that
   can outlive theirs check this and return. Standalone there is no stamp, the
   generation is 0 on both sides, and this is always true.
   -------------------------------------------------------------------------- */
const AP_GEN = (typeof window !== "undefined" && window.__AP_GEN__) || 0;
const apLive = () =>
  ((typeof window !== "undefined" && window.__AP_GEN__) || 0) === AP_GEN;
