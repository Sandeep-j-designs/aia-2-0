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

## AI features from the Campfire study, Phase 1 (13 Oct 2026, branch `ai-features`)

User asked to bring Campfire-style AI features into AIA, in three phases, with an evidence-based (never percentage) auto-approve threshold, a new Automation sidebar group, and Neo ported unchanged from AIA-Experiment in Phase 2.
- **Automation module** (`?module=AUTO&page=activity|rules[&tab=]`, `components/inbox/v2/automation/`). Pages are listed in `AUTOMATION_PAGES` (automation/index.tsx); the sidebar group and `NAV_TRAIL` entries are in `components/sidebar-layout/index.tsx`; the workspace maps nav ids to pages through `AUTOMATION_PAGES`.
- **Activity log** (`hooks/pages/inbox/use-activity.ts`): one attributed list of what the AI and people did. `logActivity(entry, undo?)` records; an entry with `undoable` and an undo function gets Undo in the log, the document History panel and toasts (`undoActivity`). Rows: `automation/common/activity-row.tsx`. Every AI action carries a "Why" (evidence), every edit a before → after.
- **#1 Earned auto-approve** (`use-auto-approve.ts`, `mock-trust.ts`, `rules/auto-approve.tsx`): per vendor + ledger, N approvals in a row with no edits, amount within a band; approved bills wait in Approved (nothing reaches Tally until sync) and can be undone; an edit pauses trust. Inbox strip and held-bill banner in `workspace.tsx`.
- **#5 History panel** (`automation/common/history-panel.tsx`): History button on every review header.
- **#2 Bank matching** (`use-bank-matches.ts`, `banking/match-panel.tsx`): exact, multi-invoice, part payment and net-of-TDS (194C 2%) matches; Accept drafts Receipt + TDS Receivable journal and moves the line to Accounting Ready.
- **#3 Bank rules** (`use-bank-rules.ts`, `banking/rule-prompt.tsx`, `rules/bank-rules.tsx`): "Always do this?" after the 3rd identical manual coding; rule-coded lines still wait for review and cite the rule.
- **#4 Learned from Tally** (`use-tally-learning.ts`, `automation/learning-sheet.tsx`, `rules/tally-learning.tsx`): read-only history read, summary, resolve split vendors. `learnedEvidence(company, vendor)` returns "Freight Inward · 38 of 40 past bills".
- **#6 Upload cleanup** (`automation/common/cleanup-steps.tsx`): cleanup panel before mapping on the sales Excel upload and the GST purchase-register upload.

## AI features Phase 2 — Neo port (13 Oct 2026)

Neo is mounted globally through `pages/_app.tsx`, with the reference panel, runtime, four action tiers, task cards, keyboard controls and live intake task from AIA-Experiment. Store adapters use the existing AIA 2.0 mutations. Drafts carry `preparedBy` and activity entries; drafts and edits can be undone until approval. Evidence replaces confidence in approval and triage. New tasks compute freight movement and Q2 ITC risk, and review each Mahindra ledger change separately. Reference screenshots are in `shots/ai-features/`.
Deliberate port adaptations: in-house icons, live company lookup, Precision Indigo tokens (Neo uses the white avatar text token on navy), and the current cost-centre contract. The reference live run hands its prepared batch to the existing Inbox approval/Sync controls; that behavior is preserved. No model or new dependencies.

## AI features Phase 2 — Compliance checks (13 Oct 2026)

`?module=CHECKS` ranks open issues by rupee impact, filters by check and separates resolved work. `use-compliance.ts` seeds four document checks and derives missing-in-books issues from the GST store. Review chrome links affected bills to checks. Approval reruns the checks. Fixes preview a balanced JV or an editable message; sending is simulated. Critical notices remain actionable until resolved. A resolved correction means a draft was prepared, not that it reached Tally. Existing GST data determines missing-bill amounts rather than the illustrative ₹38,000 in the brief.

## AI features Phase 2 — Client policy (13 Oct 2026)

`?module=AUTO&page=policy` supports plain-language entry, scripted parsing, condition/action preview, actual matching history, confirmation, switches, editing and firm-template application. Sahyadri starts empty. `POLICY-PUMP` is a ₹42,000 pump plus ₹7,560 GST; policy evidence appears in React review chrome and History without changing the vanilla AP engine. Supported parser vocabulary is equipment/pump, lab/testing and generator diesel. Source facsimiles are used for added records.

## AI features Phase 2 — Playbooks (13 Oct 2026)

`?module=AUTO&page=playbooks` lists GST close, bank tidy-up, TDS checks and overdue receivables, with organisation selection, progress matrix, source-store results and reviewable vendor messages. Runs are company-scoped and logged. Bank rules use the existing coding action. GST uses available reconciled records and reports the current portal session honestly. Sync state is owned by the workspace hook, so the summary explicitly asks the operator to confirm sync rather than claiming books are synced.

## AI features Phase 2 — Schedules (13 Oct 2026)

`?module=AUTO&page=playbooks&tab=schedules` adds schedule editing, enable switches, run-now and message previews. Seeded recurrence choices are monthly on the 14th at 09:00 or Monday at 08:00, relative to 13 Oct 2026. Expired GST authentication pauses with the existing OTP notice. Schedules are demo configuration; no background scheduler or real message delivery is installed.

## AI features Phase 2 — WhatsApp (13 Oct 2026)

`?module=AUTO&page=whatsapp` shows registered numbers and read-only permissions, switches, a conversation preview and unknown-sender refusal. Freight and overdue answers share Inbox records; GST reads current reconciliation and an output-tax mock. The answer explicitly describes available reconciled records, as the baseline GST seed is not a complete September return. No approval, edit or posting is allowed from WhatsApp. Every question and answer is logged.

## AI features Phase 3 — Dashboard and forecast (13 Oct 2026)

`?module=DASH` replaces the launch dialog. Typed monthly MIS records drive KPIs, margin arithmetic, token-coloured Recharts, CSV export and source-record drilldown. Shakunthalam's gross margin is 14.2% in August and 11.8% in September. Freight uses the same underlying bills as Neo and WhatsApp; overdue values use Collections' outstanding balances. The 390px layout wraps header actions and stacks panels. Fixed-rule calculations have no AI mark, following the existing AI-mark rule; reasons and formulas are visible instead.

The ten-week cash forecast starts from typed bank balances exported by `use-banking.ts`. Scheduled flows use approved unpaid future-due documents, including bank-match outstanding balances. Estimates are explicitly labelled demo recurring assumptions, not a claim of a trained model. Notes parse amounts/dates and affect only estimates (₹4L on 1 Nov subtracts exactly ₹4,00,000); History can undo them. No voucher is posted. MIS source records are aggregate ledger totals, not a complete Tally voucher import. GST continues to use the existing limited reconciliation dataset.

## AI features Phase 3 — Collections (13 Oct 2026)

Sales' Overdue tab uses approved invoices, date arithmetic anchored to 13 Oct 2026 and Phase 1 bank-match remaining amounts where available. Sahyadri's three invoices total ₹7,40,000; Bharat Forge SPW/26-27/091 is ₹4,10,000 and 74 days overdue. Individual and bulk drafting opens Neo. Message edits are preserved verbatim; only Send (simulated) adds the reminder and person-attributed History entry. Nothing leaves the prototype. The same helper powers Dashboard and WhatsApp.

## AI features Phase 3 — Year-end provisions (13 Oct 2026)

Journals offers FY 25–26 estimates and source schedules, editable amounts/ledgers, and separate optional 1 Apr reversals. Neo exposes the same preparation service. Four groups create seven balanced Needs Review journals with `preparedBy`, not approved vouchers. Audit fee arithmetic is ₹1,65,000 × 1.09 = ₹1,79,850; tax WDV uses general machinery 15% under IT Rules Appendix I, explicitly not Companies Act book depreciation. Source schedules/engagement evidence are bundled read-only demo records. Marks disappear after manual edits. Individual/group undo refuses changed or approved drafts.

## AI features Phase 3 — Invoice from PO (13 Oct 2026)

Shakunthalam's WhatsApp intake includes Reliance PO RRL/KA/2610/1042. A source facsimile is used, with Reliance as issuer and Shakunthalam as supplier; no document image was generated. Customer matches the AR engine master, stock matches its existing 15 L sunflower-oil item, PO reference reaches Customer PO no., and the sales ledger is the existing Local GST ledger. 100 × ₹2,150 = ₹2,15,000; HSN 151219, CGST/SGST ₹5,375 each, total ₹2,25,750. The normal AR review/approval flow is preserved. Neo opens the existing draft rather than duplicating it; Sahyadri has an honest no-PO state. `public/ar/index.html` is rebuilt into `sheet.js` and the version stamp; keep the added Reliance master when syncing upstream.

Validation: production build and TypeScript pass; calculation tests cover shared amounts, forecast notes, balanced drafts/reversals and undo; browser tests cover both organisations, editable collection send, policies/checks/schedules, Neo diffs, the mobile dashboard and PO review. Reviewed screenshots are in `shots/ai-features/`. Existing `tests/inbox-v2.test.cjs` has an outdated standalone module loader (`date-fns.ts`) and old assertion wording; it is unchanged. No dependency was added.

## Neo proposition (14 Oct 2026, supersedes parts of the Neo port above)

