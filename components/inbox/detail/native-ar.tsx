import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronLeft,
  EllipsisVertical,
  ExternalLink,
  Pencil,
  Search,
  Trash2,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import NativeShell from "@/components/inbox/common/native-shell";
import {
  arDocumentFor,
  arPlaceOfSupply,
} from "@/config/pages/inbox/ar-document";
import { cn } from "@/lib/utils";
import type { ArRow, InboxItem } from "@/types/pages/inbox";
import type { ConversionTarget } from "@/types/pages/inbox/conversion";

/**
 * Invoice bulk-upload validation grid. Ported from NativeAR in
 * js/native-ar.jsx.
 *
 * The grid is the AR module's own surface — a spreadsheet of proposed invoices
 * with per-row validation. Row numbers start at 2 to match what the accountant
 * sees in Excel (header row + 1-indexing).
 *
 * On a re-upload, rows are dedup-checked individually: some were already
 * posted, some were converted to another voucher type in an earlier session,
 * some are sitting in another pending batch. Those rows are shown but not
 * actionable, and the footer states the arithmetic so the counts visibly add up
 * to the total.
 */

const ROWS_SHOWN = 24;

type RowFilter = "all" | "issues" | "valid" | "skipped" | "converted";

type Props = {
  item: InboxItem;
  onApprove: () => void;
  onConvertRow: (rowIndex: number, target: ConversionTarget) => void;
  onDelete: () => void;
  onSaveDraft: () => void;
  onAction: (label: string) => void;
};

const isSkipped = (row: ArRow) =>
  Boolean(row.dedup?.kind?.startsWith("skipped"));
const isConverted = (row: ArRow) => row.dedup?.kind === "converted";

const NativeAR = (props: Props) => {
  const [drillIndex, setDrillIndex] = useState<number | null>(null);

  if (drillIndex != null) {
    return (
      <ARInvoiceDrill
        {...props}
        index={drillIndex}
        onBack={() => setDrillIndex(null)}
      />
    );
  }

  return <ARValidationGrid {...props} onDrill={setDrillIndex} />;
};

/* ------------------------------------------------------------------- grid */

