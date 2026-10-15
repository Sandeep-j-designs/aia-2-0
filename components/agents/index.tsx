import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import { AGENT_CATALOG } from "@/config/pages/agents/catalog";
import { useCollectionAgent } from "@/hooks/pages/agents/use-collection-agent";
import { setSourceStatus } from "@/hooks/pages/inbox/use-inbox-sources";
import type { AgentRunMode, InboxSource } from "@/types/pages/inbox/sources";
import ConnectionSetup from "@/components/agents/connection-setup";
import AgentOverview from "@/components/agents/agent-overview";
import RunMode from "@/components/agents/run-mode";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Settings2,
  Clock3,
  CheckCircle2,
  FileText,
  Inbox,
  Sparkles,
} from "lucide-react";
import { ProviderIcon } from "@/components/agents/provider-icon";
import { SOURCE_PROVIDERS } from "@/config/pages/inbox/mock-sources";

const ModeSettings = ({
  mode,
  onSave,
}: {
  mode: AgentRunMode;
  onSave: (mode: AgentRunMode) => void;
}) => {
  const [draft, setDraft] = useState(mode);
  return (
    <section className="space-y-4 rounded-2xl border border-pi-line bg-background p-6 text-sm">
      <RunMode value={draft} onChange={setDraft} />
      <p className="text-pi-body">
        This applies to future collections. Any task already running will
        finish.
      </p>
      <Button disabled={draft === mode} onClick={() => onSave(draft)}>
        Save run mode
      </Button>
    </section>
  );
};

/** Mounted inside the existing authenticated workspace shell. DEV: use
 * useRoutedListState for the page and tab keys in the production route. */
