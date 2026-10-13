import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "@/components/icons";
import {
  companyOf,
  journalLineErrors,
  journalTotals,
  type Form,
  type Item,
} from "@/components/inbox/v2/store";
import { headerCostLock } from "@/config/pages/inbox/mock-cost-centres";
import VoucherDetails from "./voucher-details";
import LedgerLines from "./ledger-lines";
import { Sheet } from "./sheet";

/**
 * The journal voucher, as the Inbox's review surface for the JV route.
 *
 * A port of Prototypes/Journals (/journal-voucher) — same sections, same
 * table, same totals panel, same imbalance banner. What is dropped is the
 * page's own chrome: that screen owns its title and its Discard / Save Voucher
 * pair, and here the Inbox's header already holds Delete and Approve & Next,
 * which are the same two decisions under the names this queue gives them.
 *
 * Composition only. Every rule lives in the store, beside the rules for the
 * other two routes:
 *   - `journalTotals`     the two column totals and whether they agree
 *   - `journalLineErrors` the lines that cannot post, and why
 *   - `issue`             whether this voucher may be approved at all
 *
 * DEV: on transplant this directory moves as-is and the three imports above
 * resolve to the journal-voucher service. The form model is the Inbox's shared
 * `Form`, so the seam is the mapping in the store, not these components.
 */

type Props = {
  item: Item;
  /**
   * Whether the user has tried to approve. Errors stay hidden until then —
   * marking a row red the moment it is created would flag every blank line on
   * a voucher the AI has only half-filled.
   */
  attempted: boolean;
  readOnly?: boolean;
  onEdit: (patch: Partial<Form>) => void;
  /** Ledgers created this session, offered in every line's picker. */
  createdLedgers?: string[];
  /**
   * The picker's "+ Create ledger". The caller runs the create dialog and
   * calls `assign` with the new name, which sets it on the line it came from.
   */
  onCreateLedger?: (query: string, assign: (name: string) => void) => void;
};

