# AI Accountant — Unified Inbox prototype

Next.js 14 (Pages Router) prototype of the AI Accountant document inbox plus module screens. All state is mocked in the browser. Local git only (baseline `22f8270`, 3 Oct 2026, taken before the UX/UI overhaul). Run with `npx next dev -p 3002`; `/` redirects to `/inbox`.

See `README.md` (folder-copy contract to `aiaccountant-app`) and `PRD-V2-IMPLEMENTATION.md` (what v2 implements). `AGENTS.prod.md` is the production repo's agent guide; its patterns apply here.

## Architecture

- **Everything renders from `components/inbox/v2/workspace.tsx`** (~6.7k lines). Both `pages/inbox/index.tsx` and `pages/inbox/[id].tsx` re-export it. Document links use `/inbox?id=…`.
- **View chain** (workspace, in order): no permissions → item unavailable → document detail (`?id`) → `?module=GST|COA|INV|BANK` → `?module=AR&upload=…` (sales upload) → `?module=AP` (`bill-register.tsx`) → `?module=AR|JV` (`register.tsx`) → default Inbox list.
- **Shell:** `components/sidebar-layout/index.tsx` (prototype stub; `components/ui/sidebar.tsx` is unused) and `components/top-bar-layout/`. Document detail is full-screen: no sidebar, no top bar.
- **Store:** `components/inbox/v2/store.ts`, a `useSyncExternalStore` store. Routes are `AP | AR | JV`. Statuses: Received, Extracting, Needs Review, Approved, Failed, Duplicate, Deleted. It writes localStorage `aia.inbox.prd.v2` but reseeds on every load. Uploaded files live in IndexedDB `aia-inbox-files`.
- **Modules:** banking, gst, chart-of-accounts, inventory, sales-upload and bill-splitter live under `components/inbox/v2/<module>/`, with their own hooks in `hooks/pages/inbox/use-*.ts` and mocks in `config/pages/inbox/mock-*.ts`. They are not store routes.
- **AP/AR entry sheets are vanilla-JS engines, not React and not iframes.**
  - `public/{ap,ar}/index.html` is split by `scripts/build-{ap,ar}-sheet.cjs` into `sheet.{html,css,js}`. The CSS is scoped under `.ap-sheet` / `.ar-sheet`.
  - The engines are injected by `ap-sheet.tsx` / `ar-sheet.tsx` and talk to the inbox via `window.postMessage`. The contract is `aia-inbox*` ↔ `aia-ap*`/`aia-ar*`; see `sheet.tsx` and `invoice-sheet.tsx`.
  - They own their tokens (`--brand`, `--radius`…), dialogs, toasts and SVGs.
  - `scripts/sync-ap-sheet.cjs` re-pulls the AP sheet from an upstream prototype, so hand edits to `public/ap/*` can be overwritten.
- **Legacy code removed (overhaul phase 6, Oct 2026):** the pre-v2 list and detail (`components/inbox/{index,detail,ar,conversion,table}`), unused `common/*` components, the hooks `use-inbox-list`, `use-inbox-detail` and `use-bill-review`, `components/ui/sidebar.tsx` and `config/pages/inbox/columns.tsx`. All of it is recoverable from git. From the old tree, v2 still uses only `components/inbox/journal/` (the JV form) and `components/inbox/common/file-icon`.
- **Tests:** `tests/ar-predictions` and `tests/inbox-v2` already failed at baseline `22f8270`. `button`, `badge` and `inbox-table-sizing` pass.

## Table interactions: do not change behaviour

The overhaul keeps every table interaction intact. Reskin the markup only.
- `hooks/pages/inbox/use-grid-keyboard.ts`
- `hooks/pages/inbox/use-column-resize.ts`
- `components/inbox/v2/table-sizing.ts` and `TABLE-RESIZING.md`
- the `EditableCell` contract
- the inline grid logic in `workspace.tsx`: column prefs, pin/order, resize, sort, `role="grid"` wiring
- engine-owned tables inside the AP/AR sheets

**DOM contract to keep:**
- `id={gridCellId(r,c)}`, `data-grid-row` and `data-grid-col` on navigable cells
- `data-filter-trigger` on header funnels
- `role="grid"` on the scroller and `role="none"` on `<Table>`
- the resize `role="separator"` span and its handlers
- `table-fixed` with an explicit width
- opaque sticky bookend cells
- copy reads `innerText`

