import React from "react";
import {
  ArrowUpRight,
  ChevronRight,
  CirclePause,
  CornerDownLeft,
  FileText,
  Lock,
  MessageCircle,
  Play,
  RotateCcw,
  ShieldCheck,
} from "@/components/icons";
import type { NeoCard, NeoMessage, NeoRef, NeoRisk } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { canvasTitle, opensInCanvas } from "@/utils/pages/neo/canvas";
import AskOptions from "./ask-options";
import ChangesetCard from "./changeset-card";
import BatchCard from "./batch-card";
import { useBatches } from "@/hooks/pages/neo/use-batches";
import DiffCard from "./diff-card";
import AgentCard from "./agent-card";
import CollectionCard from "./collection-card";
import DryRunCard, { preparedCount } from "./dry-run-card";
import {
  dryRunCollection,
  useInboxSources,
} from "@/hooks/pages/inbox/use-inbox-sources";
import ListCard from "./list-card";
import MessageCard from "./message-card";
import PipelineCard from "./pipeline-card";
import Prose from "./prose";
import Steps from "./steps";
import VoucherCard from "./voucher-card";

type CardProps = {
  message: NeoMessage;
  /** This message is the one the running task is waiting on. */
  live: boolean;
  /** The run this message belongs to is still going. */
  running: boolean;
  paused: boolean;
  onEditCard: (card: NeoCard) => void;
  onRef: (ref: NeoRef) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  /** Drawn in the canvas: full size, every row. */
  expanded?: boolean;
};

type Props = CardProps & {
  onAnswer: (value: string) => void;
  onPrompt: (prompt: string) => void;
  /** Open this message's document beside the chat. */
  onOpenCanvas?: () => void;
  /** This message's document is the one open beside the chat. */
  inCanvas?: boolean;
  /** A stopped run: carry on from where it stood, or ask again. */
  onContinue?: () => void;
  onRetry?: () => void;
  /** Why Continue can't be offered, if it can't. */
  continueBlocked?: string;
};

/**
 * The card itself — a voucher, a list, a change set. Drawn in the thread for
 * small cards and in the canvas beside the chat for documents; both places
 * share this, so an edit in one is the edit in the other.
 */
export const CardBody = ({
  message: m,
  live,
  running,
  paused,
  onEditCard,
  onRef,
  onPause,
  onResume,
  onStop,
  expanded,
}: CardProps) => {
  const card = m.card;
  if (!card) return null;
  switch (card.kind) {
    case "pipeline":
      return (
        <PipelineCard
          card={card}
          live={running}
          paused={paused}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onRef={onRef}
        />
      );
    case "voucher":
      return <VoucherCard card={card} onRef={onRef} />;
    case "list":
      return <ListCard card={card} onRef={onRef} all={expanded} />;
    case "agent":
      return <AgentCard card={card} />;
    case "collection-setup":
      return <CollectionCard card={card} />;
    case "collection-dry-run":
      return <DryRunCard card={card} />;
    case "diff":
      return <DiffCard card={card} onRef={onRef} />;
    case "batch":
      return <BatchCard card={card} editable={live} onRef={onRef} />;
    case "changeset":
      return (
        <ChangesetCard
          card={card}
          editable={live}
          onChange={onEditCard}
          onRef={onRef}
        />
      );
    case "message":
      return (
        <MessageCard
          inputId={`neo-out-${m.id}`}
          card={card}
          editable={live}
          onChange={(body) => onEditCard({ ...card, body })}
        />
      );
    default:
      return null;
  }
};

/**
 * A document Neo made, as a tile in the thread: what it is, where it stands,
 * and Open. The document itself is beside the chat.
 */
