import type { Item } from "@/components/inbox/v2/store";

/**
 * What the inbox hands the AR sales invoice sheet.
 *
 * The AP equivalent is config/pages/inbox/ap-document.ts, and the difference
 * between the two is the difference between the documents. A bill is read off
 * a supplier's paper, so the extraction has an opinion about every line and the
 * sheet is given codes, rates and a vendor to reconcile against. An invoice we
 * issued was read off our own: it carries a customer, a number, a date, the
 * lines we billed and the tax we charged, and nothing about quantities or
 * HSN codes, because our own document did not state them in the upload.
 *
 * Names, not ids. Everything here is what was printed — "Anvaya Technologies",
 * "Service Income" — and the sheet resolves those against the book it holds,
 * because the inbox has no way to know which of them this company keeps a
 * master for. A name with no master arrives at an empty picker, which is a
 * state the sheet is built for.
 *
 * DEV: replace with GET /api/inbox/:id/document.
 */

export type ArSeedLine = {
  text: string;
  hsn: string;
  amount: number;
  /** Percent. The sheet recomputes the tax; this is the rate to compute at. */
  gst: number;
  /** An income or sales ledger, as printed. "" when the document named none. */
  ledger: string;
};

export type ArSeedDocument = {
  customerName: string;
  customerGstin: string;
  customerPan: string;
  voucherNo: string;
  invoiceDate: string;
  dueDate: string;
  narration: string;
  lines: ArSeedLine[];
};

/**
 * The rate the document charged, as one number.
 *
 * The upload states tax as amounts per head — CGST and SGST, or IGST — and the
 * sheet works in rates, because it is about to decide for itself which of those
 * heads apply: a Karnataka customer splits into CGST/SGST and a Maharashtra one
 * does not, and that is the sheet's call off the two states, not ours to carry
 * over. So the heads are summed back into the rate that produced them and the
 * split is made again where it belongs.
 *
 * Rounded to the nearest half percent, which is every GST slab there is — 0,
 * 0.25, 3, 5, 12, 18, 28 — so a rupee of rounding in the upload cannot turn 18
 * into 17.98 and leave the sheet without a tax master to match.
 */
const rateFrom = (subTotal: number, taxes: Record<string, number | undefined>) => {
  const charged = Object.values(taxes || {}).reduce<number>(
    (sum, v) => sum + (v || 0),
    0
  );
  if (!subTotal || !charged) return 0;
  return Math.round(((charged / subTotal) * 100) / 0.5) * 0.5;
};

export const arDocumentFor = (item: Item): ArSeedDocument | null => {
  const invoice = item.original.invoice;
  if (!invoice) return null;

  const gst = rateFrom(invoice.subTotal, invoice.taxes);

  return {
    /*
      The form's values win over the extraction's. By the time this is built the
      accountant may have corrected the customer or the date in the inbox's own
      header, and re-seeding the sheet with what the file said would quietly
      undo that.
    */
    customerName: item.form.party || invoice.customer,
    customerGstin: "",
    customerPan: "",
    voucherNo: item.form.voucherNo || invoice.voucherNo,
    invoiceDate: item.form.date || invoice.invoiceDate,
    dueDate: item.form.due || invoice.dueDate,
    narration: item.form.narration || "",
    lines: (invoice.items || []).map((line) => ({
      text: line.desc,
      /* Our own invoice upload carries no HSN column. The sheet predicts one. */
      hsn: "",
      amount: line.amount,
      gst,
      ledger: line.ledger || "",
    })),
  };
};
