/**
 * Automatic layouts adapt; manual layouts retain exact CSS-pixel widths.
 *
 * `min` is the floor for both, and no column may go below the width its header
 * needs to show in full: 16px left padding + label + 4px gap and 20px for each
 * sort/filter button + 16px right padding (Precision Indigo cell rhythm,
 * --pad-cell 12/16), plus a few px of slack for font
 * rendering. A header that truncates hides the name of what the column holds.
 */
export type ColumnSizes = Record<
  string,
  { min: number; preferred: number; max: number }
>;

export const COLUMN_SIZES: ColumnSizes = {
  File: { min: 188, preferred: 240, max: 600 },
  Source: { min: 132, preferred: 136, max: 200 },
  User: { min: 158, preferred: 200, max: 360 },
  Vendor: { min: 128, preferred: 160, max: 360 },
  "Voucher type": { min: 160, preferred: 160, max: 240 },
  "GST Registration": { min: 180, preferred: 180, max: 360 },
  Amount: { min: 128, preferred: 130, max: 220 },
  Received: { min: 176, preferred: 190, max: 280 },
  Status: { min: 176, preferred: 180, max: 240 },
};
/**
 * The Purchases register's bill columns, under the same rule: no minimum below
 * what the header needs for its label, sort and filter buttons. Each `min`
 * rose by 8px when the header moved from 12px to 16px side padding
 * (Precision Indigo, px-4 cells); `preferred` never sits below `min`.
 * Source was raised to 132 for Open Sans (4 Oct 2026): "WhatsApp" with
 * its icon no longer fit 124.
 */
export const BILL_COLUMN_SIZES: ColumnSizes = {
  voucherNo: { min: 132, preferred: 132, max: 240 },
  invoiceNo: { min: 152, preferred: 152, max: 280 },
  party: { min: 118, preferred: 180, max: 400 },
  date: { min: 132, preferred: 136, max: 220 },
  due: { min: 138, preferred: 138, max: 220 },
  amount: { min: 162, preferred: 162, max: 240 },
  payment: { min: 150, preferred: 150, max: 240 },
  attachments: { min: 134, preferred: 134, max: 200 },
};
export const SELECT_WIDTH = 40;
/**
 * The kebab column. Fixed, like the checkbox: it holds one 32px button, so
 * there is nothing in it for extra width to do, and both bookends stay out of
 * the distribution below.
 */
export const ACTIONS_WIDTH = 78;
export const preferredWidths = (sizes: ColumnSizes) =>
  Object.fromEntries(
    Object.entries(sizes).map(([key, size]) => [key, size.preferred])
  );
export const DEFAULT_WIDTHS = preferredWidths(COLUMN_SIZES);
/*
  Every helper below takes the column map last and defaults it to the Inbox's,
  so the Inbox's calls read as they always did and other tables pass their own.
*/
export function clampWidth(
  column: string,
  value: number,
  sizes: ColumnSizes = COLUMN_SIZES
) {
  const size = sizes[column];
  return Math.round(
    Math.max(
      size.min,
      Math.min(size.max, Number.isFinite(value) ? value : size.preferred)
    )
  );
}
export function readWidths(
  value: unknown,
  sizes: ColumnSizes = COLUMN_SIZES
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, width]) =>
          Object.prototype.hasOwnProperty.call(sizes, key) &&
          typeof width === "number" &&
          Number.isFinite(width)
      )
      .map(([key, width]) => [key, clampWidth(key, width as number, sizes)])
  );
}
export function sizeColumns(
  shown: string[],
  available: number | null,
  manual: Record<string, number>,
  sizes: ColumnSizes = COLUMN_SIZES
): Record<string, number> {
  if (Object.keys(manual).length)
    return Object.fromEntries(
      shown.map((key) => [
        key,
        clampWidth(key, manual[key] ?? sizes[key].preferred, sizes),
      ])
    );
  const preferred = shown.reduce((sum, key) => sum + sizes[key].preferred, 0);
  const minimum = shown.reduce((sum, key) => sum + sizes[key].min, 0);
  const maximum = shown.reduce((sum, key) => sum + sizes[key].max, 0);
  const target = Math.round(
    Math.max(
      minimum,
      Math.min(
        maximum,
        available === null
          ? preferred
          : available - SELECT_WIDTH - ACTIONS_WIDTH
      )
    )
  );
  const growing = target >= preferred;
  const room = growing ? maximum - preferred : preferred - minimum;
  // Carry rounding across columns so exact fits never create a 1px scrollbar.
  let fractional = 0,
    allocated = 0;
  return Object.fromEntries(
    shown.map((key) => {
      const size = sizes[key];
      const capacity = growing
        ? size.max - size.preferred
        : size.preferred - size.min;
      fractional +=
        size.preferred + (room ? ((target - preferred) * capacity) / room : 0);
      const width = Math.round(fractional) - allocated;
      allocated += width;
      return [key, width];
    })
  );
}
