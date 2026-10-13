import type { NeoContext, NeoTask } from "@/types/pages/neo";
import approveBatch from "./approve-batch";
import chase from "./chase";
import duplicates from "./duplicates";
import explain from "./explain";
import journal from "./journal";
import liveRun from "./live-run";
import reledger from "./reledger";
import salesFromPurchase from "./sales-from-purchase";
import triage from "./triage";
import {
  freightInsight,
  itcInsight,
  mahindraReledger,
} from "@/config/pages/neo/tasks/insights";

/**
 * Everything Neo can do in this prototype, in the order a tie is broken.
 *
 * DEV: this registry is the scripted stand-in for the model's planner. With a
 * model behind `POST /api/neo/runs`, the prompt goes to it with these as tool
 * definitions and this file is deleted.
 */
export const NEO_TASKS: NeoTask[] = [
  freightInsight,
  itcInsight,
  mahindraReledger,
  liveRun,
  salesFromPurchase,
  journal,
  chase,
  duplicates,
  triage,
  explain,
  reledger,
  approveBatch,
];

/** What Neo can do, as it says it when asked or when it can't help. */
export const NEO_CAPABILITIES = [
  "Run a scripted bookkeeping pass: receive sample documents, check them, prepare draft fixes, and open the Inbox for review",
  "Raise a sales invoice from a purchase bill",
  "Tell you what in the queue needs you, and what can be approved now",
  "Explain why a document is flagged or blocked",
  "Move a vendor's bills to another ledger",
  "Find duplicates and clear them out",
  "Book month-end journals — depreciation, provisions, prepaid",
  "Approve a batch you've checked",
  "Draft a message to a vendor for a missing GSTIN or a clearer copy",
];

export const pickTask = (prompt: string, context: NeoContext) => {
  const scored = NEO_TASKS.map((task) => ({
    task,
    score: task.match(prompt, context),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.task;
};