const CanvasTile = ({
  card,
  live,
  open,
  onOpen,
}: {
  card: NeoCard;
  live: boolean;
  open?: boolean;
  onOpen?: () => void;
}) => {
  const { title, meta } = canvasTitle(card);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={open}
      className={cn(
        "group flex w-full max-w-[420px] items-center gap-3 rounded-xl border bg-background p-2.5 pr-3 text-left shadow-contact transition-[border-color,box-shadow] hover:border-pi-line-2 hover:shadow-pi-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
        open ? "border-pi-brand-border ring-2 ring-pi-brand-tint" : "border-pi-line"
      )}
    >
      <span className="grid h-10 w-10 flex-none place-items-center rounded-md border border-pi-line bg-pi-fill text-pi-body group-hover:text-pi-ink">
        <FileText className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold leading-5 text-pi-ink">
          {title}
        </span>
        <span className="block truncate text-caption-1 text-pi-body">
          {live ? "Waiting for you · " : ""}
          {meta}
        </span>
      </span>
      <span className="flex flex-none items-center gap-0.5 text-[12px] font-medium text-pi-body group-hover:text-pi-ink">
        {open ? "Open" : "View"}
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
};

/** What an action risks, said in the sign-off's head. */
const RISK: Record<
  Exclude<NeoRisk, "read">,
  { head: string; note: string; icon: typeof Lock }
> = {
  commit: {
    head: "Approves as you",
    note: "Neo has prepared this. Your click is the approval.",
    icon: ShieldCheck,
  },
  external: {
    head: "Leaves the company",
    note: "Sent exactly as shown, from your firm's account.",
    icon: MessageCircle,
  },
  draft: {
    head: "Creates drafts",
    note: "Nothing is approved. You can undo this from Activity.",
    icon: Lock,
  },
};

