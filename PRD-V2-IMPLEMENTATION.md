# Inbox PRD v2 implementation

The active prototype is http://localhost:3000/inbox/INB-2041.

Implemented company-scoped queues, onboarding, six status tabs and counts, search and advanced filters, session column preferences, mixed-route bulk approval with skip reasons, bulk reassignment, deletion and restoration. Review supports AP and AR through the full entry sheet, editable balanced journals, route overrides, AI and edited indicators, persistent drafts, source previews, duplicate checks, failed-extraction recovery and manual entry. Approved items retain a read-only snapshot and link to the posted voucher view. Audit history, local telemetry and demo route permissions are included.

File uploads preserve original files in IndexedDB and calculate content hashes. Email and WhatsApp receive flows, extraction, role permissions, accounting posting and analytics are simulated locally; they are not connected to production services. Spreadsheet files are preserved for download rather than rendered as a spreadsheet preview. Seeded source previews are illustrative facsimiles.

State persists in browser localStorage under `aia.inbox.prd.v2`; uploaded files use IndexedDB. Browser clearing removes prototype data. The original pages and AP sheet were backed up under `.backups/prd-v2`.

Validation completed: TypeScript, production build with `NEXT_DIST_DIR=.next-prd-check npm run build`, and `node tests/inbox-v2.test.cjs`. Browser checks covered onboarding, duplicate correction, AP field validation, switching to a balanced journal and approval returning to the queue with updated counts. The demonstration item INB-2041 was approved as a journal during verification, with invoice reference INV-1182-REVIEWED.

Implementation lives in `components/inbox/v2`, with the embedded AP/AR bridge in `public/ap/index.html`. The app bundles Open Sans locally so builds do not require fetching Google Fonts.
