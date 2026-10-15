import type { NeoTask } from "@/types/pages/neo";
import { firmBrief, lakhs } from "@/hooks/pages/neo/use-firm-brief";
import { has } from "@/utils/pages/neo";

/**
 * "What needs me across my clients today?" / "What needs my attention?"
 *
 * The firm brief, said in two sentences, with the brief itself one tap away.
 * Read-only. It used to sort one company's queue and offer to approve the
 * ready bills from chat; approving belongs to the Inbox, and the question an
 * accountant actually asks at nine is which client to open first.
 *
 * DEV: tool — get_brief, the same endpoint as Neo › Today.
 */
/** Extraction confidence a live run treats as ready to prepare. */
export const READY_CONFIDENCE = 0.9;

const triage: NeoTask = {
  id: "triage",
  title: "What needs you today",
  match: (p) =>
    has(
      p,
      /attention|needs? (me|my)|what('s| is)? (pending|left|waiting)|triage|where do i start|across (my )?clients|today|summari[sz]e (the )?(queue|inbox)/i
    )
      ? 3
      : 0,
  run: async (api) => {
    const scan = await api.step("Reading every client's queue, GST and chases");
    await api.wait(600);
    const brief = firmBrief();
    const needing = brief.clients.filter((c) => !c.clear);
    scan(`Checked ${brief.total} clients`);
    if (!needing.length) {
      await api.say(
        `None of your ${brief.total} clients need you today. ${brief.overnight}.`
      );
      return "Nothing needs you";
    }
    const top = needing[0];
    await api.say(
      `${needing.length} of your ${brief.total} clients need you. Start with ${top.name}: ${top.signals
        .slice(0, 3)
        .map((s) => s.text)
        .join(
          ", "
        )} — ${lakhs(top.impact)} to decide, ${top.deadline.toLowerCase()}.`
    );
    if (needing.length > 1)
      await api.say(
        needing
          .slice(1)
          .map(
            (c) =>
              `${c.name}: ${c.signals
                .slice(0, 3)
                .map((s) => s.text)
                .join(", ")}.`
          )
          .join(" "),
        [{ label: "Open today's brief", href: "/inbox?module=NEO" }]
      );
    else
      await api.say("The rest are clear.", [
        { label: "Open today's brief", href: "/inbox?module=NEO" },
      ]);
    return `${needing.length} clients need you`;
  },
};

export default triage;