User asked whether Neo solves a real problem, then to build the proposition (artifact https://claude.ai/artifact/D1Pgqh2QWQLt8w23mNguq4): Neo does the work no screen can, and hands the accountant something to sign. Test for any Neo task: if one button already does it, Neo doesn't. The user chose all four phases, the firm brief from the two live companies plus one mocked "other clients" line, and a checkpoint commit (`a71fa30`) first.
- **One name.** Every AI actor is "Neo · X" (`Neo · Auto-approve`, `Neo · Bank rule`, `Neo · Routine`…). `preparedBy: Neo` is only on work a Neo run made: provisions and compliance fixes use `personCreate` and credit the person.
- **Removed from Neo:** approve-batch, inbox-sync, duplicates, invoice-from-PO, explain, provisions, and the per-bill Mahindra re-ledger. Those live on their screens. Explain's "vendor not in masters" moved into the review as a banner with "Ask to confirm GSTIN" (`components/neo/chase-banner.tsx`).
- **Navigation:** a Neo group with Today (`?module=NEO`) and Sources (the old Agents page). Playbooks are titled Routines (trail Neo › Routines); the Automation group stays out of the sidebar, as the checkpoint left it.
- **Change by rule** (`tasks/change-by-rule.ts`, `common/changeset-card.tsx`): vendor + optional "from" + target, for Ledger or Cost centre. One sign-off card: rule, ticked count of total, rupees, approved-and-untouched count, before → after per bill. Rows Neo doubts (duplicate, amount > 1.6× the vendor's median, odd description) arrive unticked with the reason. The button reads "Move 6 bills". Drafts only; Undo in Tasks.
- **Chases** (`hooks/pages/neo/use-chases.ts`, `mock-chases.ts`, `types/pages/neo/chases.ts`): waiting → received → closed. Recorded by the chase task, collection reminders (`sendReminder`) and source copy requests. A chase closes itself when its document is approved or deleted (payment chases excepted). Replies are simulated (`simulateReply`); a GSTIN reply confirms the GSTIN printed in `mock-parties.ts`. Shown in Neo's Tasks tab, the review banner and the brief. Sahyadri seeds two payment chases (091 replied, 092 waiting).
- **Ask the books** (`tasks/ask-books.ts`): spend by vendor or ledger with an optional month, top vendors, vendors not in masters (→ chase), who owes us (→ reminders). Answers show their sources; read-only answers no longer hold the run open.
- **Offers** (`hooks/pages/neo/use-neo-offers.ts`, `components/neo/offers.tsx`, above the Inbox list): two identical manual ledger changes on one vendor with more open bills still on the old ledger leads to "Show the N", which opens the sign-off; and one clean approval short of auto-approve trust. "Not now" hides an offer until its evidence grows; twice dismissed, never again for that vendor. One at a time.
- **Firm brief** (`components/neo/brief`, `hooks/pages/neo/use-firm-brief.ts`, `mock-firm.ts`): live ITC at risk (Q2), waiting bills, duplicates, unreadable, overdue, open compliance checks and chases per company, ranked needs-you first then by rupees. GSTR-3B 20 Oct is the countdown. "29 other clients" is the one mocked line. Opening a signal switches company (`openIn` in workspace) and goes there. "What needs me across my clients" in Neo answers from the same data.
- **Panel:** the Live run card is gone (the task remains, by typing); suggestions come from data (`suggestions.ts`: a vendor whose open bills sit on a different ledger from their approved ones, overdue, not-in-masters, top vendor); unmatched requests get the three closest example chips (`closestExamples`). Prototype notes ("Scripted prototype", "simulated") show only with `NEO_DEMO_NOTES` (`config/pages/neo/demo.ts`, off).
- Verified headless at 1440 and 390: brief, panel, sign-off, ask-the-books, fallback chips, chase send → reply, offer → sign-off. Production build passes. Not tested: the trust offer (no seeded pattern sits at 4 of 5 with a waiting bill), chase auto-close on approval.

## Neo as a place (19 Oct 2026, supersedes the Navigation line of the Neo proposition)

User shared two reference screens (a chat home and an Agents page) and asked for Neo to look like them. They chose: keep the docked panel as well as the page; keep the navy rail rather than the screens' light one; Needs attention and Activity reuse the existing brief and activity log; Today and Sources fold into the new navigation.
- **Route:** `?module=NEO[&page=chat|agents|attention|activity]`, default chat. `?module=AGENTS&page=document-collection` (the old Sources detail) renders inside it under Agents; `?module=AGENTS` alone shows the Agents page. The sidebar has one **Neo** item (the star, see below) instead of the Today/Sources group. On every Neo page the workspace asks the rail to fold to icons (the same unsaved ask the docked record uses).
- **Neo column** (`components/neo/page/nav.tsx`): New chat, Chat, Agents, Needs attention (count = non-neutral brief signals across the live clients), Activity, then Recent chats.
- **Chat** (`components/neo/page/chat.tsx`): empty, a home with the solid star, "Hi {first name}, what can I help you with?", the page-variant composer (`Composer variant="page"`), four prompt chips (`HOME_PROMPTS` in suggestions.ts) and the confirmation note, over a dotted brand-tint wash (`.neo-home-wash`, tokens only). With messages, the same `Message` cards run down a 760px column, composer pinned below. Chips map to real tasks: Find unpaid invoices → ask-books (`unpaid` added; with nothing overdue it names the other client that has some), Upload purchase bills → batch entry (`upload` added), Create an invoice → sales from purchase, Create an agent → create-agent.
- **The docked panel stays** for every other screen and shows the same conversation. On the chat page itself the panel and its edge tab are not drawn, NeoShell stops making room, and the top-bar Neo button focuses the prompt box (`utils/pages/neo/route.ts`).
- **Recent chats** (runtime `chats`, `chatId`, `openChat`; seed `mock-chats.ts`): the current chat is filed as soon as it has a message, titled by the first request. New chat starts another; opening one restores its messages. Both are blocked while a run is live. In memory.
- **Agents** (`components/neo/page/agents.tsx`, store `hooks/pages/neo/use-agents.ts`, types `types/pages/neo/agents.ts`, seed + recipes + ready-to-use in `mock-agents.ts`): Your agents (Document collection from the collection agent, then the store's agents: Bill validator draft, TDS deduction check scheduled, per company), Recommended agents (five recipes, "Create"), Ready to use (five assistants, "Start chat" with a prompt the planner handles). Create agent, Create and an agent card all open a fresh chat.
- **Create-agent task** (`tasks/create-agent.ts`, card kind `agent`, `common/agent-card.tsx`): what it does (skipped when the prompt names a recipe) → when it runs → flag only or drafts too → card with Turn on / Save as draft / Not now. One agent per recipe: creating it again updates the one you have. "Edit agent <name>" opens a saved agent at its card. Agents flag or draft; nothing approves.
- **Needs attention** is the firm brief, retitled, without its own button. Today's links now point to `page=attention`.
- Verified headless at 1440 (dev server): home, agents, attention, activity; create-agent from the chip and from a recipe (no duplicate), unpaid answer, upload and invoice chips reach their first question, recent chats, dock on the Inbox with the same conversation. Production build not run (it would overwrite the running dev server's `.next`).

## One Neo, two sizes (19 Oct 2026, later; supersedes the panel rules above)

User: "It feels like 'Neo' exists in 2 places." The case: one agent and one conversation, drawn as two products (three marks, two front doors with different greetings, the panel's Tasks tab repeating the page, the chat lost on following a link, the panel docking over Neo's own pages). Rule: **the page is Neo's home, at full size; the panel is the same chat made small beside the work. Never both on screen; each leads to the other.** The user chose the star mark and moving Tasks to Activity.
- **One mark:** the solid star (`NeoStar` in components/icons, the sparkle's star without accents). Bare in the sidebar, the Neo column and the home; white on a brand tile in `NeoMark` (top-bar button, panel header, edge tab, offers, batch strip, presence). The duotone `Sparkle` again means only "the AI decided this value". Ready-to-use agent cards use the star too.
- **Panel = the small chat** (`components/neo/index.tsx`): header is mark, the chat's title (or Neo / Accounting agent), Recent chats menu, New chat, **Expand**, Close. No Chat/Tasks tabs, no greeting. Empty state: "Ask about this screen" (`suggestionsFor(context)`) and "Open Neo for agents, findings and history". The runtime's `tab` state is gone.
- **Neo tasks live in Activity:** Neo › Activity has a fourth tab, Neo tasks (`components/neo/page/activity.tsx` passes `tasks` to `ActivityLog`), with every run, its outcome and Undo. Chases were already in Needs attention.
- **Hand-offs** (`hooks/pages/neo/use-neo-runtime.ts`, `utils/pages/neo/route.ts`): Expand sets `carried` (the panel's "this") and opens the page, which shows the context chip above its prompt box until New chat or ×. Following a link or a run's `navigate` out of the page chat docks the panel on the same chat where you land (`dockAfter`); panel-to-record keeps closing the panel. Neo's own pages (`?module=NEO|AGENTS`) never draw the panel: entering one folds it, and Ctrl J or the top-bar button go to Neo › Chat's prompt box.
- **Fixed on the way:** ask-books didn't match "aren't in my masters" (its own example), only "not in".
- Verified headless at 1440: dock on a record → Expand with "Looking at Mahindra Logistics Ltd" carried; page answer → INB-2042 with the panel docked on the same chat; Ctrl J on Agents → Chat with the prompt box focused; Activity › Neo tasks lists a run.

## Neo chat, rebuilt as a chat app (19 Oct 2026)

User: Neo's chat "looks generic" next to Claude and the other LLM chats. The plan covered turn anatomy, the working state, sources, documents beside the chat, the composer, scrolling, chat management, the home and the panel. The user chose: Neo gets its own reading face, the canvas goes on both the page and the panel, and `react-markdown` + `remark-gfm` may be added (the production repo will need them too). A pre-change snapshot of the work tree is at `refs/checkpoints/pre-neo-chat-redesign`.
- **Reading face:** Source Serif 4. It is bundled in `public/fonts/`, with the latin-ext cut loaded as a second family only for ₹. It is exposed as `--font-family-reading`, `.neo-reading` and `.neo-prose` in `styles/neo-workspace.css`. Answers are 16.5px / 1.65 on the page and 15.5px in the panel. The UI stays Open Sans.
- **One thread for both sizes** (`common/thread.tsx`):
  - Messages are grouped into turns: request, Neo's messages, then an action row.
  - A new or edited request scrolls to the top of the view. The last turn has a min-height equal to the view, so the answer arrives below it.
  - "Jump to latest" appears when there is content below the fold.
  - While working, the star breathes (`.neo-breathe`) and the status line shimmers (`.neo-shimmer`). Both are off under reduced motion.
- **Your message** (`common/user-message.tsx`):
  - A grey `pi-fill` bubble.
  - Long messages fold behind "Show more".
  - Hover shows Copy and Edit. Edit re-runs from that request.
  - Versions are kept as `NeoMessage.versions` / `version` and switched with ‹ 2 / 2 ›.
  - More than four attachments fold to three plus "+N more".
- **Neo's message** (`common/message.tsx`):
  - Text is rendered as Markdown by `common/prose.tsx`.
  - Any id, invoice no. or voucher no. of the current company in the text becomes a citation pill (`common/source-pill.tsx`) that previews the bill on hover.
  - Tables right-align figure columns and have Copy as CSV.
  - Sign-offs with draft, commit or external risk sit in an approval card whose head says what they risk.
  - Follow-ups are quiet ↩ lines.
  - `triage` and `ask-books` now write Markdown (bold verdicts, lists).
- **Steps** (`common/steps.tsx`):
  - Open while running, folded when done ("label · N steps · 1.4s").
  - `NeoStep.startedAt` / `endedAt` record the timings.
  - A failure never folds.
- **Action row** (`common/turn-actions.tsx`):
  - Copy, Retry, 👍 and 👎. 👎 asks for a reason chip and an optional note, stored as `NeoMessage.feedback`.
  - "N sources" lists the records with previews. Only records with an `itemId` count.
- **Streaming:** `say()` writes word by word at about 30ms a word, capped at 2.4s, and sets `streaming` while it runs. Reduced motion shows the text at once.
- **Canvas** (`common/canvas.tsx`, `utils/pages/neo/canvas.ts`):
  - Voucher, batch, change set, diff, collection setup, dry run and lists over five rows show in the thread as a tile. The document opens beside the chat on the page, and to the left of the panel over the work when docked.
  - It opens automatically when a run shows one.
  - ‹ › steps through the chat's documents. Esc or × closes it.
  - Below 1024px it covers the screen.
  - It renders the same `CardBody`, so edits there are the ones the sign-off counts.
  - Runtime state: `canvas` / `setCanvas`.
- **Composer** (`common/composer.tsx`, state in `hooks/pages/neo/use-composer.ts`):
  - Two rows: the text on top, then a toolbar with +, the context pill and Send. Send becomes Stop while Neo works.
  - + offers Upload bills and the sample batch.
  - `@` lists the company's vendors and customers.
  - `/` at the start lists `NEO_COMMANDS` (suggestions.ts).
  - ↑ in an empty box edits the last request (`EDIT_LAST_EVENT`).
  - Attachments show as file tiles.
  - Files dropped anywhere on the chat attach to the next message (`common/drop-zone.tsx`).
  - The key legend is gone. Ctrl / opens `common/shortcuts.tsx`.
- **Chat management:**
  - `page/chat-title.tsx`: click the title to rename it. Its caret offers Star, Rename, Export as Markdown and Delete.
  - Titles are written once Neo answers: the first sentence, up to eight words.
  - The Neo column has a chat search, Starred / Today / Yesterday / Previous 7 days / Older groups and a ⋯ menu per chat.
  - Runtime: `renameChat`, `toggleStar`, `deleteChat`, `retry`, `edit`, `switchVersion` and `rate`.
  - Ctrl Shift O starts a new chat.
- **Home:**
  - The greeting reads "Good morning/afternoon/evening, {name}" in the reading face.
  - Four category chips (Find, Enter, Chase, Tidy up) each open three requests the planner handles, including data-derived ones from `suggestionsFor`.
  - The dotted wash is now a faint tint.
- **Panel:**
  - Header: mark, chat title, Recent, New, Expand, Close. The company and the context chip moved into the composer.
  - The left edge drags the width from 384 to 560px (`panelWidth`, localStorage `aia.neo.panelWidth`). `NeoShell` and the toast offsets follow `--neo-w`.
  - The run strip (`presence.tsx`) is hidden on Neo's chat page and centres on the actual panel width.
- **Icons added:** `ThumbsUp`, `ThumbsDown`, `Star`.
- **Continue after stopping (added the same day):**
  - A stopped run now ends on a notice (`NeoMessage.stopped`: reason, records touched, company) with Continue and Start over. Start over is the same as Retry, so it creates a version.
  - The runtime keeps each run's prompt, attachments, context and every decision in order (`runMeta`). A decision is an ask answer, or a card action plus the edited card.
  - `continueRun` removes the stopped run's messages and runs the same task again with those decisions replayed. While replaying, asks and cards answer themselves, waits are 0 and text appears whole. Once the decisions run out, or the run asks something different, it goes live.
  - Continue is disabled when the stop left records changed ("would repeat changes already made") or the company is different.
  - Known side effect: replaying batch entry makes a fresh batch id (B-…-02). The first batch stays in the in-memory batch store with no drafts.
- **Pick from Inbox (added the same day):**
  - The prompt box's + menu opens `common/inbox-picker.tsx`: the company's documents, with search, an All / Needs review / Approved filter, ticks and "Use N documents".
  - The picks become "this" through the runtime's `picked` / `pickRecords`: one document becomes `itemId`, several become `selectedIds`. So tasks that read selected rows ("move the selected bills…", chases, collections) work from Neo's page.
  - Picks show as brand-tint tiles in the prompt box (removable) and as chips on the request they were sent with (`NeoMessage.records`).
  - Picks stay until ×, a new chat or a company switch.
- **Verified** headless at 1440 and 390 (dev server):
  - Home and categories.
  - Triage Markdown.
  - Streaming.
  - Spend answer with sources and preview.
  - / and @ menus.
  - Retry and edit, with versions.
  - 👎 feedback.
  - Change-by-rule in the canvas on the page and in the panel.
  - Batch entry with attachments into the canvas.
  - Panel resize.
  - Dark mode.
  - Typecheck passes.
- **Not done:**
  - No production build (it would overwrite the running dev server's `.next`).
  - Citation pills only appear where a task's text names a record number.
  - The Neo column still breaks layouts under ~700px, as before this work.

## Document collection set up in Neo's chat, phase 1 (19 Oct 2026)

Plan doc "Document Collection setup — research and plan" (https://claude.ai/artifact/PTQdv2fgGaJbrg6UVBtodr), from research on ChatGPT, Gemini, Copilot, Zapier, Lindy, n8n, Dext, Hubdoc, QuickBooks, Zoho and Ramp. The user approved: setup in the chat, forwarding address first, firm-inbox routing by buyer GSTIN in phase 3, phase 1 now and stop for review.
- **Task** `config/pages/neo/tasks/collection-setup.ts` (score 60; "Set up document collection", "Edit agent Document collection", "collect my bills from Gmail…"). Steps:
  1. Where bills arrive (single pick of channel combos; WhatsApp suggested when the Inbox has WhatsApp items).
  2. Connect: the forwarding address is always first and connected at once (`forwardingAddress(slug)`, Gmail's confirmation code caught as `MOCK_FORWARDING_CODE`). Then optional Gmail label `AIA/Bills` behind a sample consent, with a filter to copy (`MOCK_GMAIL_FILTER`). Drive offers an AIA-created folder or an existing one. WhatsApp uses the business number.
  3. Senders (vendors and staff / anyone) and non-bills (skip / hold).
  4. Routing is not asked yet.
  5. Backfill: period (1 Sep, suggested for the 20 Oct GSTR-3B) / last 30 days / FY / new.
  6. Dry run, then Turn on / Save as draft / Not now; Save changes / Cancel when editing an agent that is on.
  - Turn on commits and `chain`s the ordinary collection run. A stopped or finished run discards any unsaved draft.
- **Setup card** (`common/collection-card.tsx`, card kind `collection-setup`) reads the draft live from the source store. While drafting, every rule is a select. A hand edit is listed in `edited` and Neo never asks about it or overwrites it (`patchCollectionDraft`). After saving, the card reads the saved setup.
- **Dry run** (`common/dry-run-card.tsx`, kind `collection-dry-run`): five groups (would prepare, already in your books, needs your decision, skipped, unreadable), with Allow sender / Exclude sender / Include again on rows. The sign-off reads "Turn on and prepare N drafts". `rows` freezes it on save.
- **One rule set** (`classify` in `use-inbox-sources.ts`), used by `dryRunCollection` and `collectSources`, in this order: excluded sender → not a bill → unknown sender → duplicate (content hash, also across channels in one pass) → unreadable → no invoice no. → prepared. Skipped files and held non-bills get receipts and no item. Verified: the dry run's 4 prepared / 1 decision / 1 unreadable matched the real run.
- **Store:** `drafts`, `CollectionAgent.setup` (configured=false + setup = Draft), `sinceFor`, `BACKFILL_LABEL`, `startCollectionDraft`, `setDraftChannel` (keeps card order), `commitCollectionSetup(company, "on"|"draft")`.
- **Types:** `SourceProvider` gains "Forwarding"; candidates carry `sender`, `knownSender` and `kind`; receipts can be `skipped`; `CollectionSetup`, `CollectionChannel`, `CollectionDryRunRow`.
- **Mock data** (`mock-sources.ts`): forwarding carries the whole accounts@ inbox. That includes the four bills, an August Blue Dart bill (FY backfill only), and a bank statement, a payment advice, a quote and a newsletter. Gmail carries the same four bills (same hashes). Drive has the Mahindra duplicate and Delhivery. WhatsApp has VRL, and Ganesh Tempo from an unknown number.
- **Screens:** the Agents card opens the chat when not set up (Draft → continue). `components/agents/index.tsx` is now only the agent's own screen: "Set up with Neo" when not set up; the Setup tab shows the card read-only, a Channels list with Disconnect/Reconnect, and "Change in Neo". `connection-setup.tsx` and `run-mode.tsx` are deleted; the dead Sources list branch is gone; in-house icons. `hooks/pages/neo/use-start-chat.ts` starts a fresh chat on Neo's page.
- **Asking to collect** before setup now chains into setup.
- **No missing-invoice-number strip** (user: "It is not needed"): `sources/document-issue.tsx` now shows only the unreadable-attachment strip. The form's Supplier invoice no. field already marks the gap. `resolveSourceReference` is gone, and the header reason reads "No supplier invoice number on the bill; add it before approving".
- **Not built (phases 2–3):** status-board Overview, Run now as a chat, reconnect health in Needs attention, firm inbox routing, WhatsApp "which company?", the daily summary notice (the Notices choice is stored, not sent). Known: the Neo column breaks layouts under ~700px; that predates this work.

## Neo voucher entry, phase A (14 Oct 2026)

User: "neo should be helpful in doing the core accounting tasks like Voucher creation … creation of 10 bills from instructions and uploads." Plan artifact https://claude.ai/artifact/4aPK6gptSju9SJVNHNB8Ex; the user chose phase A (batch purchases) in depth, then said "It should happen inside the chat interface, not in the main UI": the Batches page, its nav entry and the upload dialog's instruction field were removed. It revises part one's rule: one record → the screen; a batch, or context the document doesn't carry → Neo.
- **In the chat** (`config/pages/neo/tasks/batch-entry.ts`): the composer's clip attaches files or the sample (`NeoAttachment`, `startRun(text, attachments)`, chips on the user's message). Then: "Which bills?" if none → "What don't the bills say?" if no instruction → step "Read 10 bills" → **settings card** (`common/batch-card.tsx`, view `settings`: period, voucher date, GST registration, freight ledger, cost centre, TDS, narration; tagged Yours or with the AI mark when Neo chose; click to edit while live) → one `ask` per kind of exception, suggestion marked (goods not freight, cost centre not in masters, new vendors grouped, 194C(6)) → **register card** (view `register`: tick per voucher, a row opens to Dr = Cr and the source PDF, totals and reconciliation; the button reads "Create N drafts") → drafts card (view `drafts`, live statuses) with "Review in Inbox" and follow-up chips (`api.suggest`).
- **Follow-ups** (`tasks/batch-actions.ts`, "… batch B-xxxx-xx"): approve the clean drafts (a commit card listing them with the total; nothing guessed, no new vendor, no reverse charge — 5 of 9 in the sample), save the freight rule as client policy (`savePolicies`), undo the batch, review in Inbox. The run's Undo in Tasks also discards the batch.
- **Store:** `hooks/pages/neo/use-batches.ts`, types `types/pages/neo/batch.ts`. Cards read the batch live from the store. In memory; a reload loses batches (the drafts stay in the Inbox store until it reseeds).
- **Sample:** `config/pages/neo/mock-batch-documents.ts`, ten Harihar plant bills (HRH-01…10) printed by `scripts/source-docs/generate.cjs` to `public/docs/HRH-*` with regions appended to `mock-source-documents.ts`. When re-running the generator, existing PDFs come out byte-different; restore them and keep only the HRH additions. Attached files are matched to the sample by file name; any other file is listed as not read.
- **Checks in the store:** masters = the chart's sundry creditors plus vendors with approved bills (name-normalised, so "Blue Dart" = "Bluedart"); goods = qty + non-99 HSN; RCM = GTA SAC with no tax printed (5%); TDS 194C at 2% / 1% (PAN 4th letter P/H), single > ₹30,000 or the year (`MOCK_VENDOR_TDS.priorFyTotal` + earlier batch bills) > ₹1,00,000, 194C(6) declarations; duplicates within the batch and against the Inbox by vendor + invoice no.
- **Ledgers are the AP book's:** "Freight Inward" in an instruction resolves to the form's "Freight & Cartage Inward" (every word said is in the name); other services take the ledger their SAC is filed on. `config/pages/neo/ap-ledgers.ts` is a hand copy of the AP engine's `MASTERS.expenseLedgers`; change both together.
- **Drafts are ordinary items:** `itemFromMock` on the sample document with the batch's answers, `neoCreate` (Needs Review, `preparedBy` Neo), `Item.batch = {id, instruction}`. The document carries `neo` (`NeoPrepared` in types/pages/inbox): ledger id, cost centre id, narration, the year-to-date before the bill, a TDS exemption, a reverse-charge rate. `apDocumentFor` hands those to the AP form instead of blanks.
- **AP engine change** (`public/ap/index.html`, rebuilt into sheet.js): `suggestTdsLines` reads `SAMPLE.fyServices` and `SAMPLE.tdsExempt`, and `seed()` turns reverse charge on for `doc.reverseCharge`. A re-sync from upstream must keep these. The form agrees with the register: Mahindra 0431 deducts ₹500 on the yearly limit, Om Sai nil under 194C(6) and RCM ₹2,100 excluded from the total with the RCM ledger dialog.
- **Inbox:** `?batch=<id>` filters the list to the batch with a strip (counts, the instruction, Open in Neo), so Approve & Next walks it. Review and approval stay in the main UI.
- Verified headless at 1440 in the panel: attach sample → instruction → settings → 4 questions → register (row open) → Create 9 drafts → approve the 5 clean → Review the rest. Not built: phases B–E; the stock item for the boxes is the AP form's own proposal.

## GST Reconciliation reads like the other modules (8 Oct 2026)

User: "clean up GST Recon and make it polished as well, to have the same clarity of other modules". The user chose the name "GST Reconciliation" and a compact summary strip on Summary only.
- **Name:** GST Reconciliation in the sidebar (no GSTR-2B tag), the trail and the page title. The sheet is "New Reconciliation".
- **Page pattern:**
  - Row 1: tabs **Summary · By Month · By Vendor · Invoices**, each with its row count, beside Export and New Reconciliation (`PageTopBar`).
  - Toolbar: search (By Vendor and Invoices only, where it applies), then GSTIN and Period.
  - The PageHead, the three KPI cards and `ResultTabs` are gone from the page.
- **Summary strip** (`SummaryStrip` in gst/table-parts): Matched 84 of 108 · To review 36 · ITC at risk, on Summary only. Each figure opens Invoices filtered to its statuses.
  - Invoices replaces its two little tables (2B/PR/tax difference, ITC split) with the same strip, counted over the filtered rows.
- **Tables:**
  - Headers are shorter: GSTR-2B / Purchase Register / Difference (2B − PR) over Invoices · Taxable Value · Tax. Month and Vendor use Invoices · Taxable Value · Tax · Status (Matched · Probable · Missing). "(₹)" is gone; the figures carry it.
  - The first column (status, month, vendor) is pinned (`PIN_LEAD`) and never truncates.
  - Differences use `Diff`: signed, in normal ink, a faint dash for none. Red is kept for ITC at risk and the Missing in 2B chip.
  - Summary and By Month have no sort buttons: six statuses in a fixed order, and months by date. Without them both fit at 1440. By Vendor and Invoices keep sorting.
  - Invoices: no Sr.No; Reco Status at 200px; ITC is the in-cell picker (`CELL_TRIGGER`, faint "No Action"). By Vendor and Invoices page at 25.
- **Sheet:**
  - "New Reconciliation", with a line naming the organisation (the organisation box and the "Compliance" eyebrow are gone).
  - Three sections in the review form's style: GSTIN and Period (side by side), GSTR-2B and Purchase Register. Each section shows its state as a dot-chip in its head ("108 invoices", "Map the columns", "1 file ready").
  - GSTR-2B offers Fetch from GST Portal and Upload GSTR-2B File as two tiles, until one has worked.
  - Delete bins are faint, red only on hover.
  - Footer: what is missing, on the left, while Run is off; Cancel and Run Reconciliation on the right.
- **Empty period:** the shared stage empty state (GSTR-2B invoices → Purchase registers → Reconciled) with Start Reconciliation. Not yet checked in a browser.

## GST Reconciliation as a reconciliation ledger (13 Oct 2026, supersedes the Summary strip and Tables rules above)

User found the polished tables "very pathetic" and chose the ledger direction over an action-card queue or more refinement.
- **Overview on Summary** (`ReconOverview`): "84 of 108 GSTR-2B invoices" with its share, ITC at risk on the right, and every status as one segmented bar with a legend. Segments and legend entries open their invoices.
- **One colour per status** (`STATUS_LOOK`): Fully Matched green, AI Match indigo, Manually Matched teal, AI Probable amber, Missing in PR grey, Missing in 2B red. The bar, legend, chips and mini bars all use it. Every status is a chip with a soft ground (`MatchStatusPill`).
- **Ledger tables** (`breakdown-table.tsx`, Summary / By Month / By Vendor): 2B beside PR under small-caps group names (Invoices, Taxable value, Tax), then one Tax gap column instead of the three Difference columns. Rows are ruled; columns are not, except where a group starts. This deliberately departs from the app-wide column rules (7 Oct) for GST only.
- **Summary** sits in two sections, Matched and Needs attention, each with a subtotal, then Total. Only Missing in 2B's tax gap is red.
- **Whole rupees** on Summary, By Month, By Vendor and the Invoices strip; paise stay on the invoice lines.
- **By Month / By Vendor** end with a Matched column: a small matched / probable / missing bar and "7 of 12". By Month shows Total only with more than one month.
- **Invoices:** no column rules; a dashed hairline inside a 2B/PR pair and a firmer rule between pairs; the pinned ITC column has a left edge. Empty sides are a faint "—".
- **Sheet:** section titles in ink, not brand; file status reads "Extracted".

## Where review happens: one queue, many views (8 Oct 2026)

User: "Inbox has all the document types and there are a separate modules as well. When the user wants to review the document where should it get pointed to?" The user chose Option B over making the Inbox the only review place.
- **Two doors, one review screen.** The Inbox lists every book; each register's Needs Review lists its own (Purchases, Sales, and now Journals). Both open the same screen (`/inbox?id=…`). The firm owner clears the Inbox; a book clerk works their register; neither is sent to the other's list.
- **The Inbox owns document problems, books own voucher review.** Received, Extracting and Failed stay in the Inbox only: a file not yet read belongs to no book. A book's Needs Review is Needs Review + Duplicate (`tabRows`), so it always equals the Inbox's Need review + Duplicate for that book.
- **The list you came from is the queue.** Registers pass the rows on screen (`onOpen(item, ids, tab)`); the store keeps `queue` and `queueFrom` ("inbox:<tab>" or "<route>:<tab>").
  - The counter names it: "Documents 2 of 9 · Sales › Needs Review".
  - Back is "Back to Sales" and returns to that tab (`exitHref`, `?tab=review`). A document opened from a link or a notice isn't in the queue, so its way back is the Inbox.
- **Approve & Next stays in the list and in its book.** At the end of a book's list you land back on it with a toast: "<Book> is clear", how many documents other books still have, and Open Inbox.
- **"Post as" to another book mid-review:** you stay on the document (you just chose to re-type it). The counter reads "Moved to Journal Vouchers", a toast says where it now waits, and Next and Back keep to the original list. This deliberately differs from the proposal, which was to skip ahead.
- **Notices:** "N bills ready for review" opens that book's Needs Review. Notices about unreadable files and duplicates open the document, with the Inbox as the way back.
- Review-tab rows show Status (the Inbox's dot-chip) in place of Sync Status on Sales and Journals.
- Not tested in a browser: the "Moved to" state. The seeded sales invoices can't be approved without completing their fields, so the end of the list was tested on Journals.

## Notification centre (8 Oct 2026)

User: "Work on a full fledged notification centre for this with proper end to end plan." The user chose a popover from the bell (not a side sheet), with a full page too, and left the scope to us: every module, with notices only for moments that really happen in the prototype.
- **Two kinds, and they leave differently.** *Needs action* (unreadable file, duplicate, ready for review, sync failed, voucher out of date in Tally, master not in Tally, statement rejected, GST portal OTP, file import failed, split ready) clears when the work is done (`resolvedAt`), not when it is read. *Updates* (arrivals, statement read, GSTR-2B in, reconciliation ready, sync done, Post as finished) clear when read.
- **Grouping:** "6 bills ready for review" is one notice per book with its item ids as `refs`; approving or deleting one drops it, and the last one closes the notice. Arrivals fold per sender for 15 minutes.
- **Bell** (`components/notifications/bell.tsx`, mounted in the top bar in place of the stub popover): the badge counts unread for the organisation on screen. The panel has Needs action and Updates tabs, mark all read, settings, a line for each other organisation with open work (with Switch), and View all. The tab title carries the count.
- **Rows** (`common/notification-row.tsx`): module glyph in a 32px box, with severity only as a 7px corner dot. The title is the row's stretched link and shows a brand dot while unread. Action notices get one outline button. Read toggles on hover. Resolved actions read "Done".
- **Page** (`/notifications`, `pages/notifications` re-exports the workspace and the view chain checks `router.pathname`): Needs action / Updates / All, search, a Module filter, Unread only, rows by day, the pager.
- **Settings** (bell gear, the Preferences menu, the page): a group × channel matrix (In app, Email, WhatsApp), an email digest and urgent pop-ups. In app only hides updates; action notices always show. Saved to localStorage `aia.notifications.prefs`; email and WhatsApp are stored, not sent.
- **Urgent toasts:** critical notices toast with a View button, unless the module already toasts that moment (sync results, split ready).
- **Store:** `hooks/pages/notifications/use-notifications.ts`, module-level, reseeded on load. Inbox notices are derived from the store by `use-inbox-notifications.ts`; the rest seed from `mock-notifications.ts`, every entry standing on an existing mock state.
- **Deep links added:** `?sync=failures` narrows to the last run's failures; `?module=AP&tab=uploads&split=<id>` opens Bill Uploads and the split review.
- Known gap: a full sync run couldn't be exercised headless because the seed has no approved vouchers to sync.

## Source documents and the field highlighter (7 Oct 2026)

User: "I want the prototype to have some real bills and invoices as the data source… build the text highlighter feature where when the user reviews a field the source of that field in the document gets highlighted and zoomed in."
- **The documents.** No openly licensed, real, filled-in Indian GST invoices exist without real GSTINs, so the user chose to generate documents for the demo cast.
  - `scripts/source-docs/generate.cjs` prints one document per seeded bill, sales invoice and journal from `mock-inbox.ts`. Headless Chrome writes `public/docs/<id>.pdf` and a 2x `<id>.png`, and the boxes of every `[data-src]` value go to `config/pages/inbox/mock-source-documents.ts` (generated; never hand-edit). Re-run it after any mock change.
  - Five templates are modelled on real Indian paper: a boxed TallyPrime tax invoice (most suppliers, and our own sales), a corporate ERP invoice, a BESCOM HT bill, a filling station's bill of supply, and an internal journal note.
  - The incidental detail is deterministic: e-invoice IRN/QR, e-way bill, bank details, PO numbers. Ashapura's invoice number sits under a RECEIVED stamp, which is why it is flagged.
  - A small footer marks each page as a demo with fictitious identifiers.
  - JV notes carry `referenceNo` and `date` in the mock (`InboxJv`), and the seed uses them.
- **One viewer.** `preview.tsx` now draws the page image when a document exists, and the facsimile only for hand-raised items. On AP it is portalled into the engine's `#doc-preview` (`ApSheet`'s `preview` prop); the engine still shows and hides the pane, and its own bar and body are hidden (`.has-react-preview` in `sheet-bridge.css`).
- **Follow fields** (`ScanText` toggle in the viewer bar, on by default, remembered in localStorage `aia.inbox.followSource`):
  - `useSourceFocus` listens for document `focusin` and `pointerdown`.
  - `sourceTargetOf` maps the control to region keys, best first: engine `[data-bind]` header fields; engine line cells `tr.cr-tr [data-f]`, with the line matched by description, then position; React fields tagged `data-source` / `data-source-line` (the JV).
  - Fields with nothing printed (ledger, voucher no., cost centre) clear the box. Focus outside the forms leaves it.
  - The value gets a brand box with its field name as a tag. The rest of the page dims and a line's row is tinted.
  - The camera zooms to read the value: up to 2× fit width, or it only pans when the zoom is already comfortable. It moves in 260ms and stops on wheel or press. Reduced motion jumps straight there.
  - The tag and border are scaled back with `--zinv`, because `zoom` takes no `calc()`.

## Empty states show where the documents are (8 Oct 2026)

User: "Work on making the empty states more graphical and impressive with useful information." The user chose direction A, "Where your documents are", over a blank ledger page and a big zero.
- **One component:** `components/inbox/v2/empty-state.tsx`. `EmptyBlock` (banking/table-parts) and banking/page-parts `EmptyState` now delegate to it. The workspace's local `EmptyState` remains only for the permission, unavailable and deleted-record screens.
- **The graphic is the information.** `flow` draws the stages a document moves through as boxes joined by the ledger rule, with live counts. The stage on screen is raised in brand tint, and the button acts on the stage that holds documents.
  - Registers: Received → Needs review → Posted (`registerFlow` and `RegisterEmpty` in register.tsx; Purchases uses it too). Every book has its own Needs Review tab, so the button switches to it (`hasReviewTab`); `onOpenInbox` is only a fallback for a register without one.
- **Sales Needs Review (8 Oct 2026, user: "Sales module needs a 'Needs Review' section as well"; Journals got one too, see "Where review happens"):** the tab sits between All Invoices and Uploaded Invoice, as Purchases has it. It lists the sales invoices not yet approved, in the register's columns, with Status (the Inbox's dot-chip) in place of Sync Status, because a document in review has nothing in Tally yet. Rows open the review form. `?module=AR&tab=review` opens on it.
  - Inbox tabs: Received → Needs review → Approved.
  - Bank transactions: Needs review → Accounting ready → Synced to Tally.
- **Other uses:** `icon` gives one glyph tile, for a list with nothing before it (masters, statement logs, uploads, GST). `filters` + `onClear` gives the filtered-to-nothing variant: the active filters as chips and Clear filters.
- Fixed: Purchases/Sales/Journals and Bill Uploads used to say "Nothing posted/uploaded yet" when a search or filter was the cause.
- Stages fade in 70ms apart (tailwindcss-animate, off under reduced motion). Copy is in the accountant's voice and uses real counts.

## Master pages read as the review form (8 Oct 2026)

User: "Rework on the UI of this form and make it look a bit polished and similar to the patterns used in the AP, AR and Journal forms." Applies to New/Edit Ledger and Create/Edit Stock Item. The user chose to fold optional groups and to treat both pages the same.
- **One white panel** (`.form-panel`, 1040px, `FormJourney` in `form-journey.tsx`). The "In this form" rail, the welcome heading and the second required note are gone. The page header (`FormHeader`) runs on the same 1040px column.
- **No page heading** (user: "the headings inside the page are repetitive with the path already mentioned in the topbar"). The top bar trail names the page ("Accounting / Chart of Accounts / New Ledger", `pageCrumbs` in `workspace.tsx`). `FormHeader` is a slim bar: back chevron, then Cancel and Save, with the title as an `sr-only` h1. The module crumb ("Chart of Accounts", "Stock items") is a button back to its list: `Crumb` may be `{label, onClick}`. Group crumbs and the current page stay labels.
- **Thirds, never quarters:** `colsFor` caps at 3 and `FormCard`/`SwitchPanel` default to 3.
- **Quick picks** (Business expense, Supplier, Customer, Bank account) are a segmented control, `StarterPicks`, above Basic Details.
- **More details** (`MoreDetails`): Address, Tax registration and Opening balance fold on every ledger form. A bank ledger keeps Bank Account Details out, and a party ledger folds only Documents. Stock items fold Opening balance, with GST Details moved above it. A failing field inside opens the fold (layout effect on `[data-invalid]`).
- **Settings** switch lists are titled "Additional settings" on every form.
- Currency of Ledger is a white read-only box with a lock, not a grey disabled one. Opening Balance is one box with a Dr/Cr toggle inside it.

## Master form rework and split dialogs (8 Oct 2026)

User: "Master creation dialog box lacks a lot of UX. Rework on the cost centre split and godown split dialog boxes to match the current form patterns as well." The user chose to drop the tabs.
- **Master form** (`renderNmDialog`, both engines; the helpers sit above `nmControl`):
  - One scroll, no section tabs (`dialog-refinement.ts` no longer builds them).
  - **Party profile** (vendor or customer): Vendor/Customer (Name, Under, GSTIN, GST treatment, PAN) → Address → Credit & cost centres → Opening balance.
    - GST treatment is required. The GSTIN is required unless the treatment is Unregistered or Embassy (`req` may now be a function: `isReq`).
    - A party filed on a state shelf keeps the party profile (`profileFor`).
  - **Provenance:** a two-word caption beside the label (`.nmd__src`): "From the document", "From GSTIN", "From PAN" or "From address" (`fromCaption`), with the reason on hover. It shows only for real readings with a value; typing removes it.
  - **Under:** the AI's suggested shelf is a row with the AI mark and a **Use** button (`data-nmuse`). It replaces the old contradicting note.
  - **Duplicate check under Name:** "No vendor with this GSTIN in your books", or the match with **Use existing** (`partyByGstin`, `data-nmexisting`). Use existing sets the party on the bill.
  - **Checks:** the GSTIN check digit (`gstinCheckOk`), the PAN against GSTIN characters 3–12, and the GSTIN state against the address state. `nmReject` puts one red line under each faulty field ("Required" for missing ones), with no band. It opens the folded opening balance if the fault is there.
  - **Treatment ids:** the form lists full names (`TREATMENT_FULL`); a vendor or customer master stores the short id (`shortTreatment`).
  - Drafts read the PIN code out of the printed address.
  - **Layout:**
    - Switches and the fields they open are one bordered list (`.nmd__group--list` / `.nmd__item`).
    - The opening balance is a fold (`data-nmfold`) showing "None" or the amount.
    - Books open on 1 Apr 2026. Titles read Create Item / Ledger / Vendor / Customer, and the save button says the same.
  - AR seeds now pass the printed customer GSTIN, PAN and address (`arDocumentFor`, `printedCustomer.address`).
- **Split dialogs** (`#cc-dialog`, `#gd-dialog`):
  - Header: title, with the line and amount underneath (`.alx__titles`).
  - A meter says what is left and draws it (`.alx__meter`): per category for cost centres, for the whole line on godowns.
  - Plain column labels, 38px fields with % / ₹ / unit affixes, a bin per row, and "Fill remaining".
  - Save is never disabled. A failed save marks the rows under them (`tried`) and turns the footer status red. When complete, the status is green.
  - Styles are at the end of `dialog-workspace.css`.

## Godown split (7 Oct 2026)

User: "There should be an option to split warehouse/godowns as well." The user chose a dialog, to match the cost centre split.
- **Where:** AP and AR stock lines, in the table's Warehouse/Godown cell and in the line sheet. Journals have no godowns.
- **Picker:** "Split godowns" is a footer action with the `i-split` glyph, like "Split cost centres". It is disabled until the line has a quantity. Once split, the cell reads "Split · N godowns", the breakdown is on hover, and the menu offers "Edit split…".
- **Dialog:** "Allocate Godown" (`#gd-dialog`). It reuses the `.ccx` markup and its styles; `dialog-workspace.css` now targets `:is(#cc-dialog, #gd-dialog)`.
  - Rows are godown and quantity. The amount is the row's share of the line's taxable value, so a discount divides too.
  - The badge reads "12 MT of 20 MT". Save stays disabled until the quantities total the line's and every row has its own godown.
  - The line's godown seeds the first row. A one-row split saves as a plain godown.
- **State:** `row.gdSplit = {rows:[{godown, qty}]}`. It is mutually exclusive with `row.godown`: picking a godown in the cell or the bulk bar clears the split.
- **A quantity changed after splitting:**
  - The cell turns amber (`.cr-godown.is-mismatch`), live while typing (`gdPatchCell`). Its title gives the gap ("short by 4 MT").
  - The engine's `validate` adds `__godown` (Item Details), so approving is refused.
  - BillReview lists it in Needs you.
- **Out to the inbox:** `gdOut` in both bridges (`index.html` and `tail.js`) puts `godown` and `godownAllocation [{godown, qty, unit, amount}]` (names) on each stock line of `Form.lines`.
- **Posted record:** a Godown column appears when any line carries one, with "Split · N godowns" and the breakdown on hover.
- **Code:** the engine block starts at `GD_SPLIT` in `public/{ap,ar}/index.html`. Rebuild both sheets after editing it.

## Cost centres (5 Oct 2026)

Modelled on Tally and production (`aiaccountant-app`). Tally only; Zoho reporting tags and banking are out of scope.
- **One master set:** `config/pages/inbox/mock-cost-centres.ts`. It holds flat categories (Department, Project, Region, Sales Channel), a centre tree (`parentId`), and classes that are real percentage splits. The AP and AR engines carry a hand copy in `MASTERS.costCentres` / `costCentreClasses` with the same ids and names. Change both together.
- **Header:** a class OR one cost centre (`Form.costMode`), never both. Setting either clears every line's cost centre and locks the lines. Flipping the switch empties the header.
- **Lines:** a line holds one centre (`costCentre`) or a split (`costAllocation`, per category, each category totalling 100%). "Split cost centres" is a footer action in the picker, like "Create new …": the engines' `cselp__foot` with an `i-split` glyph, and the JV's `ComboBoxPanel` action. It opens "Allocate Cost Centre": `#cc-dialog` in the engines, `journal/cost-allocation-dialog.tsx` in the JV. Narrow cells read "Split · N centres"; the full breakdown is on hover.
- **Gating:** a line offers a cost centre only if its ledger has "Cost centres are applicable". The default is Tally's: Yes for income and expense groups, No for tax, asset, liability and party groups.
  - Engines: `ledgerCcOn` / `ccApplies`. An unresolved line follows the AI's proposed ledger, or that ledger's suggested Under group.
  - JV: `ledgerTakesCostCentre`.
  - The party line asks only when the party's ledger is flagged. Only Technova (AP vendors) is flagged.
- **Form values are names;** the engines map them to and from ids in the bridge (`tail.js` and the copy inside `index.html`).
- **Sales upload:** the invoice's cost centre goes to the header and is never stamped onto lines. It must be a leaf centre.

## Goods are items, services are ledgers (7 Oct 2026)

User: "if the invoice has things which has a physical value for example like 'Dell Laptop' it should be predicted as an item and the suitable purchase ledger for it should be predicted as well. Incase if it's a service then it should go under description and the ledger should be predicted for it." The same applies to sales.
- **Route per extracted line** (`config/pages/inbox/line-route.ts`, used by `ap-document.ts` and `ar-invoice.ts`):
  - A SAC code (99xxxx) or service wording (freight, support, AMC…) makes it a ledger line, even when the line carries an HSN.
  - Electricity (HSN 2716) is a ledger line.
  - Any other HSN, or a printed qty/rate, makes it an item line with qty, unit and rate.
  - A bare description and amount is a ledger line.
- **No exact match takes the closest existing item** (user's choice over proposing a new one).
  - It is `closestItemHit` in both engines: same HSN heading, then the form the line names (tower = desktop), then words in common, then the nearest rate.
  - It shows as a suggestion with its reason. A new item is proposed only when nothing is close.
- **The purchase ledger is set once per bill.** When most of the goods by value are capital goods, it suggests Purchase — Capital Goods (`suggestCapitalLedger`).
  - Capital goods are a capital HSN heading, not a consumable, and ≥ ₹5,000 a unit.
  - Otherwise local or interstate, by state.
  - A vendor's own past choice wins.
- The AR engine's item list carries the company's own oils, so sales lines have stock to match.

## Every form follows the review form (7 Oct 2026)

User: "Implement all the changes made on these forms to all the forms in the prototype." The AP/AR/JV review forms are the reference; every other form now matches them.
- **Shared pieces** (`components/inbox/v2/ui.tsx`, `styles/form-workspace.css`):
  - `Field` gets `optional` and `error` props. `OptionalTag`, `FieldError` and `RequiredNote` are new.
  - `Req` is a no-op: required fields are not starred anywhere.
  - `FieldCard` is a section rather than a card: a 14/600 brand title, a hairline above, a two-column grid with 16 rows / 20 columns, and an `aside` slot for `RequiredNote`.
  - `PageDialog` has a `footer` prop: a white band with a hairline above, right-aligned Cancel, then a specific primary.
  - `.modern-field` sizes any control inside a field to 38px, 6px radius and 14px text, with a brand edge and halo on focus and a red edge (no fill) when invalid. It matches triggers by `[role=combobox]` or `[aria-haspopup]`, so ComboBox and date pickers are included. Toolbars and filters outside a field keep 36px.
  - `Input`'s `error` is one 12px left-aligned line.
- **Forms brought over:**
  - Chart of accounts ledger page (`SwitchList` / `SwitchPanel`, no summary banner, scroll to the first invalid field).
  - Inventory stock item (GST switches as a list with dependent panels; HSN hidden while its switch is off).
  - Banking upload statement and transaction sheets (inline errors as well as the toast, a footer band, AI mark on the AI's Voucher Type).
  - GST column mapping, remark, link and portal auth.
  - Sales-upload save template, preview and saved-mapping picker.
  - The create vendor/ledger dialog.
  - Organisation create/rename (now a `PageDialog`).
  - Journal cost allocation (stays 32px in its table row).
  - The workspace's dialogs.
  - The engines' RCM/ITC, GST rate details (`#st-dialog` shares the `#nm-dialog` rules), cost centre, Additional Fields, Customise fields, bill allocation and line sheet dialogs.
- **Known leftovers:**
  - The shared `Notice` danger banner is still pink-filled. It appears on the sales mapping page's "map all mandatory fields".
  - Engine `.cr-sub` subheads are restyled only in `#cr-line`.
  - `#af-dialog` has no live entry point: `#btn-add-details` is never created, and `openAdditional` takes the click event as `only`.

## The AI mark (7 Oct 2026)

User: "Implement the usage of AI suggested or predicted icon throughout the prototype wherever it is required. It should be so thoughtful and relevant." The user chose the sparkle glyph and brand indigo.
- **One glyph, one colour.** Lucide's *sparkles* (`Sparkle`; `Sparkles` and `AiMark` alias it in `components/icons`), always `--pi-brand`, drawn duotone: the main star carries a 22% fill under its stroke and sits on a 20px `--pi-brand-tint` tile with a 5px radius. The user found the plain outline "very simple".
  - React draws it with `components/inbox/v2/ai-mark.tsx`, a focusable sparkle whose tooltip gives the reason.
  - The engines draw the same glyph as `#i-ai` via `AI_GLYPH` and `aiMark(reason)`, styled `.ai-mark` at the end of `bill-form.css`.
  - The old violet `--pi-ai-ink` and teal AI colours are gone from use.
- **When something is marked:**
  - Only a value the AI *decided*: a voucher type, ledger, item, predicted HSN, purchase/sales ledger, column mapping, bank categorisation or a bill-split boundary.
  - Values copied off the document are not marked: numbers, dates, amounts, GSTIN, and a journal note's printed ledgers. Values worked out by a fixed rule are not marked either: due date from credit, supply state from GSTIN, GST and TDS lines from the Act.
  - The mark goes once the value is edited or picked by hand, and it is never shown on a posted record.
  - One mark per decision: banking marks the row's Type, not Type and Ledger.
- **Where:**
  - The inbox Voucher type cell, while the route is the AI's and unedited (`aiPickedType`), with the route reason in the tooltip.
  - "Post as": the sparkle beside the reason line.
  - AP/AR line items and ledgers: the sparkle replaces the word "Suggested"; "New" keeps its word with the sparkle in front. A predicted HSN gets a small mark in its cell.
  - The purchase/sales ledger picker, with the reason kept as a kind (`purchaseLedgerAiKind`: habit / capital / supply) so it follows the bill.
  - The master dialog's header tag, banking's Type column, the GST and sales-upload column mapping, and the bill splitter's split boundaries and "AI proposed" pill.
  - The kickstart and loading screens use the sparkle decoratively for "the AI is preparing this".

## Priority form (6 Oct 2026, supersedes the 5 Oct rule below)

The user found the form carried too many fields, then drew the line: the voucher's own fields and the party with all of its details stay on the form, each in its own section. Everything else sits under **More details**. It expands in place, because footer sheets and dialogs were both rejected earlier.
- **Voucher type moved to the review header (7 Oct 2026, supersedes the next point while reviewing).** User: "Add the voucher type inside the post as section because that influences the voucher type as well. Both should be editable individually."
  - **One control, not two** (user: "They should be the same components not two different ones"). It is a grouped select labelled Post as (`#inbox-post-as`), and the trigger reads "Purchase Voucher / Debit Note": the book in grey, the type in ink, and the top bar's breadcrumb slash between them. A `›` there read as a second control beside the caret (user: "the two icons are confusing").
  - The menu holds each book as a group heading in a fixed order (Purchase, Sales, Journal), with hairline separators and that book's form types under it (`FORM_VOUCHER_TYPES` in `store.ts`). Values are `route|type`, because "Debit Note" is in two books.
  - `setVoucherType` changes the type within the book, or moves the document to the other book (`switchRoute`) with that type. A book's first type is what choosing the book alone used to do.
  - A workspace effect pushes the header's type into the AP/AR form's own (now hidden) select and fires its change. It retries, and runs again when a route switch ends. `apDocumentFor` and `arDocumentFor` also seed the type by name. The JV reads it from the store.
  - `.cr-type` is hidden only while `#inbox-post-as` is on the page (`body:has(...)` in `bill-form.css`). Hand-raised vouchers and posted records keep the type in the form.
  - With the title gone, "All fields required unless marked optional" sits on the Voucher heading's line, right-aligned. Its row is collapsed and the note offset 4px onto the heading's text line (same `body:has(#inbox-post-as)` scope).
- **Voucher type heads the form** on all three: it replaces the "Bill/Invoice/Journal details" title, because it is a voucher-level choice, not a field. It reads as one line, a "Voucher type" label beside an 18px title-style picker with no box until hovered, and sits 16px above the first section. The user found the first, stacked 22px version too big.
  - AP/AR: the engine's select lies invisibly over a `.cr-type-value` span that BillReview keeps in sync. A select sizes itself to its options' 14px text, so it can't be the title itself. `.cr-type` carries the engine's `#sec-bill`/`#sec-invoice` anchor id.
  - JV: shadcn's trigger, `.cr-type-trigger`.
- **The main card is a twelve-track grid**: thirds are 4 tracks, halves 6.
- **AP:** the Voucher section is in thirds: voucher date, voucher no., supplier invoice no. / bill date, due date, GST registration. The Vendor section is one row: vendor and billing address 5:7. At 1440 the name and the address both read in full; halves left the address 30px short.
  - **The vendor's details nest under the vendor field** (user: "nest the Vendor details inside vendor field"). GST treatment, GSTIN, source and destination of supply (and the vendor cost centre when it applies) sit in `#cr-party-details`, a tinted panel notched under the vendor box with the four fields in quarters.
  - It opens from a summary on the vendor's label line ("24AAGCA6469H1ZJ · GJ → KA ⌄", `.cr-party-toggle`). It opens on its own while any of its fields is open or wrong, and Needs you opens it.
  - Rejected along the way: the party at two thirds (too wide), the address at a third (truncated), a three-row halves layout and a two-row 5:7 + thirds layout (too much space). More details holds Accounting (cost centre a third, narration the rest; thirds with the purchase ledger) and Additional details.
- **AR:** the same, with Customer PO no., Invoice date and a Customer section.
- **Values off the master** (voucher no., billing address) are the same white field as the rest; the pencil marks the lock. The grey fill read as odd.
- **Cost centre is one picker, not a Class/Centre switch** (user: "a different approach instead of a toggle"). It offers "Set per line", a "Classes · split across centres" group, then the centres by category, so choosing is the whole decision.
  - AP/AR: `.cr-cc-pick` (built in `review-layout.ts`, values `class:<id>`/`centre:<id>`). BillReview flips the engine's hidden `#cc-toggle` when needed and sets `#cc-pick`.
  - JV: the shadcn Select sets `costMode` with the value.
- **JV:** a single Voucher section, with no More details (7 Oct 2026; user: "In journals there is only cost centre in the accounting section so you can just remove it and add cost centre to the main section"). The rows are voucher date · voucher no. · GST registration / reference no. · reference date · header cost centre (a third, 38px) / narration across the card. Every JV field is on the form.
- Section heads are `.cr-subhead--main` and always show. The toggle's collapsed line names the groups it holds ("Accounting · Additional details"). Open or closed carries to the next document, shared across the three forms.
- **A hidden field never hides a problem.** On AP/AR, once the form has loaded, a hidden field that turns open or wrong (the ledger, say) is surfaced above the toggle and stays there for that bill. Surfacing applies only while More details is closed; opened, every field sits in its own section (7 Oct 2026, user objected to Additional details errors showing under Vendor). An optional group with an error shows while the error lasts. Needs you opens More details when it jumps to a field still inside it. Every JV required field is in its Voucher section. Approve still checks every field.
- AP/AR are built as one card (`data-card="main"`) and one grid. CSS `order` places the surfaced fields above the toggle, so no engine node moves.

**Every form looks like the AP form (6 Oct 2026, "the other changes made on the AP form should be done in the rest").**
- `styles/bill-refinement.css` (palette, open sections with brand titles, 38px boxes, blue Items heading, tinted total cell, container queries) now covers AR and JV too. Its selectors are `:is(.ap-sheet, .ar-sheet, .jv-form)`, and `workspace.tsx` puts `.payable-review` on every route's review, not just AP.
- **JV is rebuilt on the bill's markup:** "Journal details", "All fields required unless marked optional", one main card of labelled boxed fields three across, the same More details toggle and Voucher subhead. The bill-form grid and priority rules include `.jv-form`, and the shadcn controls get the 38px box at the end of `bill-form.css`.
- **The JV total/progress header is gone, as on AP.** The totals card shows the total. A failed approve opens Needs you through the `JOURNAL_APPROVE_FAILED` window event from `workspace.tsx`.
- The last totals cell is Difference on the JV: brand while it balances, danger while it doesn't.

Everything else (voucher type and number, GST registration, GST treatment, GSTIN, supply states, billing address, ledger, cost centre, narration, Additional details) sits under **More details**. It expands in place, because footer sheets and dialogs were both rejected earlier. Its collapsed line shows voucher type · number · source → destination (IGST or CGST + SGST) · "+N more". Open or closed carries to the next bill.

**A hidden field never hides a problem.** Once the form has loaded, a hidden field that turns open or wrong (amber or red dot) is surfaced beside the five and stays there for that bill. An optional group with an error shows while the error lasts. Needs you opens More details when it jumps to a field still inside it. Approve still checks every field.

Built as one card (`data-card="main"`) and one grid. CSS `order` places the surfaced fields above the toggle, so no engine node moves.

## Optional fields (5 Oct 2026)

**The rule:** a field that is required, or that decides the posting or the tax, is always visible in its card. Everything optional goes in one Additional details block. This was settled after the user rejected three earlier versions: footer sheets, every field laid out, and everything behind dialogs.

- **Cards:**
  - Voucher, Vendor/Customer and Accounting show their fields in full.
  - The Vendor card holds the GST treatment, GSTIN, supply states and billing address.
  - Cards never fold on their own. A card folded by hand reopens when it has more to resolve.
- **Additional details** is the last card before Items. It holds every enabled optional group as one row, in this order: Order references, Ship to, Receipt & dispatch, Import & customs.
  - Each row shows the group's filled values, or a faint "Add", plus "Edit".
  - Edit opens the Additional Fields dialog on that group alone: `openAdditional(groupId)` adds `.afd--single`, which hides the rail and the group switch and scopes validation to the group.
  - The engines draw the rows (`renderAddl`, `XF_ORDER`) into `[data-xf-slot="additional"]`. With no group on, the block says so.
- **Customise fields** (the engine's `#btn-field-config`) sits in the Additional details card's head.
- **Ship-to tax note:** when the ship-to state differs from the destination of supply, a note under Destination of supply says so and links to Ship to (`#xf-tax-note`).

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
- **Master dialogs (item, ledger, vendor, customer) read as the bill form (7 Oct 2026).** Rendered by `renderNmDialog` in both engines; styled at the end of `styles/dialog-workspace.css`; header and tabs from `dialog-refinement.ts`.
  - Header: the title, one "Suggested from this document" tag (the AI mark) when the AI filled fields, and "Required unless marked optional" on the right. No `*` marks; optional fields say "Optional".
  - A field's AI reason is a tooltip on its label. The "↳" reasoning line under every field is gone. Real caveats (`.nmd__note`) stay as faint text.
  - Brand section heads with a hairline above. No tabs (8 Oct 2026, see Master form rework).
  - Fields use the form's metrics: 12px/500 label, 38px box, 6px radius, 14px text. Errors are a red edge with no fill.
  - A run of switches is one bordered list. A switch and the fields it opens are one tinted panel (`.nmd__group--sub`), including a dependent of a plain switch.
  - White footer, Cancel and "Create item / ledger / vendor".

**Shell:** `components/sidebar-layout` (the workbench navy rail with groups, a guide rail and a company card) and `components/top-bar-layout` (breadcrumb `NAV_TRAIL`, the search pill and ⌘K that focus the page search via "/", org chip, sync chip, notifications, and preferences with theme). The review detail renders inside the shell; the breadcrumb names the file.

**Page pattern (8 Oct 2026, supersedes the eyebrow and title):** no visible page heading. User: "I can still see the headings"; the top bar trail already names the page. `PageTopBar`, `MasterHeading` and `PageHead` render the title as an `sr-only` h1 and ignore `eyebrow`. The first row is the page's underline tabs (14px, a 2px brand underline, `CountPill` chips) on the left, passed as `PageTopBar`'s `leading` (or `UnderlineTabs inline`), with its actions on the right. The toolbar comes next, then the content in white cards on the `pi-page` canvas with an `--inset-page` gutter.
  - `MasterHeading` keeps its meta line ("72 ledgers in 28 groups") on the left.
  - A sub-page that the trail does not name (Banking's Statement Logs and Transactions) keeps its title at 18/600, beside a back chevron that replaces the old eyebrow link.
  - The sales upload steps keep their step title and drop only the eyebrow.
  - Sheets and dialogs keep their own heads.
  - **Sync is only in the top bar** (user: "Sync button should be only at the top bar"). Chart of Accounts, Stock items and Banking transactions no longer draw their own Sync. Known gap: the top bar's sync modal lists Ledgers and Stock Items with a fixed count of 0 (`SYNC_MASTER_MODULES`) and has no bank module, so `coaActions.sync`, `inventoryActions.syncItems` and `bankingActions.sync` have no caller until it is wired to them.

**Table pattern** (behaviour unchanged):
- Edge to edge, no card: the page scroller owns both axes and the header sticks at the top of the content area.
- **Pager is sticky at the bottom of the viewport (7 Oct 2026, user: "shouldn't be hidden under the end of the table").** It sits below the page scroller, not inside it, so the scroller (and its horizontal bar) ends above the pager; the user asked for the bar "inside the table, not inside the pager". The floating bulk bar sits `--inbox-footer-h` + 16px above the bottom so the two never overlap.
- Head strip `bg-pi-head-bg`, header text 12px/500 `text-pi-body`.
- Rows `h-14` (56px) with `px-4` cells.
- **Column rules (7 Oct 2026, user asked for dividers between columns):** a hairline `pi-line` on every column's right edge except Actions.
- **Pinned edges shade, they don't rule:** while columns scroll under a pinned bookend, its inner edge casts a 12px `--pin-shade` gradient (`.pin-edge-l/r` in `globals.css`), and the left one drops its hairline. A fixed hairline there doubled up with the rule of the column sliding beneath (user: "fixed columns lines are overlapping"). `usePinEdges` sets `data-pin-l`/`data-pin-r` on the grid only while something is under that edge. The left edge is the last pinned column, else the checkbox.
- **Overlay scrollbars, no native bars (7 Oct 2026, user: "the horizontal scroll should come over the line item instead of occupying a complete block"):** page scrollers take `scrollbar-hide`, and `components/common/overlay-scrollbars.tsx` draws thin thumbs over the rows, shown on hover, while scrolling and while dragged. It sits as the scroller's sibling in a `relative` box the size of the scroller, so it ends above the pager. Pinned-edge shading is `usePinEdges` (`hooks/pages/inbox/use-pin-edges.ts`).
- **White ground beside a scrolled table (7 Oct 2026):** page scrollers carry `.table-scroller` (white), their sticky chrome children keep `--pi-page`, and the header's top rule is a `border-top` on the first header row's cells (`.table-region thead`). The table region itself stays exactly the view's width: column sizing measures the grid wrapper inside it, and a region that grew with the table fed the columns back into their own maximums.
- **Applies to every page-level table** (registers, masters, GST, banking, inventory, sales upload). Dialog tables and the approved-record tables take the column rules only. Form line editors (journal lines, godown split), engine sheets and the document preview keep their own rules.
- **Hierarchy by ink (`COLUMN_INK` in `workspace.tsx`):** file name, vendor and amount are ink at 500; voucher type, GST registration, source, user and received are body ink at 400; the file size is faint 12px. Status keeps its dot.
- **Alignment:** every value starts on the header label's 16px line. Inline pickers (`CELL_TRIGGER`) bleed 8px into the cell padding for their hover wash, and status pills take `-ml-2` so the dot sits on the line. Actions header and kebab are centred.
- **Dropdown carets always show (7 Oct 2026, supersedes "carets are hover-only").** User: "Don't show the dropdowns on just hover, fields with dropdown should be obvious otherwise the user won't know it." Pickers (`CELL_TRIGGER`) rest in faint ink and go body ink on row hover, focus, while open, or under the grid cursor. The status menu caret rests at 60% opacity.
- `group-hover:bg-pi-row-hover`. A selected row gets `bg-pi-brand-tint` plus an inset 2px brand edge on the first cell.
- `table-sizing.ts` minimums include the 16px header padding.

**All three entry forms use the Finops review form (4 Oct 2026).** These are bills (AP), sales invoices (AR) and journals (JV). The user asked for "all the forms in the prototype" after the AP version below. Master forms (ledger, item, vendor dialogs) were left alone, because they have no voucher or line table for the pattern to fit.
- **AR:** the AR engine (`public/ar/index.html`) carries the same LINES block, mode guard, add-button, approve-failure and cost-centre patches as AP. They are ported with AR's field names (`invoiceHsn`/`invoiceRate`/`invoiceUnit`, `salesLedger`).
- **Layout:** `composeBillForm(doc, card, kind)` handles both engines. The rows for AR are Customer PO no., Customer and Sales ledger, and Invoice date sits in the Voucher details sheet.
- **Review layer:** `BillReview` takes `kind`. `review-assistant.tsx` is now only the hook that mounts it; the old `ReviewAssistant` overview is deleted.
- **JV (React):**
  - `journal/index.tsx` composes the header, resolved count, Needs you, totals card (debit · credit · difference) and an Expand sheet.
  - `journal/voucher-details.tsx` holds the label rows and More details (see Priority form). The Voucher details sheet is gone.
  - `journal/ledger-lines.tsx` has the Finops items head and a grid bar.
  - `journal/sheet.tsx` is a **Radix** dialog carrying `jv-form cr-sheet`. A native modal dialog makes the Radix portals (Select, ComboBox, date Popover) inert.
  - The imbalance banner, the separate narration block and `voucher-totals.tsx` are gone.
- **Styles:** `styles/bill-form.css` is scoped `html :is(.ap-sheet, .ar-sheet, .jv-form)`.
- **Engine menus in sheets:** in both engines, `sheetPortal()` returns a fixed, zero-size layer inside the open `dialog.cr-sheet`. The engine's menus and the why-tip would otherwise render on the inert `<body>`.

**Review form refinements (4 Oct 2026, from user feedback: "icons too confusing and overused", "symmetry missing", "AI colour random").**
- **Status dots:** a voucher card row carries one mark in a fixed 7px trailing column: an amber dot when open, a red dot when wrong, nothing when done. The green checks and alert icons are gone.
- **Compact grid (5 Oct 2026, AP/AR):** the user found the row-per-field cards too long, then called the first grid "pathetic". The form is one bordered block (`.cr-cards`) of sections: Voucher, Vendor/Customer, Accounting and Additional details. The CSS is the "compact grid" block at the end of `bill-form.css`, scoped to `.cr-cards`, so the journal is untouched. The journal still has its single footer link.
  - **Sections:** each has an 11px overline with an "N open" pill, then a three-column grid with labels above values (label to field 4px, field to field 16px).
  - **Fields:** every value is a 36px bordered field box. Selects show their caret at rest. Fields filled from the master (`input[readonly]`) get the head-bg fill. A proposed new party keeps the dashed teal box.
  - **Required vs optional:** required is the norm and is not marked; optional fields show a faint "Optional". The `*` `<i>` stays in the DOM because BillReview reads it. The header reads "All fields required unless marked optional".
  - **Status dot** sits right after its label.
  - **Identifiers** (voucher no., supplier invoice/PO no., GSTIN) are set in IBM Plex Mono; their placeholders stay in Open Sans.
  - **Spans:** GST registration and billing address take the full width; the party takes two columns; cost centre takes one column with narration in the other two.
  - **Additional details** groups are grid cells: a label over a field box holding the summary and "Edit", or a dashed box with "+ Add". Ship to spans two columns. Customise fields is a quiet ghost button in the section head.
  - **Symmetry rule (the user asked for a symmetric form):** every grid row is filled edge to edge, and every field sits on the same three column lines at 36px.
    - The cost centre switch ("Class / Centre") sits on the label line, so the picker is level with a single-line narration (it grows when focused).
    - With a stock line, the ledger, cost centre and narration are three equal columns.
    - Additional details lay out by count: four groups make a 2×2, two make halves, otherwise thirds. Ship to no longer spans two columns.
- **Hover-only controls:** calendars, pencils, the table's line arrow, bin and allocation pill show only on row hover or focus. Dropdown carets do not: since 7 Oct 2026 every field that opens a list shows its caret at rest. That covers select background carets, the item picker's `.cellcaret`, the purchase/sales ledger picker and JV ledger cells (end of `bill-form.css`).
- **AI suggestions** use the AI mark (see "The AI mark" below). The earlier teal rule (4 Oct) is superseded.
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
- **AI suggestions:** a matched master shows the AI mark alone; a proposed master shows the mark plus "New". A "New" item or ledger is created from its own table cell (7 Oct 2026, user: "just like for vendors"): a package-plus or book-plus button after the name opens the item or ledger master form filled in from the line. The Item and Ledger columns are 216px to fit it, and the code under a cell reads SAC for 99xxxx and HSN otherwise.
- **Styles:** `styles/bill-form.css`. The document pane defaults to `--doc-w: 36%`. AR still uses the old path and still has modes.
- **Document pane height (7 Oct 2026):** the engines size `.doc-pane` from the window (100dvh minus their own 51px top bar) and stick it 51px down, which ran it past the bottom of the screen inside the app shell. `useSheetHeight` publishes the sheet scroller's height as `--sheet-h`, and the end of `sheet-bridge.css` re-derives `--pane-h` from it (engine caps kept) and sticks the pane one gutter from the top. Covers AP and AR.
- **Sync risk:** engine edits would be overwritten by `scripts/sync-ap-sheet.cjs`, whose upstream is absent here. Rebuild with `node scripts/build-ap-sheet.cjs`.

**Review:** the `.source-stage` scope (`globals.css`) puts the document on the workbench navy radial and re-points the tokens inside it. The paper stays white.

## Design system (pre-overhaul state, for reference)


- Tokens are in `styles/globals.css` (Bloocks palette, as hex and HSL) and `tailwind.config.ts` (named type scale: `title-*`, `h1-6`, `label-1..3`, `body-1..4`, `caption-*`).
- Dark mode is not functional.
- Local primitives are in `components/inbox/v2/ui.tsx`: `T` type map, `Pill`, `StatusPill`, `Notice`, `Field`, `FieldCard`, `PageDialog`, `PageButton` and others.
- The CSS modules (`kickstart`, `upload-*`, `preview`, `bill-splitter/split-dialogs`) hardcode hex values and run their own token layers.
- Icons are lucide-react, about 114 distinct, with duplicate aliases.
- Module screens duplicate Tabs, Pager, SearchBox, sync icon, DropZone and form helpers.