Column `min` widths assume the current header padding, label font and 20px icon buttons. Changing any of these means updating `table-sizing.ts` minimums.

## Design system: Precision Indigo (current, branch `precision-indigo`)

On 3 Oct 2026 the user rejected the first overhaul ("Ledger desk", kept on branch `ledger-desk`). They asked to start over from the original prototype (`22f8270`) and apply the design system of `~/Downloads/ai-accountant-redesign-main`. That system is its `src/index.css` tokens plus the `src/workbench.css` overrides. They also asked for the table to adopt that design system while keeping the same interactions.

The reference app runs with `npx vite --port 5176`. `?screen=coa|inventory|cockpit` deep-links into its screens.

**User decisions:**
- The reference shell is adopted: navy workbench rail and a white 56px top bar.
- The in-house icon set is kept, at a 1.75 stroke.
- Dark mode is kept.

**Tokens** (`styles/globals.css`):
- Production's shadcn names are kept and re-pointed at Precision Indigo values. Alpha hairlines are flattened to opaque equivalents, because these tokens are read through `hsl()`.
- Raw design-system values are available as `--pi-*` and as Tailwind `pi-*` colours: `bg-pi-page`, `text-pi-ink`, `text-pi-body`, `text-pi-faint`, `border-pi-line`, `border-pi-line-2`, `bg-pi-head-bg`, `bg-pi-row-hover`, `bg-pi-brand-tint`, and the semantic `pi-success|warning|danger(-dot|-bg)`. These take no opacity modifiers.
- Radius scale: `rounded-xs` 4 (chips), `sm` 6 (inputs and buttons), `md` 8 (menus), `lg` 12 (cards and tables), `xl` 16 (modals).
- Elevation: `shadow-contact`, `shadow-pi-1`, `shadow-pi-2`, `shadow-table`.
- **Fonts (4 Oct 2026):** Open Sans, the variable `public/fonts/open-sans-latin.woff2` (300–800), is the one UI family for text, headings and the `.fig`/`.type-kpi` figures (tabular numerals). IBM Plex Mono is kept for `.code` IDs. Both are loaded with `next/font/local` in `pages/_app.tsx`. IBM Plex Sans and Space Grotesk are no longer loaded, and the engine sheets follow through `--font` in `sheet-bridge.css`.
- **Type scale:** nine rungs, defined as `--type-*` in `globals.css` under "Typography":
  - 11/16 overline: uppercase labels only.
  - 12/16 caption.
  - 13/20 small: labels and table cells.
  - 14/20 body.
  - 16/24 lead / h4.
  - 18/28 h3.
  - 22/28 h2.
  - 28/36 h1 / KPI.
  - 36/44 display.

  Weights are 400 text, 500 labels, 600 headings and totals, and 700 for display only. Tracking is 0 at 16px and below and no tighter than −0.02em above that (Open Sans needs less than Plex did). The legacy Tailwind sizes (`text-xs/sm/base/lg`, `text-body-*`, `text-h*`) are re-pointed onto these rungs. Roles: `.type-*`, `.workspace-eyebrow`, `.page-title` (the h1).
- **Spacing:** an 8-point grid with 4 for fine-tuning (4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48; 2 only for hairline nudges). Inside is always tighter than outside: control padding < field gap (`--gap-field` 16) < card padding (`--pad-card` 16/20) < gap between cards (16) < section (24/32) < page inset (`--inset-page` 24/40). Tailwind half-steps (1.5 / 2.5 / 3.5) are not used.
- **Radius by nesting, outermost largest:** xs 4 (chips, badges, checkboxes, logo tiles in controls), sm 6 (inputs, buttons, icon buttons, the top-bar search and switcher), md 8 (menus, popovers, tab tracks, icon tiles, inner panels), lg 12 (cards, tables, page sections), xl 16 (dialogs, sheets), full (pills, avatars, dots, switches); 2 only for progress bars. The tokens are `--radius-xs`…`--radius-xl`.
- **Applied 4 Oct 2026** by a codemod over every `.tsx` and `.css` file outside `public/`, snapping font sizes, spacing and radii to the scales. The excluded files draw the source document as paper, where small print is content rather than UI: `detail/file-preview.tsx`, `v2/preview.tsx`, `preview.module.css`, `document-loader.module.css` and `upload-animation.module.css`. The engine sheets got the font-size mapping only, inside their `<style>` blocks, because their spacing drives engine geometry. The pre-change tree is backed up in the session scratchpad (`backup-pre-typography`).

