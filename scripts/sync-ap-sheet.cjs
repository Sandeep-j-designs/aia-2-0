/*
  Re-transplants the bills review sheet from the AP prototype into this one.

      node scripts/sync-ap-sheet.cjs && node scripts/build-ap-sheet.cjs

  `~/AI Accountant/Prototypes/Accounts Payable/index.html` is the source of
  truth for the sheet's UI. It gets worked on there, and the inbox needs those
  changes without losing the handful of patches that make the sheet embeddable.
  Hand-merging a 14,000-line single-file app twice was already twice too many:
  the first sync silently kept a stale fork and lost the line-item bulk bar.

  What this applies, from scripts/ap-integration/:

    params.js   AP_PARAMS — the sheet reads its config from the query string,
                and inside the inbox there is no query string to read
    tail.js     EMBED MODE and the PRD v2 bridge — the postMessage protocol

  and, from scripts/sheet-integration/ — shared with the AR sync, because the
  toast is the inbox's component rather than either sheet's and the two sheets
  must not drift into two different ones:

    toast.css   the Figma Tost component, replacing the sheet's own toast
    toast.js    the toast factories that build that component's shape

  plus four small in-place edits documented at their call sites below.

  Every patch asserts its anchor and throws if the sheet has moved out from
  under it. A loud failure here is the point: it means a patch needs rewriting
  against the new upstream, which is exactly the thing that must not pass
  silently.
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const UPSTREAM = path.resolve(ROOT, "../Accounts Payable/index.html");
const OUT = path.join(ROOT, "public/ap/index.html");
const PATCHES = path.join(__dirname, "ap-integration");
const SHARED = path.join(__dirname, "sheet-integration");

const patch = (name) => fs.readFileSync(path.join(PATCHES, name), "utf8");
const shared = (name) => fs.readFileSync(path.join(SHARED, name), "utf8");

/** Replace exactly one occurrence, or throw naming what went missing. */
const replaceOne = (src, find, replace, label) => {
  const first = src.indexOf(find);
  if (first === -1) throw new Error(`sync: anchor missing — ${label}`);
  if (src.indexOf(find, first + find.length) !== -1)
    throw new Error(`sync: anchor is ambiguous — ${label}`);
  return src.slice(0, first) + replace + src.slice(first + find.length);
};

if (!fs.existsSync(UPSTREAM))
  throw new Error(`sync: upstream not found at ${UPSTREAM}`);

let out = fs.readFileSync(UPSTREAM, "utf8");
const before = out.length;

/* 1. AP_PARAMS, ahead of the first thing that reads a param. */
const strict = '<script>\n"use strict";\n';
out = replaceOne(
  out,
  strict,
  strict + patch("params.js"),
  "use strict prologue"
);

/* 2. Route every param read through it. The sheet reads location.search in
      several places; under the inbox the URL is /inbox/<id> and has none. */
