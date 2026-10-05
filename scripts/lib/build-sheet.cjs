/*
  Splits a single-file review sheet — public/<slug>/index.html — into three
  assets the inbox can load into its OWN document:

    public/<slug>/sheet.css    every selector scoped under .<slug>-sheet
    public/<slug>/sheet.html   the <body> markup, scripts and <style> stripped
    public/<slug>/sheet.js     the engine, verbatim

  Why, rather than an <iframe>: the sheets' <dialog>s. A dialog opened with
  showModal() renders in the top layer of ITS OWN document, so inside an iframe
  it centres on the iframe's box and is clipped by it — "Create Vendor" came out
  cut off and unable to overlay the inbox's header and footer. In the inbox's
  document the same dialog centres on the viewport and overlays everything.

  index.html stays the source of truth and still opens standalone. Re-run the
  caller after any change to it.

  The only transform applied is CSS scoping. These sheets' CSS was written to
  own a whole page — `:root` defines --radius and --font, `body` sets the
  ground, and there are bare `table`/`h3`/`button` rules. Dropped into the
  inbox's document as-is it would fight the app's shadcn tokens. Scoping every
  selector under the wrapper class means the sheet's values win inside the sheet
  and the app's win everywhere else, with custom properties inheriting down as
  before.

  Shared by scripts/build-ap-sheet.cjs and scripts/build-ar-sheet.cjs. The two
  sheets are siblings and the split is the same split; a scoping bug fixed for
  one was never going to be worth finding twice.
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

/* At-rules whose body holds declarations or frame selectors, not page
   selectors. Their contents must be copied through untouched — scoping the
   `to{}` in a @keyframes would silently kill the animation. */
const VERBATIM_AT = /^@(keyframes|font-face|property|counter-style|page)/i;
/* At-rules that wrap ordinary rules, so we keep the wrapper and scope inside. */
const NESTED_AT = /^@(media|supports|container|layer|scope)/i;

/** Split a selector list on top-level commas — `:is(a,b)` must stay intact. */
const splitSelectors = (list) => {
  const out = [];
  let depth = 0,
    current = "";
  for (const ch of list) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
    } else current += ch;
  }
  if (current.trim()) out.push(current);
  return out;
};

