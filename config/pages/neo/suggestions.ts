import { getState } from "@/components/inbox/v2/store";
import type { NeoContext } from "@/types/pages/neo";
import { overdueInvoices } from "@/utils/pages/inbox/ai-calculations";

/**
 * The prompts Neo offers before you type, from what is on screen.
 *
 * Each one is one of Neo's four jobs — ask the books, change by rule, chase,
 * the day across clients — worked out from the data that is actually there:
 * a vendor whose open bills sit on a different ledger from their approved
 * ones, a vendor missing from masters, an overdue customer. Never a canned
 * example that would answer "nothing found".
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
  const bills = items.filter((x) => x.route === "AP" && x.form.party);
  const out: string[] = [];

  if (item) {
    if (item.route === "AP" && item.original.bill?.vendorMissing)
      out.push("Ask the vendor for their GSTIN");
    if (item.route === "AP" && item.form.party)
      out.push(`How much did we spend with ${item.form.party}?`);
    if (item.route === "AP")
      out.push("Create a sales invoice based on this purchase");
  } else {
    out.push("Enter a batch of bills with an instruction");
    out.push("What needs me across my clients today?");
  }

  // A vendor whose open bills sit on a different ledger from their approved
  // ones: the change-by-rule Neo is for.
  const ledgerOf = (x: (typeof bills)[number]) => x.form.lines[0]?.ledger;
  for (const x of open.filter((b) => b.route === "AP" && ledgerOf(b))) {
    const past = bills.filter(
      (b) => b.status === "Approved" && b.form.party === x.form.party
    );
    const counts = new Map<string, number>();
    past.forEach((b) =>
      counts.set(ledgerOf(b)!, (counts.get(ledgerOf(b)!) || 0) + 1)
    );
    const usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (usual && usual !== ledgerOf(x)) {
      out.push(
        `Move all ${x.form.party} bills from ${ledgerOf(x)} to ${usual}`
      );
      break;
    }
  }

  if (overdueInvoices(s.items, s.company).length)
    out.push("Who owes us money?");
  if (!item && open.some((x) => x.original.bill?.vendorMissing))
    out.push("Which vendors aren't in my masters?");
  const top = bills
    .filter((x) => x.status === "Approved")
    .reduce<Record<string, number>>((m, x) => {
      m[x.form.party] = (m[x.form.party] || 0) + x.amount;
      return m;
    }, {});
  const biggest = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (biggest) out.push(`How much did we spend with ${biggest} in September?`);

  return [...new Set(out)].slice(0, 4);
};
