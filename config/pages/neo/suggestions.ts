import { getState, issue } from "@/components/inbox/v2/store";
import type { NeoContext } from "@/types/pages/neo";

/**
 * The prompts Neo offers before you type, from what is on screen.
 *
 * Each one is something Neo can do against the data that is actually there —
 * a vendor with open bills, a document on screen — never a canned example
 * that would answer "nothing found".
 *
 * DEV: GET /api/neo/suggestions?context=… — the server knows the queue better.
 */
export const suggestionsFor = (context: NeoContext): string[] => {
  const s = getState();
  const items = s.items.filter(
    (x) => x.company === s.company && !x.priorVoucher
  );
  const item = items.find((x) => x.id === context.itemId);
  const open = items.filter((x) =>
    ["Needs Review", "Duplicate"].includes(x.status)
  );
  const out: string[] = [];

  if (item) {
    if (item.route === "AP")
      out.push("Create a sales invoice based on this purchase");
    if (["Needs Review", "Duplicate", "Failed"].includes(item.status))
      out.push(
        issue(item) || item.status === "Duplicate"
          ? "Why is this flagged?"
          : "Explain this document"
      );
    if (item.route === "AP" && item.original.bill?.vendorMissing)
      out.push("Ask the vendor for their GSTIN");
  }
  if (context.selectedIds.length > 1)
    out.push(`Approve the ${context.selectedIds.length} selected`);

  if (open.length) out.push("What needs my attention?");
  if (!item && open.some((x) => x.route === "AP"))
    out.push("Create a sales invoice from a purchase");
  if (open.some((x) => x.status === "Duplicate")) out.push("Find duplicates");
  const vendorWithBills = open.find(
    (x) => x.route === "AP" && x.form.party && x.form.lines.length
  );
  if (vendorWithBills && !item)
    out.push(`Move all ${vendorWithBills.form.party} bills to Office Expenses`);
  out.push("Book depreciation of ₹12,000 on office equipment");

  return [...new Set(out)].slice(0, 4);
};
