import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NeoStar,
  Search,
  Upload,
  Workflow,
  MessageCircle,
} from "@/components/icons";
import { actor, useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { useComposer } from "@/hooks/pages/neo/use-composer";
import { suggestionsFor } from "@/config/pages/neo/suggestions";
import Shortcuts from "@/components/neo/common/shortcuts";
import Canvas from "@/components/neo/common/canvas";
import Composer from "@/components/neo/common/composer";
import ContextChip from "@/components/neo/common/context-chip";
import DropZone from "@/components/neo/common/drop-zone";
import Thread, { useLiveMessage } from "@/components/neo/common/thread";
import { cn } from "@/lib/utils";
import ChatTitle from "./chat-title";

const NOTE =
  "Neo prepares; you approve. Nothing reaches your books without your click.";

/** "Good morning" before noon, "Good afternoon" to five, then evening. */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

type Category = {
  id: string;
  label: string;
  icon: typeof Search;
  prompts: string[];
};

/**
 * Neo › Chat. Empty, it is a home: a greeting in Neo's voice, the prompt box,
 * and four kinds of work that each open three real requests worked out from
 * the books. Once something is asked, the conversation runs down the middle
 * with the box pinned beneath; a document Neo makes opens beside it.
 */
const NeoChat = () => {
  const neo = useNeo();
  const state = useStore();
  const box = useComposer(neo);
  const live = useLiveMessage(neo);
  const input = useRef<HTMLTextAreaElement>(null);
  const empty = !neo.messages.length;
  const first = actor.split(" ")[0];
  const [category, setCategory] = useState<string | null>(null);
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);

  useEffect(() => {
    input.current?.focus();
  }, [neo.chatId]);

  // Four kinds of work, each with requests the planner answers from the
  // books on screen — never a canned example that finds nothing.
  const categories: Category[] = useMemo(() => {
    const live = suggestionsFor({ company: state.company, selectedIds: [] });
    const spend = live.find((s) => s.startsWith("How much"));
    const move = live.find((s) => s.startsWith("Move all"));
    return [
      {
        id: "find",
        label: "Find",
        icon: Search,
        prompts: [
          "Find unpaid invoices",
          spend || "How much did we spend with Mahindra Logistics in September?",
          "Why is freight up in September?",
        ],
      },
      {
        id: "enter",
        label: "Enter",
        icon: Upload,
        prompts: [
          "Upload purchase bills",
          "Enter a batch of bills with an instruction",
          "Create an invoice",
        ],
      },
      {
        id: "chase",
        label: "Chase",
        icon: MessageCircle,
        prompts: [
          "Who owes us money?",
          "Draft collection reminders",
          "Which vendors aren't in my masters?",
        ],
      },
      {
        id: "tidy",
        label: "Tidy up",
        icon: Workflow,
        prompts: [
          move || "Move all Mahindra Logistics bills from Transportation to Freight Inward",
          "What needs me across my clients today?",
          "Create an agent that validates vendor bills",
        ],
      },
    ];
    // The store is a dependency: what can be suggested follows the books.
  }, [state]);
  const openCategory = categories.find((c) => c.id === category);

  // Digits answer the open question, Esc stops a run — as in the panel.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.defaultPrevented) return;
    const typing = (e.target as HTMLElement).closest(
      "input, textarea, select, [contenteditable=true]"
    );
    if (e.key === "Escape" && neo.busy) {
      e.preventDefault();
      neo.stop();
      return;
    }
    if (live?.ask && !typing && !box.draft && /^[1-9]$/.test(e.key)) {
      const option = live.ask.options[Number(e.key) - 1];
      if (option) {
        e.preventDefault();
        neo.answer(live.id, option.id);
      }
    }
  };

  // Expanded from the panel: what the panel was looking at comes along.
  const ctx = neo.runContext || neo.context;
  const carried = !!(ctx.itemId || ctx.selectedIds.length);

  const composer = (
    <Composer
      ref={input}
      variant="page"
      value={box.draft}
      busy={!!neo.busy}
      attachments={box.attachments}
      onChange={setDraftAndClose(box.setDraft, setCategory)}
      onSend={() => box.send()}
      onStop={neo.stop}
      onAttachFiles={box.attachFiles}
      onAttachSample={box.attachSample}
      onRemoveAttachment={box.removeAttachment}
      context={
        carried ? (
          <ContextChip
            variant="pill"
            context={ctx}
            onClear={neo.detach}
            locked={!!neo.runContext}
          />
        ) : undefined
      }
    />
  );

  return (
    <section
      aria-label="Neo chat"
      onKeyDown={onKeyDown}
      className="relative flex min-h-0 flex-1"
    >
      <DropZone
        onFiles={box.attachFiles}
        disabled={!!neo.busy}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {empty && <div aria-hidden className="neo-home-wash" />}
        <header className="relative flex h-14 flex-none items-center px-4">
          <ChatTitle />
        </header>

        {empty ? (
          <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pb-10 pt-[14vh]">
            <div className="flex items-center gap-3">
              <NeoStar className="h-8 w-8 text-pi-brand" />
              <h2 className="neo-reading text-[36px] font-normal leading-[44px] tracking-[-0.01em] text-pi-ink [text-wrap:balance]">
                {hello}, {first}
              </h2>
            </div>
            <div className="mt-8 w-full max-w-[720px]">{composer}</div>
            <div className="mt-5 flex w-full max-w-[720px] flex-col items-center">
              <ul className="flex flex-wrap justify-center gap-2">
                {categories.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-expanded={category === c.id}
                      onClick={() =>
                        setCategory((x) => (x === c.id ? null : c.id))
                      }
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                        category === c.id
                          ? "border-pi-line-2 bg-pi-fill text-pi-ink"
                          : "border-pi-line bg-background text-pi-ink-2 hover:bg-pi-fill hover:text-pi-ink"
                      )}
                    >
                      <c.icon className="h-4 w-4 text-pi-body" />
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
              {openCategory && (
                <ul
                  key={openCategory.id}
                  className="mt-3 w-full overflow-hidden rounded-xl border border-pi-line bg-background shadow-pi-1 duration-200 animate-in fade-in-0 slide-in-from-top-1"
                >
                  {openCategory.prompts.map((p) => (
                    <li key={p} className="border-t border-pi-line first:border-t-0">
                      <button
                        type="button"
                        onClick={() => box.send(p)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] text-pi-ink transition-colors hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
                      >
                        <openCategory.icon className="h-4 w-4 flex-none text-pi-faint" />
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-8 text-caption-1 text-pi-faint">{NOTE}</p>
          </div>
        ) : (
          <>
            <Thread variant="page" onPrompt={(t) => box.send(t)} />
            <div className="flex-none px-6 pb-4 pt-1">
              <div className="mx-auto max-w-[760px]">
                {composer}
                <p className="mt-2 text-center text-caption-1 text-pi-faint">
                  {NOTE}
                </p>
              </div>
            </div>
          </>
        )}
      </DropZone>
      <Canvas variant="page" />
      <Shortcuts />
    </section>
  );
};

/** Typing closes the open category: the person has their own words. */
const setDraftAndClose =
  (setDraft: (v: string) => void, setCategory: (v: null) => void) =>
  (v: string) => {
    setDraft(v);
    if (v) setCategory(null);
  };

export default NeoChat;
