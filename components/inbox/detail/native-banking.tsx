import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronLeft,
  EllipsisVertical,
  ExternalLink,
  Trash2,
  X,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConvertButton from "@/components/inbox/common/convert-button";
import HintBanner from "@/components/inbox/common/hint-banner";
import NativeShell, {
  NativePanel,
} from "@/components/inbox/common/native-shell";
import ReviewField, { FieldGrid } from "@/components/inbox/common/review-field";
import StatCard from "@/components/inbox/common/stat-card";
import { BANK_ACCOUNT_LABEL } from "@/config/pages/inbox/conversions";
import { expandStatementRows, type StatementRow } from "@/utils/pages/inbox";
import { cn } from "@/lib/utils";
import type { BankingTxn, InboxItem } from "@/types/pages/inbox";

/**
 * Parsed bank statement → reconcile. Ported from NativeBanking in
 * js/native-banking.jsx.
 *
 * Banking has exactly one conversion edge — a transaction to a Journal Voucher
 * — and it lives per row in the overflow menu rather than as a button on every
 * line. Most transactions get reconciled against a bill or receipt; only the
 * odd ones (bank charges, interest credits, transfers) become journals, so the
 * rare action stays out of the way.
 */

type Props = {
  item: InboxItem;
  onApprove: () => void;
  onConvertTxn: (txn: BankingTxn) => void;
  onDelete: () => void;
  onSaveDraft: () => void;
  onAction: (label: string) => void;
};

const NativeBanking = (props: Props) => {
  const [drillIndex, setDrillIndex] = useState<number | null>(null);

  if (drillIndex != null) {
    return (
      <BankingTxnDrill
        {...props}
        index={drillIndex}
        onBack={() => setDrillIndex(null)}
      />
    );
  }

  return <BankingTable {...props} onDrill={setDrillIndex} />;
};

/* ------------------------------------------------------------------ table */

