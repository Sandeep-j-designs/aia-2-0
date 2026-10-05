/**
 * The sales invoice's own working state.
 *
 * Ported from Figma — Karbon · AI Accountant, node 12759:94644 ("Accounts
 * Receivables - Add New Invoice - Empty").
 *
 * This is deliberately NOT the Inbox's shared `Form`. A sales invoice in Tally
 * carries three separate tables — stock items, non-inventory ledger charges,
 * and tax ledgers — plus a per-voucher field configuration, and none of that
 * flattens into the nine fields the Inbox list and its store need. `Form`
 * stays the normalised projection the queue reads (amount, party, dates); this
 * is the document behind it, the same way `Item.sheet` holds the AP bill
 * sheet's state.
 *
 * DEV: on transplant this becomes the AR module's own voucher payload. The
 * seam is `deriveLines` in components/inbox/v2/store, which is what keeps the
 * Inbox's projection in step with the tables below.
 */

/** A stock-item line — Item Mode's table. */
export type ArItemRow = {
  id: string;
  description: string;
  item: string;
  godown: string;
  costCentre: string;
  tax: string;
  quantity: number;
  unitRate: number;
  /** Percent. The design's cell is a figure with a unit toggle beside it. */
  discount: number;
  amount: number;
};

/** A non-inventory charge posted straight to a ledger — the Ledgers table. */
export type ArLedgerRow = {
  id: string;
  description: string;
  ledger: string;
  tax: string;
  costCentre: string;
  amount: number;
};

/** A tax ledger — the Taxes table. */
export type ArTaxRow = {
  id: string;
  ledger: string;
  costCentre: string;
  amount: number;
};

/**
 * Which optional fields the voucher shows, keyed by field id.
 *
 * Field Configuration (node 12759:96901) is a per-voucher-type setting: the
 * eight sections down its left edge each hold a list of toggles, and what is
 * on decides what the form renders. Only Basic Details has its fields drawn in
 * the frames; the rest are named but empty, so they are declared here and
 * carry no rows yet.
 */
export type ArFieldConfig = Record<string, boolean>;

export type ArFieldConfigField = {
  id: string;
  label: string;
  description?: string;
};

export type ArFieldConfigSection = {
  id: string;
  label: string;
  fields: ArFieldConfigField[];
};

/**
 * The eight sections, in the order the modal lists them.
 *
 * Basic Details is the only one the design populates. The other seven are
 * named in the frame's left nav with no content drawn, so they render as
 * themselves with nothing in them rather than being invented — the shell is
 * the design, the rows are pending copy.
 */
export const AR_FIELD_SECTIONS: ArFieldConfigSection[] = [
  {
    id: "basic",
    label: "Basic Details",
    fields: [
      {
        id: "referenceDate",
        label: "Reference Date",
        description:
          "Records the date you want to book this entry. Defaults to bill date if not set.",
      },
      { id: "narration", label: "Narration" },
    ],
  },
  { id: "party", label: "Party & Consignee", fields: [] },
  { id: "gst", label: "GST Details", fields: [] },
  { id: "items", label: "Item Details", fields: [] },
  { id: "costCentre", label: "Cost Centre", fields: [] },
  { id: "logistics", label: "Logistics & Movement", fields: [] },
  { id: "orders", label: "Order & References", fields: [] },
  { id: "compliance", label: "Compliance", fields: [] },
];

/** Defaults: both Basic Details toggles start off, as the frame shows them. */
export const AR_FIELD_DEFAULTS: ArFieldConfig = {
  referenceDate: false,
  narration: false,
};

/**
 * The four collapsible groups behind the "Additional Details" bar.
 *
 * The frame states the count ("·4 of 4 sections yet to be filled") but draws
 * none of the groups open, so these are the four it counts and nothing more.
 */
export const AR_ADDITIONAL_SECTIONS = [
  "Party & Consignee",
  "Logistics & Movement",
  "Order & References",
  "Compliance",
];

export type ArInvoiceState = {
  mode: "item" | "accounting";
  /** The `* Sales Ledger` picker above the Item Details table. */
  salesLedger: string;
  items: ArItemRow[];
  ledgers: ArLedgerRow[];
  taxes: ArTaxRow[];
  fields: ArFieldConfig;
};
