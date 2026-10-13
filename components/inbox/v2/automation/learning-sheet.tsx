import React from "react";
import { Circle, Lock, TickAi, X } from "@/components/icons";
import { AiMark } from "@/components/inbox/v2/ai-mark";
import { Spinner } from "@/components/inbox/v2/ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LEARNING_STEPS } from "@/config/pages/inbox/mock-tally-history";
import {
  tallyLearning,
  useTallyLearning,
} from "@/hooks/pages/inbox/use-tally-learning";
import { cn } from "@/lib/utils";
import type { LearningRun } from "@/types/pages/inbox/tally-learning";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: string;
  companyName: string;
  user: string;
  notify: (message: string, kind?: "success" | "info") => void;
};

const fmt = (n: number) => n.toLocaleString("en-IN");

/** What each step says beside its label once it is under way or done. */
const stepDetail = (id: string, run: LearningRun, done: boolean) => {
  switch (id) {
    case "connect":
      return `${run.tallyCompany || "Your company"} on ${run.machine || "this machine"}`;
    case "read":
      return done
        ? `${fmt(run.vouchers)} vouchers · ${run.period}`
        : `${fmt(run.read ?? 0)} of ${fmt(run.vouchers)} · ${run.period}`;
    case "vendors":
      return done ? `${fmt(run.vendors)} vendors` : "";
    case "items":
      return done ? `${fmt(run.items)} items` : "";
    case "narrations":
      return done ? `${run.narrations} patterns` : "";
    default:
      return "";
  }
};

/**
 * The read of the books, in a side sheet: the steps as they run, then what
 * was learned and the vendors whose coding was split, for a person to settle.
 *
 * Read-only throughout, and the sheet says so: nothing here writes to Tally.
 * A choice only decides what the AI proposes on new bills.
 */
