import type { TourStep } from "@/types/pages/guide";

/**
 * The Inbox walkthrough — a document from the moment it is sent in to the
 * moment it is approved.
 *
 * It demonstrates rather than instructs: the guide sends three sample bills in
 * itself, waits for the real upload and extraction to run, and opens the one
 * it sent. Every screen is the screen — the panel, the queue, the bill review
 * — carrying mock documents. All the user does is press Next.
 *
 * DEV: production drives this through the guide service against the user's own
 * documents, so the `action` on a step becomes a "wait for the user to do it"
 * step there. The copy is unchanged by that swap.
 */
export const INBOX_TOUR: TourStep[] = [
  {
    anchor: "nav-inbox",
    placement: "right",
    title: "Your review queue lives here",
    body: "Inbox holds every document waiting on you. Accounts Payable keeps posted bills only.",
  },
  {
    anchor: "inbox-email",
    placement: "bottom",
    title: "Forward it by email",
    body: "Each company has its own address. Every attachment becomes one Inbox item, sender and subject kept.",
  },
  {
    anchor: "inbox-whatsapp",
    placement: "bottom",
    title: "Or send it on WhatsApp",
    body: "Register a number once, then send bills the way your vendors already do.",
  },
  {
    anchor: "inbox-upload",
    placement: "bottom",
    title: "Or upload it here",
    body: "A bill, an invoice or a journal — anything you would otherwise type in by hand.",
  },
  {
    anchor: "inbox-drop-zone",
    placement: "right",
    action: "open-upload",
    title: "This is where documents go in",
    body: "PDF, JPG or PNG, up to 50 at a time. Bank and card statements belong in Banking reconciliation instead.",
    hint: "Press Next and we'll send three sample bills in for you.",
  },
  {
    anchor: "inbox-upload-progress",
    placement: "right",
    action: "demo-upload",
    waitFor: "inbox-row",
    title: "Every file, tracked",
    body: "Each document is listed as it lands. Anything that fails to upload is named here rather than counted.",
  },
  {
    anchor: "inbox-status",
    placement: "bottom",
    title: "AIA reads them for you",
    body: "Received, then Extracting: vendor, GST and totals are pulled out and your Tally ledgers are mapped.",
  },
  {
    anchor: "inbox-tab-review",
    placement: "bottom",
    title: "Prepared documents land here",
    body: "Need review is your working queue. Search and filters narrow it without losing your place.",
  },
  {
    anchor: "inbox-row",
    placement: "bottom",
    title: "One row per document",
    body: "Where it is headed and what it is worth, before you open it. Nothing has been posted yet.",
  },
  {
    anchor: "inbox-preview",
    placement: "right",
    action: "open-record",
    title: "The source, beside the entry",
    body: "The original document stays on screen while you check it. Zoom and rotate if the scan needs it.",
  },
  {
    anchor: "inbox-fields",
    placement: "left",
    title: "What AIA prepared",
    body: "Vendor, dates, line items, GST and ledgers, already filled. Edit any of it — the entry is yours until you approve.",
  },
  {
    anchor: "inbox-route",
    placement: "bottom",
    title: "Check where it posts",
    body: "AIA picks Accounts Payable, Accounts Receivable or Journal. Change the route before you approve.",
  },
  {
    anchor: "inbox-approve",
    placement: "bottom",
    title: "Approve with an audit trail",
    body: "Approve & Next posts to Tally and moves you to the next document in your filtered queue.",
  },
];