/**
 * One of Neo's messages. Its words are prose; a question is a short list of
 * answers; a document is a tile that opens beside the chat; and anything that
 * changes the books ends on a sign-off that says what it risks before the
 * button that does it.
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
  onOpenCanvas,
  inCanvas,
  onContinue,
  onRetry,
  continueBlocked,
}: Props) => {
  // Hooks first: a batch card's sign-off counts the ticked rows live.
  const { batches } = useBatches();
  // …and a collection dry run's sign-off counts the drafts it would make.
  const sources = useInboxSources();

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
  const dryRun = m.card?.kind === "collection-dry-run" ? m.card : undefined;
  const dryDraft = dryRun
    ? sources.drafts.find((d) => d.company === dryRun.company)?.setup
    : undefined;
  const wouldPrepare =
    dryRun && dryDraft
      ? preparedCount(dryRunCollection(dryRun.company, dryDraft))
      : 0;
  const labelOf = (a: NonNullable<NeoMessage["actions"]>[number]) =>
    dryRun && a.id === "on"
      ? wouldPrepare
        ? `Turn on and prepare ${wouldPrepare} draft${wouldPrepare === 1 ? "" : "s"}`
        : "Turn on"
      : m.card?.kind === "changeset" && a.primary
        ? `${m.card.verb} ${picked} bill${picked === 1 ? "" : "s"}`
        : batchCard?.view === "register" && a.primary
          ? `Create ${batchPicked} draft${batchPicked === 1 ? "" : "s"}`
          : a.label;

  if (m.stopped)
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-pi-line bg-pi-head-bg px-4 py-3">
        <div className="flex items-start gap-2.5">
          <CirclePause className="mt-0.5 h-4 w-4 flex-none text-pi-body" />
          <p className="min-w-0 text-[13px] leading-5 text-pi-ink">
            <span className="font-semibold">{m.stopped.reason}.</span>{" "}
            <span className="text-pi-body">
              {m.stopped.touched
                ? `${m.stopped.touched} record${m.stopped.touched === 1 ? " was" : "s were"} already changed and stay${m.stopped.touched === 1 ? "s" : ""} as they are; Activity lists ${m.stopped.touched === 1 ? "it" : "them"}.`
                : "Nothing was changed."}
            </span>
          </p>
        </div>
        {(onContinue || onRetry) && (
          <div className="flex flex-wrap items-center gap-2 pl-[26px]">
            {onContinue && (
              <button
                type="button"
                disabled={!!continueBlocked}
                onClick={onContinue}
                className="flex h-8 items-center gap-1.5 rounded-sm border border-pi-btn-primary-edge bg-pi-btn-fill px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <Play className="h-3 w-3 fill-current" />
                Continue
              </button>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex h-8 items-center gap-1.5 rounded-sm border border-pi-line-2 bg-background px-3 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start over
              </button>
            )}
            {continueBlocked && (
              <span className="text-caption-1 text-pi-body">{continueBlocked}</span>
            )}
          </div>
        )}
      </div>
    );

  const tiled = !!onOpenCanvas && opensInCanvas(m.card);
  const risk =
    primary?.risk && primary.risk !== "read" ? RISK[primary.risk] : undefined;

  const buttons = m.actions && m.actions.length > 0 && (
    <div className="flex flex-wrap gap-2">
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
              (batchCard?.view === "register" && a.primary && !batchPicked)
            }
            onClick={() => onAnswer(a.id)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-sm px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
              !live
                ? "h-7 border border-pi-line px-2.5 text-[12px] font-medium text-pi-body disabled:opacity-100"
                : a.primary
                  ? "border border-pi-btn-primary-edge bg-pi-btn-fill text-primary-foreground hover:bg-primary-hover"
                  : "border border-pi-line-2 bg-background text-pi-ink shadow-contact hover:bg-pi-fill"
            )}
          >
            {!live && "✓ "}
            {labelOf(a)}
            {live &&
              a.primary &&
              a.risk !== "commit" &&
              a.risk !== "external" && (
                <kbd className="ml-0.5 flex items-center gap-0.5 rounded-xs bg-primary-foreground/20 px-1 font-sans text-[11px] font-medium text-primary-foreground">
                  Ctrl <CornerDownLeft className="h-3 w-3" />
                </kbd>
              )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {m.steps && <Steps steps={m.steps} onRef={onRef} running={running} />}
      {m.text !== undefined && m.text !== "" && (
        <Prose text={m.text} onRef={onRef} streaming={m.streaming} />
      )}
      {m.links && m.links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {m.links.map((l) => (
            <button
              key={`${l.label}-${l.target}`}
              type="button"
              onClick={() => onRef(l)}
              className="flex h-7 items-center gap-1 rounded-full border border-pi-line bg-background px-3 text-[12px] font-medium text-pi-ink-2 transition-colors hover:border-pi-line-2 hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {l.label}
              <ArrowUpRight className="h-3 w-3 text-pi-faint" />
            </button>
          ))}
        </div>
      )}
      {m.ask && <AskOptions ask={m.ask} live={live} onPick={onAnswer} />}
      {m.card &&
        (tiled ? (
          <CanvasTile
            card={m.card}
            live={live}
            open={inCanvas}
            onOpen={onOpenCanvas}
          />
        ) : (
          <CardBody
            message={m}
            live={live}
            running={running}
            paused={paused}
            onEditCard={onEditCard}
            onRef={onRef}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
          />
        ))}
      {buttons &&
        (live && risk ? (
          // The sign-off: what this risks, then the buttons that do it.
          <div className="overflow-hidden rounded-xl border border-pi-line bg-background shadow-contact">
            <div className="flex items-start gap-2.5 border-b border-pi-line bg-pi-head-bg px-3.5 py-2.5">
              <risk.icon className="mt-0.5 h-4 w-4 flex-none text-pi-body" />
              <p className="min-w-0 text-[13px] leading-5">
                <span className="font-semibold text-pi-ink">{risk.head}</span>
                <span className="text-pi-body"> · {risk.note}</span>
              </p>
            </div>
            <div className="px-3.5 py-3">{buttons}</div>
          </div>
        ) : (
          buttons
        ))}
      {m.suggestions && m.suggestions.length > 0 && (
        <div className="flex flex-col items-start gap-1.5 pt-1">
          {m.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPrompt(s)}
              className="group flex items-center gap-2 rounded-lg px-1 py-1 text-left text-[13px] leading-5 text-pi-body transition-colors hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <CornerDownLeft className="h-3.5 w-3.5 flex-none -scale-x-100 text-pi-faint group-hover:text-pi-brand" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Message;
