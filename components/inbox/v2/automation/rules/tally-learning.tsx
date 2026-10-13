import React, { useMemo, useState } from "react";
import { BookOpen, Ledger, Lightbulb, RefreshCw } from "@/components/icons";
import {
  HEADER_CLASS,
  SearchBox,
  TABLE_CLASS,
  day,
} from "@/components/inbox/v2/banking/table-parts";
import EmptyState from "@/components/inbox/v2/empty-state";
import { Spinner, T } from "@/components/inbox/v2/ui";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEARNING_STEPS } from "@/config/pages/inbox/mock-tally-history";
import {
  tallyLearning,
  useTallyLearning,
} from "@/hooks/pages/inbox/use-tally-learning";
import { cn } from "@/lib/utils";
import LearningSheet from "../learning-sheet";
import type { RulesSectionProps } from "./types";

const fmt = (n: number) => n.toLocaleString("en-IN");

const COLUMNS = [
  { key: "vendor", label: "Vendor", width: "w-[30%]" },
  { key: "ledger", label: "Usual ledger", width: "w-[22%]" },
  { key: "evidence", label: "Evidence", width: "w-[16%]" },
  { key: "split", label: "Split history", width: "w-[20%]" },
  { key: "seen", label: "Last bill", width: "w-[12%]" },
];

/**
 * Rules & learning › Learned from Tally: the coding history read from the
 * books, so the AI's first prediction for a client cites the client's own
 * past ("Freight Inward · 38 of 40 past bills") instead of starting cold.
 *
 * - Never read: the vouchers waiting in Tally, and the one action.
 * - Running / to settle: where the read is, with the sheet one click away.
 * - Learned: the vendors with the most bills, their usual ledger and the
 *   evidence, and how any split history was settled.
 */
