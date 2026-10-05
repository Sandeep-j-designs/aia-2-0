# Unified Inbox — prototype

Every document that arrives by email, WhatsApp, upload or shared drive lands in
one inbox, gets classified to one of four posting routes (AP / AR / Banking /
JV), and waits for a human to approve it. That approval step is the product.

This is **real Next.js code**, not a mockup. It is built from
`~/AI Accountant/Prototypes/_template`, which carries production's tokens,
config and `components/ui/` primitives verbatim. Copy the folders below into
`aiaccountant-app`, delete the stubs, and replace the marked seams with fetches.

```bash
npm install
npm run dev          # http://localhost:3000/inbox
```

Ported from the original single-file prototype, which is preserved unchanged in
[`_reference/`](_reference) for side-by-side comparison. Delete it once this is
signed off.

## Screens

| Route         | Screen                                                     | Source                               |
| ------------- | ---------------------------------------------------------- | ------------------------------------ |
| `/inbox`      | List — tabs, filters, search, bulk actions                 | `_reference/js/inbox-list.jsx`       |
| `/inbox/[id]` | Detail shell — orientation strip, disambiguation, two-pane | `_reference/js/inbox-detail.jsx`     |
| ↳ AP          | Bill review with low-confidence verification gate          | `_reference/js/native-ap.jsx`        |
| ↳ AR          | 1,000-row validation grid + per-row drill-in               | `_reference/js/native-ar.jsx`        |
| ↳ Banking     | Statement table + per-transaction drill-in                 | `_reference/js/native-banking.jsx`   |
| ↳ JV          | Journal form with Dr/Cr balance gate                       | `_reference/js/native-jv.jsx`        |
| overlay       | Conversion panel — all 7 edges                             | `_reference/js/conversion-panel.jsx` |

Not ported: `_reference/js/tweaks-panel.jsx` (568 lines of prototype
instrumentation — density toggle, accent picker, confidence-threshold slider).

## Folders to copy

```
components/inbox/          →  aiaccountant-app/components/inbox/
components/top-bar-layout/ →  MERGE — production already has this file
hooks/pages/inbox/         →  aiaccountant-app/hooks/pages/inbox/
config/pages/inbox/        →  aiaccountant-app/config/pages/inbox/
types/pages/inbox/         →  aiaccountant-app/types/pages/inbox/
utils/pages/inbox/         →  aiaccountant-app/utils/pages/inbox/
pages/inbox/               →  aiaccountant-app/pages/inbox/
components/guide/          →  MERGE — production has its own GuideProvider
hooks/pages/guide/         →  aiaccountant-app/hooks/pages/guide/
config/pages/guide/        →  aiaccountant-app/config/pages/guide/
types/pages/guide/         →  aiaccountant-app/types/pages/guide/
```

### The guided walkthrough

`components/guide/` is the Guide button's launcher and the anchored step card.
Production already drives this through Usertour, so the parts that move across
are the **Inbox journey itself** — `config/pages/guide/inbox-tour.ts`, seven
steps — and the `data-guide-id` attributes the steps point at, which are on
elements inside `components/inbox/` and `components/sidebar-layout/`. Keep the
attributes; re-point them at whatever the guide service calls a selector.

`GuideProvider` is mounted in `pages/_app.tsx`, which is a file that gets
deleted at handoff — production mounts its own there already.

The journey **demonstrates** the flow: `components/guide/actions.ts` is a
window-event contract the workspace listens on, and three of the thirteen steps
use it — open the upload panel, send three mock bills through the real upload
and extraction path (`demoUploadDocuments`, the same seam the first-run sample
batch uses), and open the document that arrived. The viewer only presses Next.
Ending the journey — finished or skipped — sends `reset-demo`, which puts the
company back to its seed state through `resetCompany` in the store and returns
to the empty Inbox, so the walkthrough can be watched again.
Delete `actions.ts` and the listener in `workspace.tsx` on transplant:
production's guide service narrates the user's own upload instead.

