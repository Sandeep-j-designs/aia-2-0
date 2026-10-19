import { getState, type Item } from "@/components/inbox/v2/store";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import { overdueInvoices } from "@/utils/pages/inbox/ai-calculations";
import { findName, has, money } from "@/utils/pages/neo";
import { companyItems, refTo } from "./shared";

/**
 * Ask the books: the questions a dashboard didn't plan for, answered from
 * the records and never from memory. Every answer shows its arithmetic and
 * the vouchers it summed, so it can be checked rather than trusted.
 *
 * - "How much did we spend with Mahindra Logistics in September?"
 * - "What did we spend on Freight Inward?"
 * - "Who are my top vendors?"
 * - "Which vendors aren't in my masters?"  → offers to chase their GSTIN
 * - "Who owes us money?"                   → offers to draft reminders
 *
 * Read-only: nothing changes unless the person picks a follow-up.
 *
 * DEV: with a model behind POST /api/neo/runs these become one tool,
 * query_ledger(filters, group_by), and this file is deleted.
 */

const MONTHS: Record<string, { short: string; iso: string; name: string }> = {
  jul: { short: "Jul", iso: "2026-07", name: "July" },
  aug: { short: "Aug", iso: "2026-08", name: "August" },
  sep: { short: "Sep", iso: "2026-09", name: "September" },
  oct: { short: "Oct", iso: "2026-10", name: "October" },
};

const monthIn = (prompt: string) => {
  const m = prompt.toLowerCase().match(/\b(jul|aug|sep|oct)[a-z]*\b/);
  return m ? MONTHS[m[1]] : undefined;
};

const inMonth = (x: Item, m?: (typeof MONTHS)[string]) =>
  !m || x.form.date.includes(m.short) || x.form.date.startsWith(m.iso);

/** Booked or waiting purchase bills — what "spend" means to an accountant. */
const purchases = () =>
  companyItems().filter(
    (x) =>
      x.route === "AP" &&
      ["Approved", "Needs Review", "Duplicate"].includes(x.status)
  );

const net = (x: Item) => x.form.lines.reduce((s, l) => s + l.amount, 0);

const sourceList = (
  title: string,
  rows: Item[]
): Extract<NeoCard, { kind: "list" }> => ({
  kind: "list",
  title,
  groups: [
    {
      label: `${rows.length} source bill${rows.length === 1 ? "" : "s"}`,
      tone: "neutral",
      rows: rows.map((x) => ({
        itemId: x.id,
        primary: x.form.party,
        secondary: `${x.form.date} · ${x.form.invoiceNo || x.id} · ${x.status}`,
        amount: net(x),
      })),
    },
  ],
});

