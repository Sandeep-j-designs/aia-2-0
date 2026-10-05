import React from "react";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AR_ADDITIONAL_SECTIONS } from "@/types/pages/inbox/ar-invoice";

/**
 * The bar above Item Details, and the block that closes the form.
 * Figma nodes 12759:96891 and 12759:94777.
 */

const money = (n: number) =>
  `₹ ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Additional Details — a bar standing in for four collapsed groups.
 *
 * The count is the point: it says how much of the voucher has not been
 * answered without spending four sections of the page saying it. The groups
 * themselves are named in the design but never drawn open, so Add Details
 * routes to Field Configuration, which is where their fields are turned on.
 */
export const AdditionalDetails = ({
  filled,
  onAdd,
}: {
  filled: number;
  onAdd: () => void;
}) => {
  const total = AR_ADDITIONAL_SECTIONS.length;
  const remaining = total - filled;
  return (
    <div className="flex max-w-[630px] flex-wrap items-center justify-between gap-3 rounded-md bg-section px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-sm leading-5 text-foreground">
          Additional Details
        </span>
        <span className="text-xs leading-4 text-secondary-foreground">
          ·{remaining} of {total} sections yet to be filled
        </span>
      </div>
      <Button variant="ghost" size="sm" className="text-primary" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add Details
      </Button>
    </div>
  );
};

/**
 * Narration beside the figures.
 *
 * Every row above Grand Total is hidden in the frame's empty state and appears
 * as the invoice earns it — an invoice with no discount does not need a line
 * saying the discount is zero. Grand Total is the one that is always there,
 * because it is what the screen is for.
 */
export const InvoiceTotals = ({
  narration,
  narrationEnabled,
  subTotal,
  discount,
  tax,
  grandTotal,
  readOnly,
  onNarration,
  mark,
}: {
  narration: string;
  /** Field Configuration's Narration toggle. */
  narrationEnabled: boolean;
  subTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  readOnly?: boolean;
  onNarration: (v: string) => void;
  mark?: React.ReactNode;
}) => {
  const rows = [
    subTotal ? { label: "Sub Total", value: subTotal } : null,
    discount ? { label: "Discount", value: discount } : null,
    tax ? { label: "Tax", value: tax } : null,
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[338px_1fr]">
      {narrationEnabled ? (
        <div>
          <Label htmlFor="ar-narration" className="mb-2 font-normal">
            Narration (Optional)
          </Label>
          <Textarea
            id="ar-narration"
            rows={5}
            placeholder="Enter Narration"
            readOnly={readOnly}
            value={narration}
            onChange={(e) => onNarration(e.target.value)}
          />
          {mark}
        </div>
      ) : (
        // Narration is off in Field Configuration by default, and the frame's
        // empty state draws the box anyway — so the column is held rather than
        // collapsed, or the figures would slide left as the toggle flips.
        <div aria-hidden />
      )}

      <div className="rounded-md bg-section px-6 py-5">
        {rows.map((r, i) => (
          <React.Fragment key={r.label}>
            {i > 0 ? <div className="h-px bg-neutral-gray" /> : null}
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-foreground">{r.label}</span>
              <span className="text-sm tabular-nums text-foreground">
                {money(r.value)}
              </span>
            </div>
          </React.Fragment>
        ))}
        {rows.length ? <div className="h-px bg-neutral-gray" /> : null}
        <div
          className={cn(
            "flex flex-col items-center gap-1 py-4",
            rows.length && "pt-5"
          )}
        >
          <span className="text-lg font-medium leading-6 text-secondary-foreground">
            Grand Total
          </span>
          <span className="text-lg font-semibold leading-6 tabular-nums text-foreground">
            {money(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
};
