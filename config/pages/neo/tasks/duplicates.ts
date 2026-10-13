import { neoUndoChanges, remove, type Item } from "@/components/inbox/v2/store";
import type { NeoTask } from "@/types/pages/neo";
import { has, money } from "@/utils/pages/neo";
import { companyItems, describe, getItem, total, label } from "./shared";

/**
 * "Find duplicates."
 *
 * Lists each document the Inbox flagged as a duplicate beside what it
 * matched, and offers to delete the copies. Deleting is a draft-tier change
 * here — the run's Undo puts them back — because the duplicate check is a
 * guess about a document, not a posting.
 *
 * DEV: tools — list_items(status=duplicate), delete_items(ids). Undo needs a
 * restore endpoint the Inbox API does not have yet: POST /api/inbox/items/restore.
 */
const duplicates: NeoTask = {
  id: "duplicates",
  title: "Find duplicates",
  match: (p) => (has(p, /duplicat|twice|same bill|double/i) ? 3 : 0),
  run: async (api) => {
    const scan = await api.step("Looking for duplicates");
    await api.wait(650);
    const dupes = companyItems().filter((x) => x.status === "Duplicate");
    scan(
      `Found ${dupes.length} flagged as duplicate${dupes.length === 1 ? "" : "s"}`
    );
    if (!dupes.length) {
      await api.say("No duplicates in this company's Inbox.");
      return "None found";
    }
    const note = (x: Item) => {
      const match = getItem(x.hardRef);
      return x.hardRef
        ? `Same vendor + invoice no. as posted ${match?.form.voucherNo || x.hardRef}`
        : "Same file already received";
    };
    const hard = dupes.filter((x) => x.hardRef);
    await api.say(
      `${hard.length ? `${hard.length} ${hard.length === 1 ? "is a" : "are"} certain match${hard.length === 1 ? "" : "es"} against a posted voucher and can't be approved. ` : ""}${dupes.length - hard.length ? `${dupes.length - hard.length} ${dupes.length - hard.length === 1 ? "looks" : "look"} like a file sent twice — worth a glance before deleting.` : ""}`
    );
    const choice = await api.card(
      {
        kind: "list",
        title: "Duplicates",
        groups: [
          {
            label: `Delete · ${money(total(dupes))}`,
            tone: "notice",
            rows: dupes.map((x) => ({
              itemId: x.id,
              primary: describe(x),
              secondary: `${label(x)} · ${note(x)}`,
              amount: x.amount,
            })),
          },
        ],
      },
      [
        {
          id: "delete",
          label: `Delete ${dupes.length}`,
          primary: true,
          risk: "draft",
        },
        ...(hard.length && hard.length < dupes.length
          ? [{ id: "hard", label: `Only the ${hard.length} certain` }]
          : []),
        { id: "keep", label: "Keep them" },
      ]
    );
    if (choice === "keep") {
      await api.say("Kept. Nothing was deleted.");
      return "Kept";
    }
    const targets = choice === "hard" ? hard : dupes;
    const snapshots = targets.map((x) => structuredClone(x));
    const deleting = await api.step(`Deleting ${targets.length}`);
    if (
      snapshots.some((x) => JSON.stringify(getItem(x.id)) !== JSON.stringify(x))
    )
      throw new Error(
        "A duplicate changed after the preview. Run the check again before deleting."
      );
    targets.forEach((x) => remove(x.id));
    api.touch(targets.map((x) => x.id));
    api.onUndo(neoUndoChanges(snapshots, api.runId));
    await api.wait(350);
    deleting(
      `Deleted ${targets.length} duplicate${targets.length === 1 ? "" : "s"} · ${money(total(targets))} kept out of the books`
    );
    await api.say("Done. Undo in Runs brings them back if one was wrong.");
    return `${targets.length} duplicates deleted`;
  },
};

export default duplicates;