const ARValidationGrid = ({
  item,
  onApprove,
  onConvertRow,
  onDelete,
  onSaveDraft,
  onAction,
  onDrill,
}: Props & { onDrill: (index: number) => void }) => {
  const ar = item.ar;
  const [filter, setFilter] = useState<RowFilter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = useMemo(() => ar?.rows ?? [], [ar]);

  // Counts come off the row markings rather than the summary fields, so the
  // chips, the footer arithmetic and the CTA can never disagree.
  const counts = useMemo(() => {
    const tally = {
      posted: 0,
      convertedFrom: 0,
      pending: 0,
      skipped: 0,
      converted: 0,
    };
    rows.forEach((row) => {
      const kind = row.dedup?.kind;
      if (kind === "skipped-posted") {
        tally.posted += 1;
        tally.skipped += 1;
      }
      if (kind === "skipped-converted") {
        tally.convertedFrom += 1;
        tally.skipped += 1;
      }
      if (kind === "skipped-pending") {
        tally.pending += 1;
        tally.skipped += 1;
      }
      if (kind === "converted") tally.converted += 1;
    });
    return tally;
  }, [rows]);

  if (!ar) return null;

  const total = ar.rowCount;
  const issues = ar.invalidRows;
  const skipped = counts.skipped || (ar.skippedRows ?? 0);
  const converted = counts.converted || (ar.convertedRows ?? 0);
  const valid = Math.max(0, total - issues - skipped - converted);

  const shownRows = rows.filter((row) => {
    if (filter === "issues")
      return Boolean(row.issue) && !isSkipped(row) && !isConverted(row);
    if (filter === "valid")
      return !row.issue && !isSkipped(row) && !isConverted(row);
    if (filter === "skipped") return isSkipped(row);
    if (filter === "converted") return isConverted(row);
    return true;
  });

  const toggleRow = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const filters: { key: RowFilter; label: string; show: boolean }[] = [
    { key: "all", label: `All (${total.toLocaleString("en-IN")})`, show: true },
    { key: "issues", label: `Issues (${issues})`, show: true },
    {
      key: "valid",
      label: `Valid (${valid.toLocaleString("en-IN")})`,
      show: true,
    },
    { key: "skipped", label: `Skipped (${skipped})`, show: skipped > 0 },
    {
      key: "converted",
      label: `Converted (${converted})`,
      show: converted > 0,
    },
  ];

  return (
    <NativeShell
      title="Validate invoices"
      subtitle={
        <>
          {item.customer || "—"} · sheet &ldquo;{ar.sheetName}&rdquo;
          {ar.template ? (
            <>
              {" "}
              · template{" "}
              <strong className="text-foreground">{ar.template}</strong>
            </>
          ) : null}
          {item.isReupload ? (
            <>
              {" "}
              ·{" "}
              <strong className="text-primary">
                re-upload — row-level dedup
              </strong>
            </>
          ) : null}
        </>
      }
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction("Edit the column mapping")}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit mapping
        </Button>
      }
      bodyClassName="gap-0 p-0"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete batch
          </Button>
          {counts.pending > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(`Merge ${counts.pending} rows`)}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Merge {counts.pending} into INB-2044
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button variant="outline" onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            Create {valid.toLocaleString("en-IN")} invoices
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
        {filters
          .filter((entry) => entry.show)
          .map((entry) => (
            <Button
              key={entry.key}
              size="sm"
              variant={filter === entry.key ? "secondary" : "outline"}
              onClick={() => setFilter(entry.key)}
              className="h-8"
            >
              {entry.label}
            </Button>
          ))}

        <div className="flex-1" />

        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-foreground" />
          <Input placeholder="Search rows…" className="h-8 pl-8 text-sm" />
        </div>

        {selected.size > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(`Convert ${selected.size} rows`)}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Convert {selected.size} rows
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 pt-3">
        <div className="rounded-lg border border-neutral-gray">
          <Table>
            <TableHeader className="sticky top-0 bg-section">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="w-11 text-xs">#</TableHead>
                <TableHead className="text-xs">Invoice Date</TableHead>
                <TableHead className="text-xs">Invoice No</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Voucher Type</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs">Ledger</TableHead>
                <TableHead className="text-right text-xs">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="w-11" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownRows.slice(0, ROWS_SHOWN).map((row, index) => {
                const skip = isSkipped(row);
                const conv = isConverted(row);
                const locked = skip || conv;

                return (
                  <TableRow
                    key={row.invoiceNo}
                    onClick={() => !locked && onDrill(index)}
                    data-state={selected.has(index) ? "selected" : undefined}
                    className={cn(
                      locked ? "cursor-default opacity-55" : "cursor-pointer",
                      // Only unresolved problems get a ground. A skipped row is
                      // not a problem — it is already handled.
                      row.issue && !locked && "bg-destructive/40"
                    )}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {!locked ? (
                        <Checkbox
                          checked={selected.has(index)}
                          onCheckedChange={() => toggleRow(index)}
                          aria-label={`Select ${row.invoiceNo}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-secondary-foreground tabular-nums">
                      {index + 2}
                    </TableCell>
                    <TableCell className="text-sm">{row.invoiceDate}</TableCell>
                    <TableCell className="text-sm">{row.invoiceNo}</TableCell>
                    <TableCell className="text-sm">{row.customer}</TableCell>
                    <TableCell className="text-sm">{row.voucherType}</TableCell>
                    <TableCell
                      className={cn(
                        "text-sm",
                        row.gstin === "—" &&
                          !locked &&
                          "font-semibold text-destructive-foreground"
                      )}
                    >
                      {row.gstin}
                    </TableCell>
                    <TableCell className="text-sm">{row.state}</TableCell>
                    <TableCell className="text-sm">{row.ledger}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <RowStatus row={row} />
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {!locked ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Row actions"
                            >
                              <EllipsisVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onDrill(index)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => onAction("Edit this row inline")}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit row inline
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => onConvertRow(index, "JV")}
                            >
                              <ArrowLeftRight className="mr-2 h-4 w-4" />
                              Convert row →
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive-foreground"
                              onSelect={() => onAction("Skip this row")}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Skip this row
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* The arithmetic, stated. Counts that don't visibly add up to the total
          are the fastest way to lose an accountant's trust in a batch. */}
      <div className="flex flex-wrap items-center gap-4 border-t border-neutral-gray px-5 py-3 text-sm">
        <span>
          <strong>Total:</strong> {total.toLocaleString("en-IN")}
        </span>
        <span>
          <strong className="text-destructive-foreground">Issues:</strong>{" "}
          {issues}
        </span>
        <span>
          <strong className="text-success-green-foreground">Valid:</strong>{" "}
          {valid.toLocaleString("en-IN")}
        </span>
        {skipped > 0 ? (
          <span>
            <strong className="text-secondary-foreground">Skipped:</strong>{" "}
            {skipped}
          </span>
        ) : null}
        {converted > 0 ? (
          <span>
            <strong className="text-primary">Converted:</strong> {converted}
          </span>
        ) : null}
        <div className="flex-1" />
        <span className="text-xs text-secondary-foreground">
          {skipped + converted > 0
            ? `${issues} + ${valid} + ${skipped} + ${converted} = ${total.toLocaleString("en-IN")}`
            : "Only valid rows are created."}
        </span>
      </div>
    </NativeShell>
  );
};

const RowStatus = ({ row }: { row: ArRow }) => {
  const chip = (className: string, label: string, title?: string) => (
    <Badge
      variant="secondary"
      className={cn("w-fit px-2 py-0.5 text-[12px] font-normal", className)}
      title={title}
    >
      {label}
    </Badge>
  );

  if (row.dedup) {
    const { kind, ref } = row.dedup;
    if (kind === "skipped-posted")
      return chip(
        "bg-secondary text-secondary-foreground",
        `Skipped — posted ${ref}`,
        `This row's content matches ${ref}, which is already posted.`
      );
    if (kind === "skipped-converted")
      return chip(
        "bg-secondary text-secondary-foreground",
        `Skipped — converted to ${ref}`,
        `This row was converted to ${ref} in a previous session.`
      );
    if (kind === "skipped-pending")
      return chip(
        "bg-warning text-warning-foreground",
        `Already pending in ${ref}`,
        `This row is already awaiting review in ${ref}.`
      );
    if (kind === "converted")
      return chip("bg-accent text-accent-foreground", `→ ${ref}`);
  }

  if (row.issue === "missing-gstin")
    return chip("bg-destructive text-destructive-foreground", "Missing GSTIN");
  if (row.issue === "invalid-state")
    return chip("bg-warning text-warning-foreground", "Invalid state");
  if (row.issue === "missing-data")
    return chip("bg-warning text-warning-foreground", "Missing data");
  if (row.issue === "multiple-issues")
    return chip("bg-destructive text-destructive-foreground", "Multiple");

  return chip("bg-success-green text-success-green-foreground", "Valid");
};

/* ------------------------------------------------------------------ drill */

/**
 * One row of the batch, opened as a full invoice.
 *
 * The grid above is the AR module's own surface for a bulk upload — a thousand
 * proposed invoices, validated row by row. Opening one is a different question:
 * not "which rows are wrong" but "is this invoice right", and that is the same
 * question a bill asks. So it opens the same sheet, in AR wording — the AP
 * prototype served from `public/ap/index.html` with `?mode=ar`.
 *
 * What AR does not have is a source document. An invoice we raise is not read
 * off anyone's paper, so there is no facsimile beside it and nothing to
 * reconcile a printed code against; the row itself is the whole input.
 */
const ARInvoiceDrill = ({
  item,
  index,
  onBack,
  onConvertRow,
  onAction,
}: Props & { index: number; onBack: () => void }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const seeded = useRef(false);

  const row = item.ar?.rows[index];

  const send = useCallback((type: string, payload?: unknown) => {
    frame.current?.contentWindow?.postMessage(
      { source: "aia-inbox", type, payload },
      "*"
    );
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || message.source !== "aia-ap") return;
      if (message.type === "ready" && !seeded.current) {
        seeded.current = true;
        const doc = arDocumentFor(item, index);
        if (doc) {
          send("seed", { ...doc, placeOfSupply: arPlaceOfSupply(item, index) });
        }
      }
      /* The sheet made the invoice, so this row is done — back to the batch,
         which is where the remaining rows are. */
      if (message.type === "approved") onBack();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [item, index, onBack, send]);

  /* A different row is a different invoice. */
  useEffect(() => {
    seeded.current = false;
  }, [index]);

  if (!row || !item.ar) return null;

  const issueBody =
    row.issue === "missing-gstin"
      ? "GSTIN is missing. Add it on the sheet below or skip this row."
      : row.issue === "invalid-state"
        ? "Place of supply doesn't match a known Indian state code."
        : row.issue === "missing-data"
          ? "One or more required cells are empty."
          : "Multiple issues — see the flagged fields below.";

  return (
    <NativeShell
      title={row.invoiceNo}
      subtitle={`Row ${index + 2} · ${row.customer}`}
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to grid
          </Button>
          <ConvertButton
            source="ar-row"
            size="sm"
            onPick={(target) => onConvertRow(index, target)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("Skip this row")}
            className="text-destructive-foreground hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Skip row
          </Button>
        </>
      }
      bodyClassName="gap-0 p-0"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to batch
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => send("saveDraft")}>
            Save changes
          </Button>
          {/* Presses the sheet's own Create Invoice, so its validation runs and
              a refused invoice does not advance the batch. */}
          <Button onClick={() => send("approve")}>
            <Check className="h-3.5 w-3.5" />
            Save &amp; next row
          </Button>
        </>
      }
    >
      {row.issue ? (
        <div className="p-5 pb-0">
          <HintBanner
            kind="warn"
            title="This row has validation issues"
            body={issueBody}
          />
        </div>
      ) : null}

      <iframe
        ref={frame}
        src={`/ap/index.html?embed=1&mode=ar&item=${encodeURIComponent(
          item.id
        )}-${index}`}
        title="Invoice sheet"
        className="min-h-0 w-full flex-1 border-0"
      />

      <div className="flex-none border-t border-neutral-gray bg-section px-5 py-3 text-xs text-secondary-foreground">
        <strong className="text-foreground">On save:</strong> this row becomes a
        customer invoice. The rest of the batch (
        {(item.ar.rowCount - 1).toLocaleString("en-IN")} rows) continues
        independently — back to the grid to keep working on them.
      </div>
    </NativeShell>
  );
};

export default NativeAR;