const TallyLearning = ({
  company,
  companyName,
  user,
  notify,
}: RulesSectionProps) => {
  const { run, patterns, conflicts } = useTallyLearning(company);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...patterns]
      .sort((a, b) => b.total - a.total)
      .filter(
        (p) =>
          !q ||
          `${p.vendor} ${p.ledger} ${p.resolved?.other ?? ""}`
            .toLowerCase()
            .includes(q)
      );
  }, [patterns, search]);

  const start = () => {
    tallyLearning.start(company);
    setSheetOpen(true);
  };

  const sheet = (
    <LearningSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      company={company}
      companyName={companyName}
      user={user}
      notify={notify}
    />
  );

  if (run.status === "never")
    return (
      <div className="px-[var(--inset-page)] py-6">
        <div className="rounded-lg border border-pi-line bg-background shadow-table">
          <EmptyState
            sticky={false}
            flow={[
              {
                label: "Vouchers in Tally",
                count: run.vouchers,
                icon: Ledger,
              },
              {
                label: "Vendor patterns learned",
                count: 0,
                icon: Lightbulb,
                current: true,
              },
            ]}
            title="Teach the AI how these books are coded"
            body={
              <>
                Reads the purchase, sales and journal vouchers of {companyName}{" "}
                for {run.period}. Read-only: nothing is written to Tally.
                Afterwards, predictions on new bills cite your own history, such
                as &ldquo;Freight Inward · 38 of 40 past bills&rdquo;, from the
                first upload.
              </>
            }
            actions={
              <Button onClick={start}>
                <BookOpen className="h-4 w-4" />
                Learn from Tally history
              </Button>
            }
          />
          <p className="border-t border-pi-line px-6 py-3 text-center text-[12px] leading-4 text-pi-faint">
            {run.tallyCompany ? `${run.tallyCompany} on ${run.machine} · ` : ""}
            Takes a few minutes. You can leave this page while it reads.
          </p>
        </div>
        {sheet}
      </div>
    );

  return (
    <div className="flex flex-col pb-6">
      {/* Where the read stands: running, waiting on a person, or done. */}
      <div className="px-[var(--inset-page)] pt-2">
        {run.status === "running" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-pi-line bg-background px-5 py-4 shadow-contact">
            <Spinner className="size-4" />
            <p className="flex-1 text-[13px] leading-5 text-pi-ink">
              {LEARNING_STEPS[run.step ?? 0]?.label ?? "Reading"}
              {LEARNING_STEPS[run.step ?? 0]?.id === "read" ? (
                <span className="text-pi-body">
                  {" "}
                  · {fmt(run.read ?? 0)} of {fmt(run.vouchers)} vouchers
                </span>
              ) : null}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSheetOpen(true)}
            >
              Show progress
            </Button>
          </div>
        ) : run.status === "review" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-pi-line bg-background px-5 py-4 shadow-contact">
            <p className="flex-1 text-[13px] leading-5 text-pi-ink">
              <span className="font-medium">
                {conflicts.length} vendors were coded more than one way.
              </span>{" "}
              <span className="text-pi-body">
                Choose which ledger new bills follow, then save what was
                learned.
              </span>
            </p>
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              Settle {conflicts.length} vendors
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-pi-line bg-background px-5 py-4 shadow-contact">
            <div className="min-w-0">
              <p className="text-[13px] leading-5 text-pi-ink">
                Read{" "}
                <span className="font-medium">
                  {fmt(run.vouchers)} vouchers
                </span>{" "}
                from Tally for {run.period}:{" "}
                <span className="font-medium">{fmt(run.vendors)} vendors</span>,{" "}
                <span className="font-medium">{fmt(run.items)} items</span> and{" "}
                <span className="font-medium">
                  {run.narrations} narration patterns
                </span>
                .
              </p>
              <p className="mt-1 text-[12px] leading-4 text-pi-faint">
                {run.finishedAt ? `Read ${day(run.finishedAt)}` : "Read"}
                {run.confirmedBy
                  ? ` · confirmed by ${run.confirmedBy}`
                  : ""} · {run.tallyCompany} on {run.machine}
              </p>
            </div>
            <Button variant="outline" onClick={start}>
              <RefreshCw className="h-4 w-4" />
              Read again
            </Button>
          </div>
        )}
      </div>

      {/* Patterns are shown once they are in use: a read waiting on a
          person to settle split vendors has learned nothing yet. */}
      {patterns.length && run.status !== "review" ? (
        <>
          <div className="flex flex-wrap items-center gap-2 px-[var(--inset-page)] py-4">
            <SearchBox
              label="Search learned vendors"
              placeholder="Search vendor or ledger"
              value={search}
              onChange={setSearch}
            />
          </div>
          <div className="border-y border-pi-line bg-background">
            <Table className={TABLE_CLASS}>
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.key} className={c.width} />
                ))}
              </colgroup>
              <TableHeader className={HEADER_CLASS}>
                <TableRow className="hover:bg-transparent">
                  {COLUMNS.map((c) => (
                    <TableHead
                      key={c.key}
                      className={cn(
                        "h-11 whitespace-nowrap px-4 py-0 align-middle",
                        T.head
                      )}
                    >
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow
                    key={p.id}
                    className="group h-14 hover:bg-transparent"
                  >
                    <TableCell className="px-4 align-middle">
                      <span className="block truncate text-[13px] font-medium text-pi-ink">
                        {p.vendor}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <span className="block truncate text-[13px] text-pi-ink">
                        {p.ledger}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 align-middle text-[13px] tabular-nums text-pi-body">
                      {p.count} of {p.total} past bills
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      {p.resolved ? (
                        <span className="block text-[12px] leading-4 text-pi-body">
                          {p.resolved.otherCount} went to {p.resolved.other}
                          <span className="block text-pi-faint">
                            Settled by {p.resolved.by}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-pi-faint">
                          One ledger throughout
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 align-middle text-[13px] text-pi-body">
                      {day(p.lastSeen)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!rows.length ? (
              <EmptyState
                title="No learned vendor matches"
                body="Nothing fits the search."
                filters={[{ label: `“${search.trim()}”` }]}
                onClear={() => setSearch("")}
              />
            ) : null}
          </div>
          <p className="px-[var(--inset-page)] pt-3 text-[12px] leading-4 text-pi-faint">
            Showing the {patterns.length} vendors with the most bills.{" "}
            {fmt(Math.max(0, run.vendors - patterns.length))} more were learned
            from fewer bills each.
          </p>
        </>
      ) : null}
      {sheet}
    </div>
  );
};

export default TallyLearning;

/** The tab's count on Rules & learning: vendors learned, once the books are read. */
export const useTallyLearningCount = (company: string): number | undefined => {
  const { run } = useTallyLearning(company);
  return run.status === "learned" ? run.vendors : undefined;
};
