import { issue, missingFields } from "@/components/inbox/v2/store";
import type { NeoAction, NeoRef, NeoTask } from "@/types/pages/neo";
import { billEvidence } from "@/hooks/pages/neo/evidence";
import { has, money } from "@/utils/pages/neo";
import {
  ROUTE_WORD,
  companyItems,
  describe,
  getItem,
  isOpen,
  pickItem,
  refTo,
  resolveItem,
} from "./shared";

/**
 * "Why was INB-2042 flagged?" / "Explain this".
 *
 * Everything it says comes off the document and the checks the screens run —
 * the route's reason, the confidence, the fields approval is waiting on, the
 * duplicate it matched — and each claim links to where it came from. Then it
 * offers the fix it can make.
 *
 * DEV: tool — get_item with its `ai.rationale`, `flagged` fields and the
 * approve pre-check.
 */
/** The extraction's field keys, as the review form labels them. */
const FIELD_NAMES: Record<string, string> = {
  supplierInvoiceNo: "invoice number",
  costCentre: "cost centre",
  vendor: "vendor",
  customer: "customer",
  dueDate: "due date",
  billDate: "bill date",
  gstReg: "GST registration",
};

const explain: NeoTask = {
  id: "explain",
  title: "Explain a document",
  match: (p) =>
    has(
      p,
      /\bwhy\b/i,
      /explain|flagged|what'?s wrong|what is wrong|stuck|blocked/i
    )
      ? 2
      : 0,
  run: async (api) => {
    let x = resolveItem(api, (i) => i.status !== "Deleted");
    if (!x) {
      const pool = companyItems().filter(
        (i) => isOpen(i) && (issue(i) || !billEvidence(i).ready)
      );
      if (!pool.length) {
        await api.say(
          "Nothing in the queue is flagged right now. Open a document and ask again to have it explained."
        );
        return "Nothing flagged";
      }
      x = await pickItem(api, "Which document?", pool);
      if (!x) return;
    }
    const reading = await api.step(`Reading ${x.id}`, refTo(x));
    await api.wait(500);
    reading(`Read ${describe(x)}`);

    const facts: string[] = [];
    const rationale = x.original.ai?.rationale;
    facts.push(
      `It's routed as a ${ROUTE_WORD[x.route]} because ${(rationale || x.reason).replace(/\.$/, "")}.`
    );
    const missing =
      x.status === "Needs Review" || x.status === "Duplicate"
        ? missingFields(x)
        : [];
    const blocker = isOpen(x) ? issue(x) : "";
    if (x.original.bill?.vendorMissing)
      facts.push(
        `${x.form.party || "The vendor"} isn't in your masters, so approving it would create a new vendor ledger in Tally — which needs their GSTIN first.`
      );
    const flagged =
      x.original.bill?.flagged || x.original.invoice?.flagged || [];
    if (flagged.length)
      facts.push(
        `Extraction wasn't sure about the ${flagged.map((f) => FIELD_NAMES[f] || f).join(", ")}.`
      );
    if (missing.length)
      facts.push(`Approval is waiting on: ${missing.join(", ")}.`);
    else if (blocker) facts.push(`Approval is blocked: ${blocker}`);
    const links: NeoRef[] = [refTo(x)];
    if (x.hardRef) {
      const match = getItem(x.hardRef);
      facts.push(
        `Same vendor and invoice number as ${match?.form.voucherNo || x.hardRef}, already posted${match ? ` for ${money(match.amount)}` : ""}. Posting it again would double the expense.`
      );
      if (match)
        links.push({
          label: `Posted ${match.form.voucherNo || match.id}`,
          itemId: match.id,
        });
    } else if (x.softRef)
      facts.push(
        "The same file seems to have come in before — check it isn't the same bill sent twice."
      );
    if (x.status === "Failed")
      facts.push(`It couldn't be read: ${x.error || "the extraction failed"}.`);
    if (x.status === "Approved")
      facts.push(
        `It's approved${x.doneBy ? ` by ${x.doneBy}` : ""} and waiting to sync.`
      );
    if (facts.length === 1 && !blocker && isOpen(x))
      facts.push("Nothing is stopping it — it can be approved as it is.");
    await api.say(facts.join(" "), links);

    const actions: NeoAction[] = [];
    if (x.original.bill?.vendorMissing || missing.includes("Vendor"))
      actions.push({
        id: "chase",
        label: "Ask the vendor for their GSTIN",
        primary: true,
        risk: "external",
      });
    if (x.hardRef || x.softRef)
      actions.push({
        id: "dupes",
        label: "Sort out duplicates",
        primary: !actions.length,
      });
    if (!actions.length) return "Explained";
    actions.push({ id: "done", label: "Leave it" });
    const next = await api.card(
      {
        kind: "list",
        title: "Suggested next step",
        groups: [
          {
            label: x.status,
            tone: blocker ? "negative" : "notice",
            rows: [
              {
                itemId: x.id,
                primary: describe(x),
                secondary: x.id,
                amount: x.amount,
              },
            ],
          },
        ],
      },
      actions
    );
    if (next === "chase") await api.chain(`ask ${x.id} vendor for their GSTIN`);
    if (next === "dupes") await api.chain("find duplicates");
    return "Explained";
  },
};

export default explain;
