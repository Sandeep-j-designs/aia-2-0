import { getState } from "@/components/inbox/v2/store";
import {
  MOCK_BATCH_DOCUMENTS,
  SAMPLE_BATCH_INSTRUCTION,
} from "@/config/pages/neo/mock-batch-documents";
import {
  answerBatch,
  createBatchDrafts,
  getBatch,
  readBatch,
  reconcile,
  showRegister,
  startBatch,
  undoBatch,
} from "@/hooks/pages/neo/use-batches";
import type { NeoTask } from "@/types/pages/neo";
import { has, money } from "@/utils/pages/neo";

/**
 * Voucher entry in the chat: bills attached to a message, plus one line of
 * instruction, entered as a batch.
 *
 * The conversation is the plan's loop. Neo says what it understood from the
 * instruction (a settings card, editable in place), asks about each kind of
 * exception once, shows the purchase register to sign off (ticks, Dr/Cr per
 * row, totals reconciled to the documents), and only then makes the drafts —
 * Needs Review, prepared by Neo, tagged with the batch. Approving stays the
 * accountant's: in the Inbox, or from the follow-up Neo offers, which asks
 * again with the total in view.
 *
 * DEV: attachments go up with the prompt to POST /api/neo/runs; the batch
 * endpoints (types/pages/neo/batch.ts) are the tools this task calls.
 */
const batchEntry: NeoTask = {
  id: "batch-entry",
  title: "Enter a batch of bills",
  match: (p, _ctx, attachments = []) =>
    attachments.length ||
    has(p, /\bbatch\b/i) ||
    (has(p, /\b(bills|invoices|vouchers)\b/i) &&
      has(
        p,
        /\b(book|enter|post|these|freight goes|deduct|cost cent|plant)\b/i
      ) &&
      !has(p, /sales invoice|how much|spend|which vendors|approve|undo|polic/i))
      ? 9
      : 0,
  run: async (api) => {
    const typed = api.attachments.length
      ? /^\d+ files? attached$/.test(api.prompt)
        ? ""
        : api.prompt
      : api.prompt;
    let docIds = api.attachments
      .map((a) => a.docId)
      .filter(Boolean) as string[];
    const unreadable = api.attachments
      .filter((a) => !a.docId)
      .map((a) => a.name);

    if (!api.attachments.length) {
      const pick = await api.ask("Which bills?", [
        {
          id: "sample",
          label: "Use the sample: 10 Harihar plant bills",
          hint: "September freight, courier and packing for Shakunthalam",
        },
        { id: "attach", label: "I'll attach them" },
      ]);
      if (pick === "attach") {
        await api.say(
          "Attach them with the clip beside the message box and send them with your instruction: what the bills don't say, like the period, the plant, where freight goes and the TDS."
        );
        return "Waiting for the bills";
      }
      docIds = MOCK_BATCH_DOCUMENTS.map((d) => d.id);
    }
    if (!docIds.length) {
      await api.say(
        `I couldn't read ${unreadable.join(", ")}. This prototype reads its sample bills only; attach those from the clip menu.`
      );
      return "Nothing readable";
    }

    let instruction = /^enter a batch/i.test(typed) ? "" : typed.trim();
    if (!instruction) {
      const pick = await api.ask(
        "What don't the bills say?\nThe period, the plant, where freight goes, the TDS. One line covers the whole batch.",
        [
          {
            id: "sample",
            label: SAMPLE_BATCH_INSTRUCTION,
          },
          { id: "none", label: "Nothing. Use your defaults" },
        ]
      );
      instruction = pick === "sample" ? SAMPLE_BATCH_INSTRUCTION : "";
    }

    const reading = await api.step(
      `Reading ${docIds.length} bill${docIds.length === 1 ? "" : "s"}`
    );
    await api.wait(700);
    const batch = startBatch(
      instruction,
      docIds,
      unreadable,
      api.context.company || getState().company
    );
    reading(
      `Read ${docIds.length} bill${docIds.length === 1 ? "" : "s"}${unreadable.length ? ` · ${unreadable.length} not readable` : ""}`
    );
    api.status("Entering a batch of bills", { done: 1, total: 4 });

    await api.say(
      instruction
        ? "Here's what I understood. Click any value to change it; the sparkle marks the ones I chose myself."
        : "No instruction, so these are my defaults. Click any value to change it."
    );
    const go = await api.card(
      { kind: "batch", batchId: batch.id, view: "settings" },
      [
        {
          id: "enter",
          label: `Enter ${docIds.length} vouchers`,
          primary: true,
          risk: "read",
        },
        { id: "cancel", label: "Cancel" },
      ]
    );
    if (go !== "enter") {
      await api.say("Stopped. Nothing was entered.");
      return "Cancelled";
    }

    await api.checkpoint();
    readBatch(batch.id);
    const questions = getBatch(batch.id)?.questions || [];
    if (questions.length)
      await api.say(
        `${questions.length} thing${questions.length === 1 ? "" : "s"} I can't decide alone. One answer covers every bill it applies to.`
      );
    api.status("Entering a batch of bills", { done: 2, total: 4 });
    for (const q of questions) {
      const answer = await api.ask(
        `${q.text}\n${q.detail}`,
        q.options.map((o) => ({
          ...o,
          hint: o.id === q.answer ? "Suggested" : undefined,
        }))
      );
      answerBatch(batch.id, q.id, answer);
    }

    showRegister(batch.id);
    const b = getBatch(batch.id)!;
    const rows = b.rows.filter((r) => r.status !== "left-out");
    const out = b.rows.filter((r) => r.status === "left-out");
    const check = rows.filter((r) => r.status !== "ready");
    const rec = reconcile(b);
    api.status("Entering a batch of bills", { done: 3, total: 4 });
    await api.say(
      `${rows.length} vouchers, ${money(rows.reduce((s, r) => s + r.total, 0))}, reconciling to the documents (difference ${money(rec.difference)}).${out.length ? ` ${out.length} left out: ${out.map((r) => r.note?.toLowerCase()).join("; ")}.` : ""}${check.length ? ` ${check.length} to look at: ${check.map((r) => r.vendor.split(" ")[0]).join(", ")}.` : ""} Open a row for its Dr/Cr; untick anything you don't want.`
    );
    const sign = await api.card(
      { kind: "batch", batchId: batch.id, view: "register" },
      [
        { id: "create", label: "Create drafts", primary: true, risk: "draft" },
        { id: "cancel", label: "Cancel" },
      ]
    );
    if (sign !== "create") {
      await api.say(
        "Not entered. The batch is kept here if you want it later."
      );
      return "Not entered";
    }

    await api.checkpoint();
    const creating = await api.step("Creating the drafts");
    await api.wait(500);
    const created = createBatchDrafts(batch.id);
    creating(`Created ${created.length} drafts in Needs Review`);
    api.touch(created.map((x) => x.id));
    api.onUndo(() => undoBatch(batch.id));
    api.status(null);

    await api.say(
      `${created.length} drafts are in Needs Review as batch ${batch.id}, each beside its own document. Nothing is approved or synced.`,
      [{ label: "Review in Inbox", href: `/inbox?batch=${batch.id}` }]
    );
    api.show({ kind: "batch", batchId: batch.id, view: "drafts" });
    api.suggest([
      `Approve the clean drafts in batch ${batch.id}`,
      `Save the freight rule from batch ${batch.id} as client policy`,
    ]);
    return `${created.length} drafts · batch ${batch.id}`;
  },
};

export default batchEntry;
