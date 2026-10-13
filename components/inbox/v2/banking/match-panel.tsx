import React, { useState } from "react";
import { Check, Link, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { rupees } from "@/hooks/pages/inbox/use-bank-matches";
import type {
  MatchSuggestion,
  OpenDocument,
} from "@/types/pages/inbox/bank-automation";
import type { BankTransaction } from "@/types/pages/inbox/banking";
import { AiMark } from "../ai-mark";
import { T } from "../ui";
import { day } from "./table-parts";

type Props = {
  txn: BankTransaction;
  suggestion: MatchSuggestion;
  /** Every open document on this side, for matching by hand. */
  candidates: OpenDocument[];
  onAccept: () => void;
  onChoose: (docIds: string[]) => void;
  onDismiss: () => void;
};

const SectionHead = ({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) => (
  <div className="mb-3 flex min-h-5 items-center justify-between gap-4">
    <h2 className="text-[14px] font-semibold leading-5 text-pi-brand">
      {children}
    </h2>
    {aside}
  </div>
);

const SubHead = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 text-[12px] font-medium leading-4 text-pi-body">
    {children}
  </h3>
);

/**
 * The AI's match for one bank line, laid out the way an accountant checks
 * one: which documents, the working that ties the amount to them, and the
 * vouchers that accepting will draft. Nothing posts until Accept, and even
 * then the line only goes to Accounting Ready; Tally is a separate sync.
 */
const MatchPanel = ({
  txn,
  suggestion: s,
  candidates,
  onAccept,
  onChoose,
  onDismiss,
}: Props) => {
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<string[]>(
    s.documents.map((d) => d.docId)
  );
  const docOf = (id: string) => candidates.find((d) => d.id === id);
  const received = txn.crDr === "credit";

  return (
    // No rule of its own: the Voucher Configuration section below draws the
    // hairline between them.
    <section aria-label="Suggested match" className="form-section">
      <SectionHead>Suggested match</SectionHead>

      <div className="flex items-start gap-2">
        <AiMark className="mt-0.5" reason={s.evidence} />
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-5 text-pi-ink">
            {s.headline}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-pi-body">
            {s.evidence}.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SubHead>{received ? "Invoices" : "Bills"} it settles</SubHead>
          <ul className="divide-y divide-pi-line rounded-md border border-pi-line">
            {s.documents.map((m) => {
              const doc = docOf(m.docId);
              return (
                <li
                  key={m.docId}
                  className="flex items-start justify-between gap-3 px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="code block text-[13px] text-pi-ink">
                      {m.number}
                    </span>
                    <span className={cn(T.sub, "block truncate")}>
                      {doc?.party} · {day(doc?.date)}
                    </span>
                  </span>
                  <span className="flex-none text-right">
                    <span className="fig block text-[13px] text-pi-ink">
                      {rupees(m.applied)}
                    </span>
                    <span className={cn(T.sub, "block")}>
                      {m.balance ? `${rupees(m.balance)} left open` : "Settled"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0">
          <SubHead>The working</SubHead>
          <dl className="rounded-md border border-pi-line px-3 py-2">
            {s.steps.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-baseline justify-between gap-3 py-1 text-[13px] leading-5",
                  step.op === "equals" &&
                    "border-t border-dashed border-pi-line-2"
                )}
              >
                <dt className="min-w-0 truncate text-pi-body">
                  <span aria-hidden className="inline-block w-4 text-pi-faint">
                    {step.op === "less" ? "−" : step.op === "equals" ? "=" : ""}
                  </span>
                  {step.label}
                </dt>
                <dd
                  className={cn(
                    "fig flex-none tabular-nums",
                    step.op === "equals"
                      ? "font-medium text-pi-ink"
                      : "text-pi-ink"
                  )}
                >
                  {rupees(step.amount)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-5">
        <SubHead>Accepting drafts</SubHead>
        <ul className="divide-y divide-pi-line rounded-md border border-pi-line">
          {s.vouchers.map((v, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-2">
              <span className="mt-0.5 inline-flex w-16 flex-none text-[12px] font-medium text-pi-body">
                {v.type}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-pi-ink">
                  Dr {v.debit} · Cr {v.credit}
                </span>
                <span className={cn(T.sub, "block truncate")}>{v.note}</span>
              </span>
              <span className="fig flex-none text-[13px] text-pi-ink">
                {rupees(v.amount)}
              </span>
            </li>
          ))}
        </ul>
        <p className={cn(T.sub, "mt-2")}>
          The line goes to Accounting Ready. Nothing reaches Tally until you
          sync.
        </p>
      </div>

      {choosing ? (
        <div className="mt-5">
          <SubHead>
            Match by hand · open {received ? "invoices" : "bills"}
          </SubHead>
          <ul className="max-h-56 divide-y divide-pi-line overflow-y-auto rounded-md border border-pi-line">
            {candidates.map((d) => {
              const on = picked.includes(d.id);
              return (
                <li key={d.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-pi-row-hover">
                    <Checkbox
                      checked={on}
                      onCheckedChange={(checked) =>
                        setPicked((all) =>
                          checked
                            ? [...all, d.id]
                            : all.filter((x) => x !== d.id)
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="code block text-[13px] text-pi-ink">
                        {d.number}
                      </span>
                      <span className={cn(T.sub, "block truncate")}>
                        {d.party} · {day(d.date)}
                      </span>
                    </span>
                    <span className="fig flex-none text-[13px] text-pi-ink">
                      {rupees(d.outstanding)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChoosing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!picked.length}
              onClick={() => {
                onChoose(picked);
                setChoosing(false);
              }}
            >
              Use {picked.length || ""} selected
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={onAccept}>
          <Check className="h-4 w-4" />
          Accept match
        </Button>
        <Button variant="outline" onClick={() => setChoosing((v) => !v)}>
          <Link className="h-4 w-4" />
          Choose another
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          <X className="h-4 w-4" />
          Dismiss
        </Button>
      </div>
    </section>
  );
};

/** A line already matched: what it was matched to, read-only. */
export const MatchedNote = ({ txn }: { txn: BankTransaction }) =>
  txn.matchNote ? (
    <section aria-label="Matched documents" className="form-section">
      <SectionHead>Matched documents</SectionHead>
      <p className="flex items-center gap-2 text-[13px] text-pi-ink">
        <Link aria-hidden className="size-4 text-pi-faint" />
        {txn.matchNote}
      </p>
    </section>
  ) : null;

export default MatchPanel;
