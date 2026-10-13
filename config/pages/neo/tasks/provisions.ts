import type { NeoTask } from "@/types/pages/neo";
import { getState, neoDiscard } from "@/components/inbox/v2/store";
import {
  suggestProvisions,
  createProvisionDrafts,
} from "@/hooks/pages/inbox/use-provisions";
import { rupees } from "@/utils/pages/inbox/ai-calculations";
const provisions: NeoTask = {
  id: "provisions",
  title: "Suggest March provisions",
  match: (p) =>
    /provision/i.test(p) && /suggest|march|year.end/i.test(p) ? 15 : 0,
  run: async (api) => {
    const company = api.context.company || getState().company,
      lines = suggestProvisions(company);
    if (!lines.length) {
      await api.say("No provision source schedules for this organisation.");
      return;
    }
    for (const p of lines) {
      await api.say(
        `${p.group}: ${rupees(p.amount)}. ${p.reason} Sources: ${p.sources.join(", ")}.`,
        [{ label: "Edit estimates in Journals", href: "/inbox?module=JV" }]
      );
      const choice = await api.card(
        {
          kind: "voucher",
          voucherType: "Journal",
          state: "Preview",
          voucherNo: "Assigned on creation",
          party: p.group,
          date: "31 Mar 2026",
          lines: [
            { ledger: p.debit, side: "Dr", amount: p.amount, inferred: true },
            { ledger: p.credit, side: "Cr", amount: p.amount, inferred: true },
          ],
          why: p.reason,
          assumptions: [
            p.reverse
              ? "Separate reversal draft dated 1 Apr 2026"
              : "No reversal",
          ],
        },
        [
          {
            id: "create",
            label: "Create this draft",
            risk: "draft",
            primary: true,
          },
          { id: "skip", label: "Skip" },
        ]
      );
      if (choice === "create") {
        const created = createProvisionDrafts(company, [p], api.runId);
        api.touch(created.map((x) => x.id));
        api.onUndo(() => neoDiscard(created, api.runId));
        await api.say(
          "Drafts are waiting for your review.",
          created.map((x) => ({ label: x.form.voucherNo, itemId: x.id }))
        );
      }
    }
    return "Provisions prepared";
  },
};
export default provisions;
