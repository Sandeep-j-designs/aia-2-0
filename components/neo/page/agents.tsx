import React from "react";
import { useRouter } from "next/router";
import {
  Check,
  Circle,
  Copy,
  Landmark,
  ListChecks,
  Percent,
  Plus,
  ReceiptText,
  NeoStar,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { useAgents } from "@/hooks/pages/neo/use-agents";
import { useCollectionAgent } from "@/hooks/pages/agents/use-collection-agent";
import {
  AGENT_RECIPES,
  READY_AGENTS,
  TRIGGER_LABEL,
} from "@/config/pages/neo/mock-agents";
import type { NeoAgentRecipe } from "@/types/pages/neo/agents";
import { cn } from "@/lib/utils";

type Props = { company: string };

const RECIPE_ICON: Record<NeoAgentRecipe["icon"], typeof Copy> = {
  "bill-check": ListChecks,
  duplicate: Copy,
  bank: Landmark,
  receivables: ReceiptText,
  gst: Percent,
};

const when = (iso?: string) =>
  iso
    ? new Date(iso)
        .toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toLowerCase()}`)
    : undefined;

type Chip = { label: string; on: boolean };

const StatusChip = ({ chip }: { chip: Chip }) => (
  <span
    className={cn(
      "inline-flex flex-none items-center gap-1.5 rounded-md border px-2 py-0.5 text-caption-1 font-medium",
      chip.on
        ? "border-pi-success-line bg-pi-success-bg text-pi-success"
        : "border-pi-line text-pi-body"
    )}
  >
    {chip.on ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
    {chip.label}
  </span>
);

const CARD =
  "rounded-xl border border-pi-line bg-background text-left transition-[border-color,box-shadow] hover:border-pi-line-2 hover:shadow-pi-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border";

/**
 * Neo › Agents: the agents this client has, then ideas to start from, then
 * the assistants that need no set-up. Every "Create" opens a chat; Neo sets
 * the agent up in conversation and nothing runs until it is signed off.
 */
const NeoAgents = ({ company }: Props) => {
  const router = useRouter();
  const agents = useAgents(company);
  const collection = useCollectionAgent(company);
  const chat = useStartChat();
  const collectionDraft =
    !collection.agent.configured && !!collection.agent.setup;

  const yours = [
    // Document collection predates the Agents page; it keeps its own screen.
    {
      id: "document-collection",
      name: "Document collection",
      description:
        "Collects supplier bills from email, WhatsApp and Drive, and prepares drafts for review.",
      chip: {
        label: collection.agent.configured
          ? collection.status
          : collectionDraft
            ? "Draft"
            : "Not set up",
        on:
          collection.agent.configured &&
          ["Watching", "Running", "Ready"].includes(collection.status),
      },
      meta: collection.agent.configured
        ? `${collection.connected.length} channel${collection.connected.length === 1 ? "" : "s"} connected`
        : collectionDraft
          ? "Saved, not running yet"
          : "Set up with Neo in a few questions",
      // Not set up yet: set up in the chat; set up: its own screen.
      open: () =>
        collection.agent.configured
          ? void router.push("/inbox?module=AGENTS&page=document-collection")
          : void chat(
              collectionDraft
                ? "Edit agent Document collection"
                : "Set up document collection"
            ),
    },
    ...agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      chip: {
        label:
          a.status === "draft"
            ? "Draft"
            : a.status === "scheduled"
              ? "Scheduled"
              : a.status === "on"
                ? "On"
                : "Paused",
        on: a.status === "scheduled" || a.status === "on",
      },
      meta: [
        TRIGGER_LABEL[a.trigger],
        a.lastRunAt && `Last run ${when(a.lastRunAt)}`,
        a.toReview && `${a.toReview} to review`,
      ]
        .filter(Boolean)
        .join(" · "),
      open: () => void chat(`Edit agent ${a.name}`),
    })),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 flex-none items-center justify-between gap-4 border-b border-pi-line px-6">
        <h1 className="text-lg font-semibold text-pi-ink">Agents</h1>
        <Button onClick={() => void chat("Create an agent")}>
          <Plus />
          Create agent
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 pb-16 pt-8">
          <section aria-labelledby="neo-your-agents">
            <h2
              id="neo-your-agents"
              className="text-base font-semibold text-pi-ink"
            >
              Your agents{" "}
              <span className="font-normal text-pi-faint">{yours.length}</span>
            </h2>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {yours.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={a.open}
                    className={cn(CARD, "flex h-full w-full flex-col p-5")}
                  >
                    <span className="flex w-full items-start justify-between gap-3">
                      <span className="text-base font-semibold text-pi-ink">
                        {a.name}
                      </span>
                      <StatusChip chip={a.chip} />
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm leading-6 text-pi-body">
                      {a.description}
                    </span>
                    <span className="mt-auto pt-3 text-caption-1 text-pi-faint">
                      {a.meta}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="neo-recommended" className="mt-14">
            <div className="text-center">
              <h2
                id="neo-recommended"
                className="text-lg font-semibold text-pi-ink"
              >
                Recommended agents
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-pi-body">
                Start from an idea. Neo sets it up with you in a conversation,
                and you review it before anything runs.
              </p>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {AGENT_RECIPES.map((r) => {
                const Icon = RECIPE_ICON[r.icon];
                return (
                  <li
                    key={r.id}
                    className={cn(CARD, "flex flex-col p-5 hover:shadow-none")}
                  >
                    <Icon className="h-5 w-5 text-pi-ink" />
                    <h3 className="mt-4 text-[15px] font-semibold leading-6 text-pi-ink">
                      {r.name}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-6 text-pi-body">
                      {r.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => void chat(`Create an agent: ${r.name}`)}
                      aria-label={`Create ${r.name}`}
                      className="mt-4 self-start rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                    >
                      Create
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="neo-ready" className="mt-12">
            <h2
              id="neo-ready"
              className="text-center text-sm font-semibold text-pi-body"
            >
              Ready to use
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {READY_AGENTS.map((r) => (
                <li
                  key={r.id}
                  className={cn(CARD, "flex flex-col p-5 hover:shadow-none")}
                >
                  <NeoStar className="h-5 w-5 text-pi-brand" />
                  <h3 className="mt-4 text-[15px] font-semibold leading-6 text-pi-ink">
                    {r.name}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-pi-body">
                    {r.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => void chat(r.prompt)}
                    aria-label={`Start a chat with ${r.name}`}
                    className="mt-4 self-start rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  >
                    Start chat
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NeoAgents;
