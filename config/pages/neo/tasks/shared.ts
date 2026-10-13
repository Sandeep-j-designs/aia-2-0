import { getState, type Item } from "@/components/inbox/v2/store";
import type { NeoOption, NeoRef, NeoTaskApi } from "@/types/pages/neo";
import { findItemId, money } from "@/utils/pages/neo";

/**
 * What the scripted tasks share: reading the store the way the screens do,
 * and naming documents the way an accountant would.
 *
 * DEV: these reads become the agent's read tools —
 *   GET /api/inbox/items?company=…   (listItems)
 *   GET /api/inbox/items/:id         (getItem)
 */

/** The current company's documents, the books excluded. */
export const companyItems = () => {
  const s = getState();
  return s.items.filter((x) => x.company === s.company && !x.priorVoucher);
};

export const getItem = (id?: string) =>
  id ? getState().items.find((x) => x.id === id) : undefined;

export const ROUTE_WORD = {
  AP: "purchase",
  AR: "sales invoice",
  JV: "journal",
};

/**
 * How a document is named to a person. Seeded documents have short ids
 * (INB-2041); a fresh upload's id is a UUID nobody should have to read, so it
 * goes by its invoice or voucher number instead.
 */
export const label = (x: Item) =>
  /^(DEMO|SPLIT|NEO)-/.test(x.id)
    ? x.form.voucherNo || x.form.invoiceNo || x.file.name
    : x.id;

/** "Dell India Pvt Ltd · INV-1182" — how a document reads in a sentence. */
export const describe = (x: Item) =>
  `${x.form.party || x.file.name}${x.form.invoiceNo && x.form.invoiceNo !== x.id ? ` · ${x.form.invoiceNo}` : ""}`;

export const refTo = (x: Item, target: NeoRef["target"] = "open"): NeoRef => ({
  label: label(x),
  itemId: x.id,
  target,
});

export const optionFor = (x: Item): NeoOption => ({
  id: x.id,
  label: describe(x),
  hint: `${label(x)} · ${money(x.amount)}`,
});

export const isOpen = (x: Item) =>
  ["Needs Review", "Duplicate"].includes(x.status);

/**
 * The document a prompt is about: an id typed into it, else the record on
 * screen, else the first ticked row — filtered to what the task can use.
 * Returns undefined when none of those fit, and the task asks.
 */
export const resolveItem = (api: NeoTaskApi, accept: (x: Item) => boolean) => {
  const items = companyItems();
  const typed = findItemId(
    api.prompt,
    items.map((x) => x.id)
  );
  const candidates = [
    typed,
    api.context.itemId,
    ...api.context.selectedIds,
  ].filter(Boolean) as string[];
  for (const id of candidates) {
    const x = items.find((i) => i.id === id);
    if (x && accept(x)) return x;
  }
  return undefined;
};

/** Ask the user to pick one document out of a few. */
export const pickItem = async (
  api: NeoTaskApi,
  question: string,
  pool: Item[]
) => {
  const id = await api.ask(question, pool.slice(0, 4).map(optionFor));
  return getItem(id);
};

/** The sum of a list of documents, for a group heading. */
export const total = (xs: Item[]) => xs.reduce((s, x) => s + x.amount, 0);
