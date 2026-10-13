import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageDialog } from "@/components/inbox/v2/ui";
import { useStore } from "@/components/inbox/v2/store";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import {
  playbookSummary,
  runPlaybook,
  saveSchedule,
  sendPlaybookDraft,
  usePlaybooks,
} from "@/hooks/pages/inbox/use-playbooks";
import type { AgentSchedule } from "@/types/pages/inbox/ai-features";
type Props = { company: string; tab?: string; onTab: (tab: string) => void };
const PlaybooksPage = ({ company, tab = "playbooks", onTab }: Props) => {
  const { companies } = useStore(),
    data = usePlaybooks(),
    router = useRouter();
  const [book, setBook] = useState<string>(),
    [picked, setPicked] = useState([company]),
    [schedule, setSchedule] = useState<AgentSchedule>(),
    [message, setMessage] = useState<{
      run: string;
      index: number;
      body: string;
      to: string;
    }>();
  const toggle = (id: string) =>
    setPicked((xs) =>
      xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]
    );
  const startSchedule = () =>
    setSchedule({
      id: crypto.randomUUID(),
      playbookId: "gst-close",
      when: "Every month on the 14th at 09:00",
      companies: [company],
      channel: "WhatsApp",
      recipient: "Priya Raghavan",
      nextRun: "Tomorrow, 14 Oct 2026, 09:00",
      enabled: true,
    });
  return (
    <FeaturePage
      title="Playbooks"
      tab={tab}
      onTab={onTab}
      tabs={[
        { id: "playbooks", label: "Playbooks", count: data.playbooks.length },
        { id: "schedules", label: "Schedules", count: data.schedules.length },
      ]}
      actions={
        tab === "schedules" ? (
          <Button onClick={startSchedule}>Create schedule</Button>
        ) : undefined
      }
    >
      {tab === "schedules" ? (
        <div className="space-y-4">
          {data.schedules.map((s) => (
            <article
              key={s.id}
              className="space-y-3 rounded-lg border border-pi-line bg-background p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">
                  {data.playbooks.find((p) => p.id === s.playbookId)?.name}
                </h2>
                <Switch
                  aria-label={`Enable ${s.when}`}
                  checked={s.enabled}
                  onCheckedChange={(enabled) => saveSchedule({ ...s, enabled })}
                />
              </div>
              <p className="text-sm">
                {s.when} · {s.channel} to {s.recipient}
              </p>
              <p className="text-sm text-pi-body">
                {s.companies
                  .map((id) => companies.find((c) => c.id === id)?.name)
                  .join(" · ")}
              </p>
              <p className="text-sm text-pi-faint">
                Next: {s.nextRun} · Last: {s.lastRun || "No run yet"}
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-pi-brand">
                  Preview summary message
                </summary>
                <p className="mt-3 rounded-sm bg-pi-head-bg p-4">
                  {playbookSummary(s.companies)}. Open the list in AIA. Portal
                  authentication may be required.
                </p>
              </details>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSchedule({ ...s })}>
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    void runPlaybook(s.playbookId, s.companies);
                    saveSchedule({
                      ...s,
                      lastRun: "13 Oct 2026 · see run below",
                    });
                  }}
                >
                  Run now
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-pi-line rounded-lg border border-pi-line bg-background">
          {data.playbooks.map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                <p className="mt-2 text-sm text-pi-body">
                  {p.steps.length} steps · Created by {p.createdBy} · Last run:{" "}
                  {data.runs.find((r) => r.playbookId === p.id)?.status ||
                    "Not run"}
                </p>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-pi-brand">
                    View steps
                  </summary>
                  <ol className="mt-2 list-inside list-decimal space-y-2">
                    {p.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </details>
              </div>
              <Button
                onClick={() => {
                  setPicked([company]);
                  setBook(p.id);
                }}
              >
                Run
              </Button>
            </article>
          ))}
        </div>
      )}
      {data.runs.map((run) => (
        <section
          key={run.id}
          className="rounded-lg border border-pi-line bg-background p-5"
        >
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-semibold">
              {data.playbooks.find((p) => p.id === run.playbookId)?.name} ·{" "}
              {run.status}
            </h2>
            {run.status === "paused" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => void router.push("/inbox?module=GST")}
                >
                  Open GST portal
                </Button>
                <Button
                  onClick={() =>
                    void runPlaybook(run.playbookId, run.companies, run.id)
                  }
                >
                  Resume run
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-pi-line text-pi-faint">
                  <th className="p-3">Organisation</th>
                  {data.playbooks
                    .find((p) => p.id === run.playbookId)
                    ?.steps.map((s, i) => (
                      <th key={s} title={s} className="p-3">
                        Step {i + 1}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {run.companies.map((c) => (
                  <tr key={c}>
                    <td className="p-3">
                      {companies.find((x) => x.id === c)?.name}
                    </td>
                    {data.playbooks
                      .find((p) => p.id === run.playbookId)
                      ?.steps.map((s, i) => {
                        const result = run.results.find(
                          (r) => r.company === c && r.step === i
                        );
                        return (
                          <td key={s} className="p-3" title={result?.text}>
                            {result?.paused
                              ? "Needs OTP"
                              : result
                                ? "Done"
                                : "Waiting"}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-pi-body">
            {run.results.map((r, i) => (
              <li key={i}>
                <span className="font-medium">
                  {companies.find((c) => c.id === r.company)?.name} ·{" "}
                </span>
                {r.text}
              </li>
            ))}
          </ul>
          {run.drafts.map((d, i) => (
            <Button
              key={i}
              variant="outline"
              className="mr-2 mt-3"
              disabled={d.sent}
              onClick={() =>
                setMessage({ run: run.id, index: i, body: d.body, to: d.to })
              }
            >
              {d.sent ? "Sent (simulated)" : `Review email · ${d.to}`}
            </Button>
          ))}
        </section>
      ))}
      <PageDialog
        open={!!book}
        title="Run playbook"
        onClose={() => setBook(undefined)}
        footer={
          <>
            <Button variant="outline" onClick={() => setBook(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={!picked.length}
              onClick={() => {
                if (book) void runPlaybook(book, picked);
                setBook(undefined);
              }}
            >
              Run for {picked.length} organisations
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {companies.map((c) => (
            <label key={c.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={picked.includes(c.id)}
                onChange={() => toggle(c.id)}
              />
              {c.name}
            </label>
          ))}
        </div>
        <p className="mt-5 text-sm text-pi-faint">
          Drafts wait for review. GST fetch pauses if the portal needs an OTP.
        </p>
      </PageDialog>
      <PageDialog
        open={!!schedule}
        title="Schedule playbook"
        onClose={() => setSchedule(undefined)}
        footer={
          <>
            <Button variant="outline" onClick={() => setSchedule(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={
                !schedule?.companies.length || !schedule?.recipient.trim()
              }
              onClick={() => {
                if (schedule) saveSchedule(schedule);
                setSchedule(undefined);
              }}
            >
              Save schedule
            </Button>
          </>
        }
      >
        {schedule && (
          <div className="space-y-4 text-sm">
            <label className="block">
              Playbook
              <select
                className="mt-2 w-full rounded-sm border border-pi-line bg-background p-3"
                value={schedule.playbookId}
                onChange={(e) =>
                  setSchedule({ ...schedule, playbookId: e.target.value })
                }
              >
                {data.playbooks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              When
              <select
                className="mt-2 w-full rounded-sm border border-pi-line bg-background p-3"
                value={schedule.when}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    when: e.target.value,
                    nextRun: e.target.value.includes("14th")
                      ? "Tomorrow, 14 Oct 2026, 09:00"
                      : "19 Oct 2026, 08:00",
                  })
                }
              >
                <option>Every month on the 14th at 09:00</option>
                <option>Every Monday at 08:00</option>
              </select>
            </label>
            <label className="block">
              Summary channel
              <select
                className="ml-3 rounded-sm border border-pi-line bg-background p-2"
                value={schedule.channel}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    channel: e.target.value as AgentSchedule["channel"],
                  })
                }
              >
                <option>WhatsApp</option>
                <option>Email</option>
                <option>In-app</option>
              </select>
            </label>
            <label className="block">
              Recipient
              <input
                className="mt-2 w-full rounded-sm border border-pi-line bg-background p-3"
                value={schedule.recipient}
                onChange={(e) =>
                  setSchedule({ ...schedule, recipient: e.target.value })
                }
              />
            </label>
            {companies.map((c) => (
              <label className="flex gap-3" key={c.id}>
                <input
                  type="checkbox"
                  checked={schedule.companies.includes(c.id)}
                  onChange={() =>
                    setSchedule({
                      ...schedule,
                      companies: schedule.companies.includes(c.id)
                        ? schedule.companies.filter((x) => x !== c.id)
                        : [...schedule.companies, c.id],
                    })
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
      </PageDialog>
      <PageDialog
        open={!!message}
        title={`Email to ${message?.to || "vendor"}`}
        onClose={() => setMessage(undefined)}
        footer={
          <>
            <Button variant="outline" onClick={() => setMessage(undefined)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (message)
                  sendPlaybookDraft(message.run, message.index, message.body);
                setMessage(undefined);
              }}
            >
              Send (simulated)
            </Button>
          </>
        }
      >
        <textarea
          aria-label="Email preview"
          className="min-h-48 w-full rounded-sm border border-pi-line bg-background p-3 text-sm"
          value={message?.body || ""}
          onChange={(e) =>
            message && setMessage({ ...message, body: e.target.value })
          }
        />
      </PageDialog>
    </FeaturePage>
  );
};
export default PlaybooksPage;