const Agents = ({ company }: { company: string }) => {
  const router = useRouter();
  const c = useCollectionAgent(company);
  const [editing, setEditing] = useState<InboxSource | "new" | null>(null);
  const detail = router.query.page === "document-collection";
  const tab = ["overview", "configuration", "activity"].includes(
    String(router.query.tab)
  )
    ? String(router.query.tab)
    : "overview";
  const go = (nextTab?: string) => {
    setEditing(null);
    void router.push(
      nextTab
        ? `/inbox?module=AGENTS&page=document-collection&tab=${nextTab}`
        : "/inbox?module=AGENTS"
    );
  };
  const modeLabel =
    c.agent.runMode === "continuous" ? "Continuous" : "On demand";
  if (!detail)
    return (
      <FeaturePage title="Sources">
        <div className="mx-auto max-w-5xl space-y-8 py-4">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-pi-brand">
              Your team, with a little extra help
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-pi-ink">
              Put the routine on autopilot.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-pi-body">
              Give your agents the repetitive work. Keep the decisions that
              matter.
            </p>
          </div>
          {AGENT_CATALOG.map((agent) => (
            <article
              key={agent.id}
              className="grid overflow-hidden rounded-2xl border border-pi-line bg-background shadow-sm md:grid-cols-[1.15fr_1fr]"
            >
              <div className="space-y-6 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pi-brand-tint text-pi-brand">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-pi-sunken px-3 py-1 text-xs text-pi-body">
                    {c.agent.configured
                      ? `${modeLabel} · ${c.status}`
                      : "Ready to set up"}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-pi-ink">
                    {agent.name}
                  </h2>
                  <p className="max-w-xl text-sm leading-6 text-pi-body">
                    Supplier invoices, gathered for you. Connect a source and
                    let your agent turn incoming documents into drafts ready for
                    review.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_PROVIDERS.map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-pi-line px-2 py-1 text-xs text-pi-body"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-pi-line pt-6">
                  <Button
                    className="h-10 rounded-lg"
                    onClick={() =>
                      go(c.agent.configured ? "overview" : "configuration")
                    }
                  >
                    {c.agent.configured ? "Manage agent" : "Set up agent"}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                  <p className="text-sm text-pi-body">
                    {c.agent.configured
                      ? `${c.connected.length} connected account${c.connected.length === 1 ? "" : "s"}`
                      : "2 simple steps"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center border-t border-pi-line bg-pi-sunken p-6 sm:p-8 md:border-l md:border-t-0">
                <p className="mb-6 text-xs font-medium uppercase tracking-widest text-pi-body">
                  From scattered to sorted
                </p>
                <div className="flex items-center justify-center gap-4">
                  {SOURCE_PROVIDERS.map((p) => (
                    <ProviderIcon key={p} provider={p} />
                  ))}
                </div>
                <div className="mx-auto h-7 w-px bg-pi-line-2" />
                <div className="rounded-xl border border-pi-line bg-background p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Inbox className="h-4 w-4 text-pi-brand" />
                    Your Inbox
                    <span className="ml-auto text-xs font-normal text-pi-body">
                      Preview
                    </span>
                  </div>
                  {["Supplier invoice", "Freight invoice"].map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-3 border-t border-pi-line py-3"
                    >
                      <FileText className="h-4 w-4 text-pi-body" />
                      <span className="flex-1 text-xs">{name}</span>
                      <span className="rounded-full bg-pi-success-bg px-2 py-1 text-xs text-pi-success">
                        Draft
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 flex items-center justify-center gap-2 text-xs text-pi-body">
                  <CheckCircle2 className="h-4 w-4 text-pi-success" />
                  You review. You approve.
                </p>
              </div>
            </article>
          ))}
          <p className="text-xs text-pi-body">
            Demo workspace · sample connections and documents. Setup resets on
            reload.
          </p>
        </div>
      </FeaturePage>
    );
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <Button variant="ghost" className="mb-5 -ml-3" onClick={() => go()}>
          <ArrowLeft />
          All agents
        </Button>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pi-brand-border bg-pi-brand-tint text-pi-brand">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-pi-ink">
                Document Collection
              </h1>
              <p className="mt-1 text-sm text-pi-body">
                Supplier invoices, gathered for you.
              </p>
            </div>
          </div>
          {c.agent.configured && (
            <span className="inline-flex items-center gap-2 rounded-full border border-pi-line bg-background px-3 py-1.5 text-xs text-pi-body">
              <span
                className={`h-1.5 w-1.5 rounded-full ${c.agent.paused || !c.connected.length ? "bg-pi-warning" : "bg-pi-success"}`}
              />
              {modeLabel} · {c.status}
            </span>
          )}
        </header>
        {c.agent.configured && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Document Collection"
              className="inline-flex gap-1 rounded-xl border border-pi-line bg-pi-sunken p-1"
            >
              {[
                { id: "overview", label: "Overview", icon: Inbox },
                {
                  id: "configuration",
                  label: "Configuration",
                  icon: Settings2,
                },
                { id: "activity", label: "Activity", icon: Clock3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  data-state={tab === id ? "active" : "inactive"}
                  onClick={() => go(id)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-pi-brand sm:px-4 sm:text-sm ${tab === id ? "bg-background font-medium text-pi-brand shadow-sm" : "text-pi-body hover:text-pi-ink"}`}
                >
                  <Icon className="hidden h-4 w-4 sm:block" />
                  {label}
                </button>
              ))}
            </div>
            {tab !== "overview" && !editing && (
              <div className="mb-2 flex flex-wrap gap-2">
                {c.busy ? (
                  <Button variant="outline" onClick={c.stop}>
                    Stop task
                  </Button>
                ) : (
                  <Button
                    className="rounded-lg"
                    disabled={!c.connected.length || c.neoBusy}
                    onClick={c.run}
                  >
                    <Play />
                    Run now
                  </Button>
                )}
                {c.agent.runMode === "continuous" && (
                  <Button variant="ghost" onClick={c.pause}>
                    {c.agent.paused ? "Resume agent" : "Pause agent"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        <div
          key={tab}
          className="space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        >
          {tab === "overview" &&
            (c.agent.configured ? (
              <AgentOverview
                controller={c}
                onConfigure={() => go("configuration")}
                onActivity={() => go("activity")}
                onInbox={() => void router.push("/inbox")}
                onDocument={(id) =>
                  void router.push(`/inbox?id=${encodeURIComponent(id)}`)
                }
              />
            ) : (
              <Button onClick={() => go("configuration")}>Set up agent</Button>
            ))}
          {tab === "configuration" && (
            <>
              {!c.agent.configured || editing ? (
                <ConnectionSetup
                  key={
                    typeof editing === "object" ? editing?.id || "setup" : "new"
                  }
                  company={company}
                  source={editing && editing !== "new" ? editing : undefined}
                  initialSetup={!c.agent.configured}
                  busy={c.busy || c.neoBusy}
                  onCancel={() =>
                    c.agent.configured ? setEditing(null) : go()
                  }
                  onSaved={(mode) => {
                    const initial = !c.agent.configured;
                    setEditing(null);
                    if (initial) {
                      go("overview");
                      if (mode === "continuous") c.run();
                    }
                  }}
                />
              ) : (
                <>
                  <ModeSettings
                    key={c.agent.runMode}
                    mode={c.agent.runMode}
                    onSave={c.saveMode}
                  />
                  <section className="space-y-4 rounded-2xl border border-pi-line bg-background p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold text-pi-ink">
                        Connections and access
                      </h2>
                      <Button
                        variant="outline"
                        disabled={c.busy || c.neoBusy}
                        onClick={() => setEditing("new")}
                      >
                        Add connection
                      </Button>
                    </div>
                    {c.sources.map((s) => (
                      <article
                        key={s.id}
                        className="rounded-xl border border-pi-line bg-background p-5 text-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <ProviderIcon provider={s.provider} />
                            <h3 className="font-semibold">{s.provider}</h3>
                          </div>
                          <span className="self-start rounded-full bg-pi-sunken px-2.5 py-1 text-xs capitalize text-pi-body">
                            {s.status}
                          </span>
                        </div>
                        <p className="mt-2 break-all text-pi-body">
                          {s.account}
                        </p>
                        <p className="mt-2 text-pi-body">
                          {s.scope} · from {s.since} · supplier invoices
                        </p>
                        <p className="mt-2 text-xs text-pi-body">
                          {s.lastChecked
                            ? `Last checked ${new Date(s.lastChecked).toLocaleString("en-IN")}`
                            : "Not checked yet"}
                        </p>
                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            disabled={c.busy || c.neoBusy}
                            onClick={() => setEditing(s)}
                          >
                            Edit access
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={c.busy || c.neoBusy}
                            onClick={() =>
                              setSourceStatus(
                                s.id,
                                s.status === "connected"
                                  ? "disconnected"
                                  : "connected"
                              )
                            }
                          >
                            {s.status === "connected"
                              ? "Disconnect"
                              : "Reconnect"}
                          </Button>
                        </div>
                      </article>
                    ))}
                  </section>
                </>
              )}
            </>
          )}
          {tab === "activity" && (
            <section className="space-y-4 rounded-2xl border border-pi-line bg-background p-6">
              <div>
                <h2 className="text-base font-semibold text-pi-ink">
                  Collection history
                </h2>
                <p className="mt-1 text-sm text-pi-body">
                  Every run, the documents it found, and what needs your
                  attention.
                </p>
              </div>
              {!c.runs.length && (
                <p className="rounded-xl bg-pi-sunken px-6 py-12 text-center text-sm text-pi-body">
                  No tasks yet.{" "}
                  {c.agent.runMode === "on-demand"
                    ? "Run now or ask Neo when you’re ready."
                    : "The next background check will appear here."}
                </p>
              )}
              {c.runs.map((r) => (
                <article
                  key={r.id}
                  className="rounded-lg border border-pi-line bg-background p-5 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <h2 className="font-medium">
                      {r.trigger === "continuous"
                        ? "Background collection"
                        : "Requested collection"}
                    </h2>
                    <span className="capitalize text-pi-body">{r.status}</span>
                  </div>
                  <p className="mt-2 text-pi-body">{r.summary}</p>
                  <p className="mt-2 text-xs text-pi-body">
                    {new Date(r.startedAt).toLocaleString("en-IN")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.itemIds.map((id) => (
                      <Button
                        key={id}
                        variant="outline"
                        onClick={() => void router.push(`/inbox?id=${id}`)}
                      >
                        {id.replace(`COLLECT-${company}-`, "")}
                      </Button>
                    ))}
                    {["failed", "stopped"].includes(r.status) && (
                      <Button
                        variant="outline"
                        disabled={c.busy || c.neoBusy || !c.connected.length}
                        onClick={c.run}
                      >
                        Retry task
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
        <p className="mt-6 text-xs leading-5 text-pi-body">
          Demo workspace · sample connections only. Continuous checks run while
          the app is open. Setup and activity reset on reload.
        </p>
      </div>
    </div>
  );
};
export default Agents;
