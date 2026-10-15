import React from "react";
import { ArrowUpRight, CornerDownLeft } from "@/components/icons";
import type { NeoCard, NeoMessage, NeoRef } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import AskOptions from "./ask-options";
import ChangesetCard from "./changeset-card";
import BatchCard from "./batch-card";
import { useBatches } from "@/hooks/pages/neo/use-batches";
import { FileText } from "@/components/icons";
import DiffCard from "./diff-card";
import ListCard from "./list-card";
import MessageCard from "./message-card";
import PipelineCard from "./pipeline-card";
import Steps from "./steps";
import VoucherCard from "./voucher-card";

type Props = {
  message: NeoMessage;
  /** This message is the one the running task is waiting on. */
  live: boolean;
  /** The run this message belongs to is still going. */
  running: boolean;
  paused: boolean;
  onAnswer: (value: string) => void;
  onEditCard: (card: NeoCard) => void;
  onRef: (ref: NeoRef) => void;
  onPrompt: (prompt: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

/** What an action risks, said under its button. */
const RISK_NOTE = {
  commit: "This approves as you.",
  external: "This sends the message exactly as shown.",
  draft: "You can undo this from Tasks.",
  read: "",
};

/**
 * One turn of the conversation. Neo's own words sit on the agent layer;
 * anything that is a document — a voucher, a list of bills, an outbound
 * message — is drawn as white paper on it, because that is what it is.
 */
const Message = ({
  message: m,
  live,
  running,
  paused,
  onAnswer,
  onEditCard,
  onRef,
  onPrompt,
  onPause,
  onResume,
  onStop,
}: Props) => {
  // Hooks first: a batch card's sign-off counts the ticked rows live.
  const { batches } = useBatches();
  if (m.role === "user")
    return (
      <div className="ml-12 flex flex-col items-end gap-1.5 self-end duration-200 animate-in fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none">
        {m.attachments && m.attachments.length > 0 && (
          <ul
            aria-label="Attached files"
            className="flex flex-wrap justify-end gap-1"
          >
            {m.attachments.map((a) => (
              <li
                key={a.name}
                className="inline-flex max-w-[12rem] items-center gap-1 rounded-md border border-pi-line bg-background px-1.5 py-0.5 text-[11px] text-pi-body"
              >
                <FileText className="h-3 w-3 flex-none" />
                <span className="code truncate">{a.name}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="whitespace-pre-wrap rounded-xl rounded-br-sm bg-primary px-3 py-2 text-body-3 text-primary-foreground">
          {m.text}
        </p>
      </div>
    );

  const primary = m.actions?.find((a) => a.primary);
  // A sign-off names exactly what it will do: "Move 6 bills".
  const picked =
    m.card?.kind === "changeset"
      ? m.card.rows.filter((r) => r.checked).length
      : 0;
  // A batch register's sign-off says how many drafts it will make.
  const batchCard = m.card?.kind === "batch" ? m.card : undefined;
  const batchPicked =
    batchCard?.view === "register"
      ? (batches
          .find((b) => b.id === batchCard.batchId)
          ?.rows.filter((r) => r.checked && r.status !== "left-out").length ??
        0)
      : 0;
  const labelOf = (a: NonNullable<NeoMessage["actions"]>[number]) =>
    m.card?.kind === "changeset" && a.primary
      ? `${m.card.verb} ${picked} bill${picked === 1 ? "" : "s"}`
      : batchCard?.view === "register" && a.primary
        ? `Create ${batchPicked} draft${batchPicked === 1 ? "" : "s"}`
        : a.label;
  return (
    <div className="flex flex-col gap-2.5 duration-300 animate-in fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none">
      {m.steps && <Steps steps={m.steps} onRef={onRef} />}
      {m.text !== undefined && (
        <p className="whitespace-pre-wrap text-body-3 leading-6 text-pi-ink">
          {m.text}
        </p>
      )}
      {m.links && m.links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.links.map((l) => (
            <button
              key={`${l.label}-${l.target}`}
              type="button"
              onClick={() => onRef(l)}
              className="flex h-7 items-center gap-1 rounded-md border border-pi-line px-2 text-label-3 font-semibold text-primary hover:border-border hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {l.label}
              <ArrowUpRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      {m.ask && <AskOptions ask={m.ask} live={live} onPick={onAnswer} />}
      {m.card?.kind === "pipeline" && (
        <PipelineCard
          card={m.card}
          live={running}
          paused={paused}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onRef={onRef}
        />
      )}
      {m.card?.kind === "voucher" && (
        <VoucherCard card={m.card} onRef={onRef} />
      )}
      {m.card?.kind === "list" && <ListCard card={m.card} onRef={onRef} />}
      {m.card?.kind === "diff" && <DiffCard card={m.card} onRef={onRef} />}
      {m.card?.kind === "batch" && (
        <BatchCard card={m.card} editable={live} onRef={onRef} />
      )}
      {m.card?.kind === "changeset" && (
        <ChangesetCard
          card={m.card}
          editable={live}
          onChange={onEditCard}
          onRef={onRef}
        />
      )}
      {m.card?.kind === "message" && (
        <MessageCard
          inputId={`neo-out-${m.id}`}
          card={m.card}
          editable={live}
          onChange={(body) =>
            onEditCard({
              ...(m.card as Extract<NeoCard, { kind: "message" }>),
              body,
            })
          }
        />
      )}
      {m.actions && m.actions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {m.actions.map((a) => {
              const chosen = m.chosen === a.id;
              if (!live && !chosen) return null;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={
                    !live ||
                    (m.card?.kind === "changeset" && a.primary && !picked) ||
                    (batchCard?.view === "register" &&
                      a.primary &&
                      !batchPicked)
                  }
                  onClick={() => onAnswer(a.id)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-lg px-3 text-label-3 font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                    !live
                      ? "border border-pi-line text-pi-body"
                      : a.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                        : "border border-pi-line text-pi-ink hover:border-border hover:bg-pi-fill"
                  )}
                >
                  {!live && "✓ "}
                  {labelOf(a)}
                  {live &&
                    a.primary &&
                    a.risk !== "commit" &&
                    a.risk !== "external" && (
                      <kbd className="flex items-center gap-0.5 rounded-sm bg-primary-foreground/20 px-1 font-sans text-caption-1 text-primary-foreground">
                        Ctrl <CornerDownLeft className="h-3 w-3" />
                      </kbd>
                    )}
                </button>
              );
            })}
          </div>
          {live && primary?.risk && RISK_NOTE[primary.risk] && (
            <p className="text-caption-1 text-pi-body">
              {RISK_NOTE[primary.risk]}
            </p>
          )}
        </div>
      )}
      {m.suggestions && m.suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          {m.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPrompt(s)}
              className="rounded-lg border border-pi-line px-2.5 py-1.5 text-left text-label-3 text-pi-ink hover:border-border hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Message;
