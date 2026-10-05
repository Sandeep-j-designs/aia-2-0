import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";

/**
 * Column limits for the Sales upload preview grid, under the Inbox's rule (see
 * ../TABLE-RESIZING.md): no column narrower than its header needs for the
 * label plus its sort and filter buttons.
 *
 * Precision Indigo widened the header cells from px-3 to px-4, so every
 * minimum carries 8px more than the label and its buttons need.
 */

/**
 * The preview grid. Preferred widths are production's PREVIEW_COLUMNS
 * widths; minimums hold the header label and its buttons.
 */
export const PREVIEW_COLUMN_SIZES: ColumnSizes = {
  invoice_date: { min: 140, preferred: 140, max: 200 },
  reference_number: { min: 150, preferred: 150, max: 240 },
  customer_name: { min: 192, preferred: 192, max: 320 },
  voucher_type: { min: 128, preferred: 130, max: 200 },
  voucher_number: { min: 192, preferred: 192, max: 260 },
  due_date: { min: 118, preferred: 132, max: 200 },
  gstin: { min: 144, preferred: 150, max: 220 },
  place_of_supply: { min: 144, preferred: 150, max: 240 },
  cost_centre: { min: 120, preferred: 130, max: 220 },
  sales_ledger: { min: 168, preferred: 180, max: 260 },
  item_name: { min: 118, preferred: 210, max: 340 },
  hsn_sac: { min: 104, preferred: 104, max: 160 },
  quantity: { min: 104, preferred: 110, max: 160 },
  unit_rate: { min: 108, preferred: 120, max: 180 },
  item_amount: { min: 132, preferred: 132, max: 200 },
  ledger_name: { min: 128, preferred: 150, max: 260 },
  ledger_amount: { min: 140, preferred: 140, max: 200 },
  cgst_amount: { min: 136, preferred: 136, max: 200 },
  sgst_amount: { min: 176, preferred: 176, max: 220 },
  igst_amount: { min: 132, preferred: 132, max: 200 },
  tax_amount: { min: 158, preferred: 158, max: 220 },
  total_amount: { min: 158, preferred: 158, max: 220 },
  narration: { min: 118, preferred: 180, max: 360 },
  gst_registration: { min: 180, preferred: 220, max: 300 },
  row_status: { min: 144, preferred: 144, max: 200 },
};