const LearningSheet = ({
  open,
  onOpenChange,
  company,
  companyName,
  user,
  notify,
}: Props) => {
  const { run, patterns, conflicts } = useTallyLearning(company);
  // The vendor with the most bills is the example the summary quotes.
  const example = [...patterns].sort((a, b) => b.total - a.total)[0];
  const step = run.step ?? 0;
  const running = run.status === "running";
  const review = run.status === "review";
  const progress = running
    ? Math.min(
        96,
        ((step +
          (LEARNING_STEPS[step]?.id === "read" && run.vouchers
            ? (run.read ?? 0) / run.vouchers
            : 0.5)) /
          LEARNING_STEPS.length) *
          100
      )
    : 100;

  const save = () => {
    const changed = conflicts.filter((c) => c.chosenByPerson).length;
    tallyLearning.confirm(company, user);
    onOpenChange(false);
    notify(
      `Saved what was learned\nNew bills for ${companyName} will cite their own history.${
        changed
          ? ` ${changed} vendor${changed > 1 ? "s" : ""} will follow your choice over the majority.`
          : ""
      }`,
      "success"
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-pi-line bg-background p-0 sm:max-w-[640px] sm:rounded-l-xl"
      >
        <SheetHeader className="flex-row items-start justify-between space-y-0 border-b border-pi-line px-6 py-5 text-left">
          <div className="min-w-0">
            <SheetTitle className="text-[18px] font-semibold leading-7 text-pi-ink">
              Learn from Tally history
            </SheetTitle>
            <SheetDescription className="mt-1 flex items-center gap-1.5 text-[13px] text-pi-body">
              <Lock aria-hidden className="size-3.5 text-pi-faint" />
              Reads the vouchers of {companyName}. Nothing is written to Tally.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-5 w-5 text-pi-faint" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          {/* The steps: what has been read, what is being read now. */}
          <section aria-label="Progress" className="flex flex-col gap-3">
            <Progress value={progress} className="h-1" />
            <ol className="flex flex-col">
              {LEARNING_STEPS.map((s, i) => {
                const done = !running || i < step;
                const current = running && i === step;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 border-b border-pi-line py-3 last:border-b-0"
                  >
                    <span className="grid size-5 flex-none place-items-center">
                      {done ? (
                        <TickAi
                          className="size-4 text-pi-brand"
                          aria-label="Done"
                        />
                      ) : current ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Circle className="size-3 text-pi-line-2" aria-hidden />
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-[13px] leading-5",
                        done || current ? "text-pi-ink" : "text-pi-faint"
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="text-right text-[12px] tabular-nums leading-4 text-pi-body">
                      {done || current ? stepDetail(s.id, run, done) : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
            {running ? (
              <p className="text-[12px] leading-4 text-pi-faint">
                You can close this. The read carries on, and the tab shows where
                it is.
              </p>
            ) : null}
          </section>

          {!running ? (
            <section
              aria-label="What was learned"
              className="flex flex-col gap-1"
            >
              <h3 className="text-[14px] font-semibold leading-5 text-pi-ink">
                Learned coding for {fmt(run.vendors)} vendors · {fmt(run.items)}{" "}
                items · {run.narrations} narration patterns
              </h3>
              {example ? (
                <p className="text-[13px] leading-5 text-pi-body">
                  New bills from these vendors will cite this history: a{" "}
                  {example.vendor} bill reads &ldquo;{example.ledger} ·{" "}
                  {example.count} of {example.total} past bills&rdquo;.
                </p>
              ) : null}
            </section>
          ) : null}

          {review && conflicts.length ? (
            <section
              aria-label="Coded more than one way"
              className="flex flex-col gap-3"
            >
              <div>
                <h3 className="text-[14px] font-semibold leading-5 text-pi-ink">
                  {conflicts.length} vendors were coded more than one way
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-pi-body">
                  Choose the ledger new bills should follow. Past vouchers in
                  Tally stay as they are.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {conflicts.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-pi-line bg-background px-4 py-3"
                  >
                    <p className="text-[13px] font-medium leading-5 text-pi-ink">
                      {c.vendor}
                    </p>
                    <RadioGroup
                      value={c.chosen}
                      onValueChange={(ledger) =>
                        tallyLearning.choose(company, c.id, ledger)
                      }
                      aria-label={`Ledger for ${c.vendor}`}
                      className="mt-2 gap-1"
                    >
                      {c.options.map((o, i) => {
                        const id = `${c.id}-${i}`;
                        const picked = c.chosen === o.ledger;
                        return (
                          <label
                            key={o.ledger}
                            htmlFor={id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors duration-100 motion-reduce:transition-none",
                              picked ? "bg-pi-brand-tint" : "hover:bg-pi-fill"
                            )}
                          >
                            <RadioGroupItem id={id} value={o.ledger} />
                            <span
                              className={cn(
                                "flex-1 text-[13px] leading-5",
                                picked
                                  ? "font-medium text-pi-ink"
                                  : "text-pi-body"
                              )}
                            >
                              {o.ledger}
                            </span>
                            <span className="text-[12px] tabular-nums text-pi-body">
                              {o.count} {o.count === 1 ? "bill" : "bills"}
                            </span>
                            <span className="grid size-5 flex-none place-items-center">
                              {picked && i === 0 && !c.chosenByPerson ? (
                                <AiMark
                                  reason={`Most of ${c.vendor}'s bills went here (${o.count} of ${c.options.reduce((n, x) => n + x.count, 0)})`}
                                />
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                    {c.note ? (
                      <p className="mt-2 text-[12px] leading-4 text-pi-body">
                        <span className="text-pi-faint">
                          What the AI found:{" "}
                        </span>
                        {c.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-pi-line bg-background px-6 py-4">
          {review ? (
            <>
              <p className="mr-auto text-[12px] leading-4 text-pi-faint">
                Nothing is used until you save.
              </p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Decide later
              </Button>
              <Button onClick={save}>Save what was learned</Button>
            </>
          ) : (
            <Button
              variant={running ? "outline" : "default"}
              onClick={() => onOpenChange(false)}
            >
              {running ? "Close" : "Done"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LearningSheet;