The journey runs upload → review in thirteen steps, so two of its anchors sit
inside the AP bill sheet: `data-guide-id="inbox-preview"` on `#doc-pane` and
`data-guide-id="inbox-fields"` on `section.form`, in **both**
`public/ap/index.html` (the source of truth) and `public/ap/sheet.html` (the
built artifact the screen actually loads). `scripts/sync-ap-sheet.cjs` will
drop them if it overwrites either file — re-add them, or those two steps fall
back to a centred card with no highlight.

## Files to delete

These are prototype stubs sitting at production's own import paths, so the
feature code above needs **no changes** when they go:

```
pages/_app.tsx  pages/_document.tsx  pages/index.tsx
hooks/withSession.tsx
components/sidebar-layout/
components/common/page-top-bar/
types/components/index.ts   types/permissions.ts   config/permissions.ts
public/images/logo.png      _reference/            shots/
.prettierignore
```

`components/top-bar-layout/index.tsx` is a stub too, but production's real one
is at the same path — keep production's and drop this.

## API routes to wire

19 seams, each marked `// DEV:` in the source.

**Reads**

| Method | Path                                           | Returns              | Used by                                 |
| ------ | ---------------------------------------------- | -------------------- | --------------------------------------- |
| `GET`  | `/api/inbox`                                   | `InboxItem[]`        | `hooks/pages/inbox/use-inbox-list.ts`   |
| `GET`  | `/api/inbox/:id`                               | `InboxItem`          | `hooks/pages/inbox/use-inbox-detail.ts` |
| `GET`  | `/api/inbox?status=needs-review&route=<route>` | `InboxItem[]`        | detail pager cohort                     |
| `GET`  | `/api/app-config`                              | confidence threshold | `config/pages/inbox/index.ts`           |
| `GET`  | `/api/accounting-masters/ledgers?type=`        | ledger list          | `config/pages/inbox/conversions.ts`     |
| `GET`  | `/api/customers`, `/api/vendors`               | party list           | `config/pages/inbox/conversions.ts`     |

**Writes**

| Method   | Path                     | Body                                      | Used by           |
| -------- | ------------------------ | ----------------------------------------- | ----------------- |
| `POST`   | `/api/inbox/:id/approve` | —                                         | detail Approve    |
| `POST`   | `/api/inbox/:id/convert` | `{ source, target, rowIndex?, resolved }` | conversion panel  |
| `POST`   | `/api/inbox/:id/reverse` | —                                         | Undo, reversal    |
| `POST`   | `/api/inbox/:id/retry`   | —                                         | failed-item retry |
| `POST`   | `/api/inbox/:id/cancel`  | —                                         | cancel extraction |
| `PATCH`  | `/api/inbox/:id`         | `{ draft: true, ...fields }`              | Save draft        |
| `DELETE` | `/api/inbox/:id`         | —                                         | delete            |

All writes should invalidate the inbox list on success.

Two further notes for whoever wires this:

- **Ledger and party pickers are `<select>`s here.** A real chart of accounts is
  far too long for that. Production already has
  `components/common/combobox-with-lazy-loading` — use it.
- **A conversion conflict is a `409`.** `use-inbox-detail.ts` has a
  `conflictSim` branch that fakes it so the state is reachable in the prototype.
  Delete that branch and drive the same UI off the real response.

## What to replace, not port

`components/inbox/detail/file-preview.tsx` draws a **facsimile** of the source
document so there is something to review against. Production has the real
viewer — `components/common/pdf-document-viewer-page.tsx` on
`@react-pdf-viewer/*`. Point it at the stored file and delete the facsimile.
Only the two-pane layout that hosts it survives.

Similarly, `expandStatementRows()` in `utils/pages/inbox/index.ts` synthesises
statement lines from a five-row sample. The API returns the real transactions.

**Half of `file-preview.tsx` is currently unreachable.** The two-pane split only
opens for AP, JV and unrouted items in a non-terminal state, so of the six
branches in that component only three can render — the bill PDF, the JV memo and
the fallback. The spreadsheet, bank-statement and two failure previews are dead
code. This is faithful to the original, which had the same gap, and the branches
are kept because they become live the moment the two-pane rule changes. Worth a
decision: either widen two-pane, or delete four branches.

