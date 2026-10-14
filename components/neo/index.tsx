import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  History,
  MessageSquare,
  SquarePen,
  X,
} from "@/components/icons";
import { suggestionsFor } from "@/config/pages/neo/suggestions";
import { actor, companyOf, useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { money } from "@/utils/pages/neo";
import { cn } from "@/lib/utils";
import Composer from "./common/composer";
import ContextChip from "./common/context-chip";
import Message from "./common/message";
import NeoMark from "./common/neo-mark";
import RunList from "./common/run-list";

const LIVE_RUN_PROMPT = "Start a live bookkeeping run";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/**
 * Neo's panel: the agent layer, docked right, above every route.
 *
 * It sits on the top bar's navy rather than the workspace's white, so the
 * agent reads as its own layer beside the books — and anything Neo hands you
 * that is a document (a voucher, a list of bills, a message to send) is drawn
 * as white paper on that layer. One accent, no ornament: the difference is the
 * ground, not decoration.
 *
 * The panel owns its keys while focus is inside it — digits answer the open
 * question, Ctrl+Enter takes the card's main action, Esc stops a run or closes
 * — so none of them reach the queue's shortcuts behind it.
 */
const NeoPanel = () => {
  const neo = useNeo();
  const state = useStore();
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // The message the running task is waiting on, if any.
  const live = useMemo(() => {
    if (!neo.busy) return undefined;
    return [...neo.messages]
      .reverse()
      .find(
        (m) =>
          m.runId === neo.busy &&
          ((m.ask && !m.ask.answer) || (m.actions?.length && !m.chosen))
      );
  }, [neo.busy, neo.messages]);

  const suggestions = useMemo(
    () => suggestionsFor(neo.context),
    // The store is a dependency: what can be suggested follows the queue.
    [neo.context, state]
  );

  const waiting = useMemo(() => {
    const open = state.items.filter(
      (x) =>
        x.company === state.company &&
        !x.priorVoucher &&
        ["Needs Review", "Duplicate"].includes(x.status)
    );
    return {
      count: open.length,
      total: open.reduce((s, x) => s + x.amount, 0),
    };
  }, [state]);

  useEffect(() => {
    if (neo.open) window.setTimeout(() => input.current?.focus(), 60);
  }, [neo.open]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [neo.messages, neo.tab]);

  const send = (text = draft) => {
    if (!text.trim() || neo.busy) return;
    setDraft("");
    void neo.startRun(text);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.defaultPrevented) return;
    const typing = (e.target as HTMLElement).closest(
      "input, textarea, select, [contenteditable=true]"
    );
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (neo.busy) neo.stop();
      else neo.setOpen(false);
      return;
    }
    if (
      neo.tab === "chat" &&
      !neo.messages.length &&
      !draft &&
      !typing &&
      /^[1-4]$/.test(e.key) &&
      suggestions[Number(e.key) - 1]
    ) {
      e.preventDefault();
      send(suggestions[Number(e.key) - 1]);
      return;
    }
    if (live?.ask && !typing && !draft && /^[1-9]$/.test(e.key)) {
      const option = live.ask.options[Number(e.key) - 1];
      if (option) {
        e.preventDefault();
        neo.answer(live.id, option.id);
      }
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const primary = live?.actions?.find((a) => a.primary);
      if (
        live &&
        primary &&
        !typing &&
        primary.risk !== "commit" &&
        primary.risk !== "external"
      )
        neo.answer(live.id, primary.id);
    }
    e.stopPropagation();
  };

  if (!neo.open)
    return neo.hasLauncher ? null : (
      <button
        type="button"
        onClick={() => neo.setOpen(true)}
        title="Ask Neo (Ctrl J)"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-background px-1.5 py-3 text-pi-ink shadow-popover-shadow hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <NeoMark className="h-6 w-6 text-label-3" live={!!neo.busy} />
        <span className="text-caption-1 font-semibold [writing-mode:vertical-rl]">
          Ask Neo
        </span>
      </button>
    );

  const firstName = actor.split(" ")[0];
  const company = companyOf(state.company)?.name;

  return (
    <aside
      aria-label="Neo"
      onKeyDown={onKeyDown}
      className="neo-panel fixed right-0 top-0 z-40 flex h-dvh w-full max-w-full flex-col border-l border-pi-line bg-background text-pi-ink shadow-popover-shadow duration-200 animate-in slide-in-from-right-8 fade-in-0 motion-reduce:animate-none sm:w-96"
    >
      <header className="relative flex min-h-[112px] flex-none items-start gap-3 border-b border-pi-line px-5 pb-14 pt-4">
        <NeoMark live={!!neo.busy && !neo.paused} />
        <div className="min-w-0 leading-tight">
          <h2 className="text-base font-semibold leading-6">Neo</h2>
          <p
            className="truncate text-caption-1 text-pi-body"
            aria-live="polite"
          >
            {neo.busy
              ? neo.paused
                ? "Paused"
                : "Working"
              : "Accounting agent"}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Neo views"
          className="absolute bottom-3 left-5 right-5 flex gap-1 rounded-lg bg-pi-fill p-1"
        >
          {(
            [
              { id: "chat", label: "Chat", icon: MessageSquare },
              {
                id: "runs",
                label: `Tasks${neo.runs.length ? ` ${neo.runs.length}` : ""}`,
                icon: History,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={neo.tab === t.id}
              onClick={() => neo.setTab(t.id)}
              className={cn(
                "flex h-8 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                neo.tab === t.id
                  ? "bg-background text-primary shadow-sm"
                  : "text-pi-body hover:text-pi-ink"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="New chat"
          title="New chat"
          disabled={!!neo.busy || !neo.messages.length}
          onClick={neo.reset}
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-40"
        >
          <SquarePen className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Close Neo"
          title="Close (Esc)"
          onClick={() => neo.setOpen(false)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <p className="px-5 pb-1 pt-3 text-xs leading-5 text-pi-body">
        {companyOf(neo.runContext?.company || state.company)?.name}
        {neo.runContext ? " · Run scope is fixed" : " · Scripted prototype"}
      </p>
      <ContextChip
        context={neo.runContext || neo.context}
        onClear={neo.detach}
        locked={!!neo.runContext}
      />

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-wrap:anywhere]"
      >
        {neo.tab === "runs" ? (
          <RunList
            runs={neo.runs}
            onUndo={neo.undo}
            onRef={neo.goTo}
            busy={!!neo.busy}
          />
        ) : neo.messages.length ? (
          <div className="flex flex-col gap-6 px-5 py-6">
            {neo.messages.map((m) => (
              <Message
                key={m.id}
                message={m}
                live={live?.id === m.id}
                running={!!m.runId && m.runId === neo.busy}
                paused={neo.paused}
                onAnswer={(v) => neo.answer(m.id, v)}
                onEditCard={(card) => neo.editCard(m.id, card)}
                onRef={neo.goTo}
                onPrompt={send}
                onPause={neo.pause}
                onResume={neo.resume}
                onStop={neo.stop}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-7 px-5 py-7">
            <div>
              <p className="text-xl font-semibold tracking-tight text-pi-ink">
                {greeting()}, {firstName}.
              </p>
              <p className="mt-3 text-sm leading-6 text-pi-body">
                {waiting.count
                  ? `${waiting.count} document${waiting.count === 1 ? "" : "s"} worth ${money(waiting.total)} are waiting in ${company}.`
                  : `${company}'s queue is clear.`}{" "}
                I prepare the work and show you exactly what will post. Nothing
                is approved or sent until you say so.
              </p>
            </div>

            <button
              type="button"
              onClick={() => send(LIVE_RUN_PROMPT)}
              className="group flex flex-col gap-3 rounded-xl border border-pi-line bg-background p-4 text-left text-foreground transition-colors hover:border-pi-brand-border hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <span className="flex items-center justify-between">
                <span className="rounded-sm bg-background px-1.5 py-0.5 text-caption-1 font-bold uppercase tracking-wide text-pi-ink">
                  Live run
                </span>
                <kbd className="rounded-sm bg-muted px-1.5 font-sans text-caption-1 font-semibold text-muted-foreground">
                  Demo
                </kbd>
              </span>
              <span>
                <span className="block text-label-1 font-bold">
                  Work the Inbox with me
                </span>
                <span className="mt-1 block text-body-4 text-muted-foreground">
                  New bills come in, I read and check each one, fix what I can,
                  and hold the rest. Review the prepared batch in the Inbox,
                  then approve and sync through the usual controls.
                </span>
              </span>
              <span className="flex items-center gap-1 text-label-3 font-semibold text-primary">
                Start
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </button>

            <div>
              <p className="mb-2 text-caption-1 font-semibold uppercase tracking-wide text-pi-body">
                Or ask for one thing
              </p>
              <ul className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => send(s)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-pi-line px-3 py-3 text-left text-[13px] leading-5 text-pi-ink hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                    >
                      <kbd className="grid h-5 min-w-5 flex-none place-items-center rounded-sm bg-pi-fill px-1 font-sans text-caption-1 font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        {i + 1}
                      </kbd>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <Composer
        ref={input}
        value={draft}
        busy={!!neo.busy}
        onChange={setDraft}
        onSend={() => send()}
        onStop={neo.stop}
      />
    </aside>
  );
};

export default NeoPanel;