**Components:**
- Buttons:
  - Primary is the "lit edge": `bg-pi-btn-fill` plus a `border-pi-btn-primary-edge`.
  - outline and secondary are neutral (surface, `line-2` border, contact shadow).
  - ghost uses the body ink.
- Statuses are dot-chips (`StatusPill` in `v2/ui.tsx`). Meaning lives in a 7px dot, and the label stays body ink.
- Tooltips are ink on page.
- Dialogs are `rounded-xl`.

**Shell:** `components/sidebar-layout` (the workbench navy rail with groups, a guide rail and a company card) and `components/top-bar-layout` (breadcrumb `NAV_TRAIL`, the search pill and ⌘K that focus the page search via "/", org chip, sync chip, notifications, and preferences with theme). The review detail renders inside the shell; the breadcrumb names the file.

**Page pattern:** a `.workspace-eyebrow` above a 30px/500 title, underline tabs (14px, a 2px brand underline, `CountPill` chips), toolbar, then the content in white cards on the `pi-page` canvas with an `--inset-page` gutter.

**Table pattern** (behaviour unchanged):
- One white card (`rounded-lg border-pi-line shadow-table`) is the two-axis scrollport, with the pager inside it.
- Head strip `bg-pi-head-bg`, header text 12px/500 `text-pi-body`.
- Rows `h-14` (56px) with `px-4` cells. Hairline row dividers only; no vertical rules.
- `group-hover:bg-pi-row-hover`. A selected row gets `bg-pi-brand-tint` plus an inset 2px brand edge on the first cell.
- `table-sizing.ts` minimums include the 16px header padding.

**All three entry forms use the Finops review form (4 Oct 2026).** These are bills (AP), sales invoices (AR) and journals (JV). The user asked for "all the forms in the prototype" after the AP version below. Master forms (ledger, item, vendor dialogs) were left alone, because they have no voucher or line table for the pattern to fit.
- **AR:** the AR engine (`public/ar/index.html`) carries the same LINES block, mode guard, add-button, approve-failure and cost-centre patches as AP. They are ported with AR's field names (`invoiceHsn`/`invoiceRate`/`invoiceUnit`, `salesLedger`).
- **Layout:** `composeBillForm(doc, card, kind)` handles both engines. The rows for AR are Customer PO no., Customer and Sales ledger, and Invoice date sits in the Voucher details sheet.
- **Review layer:** `BillReview` takes `kind`. `review-assistant.tsx` is now only the hook that mounts it; the old `ReviewAssistant` overview is deleted.
- **JV (React):**
  - `journal/index.tsx` composes the header, resolved count, Needs you, totals card (debit · credit · difference) and an Expand sheet.
  - `journal/voucher-details.tsx` holds the label rows plus the Voucher details sheet (reference date, cost centre class, narration).
  - `journal/ledger-lines.tsx` has the Finops items head and a grid bar.
  - `journal/sheet.tsx` is a **Radix** dialog carrying `jv-form cr-sheet`. A native modal dialog makes the Radix portals (Select, ComboBox, date Popover) inert.
  - The imbalance banner, the separate narration block and `voucher-totals.tsx` are gone.
- **Styles:** `styles/bill-form.css` is scoped `html :is(.ap-sheet, .ar-sheet, .jv-form)`.
- **Engine menus in sheets:** in both engines, `sheetPortal()` returns a fixed, zero-size layer inside the open `dialog.cr-sheet`. The engine's menus and the why-tip would otherwise render on the inert `<body>`.

