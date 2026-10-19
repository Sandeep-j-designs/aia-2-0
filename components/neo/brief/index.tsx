import React from "react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import { actor } from "@/components/inbox/v2/store";
import { useFirmBrief, lakhs } from "@/hooks/pages/neo/use-firm-brief";
import { BRIEF_DEADLINE } from "@/config/pages/neo/mock-firm";
import { DEMO_TODAY } from "@/utils/pages/inbox/ai-calculations";
import type { BriefTone } from "@/types/pages/neo/brief";
import { cn } from "@/lib/utils";
import ChaseList from "@/components/neo/common/chase-list";

type Props = {
  /** Switch to the client and open the screen where the work is. */
  onOpen: (company: string, href: string) => void;
};

const DOT: Record<BriefTone, string> = {
  negative: "bg-pi-danger-dot",
  notice: "bg-pi-warning-dot",
  neutral: "bg-pi-line-strong",
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/**
 * Neo › Today: the firm brief. Every client at once, ranked by what needs a
 * person before the return is due, so the day starts from the brief rather
 * than from the company switcher. It only reads — each figure opens that
 * client's own screen, where the work is done and approved.
 *
 * The two live companies are computed from their stores; the rest of the
 * firm is one honest line (config/pages/neo/mock-firm.ts).
 */
const Brief = ({ onOpen }: Props) => {
  const brief = useFirmBrief();
  const first = actor.split(" ")[0];
  const due = new Date(
    `${BRIEF_DEADLINE.due}T00:00:00+05:30`
  ).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <FeaturePage title="Needs attention">
      <section className="max-w-[72ch]">
        <p className="text-caption-1 text-pi-faint">
          {DEMO_TODAY.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h2 className="mt-1 text-[22px] font-semibold leading-7 tracking-tight text-pi-ink [text-wrap:balance]">
          {greeting()}, {first}.{" "}
          {brief.needYou
            ? `${brief.needYou} of your ${brief.total} clients need you before ${due}.`
            : `None of your ${brief.total} clients need you before ${due}.`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-pi-body">
          {brief.overnight}.
        </p>
      </section>

      <section aria-labelledby="brief-clients">
        <h3
          id="brief-clients"
          className="mb-3 text-sm font-semibold text-pi-ink"
        >
          Clients, most pressing first
        </h3>
        <ul className="overflow-hidden rounded-lg border border-pi-line bg-background shadow-contact">
          {brief.clients.map((c) => (
            <li
              key={c.company}
              className="grid grid-cols-1 gap-3 border-b border-pi-line px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] md:items-center md:gap-6"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-pi-ink">
                  {c.name}
                </p>
                <p className="mt-0.5 text-caption-1 text-pi-body">
                  {c.deadline}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
                {c.clear ? (
                  <span className="text-[13px] text-pi-body">
                    Nothing needs you
                  </span>
                ) : (
                  c.signals.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onOpen(c.company, s.href)}
                      className="inline-flex items-center gap-2 rounded-sm text-[13px] text-pi-body underline decoration-transparent underline-offset-2 hover:text-pi-ink hover:decoration-pi-line-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-[7px] flex-none rounded-full",
                          DOT[s.tone]
                        )}
                      />
                      <span
                        className={cn(
                          s.tone === "negative" && "font-medium text-pi-ink"
                        )}
                      >
                        {s.text}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex items-center gap-4 md:justify-end">
                {!c.clear && (
                  <span
                    className="text-caption-1 tabular-nums text-pi-faint"
                    title="ITC at risk, overdue receivables and bills waiting for review"
                  >
                    {lakhs(c.impact)} to decide
                  </span>
                )}
                {c.next && (
                  <Button
                    size="sm"
                    variant={c === brief.clients[0] ? "default" : "outline"}
                    onClick={() => onOpen(c.company, c.next!.href)}
                  >
                    {c.next.label}
                  </Button>
                )}
              </div>
            </li>
          ))}
          <li className="grid grid-cols-1 gap-1 bg-pi-head-bg px-5 py-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-6">
            <p className="text-sm text-pi-ink">
              {brief.rest.clients} other clients
            </p>
            <p className="text-[13px] text-pi-body">{brief.rest.note}</p>
          </li>
        </ul>
        <p className="mt-2 text-caption-1 text-pi-faint">
          Ranked by rupees that need a decision: ITC at risk, overdue
          receivables and bills waiting for review. Opening a row switches to
          that client.
        </p>
      </section>

      <section aria-labelledby="brief-chases">
        <h3
          id="brief-chases"
          className="mb-3 text-sm font-semibold text-pi-ink"
        >
          Chases
        </h3>
        <ChaseList all onOpen={onOpen} />
      </section>
    </FeaturePage>
  );
};

export default Brief;
