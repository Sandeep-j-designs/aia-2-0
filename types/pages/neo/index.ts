/**
 * Neo — the in-app agent.
 *
 * These are the contracts between the agent runtime and the panel that draws
 * it. They are shaped as the stream a real agent backend would send: a run
 * emits steps, questions and cards, and waits on the user where a card or a
 * question needs an answer. The prototype's scripted runtime produces exactly
 * these, so swapping it for a model changes where the events come from, not
 * what they are.
 *
 * DEV: POST /api/neo/runs streams `NeoEvent`s (SSE); the user's answers go
 * back on POST /api/neo/runs/:id/replies. camelCase here, as everywhere.
 */

/**
 * How much a tool call can change, which decides how much Neo asks.
 *
 * - read     — answers and lists. No confirmation.
 * - draft    — creates or edits work that is not yet approved. Previewed,
 *              applied on one key, undoable.
 * - commit   — approval, and anything that syncs to Tally. Neo never does this
 *              on its own; the user's keypress is the approval.
 * - external — anything that leaves the company: messages to vendors or
 *              customers. Shown verbatim, sent only on the user's say-so.
 */
export type NeoRisk = "read" | "draft" | "commit" | "external";

/** A record the agent is pointing at — a citation, or a place to go. */
export type NeoRef = {
  label: string;
  href?: string;
  itemId?: string;
  /** "open" goes to the record; "inbox" shows its row in the queue. */
  target?: "open" | "inbox";
};

export type NeoStepStatus = "running" | "done" | "failed";

export type NeoStep = {
  id: string;
  label: string;
  status: NeoStepStatus;
  cite?: NeoRef;
};

export type NeoOption = {
  id: string;
  label: string;
  hint?: string;
};

export type NeoAsk = {
  question: string;
  options: NeoOption[];
  /** The option picked, once answered. The question stays on screen. */
  answer?: string;
};

export type NeoVoucherLine = {
  ledger: string;
  side: "Dr" | "Cr";
  amount: number;
  /** Chosen by Neo rather than read off the source. Highlighted. */
  inferred?: boolean;
};

export type NeoTone = "neutral" | "positive" | "notice" | "negative";

export type NeoCard =
  | {
      kind: "voucher";
      voucherType: string;
      state: "Preview" | "Draft created";
      voucherNo: string;
      party: string;
      date: string;
      lines: NeoVoucherLine[];
      why?: string;
      source?: NeoRef;
      company?: string;
      assumptions?: string[];
      evidence?: NeoRef[];
      items?: { description: string; cost: number; amount: number }[];
    }
  | {
      kind: "list";
      title: string;
      groups: {
        label: string;
        tone: NeoTone;
        rows: {
          itemId: string;
          primary: string;
          secondary?: string;
          amount?: number;
        }[];
      }[];
    }
  | {
      kind: "diff";
      title: string;
      field: string;
      rows: {
        itemId: string;
        party: string;
        from: string;
        to: string;
        amount: number;
      }[];
    }
  | {
      kind: "message";
      channel: "WhatsApp" | "Email";
      to: string;
      body: string;
    }
  | {
      /**
       * A long-running workflow, drawn as stages with live counters and a
       * running log. Updated in place as the run moves.
       */
      kind: "pipeline";
      title: string;
      startedAt: number;
      finishedAt?: number;
      stages: NeoStage[];
      log: NeoLogLine[];
    };

export type NeoStageStatus = "waiting" | "active" | "done" | "held";

export type NeoStage = {
  id: string;
  label: string;
  status: NeoStageStatus;
  /** "4 clean · 1 duplicate · 1 blocked" — what the stage has found. */
  detail?: string;
};

export type NeoLogLine = {
  id: string;
  at: number;
  text: string;
  itemId?: string;
  tone?: NeoTone;
};

/** How Neo marks a row in the lists while a run is working on it. */
export type NeoPresenceState = "working" | "done" | "held";

export type NeoAction = {
  id: string;
  label: string;
  primary?: boolean;
  risk?: NeoRisk;
};

export type NeoMessage = {
  id: string;
  role: "user" | "neo";
  runId?: string;
  text?: string;
  steps?: NeoStep[];
  ask?: NeoAsk;
  card?: NeoCard;
  actions?: NeoAction[];
  /** The action taken on this card, once decided. Locks its buttons. */
  chosen?: string;
  links?: NeoRef[];
  /** Prompts offered as one-tap follow-ups; picking one sends it. */
  suggestions?: string[];
};

export type NeoRunStatus =
  "running" | "needs-you" | "done" | "failed" | "stopped" | "undone";

export type NeoRun = {
  id: string;
  context: NeoContext;
  title: string;
  status: NeoRunStatus;
  startedAt: string;
  /** Records this run created or changed, for Undo and for the Runs tab. */
  touched: string[];
  summary?: string;
  undoable: boolean;
};

/** What "this" means when the user types it. */
export type NeoContext = {
  company?: string;
  /** The record open on screen. */
  itemId?: string;
  /** Rows ticked in a list. */
  selectedIds: string[];
  /** Which register is on screen, if any. */
  module?: "AP" | "AR" | "JV";
};

/**
 * The runtime's side of a task: what a scripted task (or, later, the model's
 * tool calls) can do to the conversation.
 */
export type NeoTaskApi = {
  runId: string;
  prompt: string;
  context: NeoContext;
  signal: AbortSignal;
  focus: (itemId: string) => void;
  say: (text: string, links?: NeoRef[]) => Promise<void>;
  step: (label: string, cite?: NeoRef) => Promise<(label?: string) => void>;
  fail: (label: string) => void;
  ask: (question: string, options: NeoOption[]) => Promise<string>;
  card: (card: NeoCard, actions: NeoAction[]) => Promise<string>;
  /** Show a card that doesn't wait on the user; returns its updater. */
  show: (card: NeoCard) => (card: NeoCard) => void;
  /** Replace the last card in place — a preview that becomes a result. */
  updateCard: (card: NeoCard, actions?: NeoAction[]) => void;
  touch: (ids: string[]) => void;
  onUndo: (undo: () => { reversed: string[]; skipped: string[] }) => void;
  /** Hand off to another task, as if the user had asked for it. */
  chain: (prompt: string) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  /** Wait here while the user has the run paused. */
  checkpoint: () => Promise<void>;
  /** Mark rows in the on-screen lists; null clears a row. */
  presence: (ids: string[], state: NeoPresenceState | null) => void;
  /** The one-line status the workspace strip shows while a run is live. */
  status: (
    text: string | null,
    progress?: { done: number; total: number }
  ) => void;
  navigate: (path: string) => Promise<void>;
};

export type NeoTask = {
  id: string;
  title: string;
  /** Whether this task answers the prompt, and how strongly. 0 is no. */
  match: (prompt: string, context: NeoContext) => number;
  run: (api: NeoTaskApi) => Promise<string | void>;
};
