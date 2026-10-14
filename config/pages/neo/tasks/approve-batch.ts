import { approve, getState } from "@/components/inbox/v2/store";
import { billEvidence } from "@/hooks/pages/neo/evidence";
import type { NeoTask } from "@/types/pages/neo";
import { companyItems, describe } from "./shared";
const approveBatch: NeoTask = {
  id: "approve-batch",
  title: "Approve bills with full evidence",
  match: (p) => (/\bapprove\b/i.test(p) ? 3 : 0),
  run: async (api) => {
    const selected = /selected|these|ticked/i.test(api.prompt);
    if (selected && !api.context.selectedIds.length) {
      await api.say("Select the bills first.");
      return;
    }
    const pool = companyItems().filter(
      (x) =>
        x.status === "Needs Review" &&
        (!selected || api.context.selectedIds.includes(x.id))
    );
    const ready = pool.filter((x) => billEvidence(x).ready),
      blocked = pool.filter((x) => !billEvidence(x).ready);
    const versions = new Map(ready.map((x) => [x.id, JSON.stringify(x)]));
    const choice = await api.card(
      {
        kind: "list",
        title: "Evidence for approval",
        groups: [
          {
            label: `${ready.length} with full evidence`,
            tone: "positive",
            rows: ready.map((x) => ({
              itemId: x.id,
              primary: describe(x),
              secondary: billEvidence(x).reason,
              amount: x.amount,
            })),
          },
          {
            label: `${blocked.length} need review`,
            tone: "notice",
            rows: blocked.map((x) => ({
              itemId: x.id,
              primary: describe(x),
              secondary: billEvidence(x).reason,
              amount: x.amount,
            })),
          },
        ],
      },
      [
        ...(ready.length
          ? [
              {
                id: "approve",
                label: `Approve ${ready.length} bills`,
                risk: "commit" as const,
                primary: true,
              },
            ]
          : []),
        { id: "cancel", label: "Leave for review" },
      ]
    );
    if (choice !== "approve") return "Nothing approved";
    let count = 0;
    for (const preview of ready) {
      const current = getState().items.find((x) => x.id === preview.id);
      if (
        current?.status === "Needs Review" &&
        current.company === api.context.company &&
        JSON.stringify(current) === versions.get(current.id) &&
        billEvidence(current).ready &&
        !approve(current.id)
      )
        count++;
    }
    if (count < ready.length) api.outcome("partial");
    await api.say(
      `${count} bills approved by you. ${ready.length - count ? `${ready.length - count} changed or no longer passed the checks; left for review. ` : ""}Approved bills are waiting for your Sync.`,
      ready.map((x) => ({ label: x.form.voucherNo, itemId: x.id }))
    );
    return `${count} approved by the user`;
  },
};
export default approveBatch;