const askBooks: NeoTask = {
  id: "ask-books",
  title: "Answer from the books",
  match: (p) =>
    has(
      p,
      /how much|spend|spent|total|top vendors?|biggest vendors?|largest vendors?|(not|n['’]t) in (my )?masters|missing gstin|without (a )?gstin|who owes|overdue|outstanding|unpaid/i
    ) && !has(p, /freight/i)
      ? 5
      : 0,
  run: async (api) => {
    const p = api.prompt;

    // Who owes us
    if (has(p, /who owes|overdue|outstanding|unpaid|receivable/i)) {
      const company = api.context.company || getState().company;
      const rows = overdueInvoices(getState().items, company).sort(
        (a, b) => b.outstanding - a.outstanding
      );
      if (!rows.length) {
        // Say where the money is owed, if it is owed to another client.
        const elsewhere = getState()
          .companies.filter((c) => c.id !== company)
          .map((c) => ({
            name: c.name,
            rows: overdueInvoices(getState().items, c.id),
          }))
          .filter((c) => c.rows.length);
        await api.say(
          `Nobody is overdue here. Every approved invoice is in date.${elsewhere
            .map(
              (c) =>
                ` ${c.name} has ${c.rows.length} overdue invoice${c.rows.length === 1 ? "" : "s"} worth ${money(c.rows.reduce((s, r) => s + r.outstanding, 0))}; switch to it to see them.`
            )
            .join("")}`
        );
        return "Nothing overdue";
      }
      const sum = rows.reduce((s, r) => s + r.outstanding, 0);
      await api.say(
        `${rows.length} invoice${rows.length === 1 ? " is" : "s are"} overdue, ${money(sum)} in all. The oldest is ${rows.reduce((a, b) => (b.days > a.days ? b : a)).item.form.party} at ${Math.max(...rows.map((r) => r.days))} days. Outstanding nets off part-payments matched in Banking.`
      );
      const next = await api.card(
        {
          kind: "list",
          title: "Overdue invoices",
          groups: [
            {
              label: "Oldest first by amount",
              tone: "notice",
              rows: rows.map((r) => ({
                itemId: r.item.id,
                primary: r.item.form.party,
                secondary: `${r.item.form.invoiceNo} · ${r.days} days overdue`,
                amount: r.outstanding,
              })),
            },
          ],
        },
        [
          { id: "remind", label: "Draft reminders", primary: true },
          { id: "done", label: "That's all" },
        ]
      );
      if (next === "remind")
        await api.chain(
          `Draft collection reminder for ${rows.map((r) => r.item.id).join(" ")}`
        );
      return `${rows.length} overdue · ${money(sum)}`;
    }

    // Vendors not in masters
    if (
      has(p, /(not|n['’]t) in (my )?masters|missing gstin|without (a )?gstin/i)
    ) {
      const rows = purchases().filter(
        (x) => x.status !== "Approved" && x.original.bill?.vendorMissing
      );
      if (!rows.length) {
        await api.say(
          "Every vendor on an open bill is in your masters, with a GSTIN on file."
        );
        return "All vendors known";
      }
      await api.say(
        `${rows.length} open bill${rows.length === 1 ? " is" : "s are"} from a vendor that isn't in your masters. Approving creates the vendor in Tally, and that needs their GSTIN first.`,
        rows.map((x) => refTo(x))
      );
      const next = await api.card(sourceList("Vendors not in masters", rows), [
        {
          id: "chase",
          label:
            rows.length === 1
              ? `Ask ${rows[0].form.party} for their GSTIN`
              : "Ask the first vendor for their GSTIN",
          primary: true,
        },
        { id: "done", label: "That's all" },
      ]);
      if (next === "chase")
        await api.chain(`ask ${rows[0].id} vendor for their GSTIN`);
      return `${rows.length} vendors not in masters`;
    }

    const month = monthIn(p);
    const bills = purchases().filter((x) => inMonth(x, month));
    const period = month ? ` in ${month.name}` : "";

    // Top vendors
    if (has(p, /top|biggest|largest/i)) {
      const byVendor = new Map<string, Item[]>();
      bills.forEach((x) =>
        byVendor.set(x.form.party, [...(byVendor.get(x.form.party) || []), x])
      );
      const top = [...byVendor.entries()]
        .map(([party, xs]) => ({
          party,
          xs,
          sum: xs.reduce((s, x) => s + net(x), 0),
        }))
        .sort((a, b) => b.sum - a.sum)
        .slice(0, 5);
      if (!top.length) {
        await api.say(`No purchase bills${period}.`);
        return "No bills";
      }
      await api.say(
        `Top ${top.length} vendors by spend${period}, before tax: ${top.map((t) => `${t.party} ${money(t.sum)}`).join("; ")}.`
      );
      api.show({
        kind: "list",
        title: `Top vendors${period}`,
        groups: top.map((t) => ({
          label: `${t.party} · ${money(t.sum)}`,
          tone: "neutral" as const,
          rows: t.xs.slice(0, 3).map((x) => ({
            itemId: x.id,
            primary: x.form.invoiceNo || x.id,
            secondary: `${x.form.date} · ${x.status}`,
            amount: net(x),
          })),
        })),
      });
      return `Top vendors${period}`;
    }

    // Spend with a vendor, or on a ledger
    const vendor = findName(p, [...new Set(bills.map((x) => x.form.party))]);
    const ledger = vendor
      ? undefined
      : findName(p, [
          ...new Set(bills.flatMap((x) => x.form.lines.map((l) => l.ledger))),
        ]);
    if (!vendor && !ledger) {
      await api.say(
        `I can total spend by vendor or by ledger${period}. Name one — “How much did we spend with Mahindra Logistics in September?” or “What did we spend on Office Expenses?”`
      );
      return "Needs a vendor or ledger";
    }
    const scan = await api.step(
      `Adding up ${vendor ? `${vendor}'s bills` : `lines on ${ledger}`}${period}`
    );
    await api.wait(450);
    const rows = vendor
      ? bills.filter((x) => x.form.party === vendor)
      : bills.filter((x) => x.form.lines.some((l) => l.ledger === ledger));
    const amountOf = (x: Item) =>
      vendor
        ? net(x)
        : x.form.lines
            .filter((l) => l.ledger === ledger)
            .reduce((s, l) => s + l.amount, 0);
    const sum = rows.reduce((s, x) => s + amountOf(x), 0);
    const waiting = rows.filter((x) => x.status !== "Approved");
    scan(`${rows.length} bill${rows.length === 1 ? "" : "s"} · ${money(sum)}`);
    await api.say(
      `**${money(sum)}** ${vendor ? `with ${vendor}` : `on ${ledger}`}${period}, before tax, from ${rows.length} bill${rows.length === 1 ? "" : "s"}.${waiting.length ? `\n\n${waiting.length} of them ${waiting.length === 1 ? "is" : "are"} still waiting for review, so the booked figure is **${money(sum - waiting.reduce((s, x) => s + amountOf(x), 0))}**.` : ""}`
    );
    api.show(
      sourceList(
        `${vendor || ledger}${period}`,
        [...rows].sort((a, b) => amountOf(b) - amountOf(a))
      )
    );
    return `${money(sum)}${period}`;
  },
};

export default askBooks;
