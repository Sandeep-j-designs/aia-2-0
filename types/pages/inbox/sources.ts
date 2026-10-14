import type { InboxItem } from "@/types/pages/inbox";

export type SourceProvider = "Gmail" | "Google Drive" | "WhatsApp Business";
export type AgentRunMode = "on-demand" | "continuous";
export type CollectionAgent = {
  company: string;
  configured: boolean;
  runMode: AgentRunMode;
  paused: boolean;
};
export type CollectionRun = {
  id: string;
  company: string;
  trigger: "continuous" | "on-demand";
  status: "running" | "completed" | "partial" | "stopped" | "failed";
  startedAt: string;
  finishedAt?: string;
  itemIds: string[];
  summary: string;
};
export type InboxSource = {
  id: string;
  company: string;
  provider: SourceProvider;
  account: string;
  scope: string;
  since: string;
  status: "connected" | "paused" | "disconnected";
  lastChecked?: string;
  summary?: string;
};
export type SourceCandidate = {
  key: string;
  hash: string;
  provider: SourceProvider;
  location: string;
  received: string;
  problem?: "missing-reference" | "unreadable";
  document: InboxItem;
};
export type SourceReceipt = {
  company: string;
  sourceId: string;
  candidateKey: string;
  itemId?: string;
  hash: string;
  location: string;
  collectedAt: string;
  outcome: "prepared" | "linked" | "needs-decision" | "failed";
  reason: string;
};
export type SourceRequest = {
  company: string;
  runId: string;
  sourceId: string;
  candidateKey: string;
  body: string;
  status: "waiting" | "received";
};
