import { getState } from "@/components/inbox/v2/store";
import type { NeoTask } from "@/types/pages/neo";

const inboxSync: NeoTask = {
  id: "inbox-sync",
  title: "Prepare approved vouchers for Sync",
  match: (p) => (/\bsync\b/i.test(p) ? 10 : 0),
  run: async (api) => {
    const approved = getState().items.filter(
      (x) =>
        x.company === api.context.company &&
        x.status === "Approved" &&
        !x.priorVoucher
    );
    if (!approved.length) {
      await api.say(
        "There are no approved vouchers to sync. Review and approve the drafts first."
      );
      return "Nothing approved to sync";
    }
    await api.say(
      "I’ll open the existing Sync review. Check the modules and current voucher counts, then confirm Sync there. Collecting or approving documents does not authorise posting to Tally."
    );
    await api.navigate(`/inbox?neoSync=${api.runId}`);
    return "Opened Sync review; posting requires separate confirmation there";
  },
};
export default inboxSync;
