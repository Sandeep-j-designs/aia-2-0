/*
  Re-transplants the sales invoice sheet from the AR prototype into this one.

      node scripts/sync-ar-sheet.cjs && node scripts/build-ar-sheet.cjs

  `~/AI Accountant/Prototypes/Accounts Receivable/index.html` is the source of
  truth for the sheet's UI. It gets worked on there, and the inbox needs those
  changes without losing the handful of patches that make the sheet embeddable.

  This is the AP sync with AR's names. The two sheets are siblings — the same
  topbar, the same toast stack, the same draft cache, the same boot() at the
  end of one <script> — so the same set of patches lands on both, and keeping
  the two scripts the same shape is what makes a fix to one obviously
  transferable to the other.

  What this applies, from scripts/ar-integration/:

    params.js   AR_PARAMS — the sheet reads its config from the query string,
                and inside the inbox there is no query string to read
    tail.js     EMBED MODE and the PRD v2 bridge — the postMessage protocol

  and, from scripts/sheet-integration/ — shared with the AP sync, because the
  toast is the inbox's component rather than either sheet's:

    toast.css   the Figma Tost component, replacing the sheet's own toast
    toast.js    the toast factories that build that component's shape

  plus three small in-place edits documented at their call sites below. There
  is no viewer patch: this sheet has no document pane, so it has nothing that
  re-fits itself on resize and nothing that can outlive its own DOM that way.

  Every patch asserts its anchor and throws if the sheet has moved out from
  under it. A loud failure here is the point: it means a patch needs rewriting
  against the new upstream, which is exactly the thing that must not pass
  silently.
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const UPSTREAM = path.resolve(ROOT, "../Accounts Receivable/index.html");
const OUT = path.join(ROOT, "public/ar/index.html");
const PATCHES = path.join(__dirname, "ar-integration");
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

/* 1. AR_PARAMS, ahead of the first thing that reads a param. */
const strict = '<script>\n"use strict";\n';
out = replaceOne(
  out,
  strict,
  strict + patch("params.js"),
  "use strict prologue"
);

/* 2. Route every param read through it. The sheet reads location.search for
      ?dev; under the inbox the URL is /inbox/<id> and has none. */
let routed = 0;
out = out
  .replace(/new URLSearchParams\(location\.search\)\.get\(/g, () => {
    routed++;
    return "AR_PARAMS.get(";
  })
  .replace(/new URLSearchParams\(location\.search\)\.has\(/g, () => {
    routed++;
    return "AR_PARAMS.has(";
  });

/* 3. Two consts the embed block reassigns — a per-item draft key, and the
      sample the inbox seeds its extracted invoice over. Left as const, the
      sheet throws "Assignment to constant variable" on load and renders no
      rows. */
out = replaceOne(
  out,
  "const DRAFT_KEY = 'aia.ar.draft.v2';",
  `/* let, not const: under the inbox a draft belongs to the invoice it was opened
   from, so the embed block re-points this at a per-item key. */
let DRAFT_KEY = 'aia.ar.draft.v2';`,
  "DRAFT_KEY declaration"
);
out = replaceOne(
  out,
  "const SAMPLE = {",
  `/* let, not const: the inbox seeds the invoice it extracted over this sample by
   replacing the whole object, so every prediction downstream reads it. */
let SAMPLE = {`,
  "SAMPLE declaration"
);

/* 4. The inbox owns drafts for its items and re-seeds on open, so the sheet
      must not restore one of its own over the top. */
out = replaceOne(
  out,
  "function loadDraft(){\n",
  `function loadDraft(){
  if(AR_PARAMS.get('inboxv2')==='1')return false;\n`,
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

/* 7. The integration itself, immediately before boot(). */
const boot = "\nboot();";
{
  const at = out.lastIndexOf(boot);
  if (at === -1) throw new Error("sync: anchor missing — boot() call");
  out = out.slice(0, at) + "\n\n" + patch("tail.js") + out.slice(at);
}

/* Keep AR prediction parity and the removal of RCM across upstream syncs.
   Anchors fail explicitly if the upstream sheet changes. */
for (const [index, change] of JSON.parse(
  patch("prediction-patches.json")
).entries()) {
  out = replaceOne(
    out,
    change.find,
    change.replace,
    `AR prediction patch ${index + 1}`
  );
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(
  `synced from ${path.basename(path.dirname(UPSTREAM))}/index.html\n` +
    `  upstream ${before} chars -> ${out.length} chars\n` +
    `  param reads routed: ${routed}\n` +
    `  now run: node scripts/build-ar-sheet.cjs`
);
