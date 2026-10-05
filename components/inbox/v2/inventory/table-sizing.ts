import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";

/**
 * The Items table's column sizes, under the Inbox's rule (TABLE-RESIZING.md):
 * no minimum below what the header needs for its label and its sort and
 * filter buttons — 16px padding each side (Precision Indigo; +8 over the
 * old 12px), the label, 4px gaps, 20px a button. Tally sync holds a dot-chip
 * ("Not synced") rather than a 16px icon, so it is that wide.
 */
export const ITEM_SIZES: ColumnSizes = {
  name: { min: 128, preferred: 300, max: 560 },
  under: { min: 120, preferred: 180, max: 320 },
  category: { min: 140, preferred: 170, max: 300 },
  unit: { min: 108, preferred: 130, max: 220 },
  openingStocks: { min: 160, preferred: 170, max: 260 },
  sync: { min: 132, preferred: 140, max: 140 },
};