const scoperFor = (SCOPE) => {
  const scopeOne = (selector) => {
    const s = selector.trim();
    if (!s) return s;
    // The page-level selectors collapse onto the wrapper itself: it IS the
    // sheet's root and its body. This is also what keeps :root's custom
    // properties working — they land on the wrapper and inherit to everything
    // inside.
    if (s === ":root" || s === "html" || s === "body") return SCOPE;
    if (s.startsWith(":root") || s.startsWith("html") || s.startsWith("body"))
      return SCOPE + s.replace(/^(:root|html|body)/, "");
    // A bare universal keeps its pseudo-element: * ::before would be wrong.
    if (s.startsWith("*")) return `${SCOPE} *${s.slice(1)}`;
    return `${SCOPE} ${s}`;
  };

  const scopeSelectorList = (list) =>
    splitSelectors(list).map(scopeOne).join(", ");

  /** Walk the CSS by brace depth so at-rules can be treated by kind. */
  const scopeCss = (css) => {
    let out = "";
    let i = 0;
    while (i < css.length) {
      // Copy through comments so the sheet's reasoning survives the transform.
      if (css.startsWith("/*", i)) {
        const end = css.indexOf("*/", i + 2);
        const stop = end === -1 ? css.length : end + 2;
        out += css.slice(i, stop);
        i = stop;
        continue;
      }
      const brace = css.indexOf("{", i);
      if (brace === -1) {
        out += css.slice(i);
        break;
      }
      const prelude = css.slice(i, brace);
      /*
        A prelude is not just a selector: between two rules it also carries the
        whitespace and the comments that belong to the next rule. Those have to
        be emitted verbatim and kept out of the scoping, for two reasons — a
        comment ahead of the selector would otherwise push the wrapper prefix in
        front of the comment instead of the selector, and a comment containing a
        comma ("quiet until you approach it, but the grip…") would be split as
        if it were a selector list and get a prefix spliced into its prose.
      */
      const lead = /^(\s*(?:\/\*[\s\S]*?\*\/\s*)*)/.exec(prelude)[1];
      const selector = prelude
        .slice(lead.length)
        .replace(/\/\*[\s\S]*?\*\//g, "");
      // Find the matching close brace, tracking nesting and skipping comments.
      let depth = 0,
        j = brace;
      for (; j < css.length; j++) {
        if (css.startsWith("/*", j)) {
          const end = css.indexOf("*/", j + 2);
          j = end === -1 ? css.length : end + 1;
          continue;
        }
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      const body = css.slice(brace + 1, j);
      const trimmed = selector.trim();

      out += lead;
      if (trimmed.startsWith("@")) {
        if (NESTED_AT.test(trimmed)) out += `${selector}{${scopeCss(body)}}`;
        // @keyframes / @font-face and anything unrecognised: body copied as-is.
        else out += `${selector}{${body}}`;
      } else {
        out += `${scopeSelectorList(selector)}{${body}}`;
      }
      i = j + 1;
    }
    return out;
  };

  return scopeCss;
};

/**
 * @param {object} o
 * @param {string} o.slug        "ap" | "ar" — the public/ directory and the
 *                               wrapper class stem (.ap-sheet, .ar-sheet).
 * @param {string} o.builder     the build script's own path, named in the
 *                               generated banners so a reader of the output
 *                               knows what to re-run.
 * @param {string} o.versionFile where to write the content hash, relative to
 *                               the repo root.
 * @param {string} o.versionConst the exported name inside that file.
 */
const buildSheet = ({ slug, builder, versionFile, versionConst }) => {
  const SRC = path.join(ROOT, `public/${slug}/index.html`);
  const SCOPE = `.${slug}-sheet`;
  const scopeCss = scoperFor(SCOPE);

  const html = fs.readFileSync(SRC, "utf8");

  const pick = (open, close) => {
    const a = html.indexOf(open);
    const b = html.indexOf(close, a);
    if (a === -1 || b === -1) throw new Error(`missing ${open}`);
    return { inner: html.slice(a + open.length, b), start: a, end: b };
  };

  const style = pick("<style>", "</style>");
  const script = pick("<script>", "</script>");
  const bodyOpen = html.indexOf("<body>");
  const bodyClose = html.lastIndexOf("</body>");

  // Markup is the body minus the two blocks we lift out separately.
  let markup = html.slice(bodyOpen + "<body>".length, bodyClose);
  markup = markup
    .replace(html.slice(style.start, style.end + "</style>".length), "")
    .replace(html.slice(script.start, script.end + "</script>".length), "")
    .trim();

  const banner = (what) =>
    `/* GENERATED from public/${slug}/index.html by ${builder} — ${what}.\n   Edit index.html and re-run; changes here are overwritten. */\n`;

  const css = scopeCss(style.inner);

  fs.writeFileSync(
    path.join(ROOT, `public/${slug}/sheet.css`),
    banner(`every selector scoped under ${SCOPE}`) + css
  );
  /*
    The engine declares at top level — `const STATES`, `const MASTERS`, and
    hundreds more. Standalone that is a whole document's scope and fine; in the
    inbox the script is appended again each time a different document is opened,
    and a second evaluation in the same global scope throws "Identifier has
    already been declared" before a line of it runs. Wrapping each evaluation in
    its own function scope is what makes opening a second document possible at
    all — and it is also what lets the AP and AR engines share one page without
    either one's top-level names reaching the other.
  */
  fs.writeFileSync(
    path.join(ROOT, `public/${slug}/sheet.js`),
    banner("the sheet engine, wrapped in one function scope per evaluation") +
      "(function(){\n" +
      script.inner +
      "\n})();\n"
  );
  fs.writeFileSync(
    path.join(ROOT, `public/${slug}/sheet.html`),
    `<!-- GENERATED from public/${slug}/index.html by ${builder}.\n     Edit index.html and re-run; changes here are overwritten. -->\n` +
      markup
  );

  /*
    A content hash for the three assets, written where the component can import
    it. The script URL used to be keyed on the item id alone, so re-opening a
    document re-requested a URL the browser already had and was served the
    previous build from cache — a fix could be in the file on disk and still not
    be the one running, which is a genuinely confusing way to lose an afternoon.
    Keying on content means a rebuild always changes the URL and a stale asset
    cannot survive a reload.
  */
  const version = require("crypto")
    .createHash("sha256")
    .update(css + script.inner + markup)
    .digest("hex")
    .slice(0, 12);
  fs.writeFileSync(
    path.join(ROOT, versionFile),
    `// GENERATED by ${builder} — do not edit.\n` +
      `// Content hash of sheet.css + sheet.js + sheet.html, used to cache-bust them.\n` +
      `export const ${versionConst} = "${version}";\n`
  );

  console.log(
    `sheet.css ${css.length}  sheet.js ${script.inner.length}  sheet.html ${markup.length}  v ${version}`
  );
};

module.exports = { buildSheet };