const JournalVoucher = ({
  item,
  attempted,
  readOnly,
  onEdit,
  createdLedgers,
  onCreateLedger,
}: Props) => {
  const [needs, setNeeds] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const savedForm = readOnly ? item.snapshot || item.form : item.form;
  const form = readOnly
    ? savedForm
    : {
        ...savedForm,
        lines: [
          ...savedForm.lines,
          ...Array.from(
            { length: Math.max(0, 2 - savedForm.lines.length) },
            () => ({
              description: "",
              ledger: "",
              amount: 0,
              dr: 0,
              cr: 0,
              costCentre: "",
            })
          ),
        ],
      };
  const totals = journalTotals(form);
  const errors = attempted && !readOnly ? journalLineErrors(form) : [];
  const branches = companyOf(item.company)?.branches ?? [];

  const setLine = (index: number, patch: Partial<Form["lines"][number]>) =>
    onEdit({
      lines: form.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line
      ),
    });

  /**
   * A line is one side of an entry. Entering a debit clears the credit and the
   * other way round — the two cells are a single choice presented as two
   * inputs, not two independent figures. Both stay visible and the unused one
   * reads 0.00, which is what the frames show.
   *
   * `amount` is kept in step because the list's Amount column and the store's
   * own recalculation both read it.
   */
  const setAmount = (index: number, side: "dr" | "cr", value: number) => {
    const amount = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
    setLine(
      index,
      side === "dr"
        ? { dr: amount, cr: 0, amount }
        : { cr: amount, dr: 0, amount }
    );
  };

  const addLine = () =>
    onEdit({
      lines: [
        ...form.lines,
        {
          description: "",
          ledger: "",
          amount: 0,
          dr: 0,
          cr: 0,
          costCentre: "",
        },
      ],
    });

  /** Never drop below two lines — one side alone cannot be an entry. */
  const removeLine = (index: number) =>
    onEdit({
      lines:
        form.lines.length <= 2
          ? form.lines.map((line, i) =>
              i === index
                ? {
                    description: "",
                    ledger: "",
                    amount: 0,
                    dr: 0,
                    cr: 0,
                    costCentre: "",
                  }
                : line
            )
          : form.lines.filter((_, i) => i !== index),
    });

  /*
    The checks the header counts and Needs you lists, as the bill and invoice
    forms count theirs (bill-review.tsx): the required voucher fields, then the
    entries — some figures, every figured line coded, debits equal to credits.
    `journalLineErrors` is the store's own rule, read whether or not an
    approval has been tried; only the colour waits for the attempt.
  */
  const lineErrors = readOnly ? [] : journalLineErrors(form);
  const hasFigures = form.lines.some((line) => line.dr || line.cr);
  const checks: Check[] = [
    {
      key: "voucherType",
      label: "Voucher type",
      ok: !!form.voucherType.trim(),
      target: "#jv-voucher-type",
    },
    {
      key: "date",
      label: "Voucher date",
      ok: !!form.date.trim(),
      target: "#jv-voucher-date",
    },
    {
      key: "voucherNo",
      label: "Voucher no.",
      ok: !!form.voucherNo.trim(),
      target: "#jv-voucher-no",
    },
    {
      key: "gst",
      label: "GST registration",
      ok: !!form.gst.trim(),
      target: "#jv-gst",
    },
    {
      key: "figures",
      label: "Debit and credit amounts",
      ok: hasFigures,
      target: ".jv-lines",
      where: "Entries",
    },
    ...lineErrors.map((e) => ({
      key: `line-${e.index}-${e.kind}`,
      label: `Line ${e.index + 1}: ${e.kind === "ledger" ? "choose a ledger" : "enter an amount"}`,
      ok: false,
      target: ".jv-lines",
      where: "Entries",
    })),
    {
      key: "balanced",
      label: "Debits equal credits",
      ok: !hasFigures || totals.isBalanced,
      target: ".jv-lines",
      where: "Entries",
    },
  ];
  const open = checks.filter((c) => !c.ok);

  /*
    No header of its own (6 Oct 2026, as on the bill): the total is in the
    totals card below, and the review count only repeated the dots. A failed
    approve opens Needs you instead — the Inbox says so with this event.
  */
  const openRef = useRef(open.length);
  openRef.current = open.length;
  useEffect(() => {
    const onFailed = () => {
      if (openRef.current) setNeeds(true);
    };
    window.addEventListener(JOURNAL_APPROVE_FAILED, onFailed);
    return () => window.removeEventListener(JOURNAL_APPROVE_FAILED, onFailed);
  }, []);

  const go = (check: Check) => {
    setNeeds(false);
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `.jv-form ${check.target}`
      );
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      (target?.matches("input, button")
        ? target
        : target?.querySelector<HTMLElement>("input, button")
      )?.focus({ preventScroll: true });
    });
  };

  const lineTable = (expanded: boolean) => (
    <LedgerLines
      lines={form.lines}
      errors={errors}
      costLock={headerCostLock(form)}
      readOnly={readOnly}
      onLineChange={setLine}
      onAmountChange={setAmount}
      onAddLine={addLine}
      onRemoveLine={removeLine}
      createdLedgers={createdLedgers}
      onExpand={expanded ? undefined : () => setExpanded(true)}
      onCreateLedger={
        onCreateLedger
          ? (query, index) =>
              onCreateLedger(query, (name) => setLine(index, { ledger: name }))
          : undefined
      }
    />
  );

  return (
    // The review editor body, laid out as the Finops review form (Oct 2026)
    <div className="jv-form journal-voucher flex min-h-full min-w-0 flex-col gap-6 bg-pi-surface-panel px-6 pb-7 pt-5">
      <VoucherDetails
        form={form}
        attempted={attempted && !readOnly}
        branches={branches}
        edited={readOnly ? [] : item.edited}
        readOnly={readOnly}
        onChange={onEdit}
      />

      {lineTable(false)}

      <div className="cr-totals jv-totals" role="group" aria-label="Totals">
        <span>
          <small>Total debit</small>
          <b>{formatRupees(totals.totalDebit)}</b>
        </span>
        <span>
          <small>Total credit</small>
          <b>{formatRupees(totals.totalCredit)}</b>
        </span>
        <span data-tone={totals.isBalanced ? "ok" : "err"}>
          <small>Difference</small>
          <b>{formatRupees(totals.difference)}</b>
        </span>
      </div>
      {hasFigures ? (
        <p className={`cr-balance ${totals.isBalanced ? "ok" : "warn"}`}>
          {totals.isBalanced ? (
            <>
              <Check size={14} aria-hidden="true" />
              Debits equal credits
            </>
          ) : (
            <>Debits and credits differ by {formatRupees(totals.difference)}</>
          )}
        </p>
      ) : null}

      <Sheet
        open={needs}
        onClose={() => setNeeds(false)}
        title="Needs you"
        blurb="What is left to resolve"
      >
        {open.length ? (
          open.map((check) => (
            <div className="cr-need" key={check.key}>
              <span
                className="cr-dot"
                data-tone={attempted ? "err" : "warn"}
                aria-hidden="true"
              />
              <span>{check.label}</span>
              <small>{check.where ?? "Voucher"}</small>
              <button
                type="button"
                className="cr-propose"
                onClick={() => go(check)}
              >
                {check.where ? "To the entries" : "On the voucher"}
                <ChevronRight size={12} aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <p className="cr-empty-needs">Nothing left to resolve.</p>
        )}
      </Sheet>

      <Sheet
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Journal entries"
        blurb="Changes stay in your draft"
        doneLabel="Back to review"
        wide
      >
        {lineTable(true)}
      </Sheet>
    </div>
  );
};

/** Raised by the Inbox when approving this journal fails its checks. */
export const JOURNAL_APPROVE_FAILED = "aia-journal-approve-failed";

type Check = {
  key: string;
  label: string;
  ok: boolean;
  /** A selector inside the form for the way to it. */
  target: string;
  /** Where it is, for Needs you; absent means the voucher card. */
  where?: string;
};

const formatRupees = (value: number) =>
  `₹ ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default JournalVoucher;