**Review form refinements (4 Oct 2026, from user feedback: "icons too confusing and overused", "symmetry missing", "AI colour random").**
- **Status dots:** a voucher card row carries one mark in a fixed 7px trailing column: an amber dot when open, a red dot when wrong, nothing when done. The green checks and alert icons are gone.
- **Card footer:** sheets open from a two-up footer on the card ("Dates, branch & cost centres" | "Supplier/Customer GST & address", each with a pending count). The journal footer has one link. There are no per-row chevrons.
- **Hover-only controls:** carets (including a select's background caret), calendars, pencils, the table's line arrow, JV's ledger caret, bin and allocation pill all show only on row hover or focus.
- **AI suggestions are teal**, the palette's secondary accent: a `--pi-teal-tint` chip with `--pi-teal-strong` text, where `--pi-teal-strong` is a labelled extension in `globals.css`, light `#0c6e64` and dark `#2bc0b0`. The value stays ink. `--pi-ai-ink` is no longer used by the forms.
- **Header:** one line, "Bill total · Read from the source".
- **`FormJourney` stepper:** it now follows scrolling (scroll-spy on the nearest scroll container; the last step at the end). It used to change only on click.
- **Posted-record page:** the column takes `lg:pl-1` only when a document preview sits beside it. A record with no document (`item.created`) gets the full `p-6` gutter.

**Bill form (AP): the Finops review form, 4 Oct 2026.** The user asked for the review UI of the Finops prototype (`~/Documents/folio-workspace`, `components/coding-review.tsx`) on this sheet, replacing an interim "voucher sheet" pass. The Item Mode / Accounting Mode switch stays gone.
- **Header** (`bill-review.tsx`, mounted into `.cr-head`): "Read from the source…", the bill total, "Draft · not in books", "N of M resolved" with a green bar, and "N to review ›" (opens Needs you) or "Ready to approve". The total comes from the engine's `totals` postMessage.
- **Voucher details card** (`composeBillForm` in `review-layout.ts`): rows for voucher type, voucher date, voucher no., supplier invoice no., party A/c name and purchase ledger. Purchase ledger shows only while a stock item exists.
  - Each row is label | the engine's own field | a status mark (`data-tone` ok/warn/err, set by BillReview) | a › with a pending count that opens a sheet.
- **Sheets** are native `<dialog class="cr-sheet">` built from the engine's own nodes:
  - **Voucher details:** bill and due date, branch, cost centres, narration, additional details, configure fields.
  - **Party details:** GST treatment, GSTIN, supply states, billing address, vendor cost centre.
  - **Tax & deductions:** the engine's `#breakdown`.
  - **Needs you:** rendered by BillReview.
  - **Invoice items:** the Expand dialog. BillReview moves `.cr-grid-wrap` into it and back on close.
- **Items:** one `<table class="cr-table">`, rendered by the engine's LINES block into `#items-table`; `#ledgers-table` stays empty.
  - **Columns (4 Oct 2026, user asked for separate Item, Ledger and Cost centre columns):** `#` (the checkbox shows on hover or when ticked), Description, Item, Qty, Rate, Ledger, Cost centre, Amount, and ⋯.
    - The table's `min-width` is 1060, so the form card (about 672px at 1440) scrolls sideways.
    - `#` is pinned left; Amount and ⋯ are pinned right. `crEdges()` sets `data-l`/`data-r` on `#items-table`, which draws shadows on the pinned edges. The scrollbar stays drawn.
    - The Expand dialog is `min(1160px, …)` wide and fits every column.
  - **Item column:** an item line has its own picker (`data-f="item"`). A ledger line gets an empty combo (`data-cr-item`, placeholder "Add item"). Picking a master there runs `moveLedgerToItem` and then `applyItemMaster`, keeping the stated amount.
  - The item datalist ends with `NM_NEW_ITEM` ("+ Create new item…"), which opens the item master form (`openNmDialog(draftItem(row))`). `cselFromCombo` never filters out `__nm-` options.
  - **Description** is a plain `input.cr-in--text` (`data-f="description"`); it no longer opens the line sheet. The sheet opens from ⋯ → "Line details".
  - **HSN/SAC** sits under the Item picker in the same cell (`td.cr-stack`, `.cell.cr-hsn`). It is an editable combo over the `hsn-list` datalist, which `ensureHsnList()` builds from `MASTERS.hsnSac`. A typed code sets `hsnFrom='user'`, and `change` re-renders.
  - **Pickers (`cselDrop`):**
    - The whole `.cell` opens its list: the caret, the padding and select cells all work. Before this, the caret called native `showPicker` and did nothing.
    - `__nm-*` options ("Create new item / ledger / vendor…") render in a fixed `.cselp__foot` under the scrolling list, with a plus icon and brand ink, and are never filtered out by search.
  - **One focus ring per field (`sheet-bridge.css`, end of file):**
    - In the engine sheets, an input, select or textarea inside a wrapper that draws focus (`.control`, `.cell`, `.cselp__find`, `.bulkbar__fld`, `.hsn`, `.split__value`, `.nmd__ctl`) draws no outline or shadow of its own. The engine's square 2px outline was doubling the wrapper ring.
    - The picker's search row has no box at all.
    - A new wrapper class goes into that list.
  - **Field padding:** every bordered field keeps 12px inside its edge. That covers voucher rows, JV rows and table cells; voucher rows sit at a -12px offset so their text stays on the column. Table text starts 16px into each column (4px cell plus 12px field), and headers and the amount cell match. Qty is 72px wide, Rate 104px, and the table's `min-width` is 1092px.
    - **App-wide (`globals.css`, after the `:focus-visible` double ring):** text inputs, textareas and selects never get the double ring. A bordered field shows focus with its border (the Input component's brand edge plus soft halo, or `input:focus`). A bare field in a search row (Columns popover, combo-box, cmdk) is shown by its caret and row. The ring had drawn a square blue box around those bare inputs. Buttons and other controls keep the double ring.
  - **Ledger column:** a ledger line has its ledger select plus the plus button. An item line shows the voucher's purchase or sales ledger as read-only `.cr-book` text.
  - **Footer:** only "Add line" (`#btn-add-ledger`). `#btn-add-item` stays in the DOM, hidden, because the engine binds it by id.
  - **⋯ (`.cr-more`, `data-act="menu"`):** opens the engine's existing `openRowMenu` (Duplicate, convert, Clear, Delete). It shows on hover or focus.
  - Placeholders: "Untitled item" is faint (`.is-untitled`). Qty and rate render empty with a faint "0". An unresolved item or ledger picker is amber; empty cost centre and "Add item" are faint.
  - `.predbtn` / `.fieldplus` are a borderless 16px plus that gets a tint on hover. There are no vertical rules.
  - Ledger lines show "—" for qty and rate; the "Ledger line" meta label is gone.
  - The description opens `#cr-line`, the line sheet, which the engine renders (`renderLineSheet`). It holds coding, type, godown, description, HSN, qty, rate, discount, amount, the consent bar, tax, convert and remove.
  - Rows still carry `.trow` for the engine's handlers, so `bill-form.css` forces `display: table-row`.
  - Sheet rebuilds wait while a pointer is down in the sheet (`sheetHeld`); otherwise a blur-triggered re-render swaps the button out from under the click.
- **Totals card:** taxable value · GST (less TDS) · bill total. It opens Tax & deductions.
- **Checks** (BillReview `collect`): every required field (a `*` label) on the card or in a sheet, Additional details when it is invalid, tax lines when they are invalid, and the lines (present and coded). A failed approve opens Needs you.
- **Hidden:** `#sug-bar` and `#err-banner` (`.bill-hidden`). `.closing` and `.modebar` are removed.
- **AI suggestions:** value text in `--pi-ai-ink`, with "New" or "Suggested" in front. The create "+" is hidden in the table and shown in the line sheet and the Expand dialog.
- **Styles:** `styles/bill-form.css`. The document pane defaults to `--doc-w: 36%`. AR still uses the old path and still has modes.
- **Sync risk:** engine edits would be overwritten by `scripts/sync-ap-sheet.cjs`, whose upstream is absent here. Rebuild with `node scripts/build-ap-sheet.cjs`.

**Review:** the `.source-stage` scope (`globals.css`) puts the document on the workbench navy radial and re-points the tokens inside it. The paper stays white.

## Design system (pre-overhaul state, for reference)


- Tokens are in `styles/globals.css` (Bloocks palette, as hex and HSL) and `tailwind.config.ts` (named type scale: `title-*`, `h1-6`, `label-1..3`, `body-1..4`, `caption-*`).
- Dark mode is not functional.
- Local primitives are in `components/inbox/v2/ui.tsx`: `T` type map, `Pill`, `StatusPill`, `Notice`, `Field`, `FieldCard`, `PageDialog`, `PageButton` and others.
- The CSS modules (`kickstart`, `upload-*`, `preview`, `bill-splitter/split-dialogs`) hardcode hex values and run their own token layers.
- Icons are lucide-react, about 114 distinct, with duplicate aliases.
- Module screens duplicate Tabs, Pager, SearchBox, sync icon, DropZone and form helpers.