let routed = 0;
out = out
  .replace(/new URLSearchParams\(location\.search\)\.get\(/g, () => {
    routed++;
    return "AP_PARAMS.get(";
  })
  .replace(/new URLSearchParams\(location\.search\)\.has\(/g, () => {
    routed++;
    return "AP_PARAMS.has(";
  });

/* 3. Two consts the embed block reassigns — a per-item draft key, and the
      sample the inbox seeds its extracted bill over. Left as const, the sheet
      throws "Assignment to constant variable" on load and renders no rows. */
out = replaceOne(
  out,
  "const DRAFT_KEY = 'aia.ap.draft.v1';",
  `/* let, not const: under the inbox a draft belongs to the bill it was opened
   from, so the embed block re-points this at a per-item key. */
let DRAFT_KEY = 'aia.ap.draft.v1';`,
  "DRAFT_KEY declaration"
);
out = replaceOne(
  out,
  "const SAMPLE = {",
  `/* let, not const: the inbox seeds the bill it extracted over this sample by
   replacing the whole object, so every prediction downstream reads it. */
let SAMPLE = {`,
  "SAMPLE declaration"
);

/* 3b. Stop the viewer's async triggers once their evaluation is superseded.

       These are the only things that reach the viewer after its own DOM has
       gone: a window resize and a ResizeObserver on the pane, both of which
       re-run a fit. The inbox replaces the whole sheet when the bill or route
       changes, so a fit firing across that swap ran applyZoom against nodes
       that no longer existed — the TypeError behind Next's error overlay while
       paging through bills.

       Gated here rather than made null-safe inside applyZoom/fitScale, because
       the work is pointless as well as unsafe: a superseded viewer has nothing
       left to lay out. applyZoom keeps its own guards from step 6b as well —
       cheap, and it is the correct shape for that function regardless. */
out = replaceOne(
  out,
  "addEventListener('resize', ()=>{ if(viewer.mode!=='level') applyZoom(); });",
  "addEventListener('resize', ()=>{ if(!apLive()) return; if(viewer.mode!=='level') applyZoom(); });",
  "viewer resize listener"
);
out = replaceOne(
  out,
  "new ResizeObserver(()=>{ if(viewer.mode!=='level') applyZoom(); }).observe($('#doc-pane'));",
  `new ResizeObserver(function(){ if(!apLive()){ this.disconnect?.(); return; }
  if(viewer.mode!=='level') applyZoom(); }).observe($('#doc-pane'));`,
  "viewer ResizeObserver"
);

/* 4. The inbox owns drafts for its items and re-seeds on open, so the sheet
      must not restore one of its own over the top. */
out = replaceOne(
  out,
  "function loadDraft(){\n",
  `function loadDraft(){
  if(AP_PARAMS.get('inboxv2')==='1')return false;\n`,
  "loadDraft body"
);

/* 5. The toast, restyled to the Figma component. Anchored on the sheet's own
      toast rules; if upstream restyles them, this patch needs revisiting. */
const toastCssStart = ".toast{display:flex;align-items:center;gap:10px;";
const toastCssEnd = "border-radius:3px}\n";
{
  const a = out.indexOf(toastCssStart);
  if (a === -1) throw new Error("sync: anchor missing — toast CSS block");
  const b = out.indexOf(toastCssEnd, a);
  if (b === -1) throw new Error("sync: anchor missing — toast CSS end");
  out =
    out.slice(0, a) + shared("toast.css") + out.slice(b + toastCssEnd.length);
}

/* 6. The toast factories, rebuilt to emit that component's shape. */
{
  const a = out.indexOf("function toast(msg,kind=''){");
  if (a === -1) throw new Error("sync: anchor missing — toast() factory");
  const marker =
    "\n\n/* ============================================================================\n   2a. OPTIONAL FIELD GROUPS";
  const b = out.indexOf(marker, a);
  if (b === -1) throw new Error("sync: anchor missing — end of toastAction()");
  out = out.slice(0, a) + shared("toast.js").trimEnd() + out.slice(b);
}

/* 6b. Make the viewer's zoom controls null-safe.

   applyZoom guards the page it scales but not the three controls it labels, so
   once the sheet's chrome is gone it throws on textContent of null. Standalone
   nothing removes that chrome, but the inbox replaces the whole sheet whenever
   the bill or its route changes, and a fit-mode ResizeObserver firing across
   that swap threw an uncaught TypeError on every route switch.

   DEV: this belongs upstream — it is a real bug there too, and a viewer should
   not throw when its own controls are absent. Fix it in
   Prototypes/Accounts Payable/index.html and delete this step. */
out = replaceOne(
  out,
  `  $('#zoom-value').textContent = Math.round(viewer.scale*100) + '%';
  $('#zoom-out').disabled = viewer.scale <= ZOOM_MIN + 1e-4;
  $('#zoom-in').disabled  = viewer.scale >= ZOOM_MAX - 1e-4;`,
  `  const lvl = $('#zoom-value'), out_ = $('#zoom-out'), in_ = $('#zoom-in');
  if(lvl) lvl.textContent = Math.round(viewer.scale*100) + '%';
  if(out_) out_.disabled = viewer.scale <= ZOOM_MIN + 1e-4;
  if(in_)  in_.disabled  = viewer.scale >= ZOOM_MAX - 1e-4;`,
  "applyZoom control writes"
);

/* 7. The integration itself, immediately before boot(). */
const boot = "\nboot();";
{
  const at = out.lastIndexOf(boot);
  if (at === -1) throw new Error("sync: anchor missing — boot() call");
  out = out.slice(0, at) + "\n\n" + patch("tail.js") + out.slice(at);
}

fs.writeFileSync(OUT, out);
console.log(
  `synced from ${path.basename(path.dirname(UPSTREAM))}/index.html\n` +
    `  upstream ${before} chars -> ${out.length} chars\n` +
    `  param reads routed: ${routed}\n` +
    `  now run: node scripts/build-ap-sheet.cjs`
);