## Open questions

**1. Five token conflicts — needs a decision.** The prototype's status colours
were chosen for WCAG AA contrast and production's are not. This prototype uses
production's, so the warning states currently read louder than designed.

|             | Prototype         | Production         |                                 |
| ----------- | ----------------- | ------------------ | ------------------------------- |
| danger      | `#c11212` — 6.2:1 | `#FD1717` — ~3.9:1 | **fails AA for body text**      |
| success     | `#0f6e41` — 6.3:1 | `#039E00` — ~3.4:1 | **fails AA**                    |
| warning     | `#8a5300` — 6.3:1 | `#CC3600`          | different hue (brown vs orange) |
| brand step  | `#465ed5`         | _(none)_           | no production token             |
| danger wash | `#fdf8f8`         | `#FFF0F0`          | prototype far fainter           |

**2. Two tokens must be added to production before this ships.** The dark bar
needs a muted foreground and a company-badge colour that production has no token
for. They are declared in a clearly marked `PROPOSED TOKENS` block at the end of
`styles/globals.css` as `--surface-foreground-muted` (`#A9ADBE`) and
`--surface-badge` (`#12A594`), and mirrored in `tailwind.config.ts`. Everything
else in both files is production's, verbatim.

**3. The sub-threshold confidence banner is unreachable with this data.**
INB-2042 was built as the low-confidence case but sits at 62%, just above the
60% default. Raise `AI_CONFIDENCE_THRESHOLD` in `config/pages/inbox/index.ts` to
exercise it. The original made this adjustable via the tweaks panel.

**4. States not yet designed:** inbox empty state (first-run), permission-denied,
and the AR grid at true scale — it renders 24 of 1,000 rows. Production's
`components/common/tanstack-data-table` has the virtualisation for the real thing.

## Checks

```bash
npm run build          # clean
npm run format:check   # clean
```

No raw hex or arbitrary colour outside `components/ui/` (production's own
`badge.tsx`, `sonner.tsx` and `chart.tsx` carry four, and are copied verbatim).

Screenshots of every state are in [`shots/`](shots).

## Journal review in the inbox

The current `/inbox` workspace uses `components/inbox/journal`, the port of
`Prototypes/Journals`, for both journal review and the read-only approved record.
It keeps the inbox source preview, route selector, delete action and
**Approve & Next** queue navigation. The preview/form divider is resizable.

Edits persist through the inbox store, update the queue's debit total, and retain
voucher type, narration and allocations when switching away from Journal and
back. Approval checks required voucher fields, ledger lines and debit/credit
balance; optional reference fields and party information do not block a journal.
Manual review always offers at least two ledger rows. Approval freezes the full
form in the posted snapshot and emits the existing Journal Voucher Created event.

Validation: `node tests/inbox-v2.test.cjs` and `npx tsc --noEmit`.
These remain local prototype flows; no accounting backend is called.

## AR predictions

The inbox AR sheet uses AP's prediction workflow with customer and sales context:
HSN/SAC and coding-history matches, new-master proposals, review/creation,
HSN inference and consent, and remembered customer/ledger corrections. Sales
lines default to Sales Accounts; customers default to Sundry Debtors. GST uses
output ledgers, and AR retains its TDS-receivable / TCS-payable behavior.
RCM is not available in AR and does not affect totals or voucher entries.

`public/ar/index.html` is the executable source; `node scripts/build-ar-sheet.cjs`
regenerates the embedded assets. `scripts/ar-integration/prediction-patches.json`
retains these changes when `scripts/sync-ar-sheet.cjs` imports the upstream AR
prototype. Sync fails if an upstream change invalidates a patch anchor.

Browser regression checks: `node tests/ar-predictions.test.cjs` with Playwright
installed. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation;
`CHROME_PATH` optionally selects an installed Chrome executable.
