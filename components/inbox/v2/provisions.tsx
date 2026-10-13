import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { PageDialog } from "@/components/inbox/v2/ui";
import {
  createProvisionDrafts,
  fixedAssets,
  suggestProvisions,
} from "@/hooks/pages/inbox/use-provisions";
import { rupees } from "@/utils/pages/inbox/ai-calculations";
import { AiMark } from "@/components/inbox/v2/ai-mark";
import type { Provision } from "@/types/pages/inbox/dashboard";
import { MOCK_PROVISION_SOURCES } from "@/config/pages/inbox/mock-provisions";
type Props = { company: string };
const Provisions = ({ company }: Props) => {
  const router = useRouter();
  const [edited, setEdited] = useState<string[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [open, setOpen] = useState(false),
    [fy, setFy] = useState("25-26"),
    [lines, setLines] = useState<Provision[]>([]),
    [error, setError] = useState(""),
    [sources, setSources] = useState<Provision>();
  const change = (id: string, patch: Partial<Provision>) => {
    setEdited((ids) => [...new Set([...ids, id])]);
    setLines((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setLines(suggestProvisions(company, fy));
          setEdited([]);
          setError("");
          setOpen(true);
        }}
      >
        Suggest year-end provisions
      </Button>
      <PageDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Year-end provisions"
        className="max-w-[900px]"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!lines.length}
              onClick={() => {
                try {
                  const created = createProvisionDrafts(
                    company,
                    lines,
                    crypto.randomUUID()
                  );
                  setOpen(false);
                  void router.push(`/inbox?id=${created[0].id}`);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Create draft JVs
            </Button>
          </>
        }
      >
        <label className="text-sm">
          Financial year{" "}
          <select
            className="ml-3 rounded-sm border border-pi-line bg-background p-2"
            value={fy}
            onChange={(e) => {
              setFy(e.target.value);
              setEdited([]);
              setLines(suggestProvisions(company, e.target.value));
            }}
          >
            <option value="25-26">FY 25–26</option>
            <option value="26-27">FY 26–27</option>
          </select>
        </label>
        <p className="my-4 text-sm text-pi-faint">
          Review estimates and ledgers. Every journal and any reversal remains
          in Needs Review.
        </p>
        {!lines.length && (
          <p>No source schedules available for this financial year.</p>
        )}
        {lines.map((p) => (
          <section
            key={p.id}
            className="space-y-3 border-t border-pi-line py-5"
          >
            <h3 className="flex items-center gap-2 font-semibold">
              {p.group}
              {!edited.includes(p.id) && <AiMark reason={p.reason} />}
            </h3>
            <p className="text-sm leading-6 text-pi-body">{p.reason}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs">
                Estimate
                <input
                  aria-label={`${p.group} estimate`}
                  type="number"
                  min="1"
                  className="mt-2 w-full rounded-sm border border-pi-line bg-background p-3 text-sm"
                  value={p.amount}
                  onChange={(e) =>
                    change(p.id, { amount: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs">
                Debit ledger
                <input
                  className="mt-2 w-full rounded-sm border border-pi-line bg-background p-3 text-sm"
                  value={p.debit}
                  onChange={(e) => change(p.id, { debit: e.target.value })}
                />
              </label>
              <label className="text-xs">
                Offset ledger
                <input
                  className="mt-2 w-full rounded-sm border border-pi-line bg-background p-3 text-sm"
                  value={p.credit}
                  onChange={(e) => change(p.id, { credit: e.target.value })}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.reverse}
                  onChange={(e) => change(p.id, { reverse: e.target.checked })}
                />
                Reverse on 1 April 2026
              </label>
              <Button variant="ghost" onClick={() => setSources(p)}>
                View source schedules
              </Button>
            </div>
          </section>
        ))}
        {error && (
          <p role="alert" className="text-sm text-pi-danger">
            {error}
          </p>
        )}
      </PageDialog>
      <PageDialog
        open={!!sources}
        onClose={() => setSources(undefined)}
        title="Provision source schedules"
      >
        {sources && (
          <div className="space-y-4 text-sm">
            <p>{sources.reason}</p>
            {sources.sources
              .filter((s) =>
                MOCK_PROVISION_SOURCES.some(
                  (x) => x.id === s && x.company === company
                )
              )
              .map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  onClick={() => setSourceId(s)}
                >
                  {s}
                </Button>
              ))}
            {MOCK_PROVISION_SOURCES.filter(
              (x) =>
                x.id === sourceId &&
                x.company === company &&
                sources.sources.includes(x.id)
            ).map((x) => (
              <article
                key={x.id}
                className="space-y-3 rounded-sm border border-pi-line p-4"
              >
                <h3 className="font-semibold">{x.title}</h3>
                <p>
                  {x.id} · {x.date}
                </p>
                <p>{rupees(x.amount)}</p>
                <p>{x.detail}</p>
                <p className="text-xs text-pi-faint">
                  Read-only demo source record
                </p>
              </article>
            ))}
            {sources.group === "Depreciation" &&
              fixedAssets(company).map((a) => (
                <p key={a.id}>
                  {a.name} · Opening WDV {rupees(a.openingWdv)} · Rate{" "}
                  {a.rate * 100}% · Full year, no additions or disposals.
                </p>
              ))}
          </div>
        )}
      </PageDialog>
    </>
  );
};
export default Provisions;
