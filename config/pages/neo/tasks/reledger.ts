import {
  applyBulkAction,
  getState,
  neoUndoChanges,
} from "@/components/inbox/v2/store";
import { LEDGERS } from "@/config/pages/inbox/journal-masters";
import type { NeoTask } from "@/types/pages/neo";
import { findName, has, money } from "@/utils/pages/neo";
import { companyItems, total, label } from "./shared";

/**
 * "Move all Nova Logistics bills to Freight Inward."
 *
 * Finds the vendor's open bills, shows every line's ledger before and after,
 * and changes nothing until told to. Applied through the same bulk Reassign
 * the selection bar uses, so the edit trail is identical to doing it by hand;
 * the run's Undo puts each bill back exactly as it was.
 *
 * DEV: tools — list_items(vendor), bulk_update(ids, field="ledger", value).
 */

/** Every ledger name the company's documents and masters use. */
const knownLedgers = () =>
  [
    ...new Set([
      ...companyItems().flatMap((x) => x.form.lines.map((l) => l.ledger)),
      ...LEDGERS.map((l) => l.name),
      "Freight Inward",
      "Freight Outward",
      "Office Expenses",
      "Staff Welfare",
    ]),
  ].filter(Boolean);

const reledger: NeoTask = {
  id: "reledger",
  title: "Change a vendor's ledger",
  match: (p) =>
    has(
      p,
      /(move|change|set|switch|re-?ledger|recode|re-?code|reclass|post)\b.*\b(to|ledger|under|into)\b/i
    ) && !has(p, /sales invoice|journal|jv\b/i)
      ? 2
      : 0,
  run: async (api) => {
    const selectionRequested = /selected|ticked|these|chosen/i.test(api.prompt);
    if (selectionRequested && !api.context.selectedIds.length) {
      await api.say(
        "Select the bills to change first. No company-wide changes were made."
      );
      return "No selection";
    }
    const bills = companyItems().filter(
      (x) =>
        x.route === "AP" &&
        ["Needs Review", "Duplicate"].includes(x.status) &&
        x.form.party &&
        (!selectionRequested || api.context.selectedIds.includes(x.id))
    );
    const vendors = [...new Set(bills.map((x) => x.form.party))];
    let vendor = findName(api.prompt, vendors);
    const toText = api.prompt.split(/\b(?:to|into|under)\b/i).pop() || "";
    let ledger = findName(toText, knownLedgers());
    if (!vendor) {
      if (!vendors.length) {
        await api.say(
          "There are no open purchase bills to re-ledger in this company."
        );
        return "Nothing open";
      }
      vendor = await api.ask(
        "Whose bills?",
        vendors.slice(0, 4).map((v) => ({
          id: v,
          label: v,
          hint: `${bills.filter((b) => b.form.party === v).length} open`,
        }))
      );
    }
    if (!ledger)
      ledger = await api.ask(`Which ledger should ${vendor}'s bills go to?`, [
        { id: "Freight Inward", label: "Freight Inward" },
        { id: "Office Expenses", label: "Office Expenses" },
        { id: "General Expenses", label: "General Expenses" },
        { id: "Repairs & Maintenance", label: "Repairs & Maintenance" },
      ]);

    const scan = await api.step(`Finding ${vendor}'s open bills`);
    await api.wait(500);
    const targets = bills.filter((x) => x.form.party === vendor);
    scan(
      `${targets.length} open bill${targets.length === 1 ? "" : "s"} from ${vendor}`
    );
    const rows = targets.flatMap((x) =>
      x.form.lines.map((l) => ({
        itemId: x.id,
        party: `${label(x)} · ${l.description || x.form.invoiceNo}`,
        from: l.ledger || "—",
        to: ledger!,
        amount: l.amount,
      }))
    );
    const changing = rows.filter((r) => r.from !== r.to);
    if (!changing.length) {
      await api.say(
        `${vendor}'s open bills are already on ${ledger}. Nothing to change.`
      );
      return "Already set";
    }
    const choice = await api.card(
      { kind: "diff", title: `${vendor} → ${ledger}`, field: "Ledger", rows },
      [
        {
          id: "apply",
          label: `Apply to ${targets.length} bill${targets.length === 1 ? "" : "s"}`,
          primary: true,
          risk: "draft",
        },
        { id: "cancel", label: "Cancel" },
      ]
    );
    if (choice !== "apply") {
      await api.say("Cancelled. The bills are as they were.");
      return "Cancelled";
    }
    const snapshots = targets.map((x) => structuredClone(x));
    const applying = await api.step(
      `Setting ${ledger} on ${targets.length} bill${targets.length === 1 ? "" : "s"}`
    );
    await api.wait(400);
    if (
      snapshots.some(
        (x) =>
          JSON.stringify(getState().items.find((item) => item.id === x.id)) !==
          JSON.stringify(x)
      )
    )
      throw new Error(
        "A bill changed after the preview. Run the request again to review the current values."
      );
    const result = applyBulkAction(
      targets.map((x) => x.id),
      "Ledger",
      ledger!
    );
    api.touch(targets.map((x) => x.id));
    api.onUndo(neoUndoChanges(snapshots, api.runId));
    applying(
      `Changed ${result.changed} bill${result.changed === 1 ? "" : "s"} · ${money(total(targets))}${result.skipped ? ` · ${result.skipped} skipped (${Object.keys(result.reasons).join(", ")})` : ""}`
    );
    const now = getState().items.filter((x) =>
      targets.some((t) => t.id === x.id)
    );
    await api.say(
      `${vendor}'s bills now post to ${ledger}. They're still waiting for review — nothing was approved.`,
      now
        .slice(0, 3)
        .map((x) => ({ label: x.id, itemId: x.id, target: "inbox" as const }))
    );
    return `${result.changed} bills → ${ledger}`;
  },
};

export default reledger;