const BankingTable = ({
  item,
  onApprove,
  onConvertTxn,
  onDelete,
  onSaveDraft,
  onAction,
  onDrill,
}: Props & { onDrill: (index: number) => void }) => {
  const banking = item.banking;
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = useMemo(
    () => (banking ? expandStatementRows(banking) : []),
    [banking]
  );

  if (!banking) return null;

  const toggleRow = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const money = (value: number) => value.toLocaleString("en-IN");

  return (
    <NativeShell
      title="HDFC Bank · Statement"
      subtitle={`A/C ${BANK_ACCOUNT_LABEL.replace("HDFC ", "")} · ${banking.dateRange} · ${banking.txnCount} transactions`}
      bodyClassName="gap-0 p-0"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete statement
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            Confirm &amp; Send to Reconcile
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-3 px-5 pt-4">
        <StatCard label="Transactions" value={String(banking.txnCount)} />
        <StatCard
          label="Date range"
          value={banking.dateRange.replace("–", "→")}
          small
        />
        <StatCard
          label="Opening balance"
          value={`₹ ${money(banking.opening)}`}
        />
        <StatCard
          label="Closing balance"
          value={`₹ ${money(banking.closing)}`}
          accent
        />
      </div>

      <div className="flex items-center gap-3 px-5 pt-4">
        <strong className="text-sm">Transactions</strong>
        <span className="rounded-md bg-section px-2 py-0.5 text-xs text-secondary-foreground">
          Showing {rows.length} of {banking.txnCount}
        </span>
        <div className="flex-1" />
        {selected.size > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(`Convert ${selected.size} transactions`)}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Convert {selected.size} txns →
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 pb-4 pt-2">
        <div className="rounded-lg border border-neutral-gray">
          <Table>
            <TableHeader className="sticky top-0 bg-section">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="w-[110px] text-xs">Date</TableHead>
                <TableHead className="text-xs">Narration</TableHead>
                <TableHead className="text-right text-xs">Debit</TableHead>
                <TableHead className="text-right text-xs">Credit</TableHead>
                <TableHead className="text-right text-xs">Balance</TableHead>
                <TableHead className="w-11" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((txn, index) => (
                <TableRow
                  // Synthesized rows have no id; index is stable here because
                  // the list is derived deterministically and never reordered.
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  onClick={() => onDrill(index)}
                  data-state={selected.has(index) ? "selected" : undefined}
                  className="cursor-pointer"
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(index)}
                      onCheckedChange={() => toggleRow(index)}
                      aria-label={`Select ${txn.narration}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {txn.date}
                  </TableCell>
                  <TableCell className="text-sm">{txn.narration}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm tabular-nums",
                      txn.dr
                        ? "text-destructive-foreground"
                        : "text-secondary-foreground"
                    )}
                  >
                    {txn.dr ? money(txn.dr) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-sm tabular-nums",
                      txn.cr
                        ? "text-success-green-foreground"
                        : "text-secondary-foreground"
                    )}
                  >
                    {txn.cr ? money(txn.cr) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {money(txn.balance)}
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <RowMenu
                      onOpen={() => onDrill(index)}
                      onConvert={() => onConvertTxn(txn)}
                      onAction={onAction}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </NativeShell>
  );
};

const RowMenu = ({
  onOpen,
  onConvert,
  onAction,
}: {
  onOpen: () => void;
  onConvert: () => void;
  onAction: (label: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label="Transaction actions"
      >
        <EllipsisVertical className="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={onOpen}>
        <ExternalLink className="mr-2 h-4 w-4" />
        Open transaction
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => onAction("Reconcile against a bill")}>
        Reconcile against bill
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => onAction("Reconcile against a receipt")}
      >
        Reconcile against receipt
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onConvert}>
        <ArrowLeftRight className="mr-2 h-4 w-4" />
        Convert →
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive-foreground"
        onSelect={() => onAction("Mark this transaction unreconciled")}
      >
        <X className="mr-2 h-4 w-4" />
        Mark unreconciled
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

/* ------------------------------------------------------------------ drill */

const BankingTxnDrill = ({
  item,
  index,
  onBack,
  onConvertTxn,
  onAction,
}: Props & { index: number; onBack: () => void }) => {
  const banking = item.banking;
  const rows: StatementRow[] = useMemo(
    () => (banking ? expandStatementRows(banking) : []),
    [banking]
  );
  const txn = rows[index];

  if (!txn) return null;

  return (
    <NativeShell
      title={txn.narration}
      subtitle={`Transaction · ${txn.date} · ${BANK_ACCOUNT_LABEL}`}
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to statement
          </Button>
          <ConvertButton
            source="banking-row"
            size="sm"
            onPick={() => onConvertTxn(txn)}
          />
        </>
      }
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex-1" />
          <Button onClick={() => onAction("Reconcile this transaction")}>
            <Check className="h-3.5 w-3.5" />
            Reconcile
          </Button>
        </>
      }
    >
      <NativePanel>
        <FieldGrid>
          <ReviewField label="Date" value={txn.date} required />
          <ReviewField label="Narration" value={txn.narration} required />
          <ReviewField
            label="Debit (₹)"
            value={txn.dr ? txn.dr.toLocaleString("en-IN") : "—"}
          />
          <ReviewField
            label="Credit (₹)"
            value={txn.cr ? txn.cr.toLocaleString("en-IN") : "—"}
          />
          <ReviewField
            label="Reconciled against"
            placeholder="Search bills, receipts, ledgers…"
          />
          <ReviewField label="Cost Centre" placeholder="Optional" />
        </FieldGrid>
      </NativePanel>

      <HintBanner
        kind="info"
        title="Match to a bill or receipt"
        body="Type vendor name or amount above. We'll surface matching bills, customer receipts and ledger entries from the last 90 days."
      />
    </NativeShell>
  );
};

export default NativeBanking;
