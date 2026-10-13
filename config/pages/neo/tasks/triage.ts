import { issue, missingFields, type Item } from "@/components/inbox/v2/store";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import { billEvidence } from "@/hooks/pages/neo/evidence";
import { has, money } from "@/utils/pages/neo";
import { companyItems, describe, total, label } from "./shared";

/**
 * "What needs my attention?"
 *
 * Sorts the review queue into what can go now and what is stuck, each with
 * the rupees behind it. Read-only: it changes nothing, and every row opens
 * the document.
 *
 * DEV: tool — list_items(status=open) plus the same checks the approve
 * endpoint runs, so "ready" here means the server would accept it.
 */

export const READY_CONFIDENCE = 0.9;

const row = (x: Item, note: string) => ({
  itemId: x.id,
  primary: describe(x),
  secondary: `${label(x)} · ${note}`,
  amount: x.amount,
});

const triage: NeoTask = {
  id: "triage",
  title: "What needs attention",
  match: (p) =>
    has(
      p,
      /attention|needs? (me|my)|what('s| is)? (pending|left|waiting)|triage|where do i start|summari[sz]e (the )?(queue|inbox)/i
    )
      ? 3
      : 0,
  run: async (api) => {
    const scan = await api.step("Checking the review queue");
    await api.wait(600);
    const open = companyItems().filter((x) =>
      ["Needs Review", "Duplicate", "Failed"].includes(x.status)
    );
    scan(
      `Checked ${open.length} document${open.length === 1 ? "" : "s"} waiting in this company's Inbox`
    );
    if (!open.length) {
      await api.say("Nothing is waiting. The queue is clear.");
      return "Queue clear";
    }

    const duplicates = open.filter((x) => x.status === "Duplicate");
    const failed = open.filter((x) => x.status === "Failed");
    const review = open.filter((x) => x.status === "Needs Review");
    const blocked = review.filter((x) => issue(x));
    const low = review.filter((x) => !issue(x) && !billEvidence(x).ready);
    const ready = review.filter((x) => !issue(x) && billEvidence(x).ready);

    const groups: Extract<NeoCard, { kind: "list" }>["groups"] = [
      {
        label: "Ready to approve",
        tone: "positive" as const,
        rows: ready.map((x) => row(x, billEvidence(x).reason)),
      },
      {
        label: "Blocked — something missing",
        tone: "negative" as const,
        rows: blocked.map((x) =>
          row(x, missingFields(x).join(", ") || issue(x))
        ),
      },
      {
        label: "Check first — evidence incomplete",
        tone: "notice" as const,
        rows: low.map((x) => row(x, billEvidence(x).reason)),
      },
      {
        label: "Possible duplicates",
        tone: "notice" as const,
        rows: duplicates.map((x) =>
          row(
            x,
            x.hardRef
              ? `matches posted ${x.hardRef}`
              : "looks like a file already sent"
          )
        ),
      },
      {
        label: "Couldn't be read",
        tone: "neutral" as const,
        rows: failed.map((x) => row(x, x.error || "extraction failed")),
      },
    ].filter((g) => g.rows.length);

    await api.say(
      `${ready.length} of ${open.length} can be approved now (${money(total(ready))}). ${blocked.length ? `${blocked.length} ${blocked.length === 1 ? "is" : "are"} blocked on missing details` : "Nothing is blocked"}${duplicates.length ? `, and ${duplicates.length} look${duplicates.length === 1 ? "s" : ""} like duplicates` : ""}.`
    );
    const next = await api.card(
      { kind: "list", title: "Review queue", groups },
      [
        ...(ready.length
          ? [
              {
                id: "approve",
                label: `Approve the ${ready.length} ready`,
                primary: true,
                risk: "commit" as const,
              },
            ]
          : []),
        ...(duplicates.length
          ? [{ id: "duplicates", label: "Sort out duplicates" }]
          : []),
        { id: "done", label: "That's all" },
      ]
    );
    if (next === "approve") await api.chain("Approve bills with full evidence");
    if (next === "duplicates") await api.chain("find duplicates");
    return `${ready.length} ready · ${blocked.length} blocked`;
  },
};

export default triage;
