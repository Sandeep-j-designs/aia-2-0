import React, { useMemo, useRef, useState } from "react";
import {
  CircleCheck,
  Clock,
  CloudUpload,
  Eye,
  Landmark,
  Trash2,
  Undo2,
  Upload,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import BulkActionBar from "@/components/common/bulk-action-bar";
import { ComboBox } from "@/components/common/combo-box";
import DateFilter, { FY_PRESETS } from "@/components/common/date-filter";
import DateRangePanel from "@/components/common/date-filter/panel";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import { bankingActions, isCashLedger } from "@/hooks/pages/inbox/use-banking";
import {
  bankMatchActions,
  candidatesFor,
  rupees,
  useBankMatches,
} from "@/hooks/pages/inbox/use-bank-matches";
import {
  bankRuleActions,
  ruleCitation,
  ruleFor,
  useBankRules,
} from "@/hooks/pages/inbox/use-bank-rules";
import { actor } from "@/components/inbox/v2/store";
import usePinEdges from "@/hooks/pages/inbox/use-pin-edges";
import { gstRegistrationsOf } from "@/config/pages/inbox/mock-banking";
import type {
  BankLedgerData,
  BankTransaction,
  TallyVoucherPaymentType,
} from "@/types/pages/inbox/banking";
import { ColumnFilter, QuickFilter } from "@/components/inbox/v2/filter-panel";
import { PageDialog, T } from "@/components/inbox/v2/ui";
import {
  AmountFields,
  ColumnsButton,
  Pager,
  SearchBox,
  UnderlineTabs,
  nextSort,
  sortRows,
  type SortState,
} from "./table-parts";
import {
  PAGE_TITLE,
  PAGE_SCROLL,
  PageHead,
  Pinned,
  TOOLBAR,
  TableCard,
  ToolbarRule,
} from "./page-parts";
import TransactionsTable, {
  TYPE_BY_LABEL,
  ledgerGroupsFor,
  type TxnColumn,
} from "./transactions-table";
import TransactionSheet from "./transaction-sheet";
import RulePrompt from "./rule-prompt";

/**
 * One bank ledger's transactions: Needs Review and Accounting Ready.
 *
 * Production: pages/bank/transaction/[id].tsx and
 * components/transactions/common/*. Route state (tab, filters, page) is
 * component state here.
 * DEV: sync with useRoutedListState — keys tab, page, limit, search,
 * dateRangeAfter, dateRangeBefore, paymentType, ledger, amount,
 * autoCategoriseTransactions, hideSyncedTransactions.
 */

type Tab = "review" | "ready";
type DateRange = { from?: Date; to?: Date };
const TYPE_OPTIONS = ["Payment", "Receipt", "Contra"].map((label) => ({
  value: label,
  label,
}));
const SORTABLE = new Set<TxnColumn>([
  "date",
  "voucherNo",
  "description",
  "type",
  "ledger",
  "amount",
]);
const SORT_VALUE: Partial<
  Record<TxnColumn, (txn: BankTransaction) => string | number>
> = {
  date: (t) => t.transactionDate,
  voucherNo: (t) => t.voucherNo ?? "",
  description: (t) => t.description,
  type: (t) => t.paymentType ?? "",
  ledger: (t) => t.ledgersNameList[0] ?? "",
  amount: (t) => Number(t.transactionAmountLc),
};
const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");
const typeLabel = (t: BankTransaction) =>
  t.paymentType ? t.paymentType[0].toUpperCase() + t.paymentType.slice(1) : "";

type Props = {
  company: string;
  ledger: BankLedgerData;
  ledgers: BankLedgerData[];
  transactions: BankTransaction[];
  onBack: () => void;
  onSwitch: (ledgerId: string) => void;
  onLogs: () => void;
  onUpload: () => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
  onUnbuilt: (what: string) => void;
};

const Transactions = ({
  company,
  ledger,
  ledgers,
  transactions,
  onBack,
  onSwitch,
  onLogs,
  onUpload,
  notify,
  onUnbuilt,
}: Props) => {
  const [tab, setTab] = useState<Tab>("review");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState<TxnColumn>>(null);
  const [dates, setDates] = useState<DateRange>({});
  const [types, setTypes] = useState<string[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<string[]>([]);
  const [gsts, setGsts] = useState<string[]>([]);
  const [amount, setAmount] = useState({ min: "", max: "" });
  const [aiOnly, setAiOnly] = useState(false);
  const [hideSynced, setHideSynced] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [staged, setStaged] = useState<{ type?: string; ledger?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const own = transactions.filter((t) => t.bankAccountUuid === ledger.id);
  const { suggestions, docs } = useBankMatches(company, own);
  const { fresh } = useBankRules(company);
  const prompt =
    fresh && (!fresh.bankAccountUuid || fresh.bankAccountUuid === ledger.id)
      ? fresh
      : undefined;
  const matchFor = (t: BankTransaction) => suggestions.get(t.bankLineUuid);
  const ruleNoteFor = (t: BankTransaction) => {
    const rule = ruleFor(company, t);
    return rule ? ruleCitation(rule) : undefined;
  };
  /**
   * After a person codes lines by hand, look for the repeat that earns a
   * rule suggestion (the third consistent one).
   */
  const observe = (uuids: string[]) => {
    const all = bankingActions.transactionsOf(company);
    uuids.forEach((uuid) => {
      const t = all.find((x) => x.bankLineUuid === uuid);
      if (t) bankRuleActions.observe(company, t, all);
    });
  };
  const review = own.filter((t) => !t.accoutingReady);
  const ready = own.filter((t) => t.accoutingReady);
  const onReady = tab === "ready";

  const anyFilter = !!(
    search ||
    dates.from ||
    dates.to ||
    types.length ||
    ledgerFilter.length ||
    gsts.length ||
    amount.min ||
    amount.max
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = (onReady ? ready : review).filter(
      (t) =>
        (!term ||
          [t.description, t.voucherNo ?? "", t.ledgersNameList[0] ?? ""].some(
            (v) => v.toLowerCase().includes(term)
          )) &&
        (!dates.from || t.transactionDate >= iso(dates.from)) &&
        (!dates.to || t.transactionDate <= iso(dates.to)) &&
        (!types.length || types.includes(typeLabel(t))) &&
        (!ledgerFilter.length ||
          ledgerFilter.includes(t.ledgersNameList[0] ?? "")) &&
        (!gsts.length || gsts.includes(t.companyGstLabel)) &&
        (!amount.min || Number(t.transactionAmountLc) >= Number(amount.min)) &&
        (!amount.max || Number(t.transactionAmountLc) <= Number(amount.max)) &&
        // "Show AI Categorised": rows AIA filled in full, ready to check.
        (!aiOnly ||
          (t.categorisedBy === "ai" && t.isReadyToSync && !onReady)) &&
        (!hideSynced || t.thirdPartySyncStatus !== "synced" || !onReady)
    );
    return sortRows(filtered, sort, SORT_VALUE);
  }, [
    own,
    onReady,
    search,
    dates,
    types,
    ledgerFilter,
    gsts,
    amount,
    aiOnly,
    hideSynced,
    sort,
  ]);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const selectedRows = own.filter((t) => selected.includes(t.bankLineUuid));

  const firstPage = () => {
    setPage(0);
    setSelected([]);
  };
  /*
   * The empty table (8 Oct 2026): filtered, it offers to clear; truly empty,
   * it shows the stages a bank line moves through, counted, and acts on the
   * one that holds lines.
   */
  const synced = ready.filter(
    (t) => t.thirdPartySyncStatus === "synced"
  ).length;
  const lines = (n: number) => `${n} transaction${n === 1 ? "" : "s"}`;
  const txnFlow = [
    {
      label: "Needs review",
      count: review.length,
      icon: Clock,
      current: tab === "review",
    },
    {
      label: "Accounting ready",
      count: ready.length,
      icon: CircleCheck,
      current: tab === "ready",
    },
    { label: "Synced to Tally", count: synced, icon: CloudUpload },
  ];
  const transactionsEmpty: React.ComponentProps<
    typeof TransactionsTable
  >["empty"] =
    anyFilter || aiOnly || hideSynced
      ? {
          title: "No transactions match these filters",
          body: `None of the ${lines(tab === "review" ? review.length : ready.length)} in ${tab === "review" ? "Needs Review" : "Accounting Ready"} match.`,
          filters: [],
          onClear: () => reset(),
        }
      : !review.length && !ready.length
        ? {
            icon: Landmark,
            title: "No transactions yet",
            body: "Upload a bank statement for this account. Its transactions appear here, with a ledger suggested for each one.",
            actions: (
              <Button onClick={onUpload}>
                <Upload className="h-4 w-4" />
                Upload Statement
              </Button>
            ),
          }
        : tab === "review"
          ? {
              flow: txnFlow,
              title: "Nothing left to review",
              body: `Every transaction has a ledger. ${lines(ready.length)} ${ready.length === 1 ? "is" : "are"} accounting-ready${synced ? `, and ${synced} already in Tally` : ""}.`,
              actions: (
                <Button variant="outline" onClick={() => setTab("ready")}>
                  View accounting-ready
                </Button>
              ),
            }
          : {
              flow: txnFlow,
              title: "Nothing accounting-ready yet",
              body: `${lines(review.length)} still ${review.length === 1 ? "needs" : "need"} a ledger or a check before ${review.length === 1 ? "it is" : "they are"} ready to post.`,
              actions: (
                <Button onClick={() => setTab("review")}>
                  Review {lines(review.length)}
                </Button>
              ),
            };
  const reset = () => {
    setSearch("");
    setDates({});
    setTypes([]);
    setLedgerFilter([]);
    setGsts([]);
    setAmount({ min: "", max: "" });
    firstPage();
  };

  const ledgerOptions = useMemo(
    () =>
      [...new Set(own.flatMap((t) => t.ledgersNameList))]
        .sort()
        .map((value) => ({ value, label: value })),
    [own]
  );

  const filterFor = (key: TxnColumn) => {
    const apply =
      <V,>(fn: (v: V) => void) =>
      (v: V) => {
        fn(v);
        firstPage();
      };
    switch (key) {
      case "date":
        return (
          <DateRangePanel
            value={dates}
            onApply={apply(setDates)}
            presets={FY_PRESETS}
            presetsLabel="Date range"
            today={new Date()}
          />
        );
      case "gst":
        return (
          <ColumnFilter
            label="GST Registration"
            options={gstRegistrationsOf(company).map((g) => ({
              value: g.label,
              label: g.label,
            }))}
            selected={gsts}
            onChange={apply(setGsts)}
          />
        );
      case "type":
        return (
          <ColumnFilter
            label="Type"
            options={TYPE_OPTIONS}
            selected={types}
            onChange={apply(setTypes)}
          />
        );
      case "ledger":
        return (
          <ColumnFilter
            label="Ledger"
            options={ledgerOptions}
            selected={ledgerFilter}
            onChange={apply(setLedgerFilter)}
          />
        );
      case "amount":
        return (
          <div className="w-64 p-3">
            <AmountFields
              min={amount.min}
              max={amount.max}
              onChange={(k, v) => {
                setAmount((a) => ({ ...a, [k]: v }));
                firstPage();
              }}
            />
          </div>
        );
      default:
        return undefined;
    }
  };
  const filterActive = (key: TxnColumn) =>
    key === "date"
      ? !!(dates.from || dates.to)
      : key === "gst"
        ? !!gsts.length
        : key === "type"
          ? !!types.length
          : key === "ledger"
            ? !!ledgerFilter.length
            : key === "amount"
              ? !!(amount.min || amount.max)
              : false;

  /* ------------------------------------------------------------ writes */
  const toggleReady = (txn: BankTransaction) => {
    bankingActions.setAccountingReady(
      company,
      [txn.bankLineUuid],
      !txn.accoutingReady
    );
    setSelected((s) => s.filter((id) => id !== txn.bankLineUuid));
    notify("Transaction updated");
  };

  const sides = new Set(selectedRows.map((t) => t.crDr));
  const mixed = sides.size > 1;
  const side = selectedRows[0]?.crDr ?? "debit";
  const stagedType: TallyVoucherPaymentType | null = staged.type
    ? TYPE_BY_LABEL[staged.type]
    : null;
  const bulkLedgerGroups = ledgerGroupsFor(
    stagedType,
    ledger.ledgerName,
    company
  );
  const hasStaged = !!(staged.type || staged.ledger);

  const finish = () => {
    setSelected([]);
    setStaged({});
  };
  const applyStaged = () => {
    selectedRows.forEach((t) => {
      const type = stagedType ?? t.paymentType;
      const allowed = ledgerGroupsFor(type, ledger.ledgerName, company).flatMap(
        (g) => g.options
      );
      const ledgerName =
        staged.ledger ??
        (allowed.includes(t.ledgersNameList[0] ?? "")
          ? t.ledgersNameList[0]
          : undefined);
      bankingActions.updateTransaction(company, t.bankLineUuid, {
        paymentType: type,
        ledgersNameList: ledgerName ? [ledgerName] : [],
        ledgersUuidList: ledgerName ? [`led-${ledgerName}`] : [],
        categorisedBy: "user",
      });
    });
    observe(selectedRows.map((t) => t.bankLineUuid));
  };
  const bulkSave = () => {
    applyStaged();
    notify(`${selectedRows.length} transactions updated`);
    finish();
  };
  const bulkReady = () => {
    const after = selectedRows.map((t) => ({
      type: stagedType ?? t.paymentType,
      ledger: staged.ledger ?? t.ledgersNameList[0],
    }));
    if (after.some((t) => !t.type || !t.ledger)) {
      notify(
        "One or more selected transactions need matching or categorization",
        "error"
      );
      return;
    }
    if (hasStaged) applyStaged();
    bankingActions.setAccountingReady(company, selected, true);
    notify(
      hasStaged
        ? `${selected.length} transactions saved and marked as Accounting Ready`
        : `${selected.length} transactions marked as Accounting Ready`
    );
    finish();
  };
  const bulkRevert = () => {
    if (selectedRows.some((t) => t.thirdPartySyncStatus !== "not_synced")) {
      notify("Unable to revert selected transactions", "error");
      return;
    }
    bankingActions.setAccountingReady(company, selected, false);
    notify(`${selected.length} transactions reverted to Needs Review`);
    finish();
  };
  const bulkDelete = () => {
    bankingActions.deleteTransactions(company, selected);
    notify(`${selected.length} transactions deleted.`);
    setConfirmDelete(false);
    finish();
  };

  const openTxn = openId ? own.find((t) => t.bankLineUuid === openId) : null;
  // The page scroller; it owns the horizontal scroll the table's pinned
  // bookends shade against (the attributes go on it, an ancestor of the cells).
  const scroller = useRef<HTMLDivElement | null>(null);
  const pinEdges = usePinEdges(scroller);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* The scroller's own box, so the overlay bars and the floating
          selection bar sit over the table and end above the pager. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={scroller} className={PAGE_SCROLL} {...pinEdges}>
          <Pinned>
            <PageHead
              eyebrow="Banking"
              back={{ label: "Back to Banking", onClick: onBack }}
              title={
                <div className="-ml-2 min-w-0">
                  <ComboBox
                    title="Select Bank Ledger"
                    options={ledgers
                      .filter((l) => !isCashLedger(l))
                      .map((l) => ({ value: l.id, label: l.ledgerName }))}
                    selectedValue={ledger.id}
                    onChange={(value) => onSwitch(String(value))}
                    isMultiSelect={false}
                    hideClearButton
                    formatTriggerLabel={(label) => `${label} - Transactions`}
                    triggerClassName="h-auto w-auto min-w-[180px] max-w-full rounded-sm border-none bg-transparent px-2 py-0.5 shadow-none hover:bg-pi-fill"
                    singleTriggerContentClassName={PAGE_TITLE}
                  />
                </div>
              }
              actions={
                <>
                  {/* Sync lives in the top bar only (8 Oct 2026). */}
                  <Button variant="secondary" onClick={onLogs}>
                    <Eye className="h-4 w-4" />
                    Statement Logs
                  </Button>
                  <Button onClick={onUpload}>
                    <Upload className="h-4 w-4" />
                    Upload Statement
                  </Button>
                </>
              }
            />

            <UnderlineTabs
              tabs={[
                { id: "review", label: "Needs Review", count: review.length },
                { id: "ready", label: "Accounting Ready", count: ready.length },
              ]}
              value={tab}
              onChange={(next) => {
                setTab(next as Tab);
                setAiOnly(false);
                setHideSynced(false);
                setStaged({});
                firstPage();
              }}
            />

            <div className={TOOLBAR}>
              <SearchBox
                label="Search transactions"
                placeholder="Search..."
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  firstPage();
                }}
              />
              <ToolbarRule />
              <QuickFilter
                label="Type"
                options={TYPE_OPTIONS}
                selected={types}
                onChange={(next) => {
                  setTypes(next);
                  firstPage();
                }}
              />
              <DateFilter
                label="Date"
                value={dates}
                onChange={(next) => {
                  setDates(next);
                  firstPage();
                }}
              />
              <Tooltip
                side="bottom"
                message={
                  onReady
                    ? "Hide transactions that have already been synced."
                    : "Display transactions with complete data to review before marking as accounting-ready."
                }
              >
                <Label className="ml-2 flex cursor-pointer items-center gap-2 whitespace-nowrap">
                  <Switch
                    checked={onReady ? hideSynced : aiOnly}
                    onCheckedChange={(checked) => {
                      if (onReady) setHideSynced(checked);
                      else setAiOnly(checked);
                      firstPage();
                    }}
                  />
                  <span className={cn(T.cell, "text-pi-body")}>
                    {onReady
                      ? "Hide Synced Transactions"
                      : "Show AI Categorised Transactions"}
                  </span>
                </Label>
              </Tooltip>
              <span className="flex-1" />
              {anyFilter && (
                <Button variant="ghost" onClick={reset}>
                  <Undo2 className="h-3 w-3" />
                  Reset Filters
                </Button>
              )}
              <ColumnsButton onClick={() => onUnbuilt("Choosing columns")} />
            </div>

            {prompt ? (
              <RulePrompt
                suggestion={prompt}
                onCreate={() => {
                  const { rule, coded } = bankRuleActions.accept(
                    company,
                    prompt.id,
                    actor
                  );
                  if (rule)
                    notify(
                      coded
                        ? `Rule created. ${coded} more ${coded === 1 ? "line was coded by it and waits" : "lines were coded by it and wait"} for your review.`
                        : "Rule created. It codes these lines from the next statement on."
                    );
                }}
                onLater={() => bankRuleActions.snooze(company, prompt.id)}
                onNever={() => {
                  bankRuleActions.dismiss(company, prompt.id, actor);
                  notify("We won't suggest a rule for these again.", "info");
                }}
              />
            ) : null}
          </Pinned>

          <TableCard>
            <TransactionsTable
              company={company}
              rows={pageRows}
              ready={onReady}
              selected={selected}
              onSelectedChange={setSelected}
              sort={sort}
              onSort={(key) => {
                setSort((current) => nextSort(current, key));
                firstPage();
              }}
              sortable={SORTABLE}
              filterFor={filterFor}
              filterActive={filterActive}
              onOpen={(txn) => setOpenId(txn.bankLineUuid)}
              onUpdate={(txn, change, message) => {
                bankingActions.updateTransaction(
                  company,
                  txn.bankLineUuid,
                  change
                );
                notify(message);
                observe([txn.bankLineUuid]);
              }}
              matchFor={matchFor}
              ruleNoteFor={ruleNoteFor}
              onToggleReady={toggleReady}
              onUnbuilt={onUnbuilt}
              empty={transactionsEmpty}
            />
          </TableCard>
        </div>
        <OverlayScrollbars scroller={scroller} />

        {selected.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <BulkActionBar
              className="pointer-events-auto"
              selectedCount={selected.length}
              totalCount={rows.length}
              onSelectAll={
                selected.length < rows.length
                  ? () => setSelected(rows.map((t) => t.bankLineUuid))
                  : undefined
              }
              // Categorize: a type and a ledger staged for every selected row.
              // Production allows it only for one side (all debits or all
              // credits), so a mixed selection cannot categorise.
              fields={
                onReady
                  ? []
                  : [
                      {
                        key: "type",
                        // "Transaction Type" in production; the bar's 130px
                        // fields cut that short, and the column says "Type".
                        label: "Type",
                        value: staged.type,
                        isDisabled: mixed,
                        options: (side === "debit"
                          ? ["Payment", "Contra"]
                          : ["Receipt", "Contra"]
                        ).map((v) => ({ label: v, value: v })),
                      },
                      {
                        key: "ledger",
                        label: "Ledger",
                        value: staged.ledger,
                        isDisabled: mixed,
                        options: bulkLedgerGroups.flatMap((g) =>
                          g.options.map((o) => ({ label: o, value: o }))
                        ),
                        optionGroups: bulkLedgerGroups.map((g) => ({
                          label: g.heading,
                          options: g.options.map((o) => ({
                            label: o,
                            value: o,
                          })),
                        })),
                        createNoun: "ledger",
                        onCreate: () => onUnbuilt("Creating a ledger"),
                      },
                    ]
              }
              onFieldChange={(key, value) =>
                setStaged((s) => {
                  const next = { ...s };
                  const k = key as "type" | "ledger";
                  if (next[k] === value) delete next[k];
                  else next[k] = value;
                  // A Contra takes only bank or cash ledgers.
                  if (
                    k === "type" &&
                    next.ledger &&
                    !ledgerGroupsFor(
                      TYPE_BY_LABEL[value],
                      ledger.ledgerName,
                      company
                    )
                      .flatMap((g) => g.options)
                      .includes(next.ledger)
                  )
                    delete next.ledger;
                  return next;
                })
              }
              actions={
                onReady
                  ? [
                      {
                        label: "Revert to Needs Review",
                        onClick: bulkRevert,
                        variant: "primary",
                      },
                    ]
                  : [
                      ...(hasStaged
                        ? [{ label: "Save", onClick: bulkSave }]
                        : []),
                      {
                        label: hasStaged
                          ? "Save & Mark as Ready"
                          : "Mark as ready",
                        onClick: bulkReady,
                        variant: "primary" as const,
                      },
                    ]
              }
              deleteLabel={`Delete ${selected.length} selected`}
              onDelete={() => setConfirmDelete(true)}
              onClearSelection={finish}
            />
          </div>
        )}
      </div>

      {/* Below the page scroller, not inside it: the pager stays at the
          bottom of the viewport, and the horizontal bar ends above it. */}
      <Pager
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={(next) => {
          setPage(next);
          setSelected([]);
        }}
        onPageSizeChange={setPageSize}
      />

      <PageDialog
        open={confirmDelete}
        title="Confirm Delete Transactions"
        onClose={() => setConfirmDelete(false)}
        className="max-w-[460px]"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button isDestructive onClick={bulkDelete}>
              <Trash2 className="h-4 w-4" />
              Delete transactions
            </Button>
          </>
        }
      >
        <p className={T.value}>
          Some of the selected transactions are categorized. Deleting them will
          permanently remove their categorization data.
        </p>
        <p className={cn(T.value, "mt-2")}>Are you sure you want to proceed?</p>
      </PageDialog>

      <TransactionSheet
        company={company}
        txn={openTxn ?? null}
        onClose={() => setOpenId(null)}
        onSave={(txn, change, markReady) => {
          bankingActions.updateTransaction(company, txn.bankLineUuid, change);
          observe([txn.bankLineUuid]);
          if (markReady) {
            bankingActions.setAccountingReady(
              company,
              [txn.bankLineUuid],
              true
            );
            notify("Saved and marked as Accounting Ready.");
          } else {
            const type = change.paymentType ?? txn.paymentType;
            notify(
              type
                ? `${type[0].toUpperCase()}${type.slice(1)} voucher saved.`
                : "Transaction updated"
            );
          }
          setOpenId(null);
        }}
        onRevert={(txn) => {
          bankingActions.setAccountingReady(company, [txn.bankLineUuid], false);
          notify("Transaction reverted to Needs Review.");
          setOpenId(null);
        }}
        notify={notify}
        onUnbuilt={onUnbuilt}
        ruleNote={openTxn ? ruleNoteFor(openTxn) : undefined}
        match={
          openTxn && matchFor(openTxn)
            ? {
                suggestion: matchFor(openTxn)!,
                candidates: candidatesFor(openTxn, docs),
                onAccept: () => {
                  const s = matchFor(openTxn)!;
                  bankMatchActions.accept(company, openTxn, s, actor);
                  notify(
                    `Matched to ${s.documents.map((d) => d.number).join(" + ")}. ${s.vouchers
                      .map((v) => `${v.type} ${rupees(v.amount)}`)
                      .join(" and ")} drafted; the line is Accounting Ready.`
                  );
                  setOpenId(null);
                },
                onChoose: (ids) =>
                  bankMatchActions.choose(company, openTxn.bankLineUuid, ids),
                onDismiss: () => {
                  bankMatchActions.dismiss(company, openTxn, actor);
                  notify("Suggestion dismissed.", "info");
                },
              }
            : undefined
        }
      />
    </div>
  );
};

export default Transactions;
