import React from "react";
import {
  Check,
  Copy,
  Eye,
  FileText,
  type IconComponent,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { GodownAllocation, Item } from "./store";
import { PageDialog, StatusPill } from "./ui";
import Preview from "./preview";
import {
  allocationDetail,
  allocationLabel,
  headerCostLock,
} from "@/config/pages/inbox/mock-cost-centres";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value
  );
/** "Main Store 12 MT · Peenya 8 MT", for a split line's tooltip. */
const godownDetail = (rows: GodownAllocation[]) =>
  rows
    .map(
      (r) =>
        `${r.godown} ${r.qty.toLocaleString("en-IN")}${r.unit ? ` ${r.unit}` : ""}`
    )
    .join(" · ");
/** What a payable reads as on the books: a credit against the vendor. */
const credit = (value: number) => `${money(value)} Cr`;
const date = (value: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : value || "—";

export function RecordBanner({
  tone,
  title,
  children,
  action,
  label,
  icon,
}: {
  tone: "success" | "warning";
  /** The mark's glyph, when the tone's default (tick / copy) does not fit. */
  icon?: IconComponent;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  /** Read to screen readers only; the disabled Approve says it in its tooltip. */
  label: string;
}) {
  const success = tone === "success";
  const Icon = icon ?? (success ? Check : Copy);
  return (
    <section
      aria-label={title}
      /*
        A compact card on the page canvas, clear of the header row above and
        the panes below (16px each way, the page's 20px gutter at the sides).
        One row: the tinted mark carries the tone, the title says what
        happened, the line under it says what to do, and the action sits
        right. The tint stays in the mark — a fully tinted band read as an
        alarm and collided with the form under it.
      */
      className="mx-5 my-4 flex shrink-0 items-center gap-3 rounded-lg border border-pi-line bg-pi-surface-panel py-3 pl-3 pr-4 shadow-contact"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          success
            ? "bg-pi-success-bg text-pi-success"
            : "bg-pi-warning-bg text-pi-warning"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[14px] font-medium leading-5 tracking-[-0.01em] text-pi-ink">
          {title}
          <span className="sr-only"> ({label})</span>
        </h2>
        <p className="truncate text-[13px] leading-5 text-pi-body">
          {children}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-pi-body">{label}</dt>
      <dd className="mt-1 break-words text-[13px] text-pi-ink">
        {value || "—"}
      </dd>
    </div>
  );
}

/** One fact: a quiet label above its value. */
function Field({
  label,
  title,
  children,
}: {
  label: string;
  /** Hover detail, e.g. what a cost centre class splits into. */
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2" title={title}>
      <dt className="text-[13px] leading-[18px] text-pi-body">{label}</dt>
      <dd className="min-w-0 break-words text-[15px] leading-[22px] text-pi-ink">
        {children}
      </dd>
    </div>
  );
}

/** A block under its own plain label — a table, the document, the narration. */
function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[13px] leading-[18px] text-pi-body">{label}</h2>
      {children}
    </section>
  );
}

/* Hairline-bordered tables, ruled on every cell; a narrow panel scrolls them
   sideways inside their box. */
const BOX = "overflow-x-auto rounded-lg border border-pi-line";
const TABLE =
  "w-full border-collapse text-left text-[14px] text-pi-ink [&_:is(th,td)]:border-pi-line [&_:is(th,td)+:is(th,td)]:border-l [&_tr:not(:last-child)>:is(th,td)]:border-b [&_thead_tr>th]:border-b";
const TH = "whitespace-nowrap px-4 py-2.5 font-normal text-pi-body";
const TD = "px-4 py-2.5 align-top font-normal";
const NUM = "fig whitespace-nowrap text-right";
const TOTAL_ROW =
  "bg-pi-head-bg [&>*]:border-t [&>*]:border-pi-line [&>*]:text-[15px] [&>*]:font-medium";

export function ApprovedDetails({
  item,
  company,
}: {
  item: Item;
  company: string;
}) {
  const [documentOpen, setDocumentOpen] = React.useState(false);
  const f = item.snapshot || item.form;
  // A header class or cost centre answers for every line; null when the lines
  // carry their own. Older drafts predate `costMode`, so infer it.
  const headerLock = headerCostLock({
    costMode: f.costMode ?? (f.costClass ? "class" : "centre"),
    costClass: f.costClass,
    costCentre: f.costCentre,
  });
  const journal = item.route === "JV";
  const ar = item.route === "AR" ? item.arSnapshot || item.arSheet : undefined;
  const subtotal = f.lines.reduce((sum, line) => sum + line.amount, 0);
  // A Godown column only when a line landed stock somewhere.
  const stocked =
    !journal && f.lines.some((l) => l.godown || l.godownAllocation?.length);
  const adjustments = Math.round((item.amount - subtotal) * 100) / 100;
  /*
    The tax block as it came off the document. Both sides of the invoice carry
    one — a bill's GST is input, a sales invoice's is output — and neither is
    recomputed here; these are the figures the extraction read.
  */
  const taxes = item.original?.bill?.taxes || item.original?.invoice?.taxes;
  const taxHeads = taxes
    ? (
        [
          ["CGST", taxes.cgst],
          ["SGST", taxes.sgst],
          ["IGST", taxes.igst],
        ] as const
      ).filter(([, amount]) => !!amount)
    : [];
  const taxTotal = taxHeads.reduce((sum, [, amount]) => sum + (amount || 0), 0);
  const taxSide = item.route === "AR" ? "Output" : "Input";
  /*
    Tally's bill-wise allocation. A purchase entered against a supplier invoice
    it has not seen before opens a new reference under that invoice's number,
    payable on the due date — one row, because one bill is what an inbox
    document is. Part-payments and settled references would come from the
    ledger, which this prototype does not carry.
  */
  const allocation =
    item.route === "AP" && f.invoiceNo
      ? {
          refType: "New Ref",
          refName: f.invoiceNo,
          due: f.due,
          amount: item.amount,
        }
      : undefined;
  const total = journal ? f.lines.reduce((s, l) => s + l.dr, 0) : item.amount;
  const narration = f.narration && f.narration !== "—" ? f.narration : "";
  // A header class or centre answers for every line, so the column goes.
  const lineCost = !headerLock;
  const lead = 2 + (lineCost ? 1 : 0) + (stocked ? 1 : 0);

  /*
    Mercury's record: the voucher number as the title with its status beside
    it, then every fact once in a two-column grid. The lines follow in
    bordered tables, the summary closes on the total, and the document and
    narration come last. No approver: without an audit trail behind it, the
    name would be a claim the record cannot back.
  */
  return (
    <article
      aria-label="Approved voucher details"
      className="flex min-w-0 flex-col gap-8 text-pi-ink"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="break-words text-[28px] font-normal leading-9 tracking-[-0.02em]">
          {f.voucherNo || f.party || f.voucherType}
        </h1>
        <StatusPill status="Approved" />
      </header>

      <dl
        aria-label="Voucher information"
        className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-pi-line pt-6"
      >
        <Field
          label={
            journal ? "Party" : item.route === "AR" ? "Customer" : "Vendor"
          }
        >
          {f.party || "—"}
        </Field>
        <Field label={journal ? "Total debit" : "Amount"}>
          <span className="fig">{money(total)}</span>
        </Field>
        <Field
          label={
            journal
              ? "Voucher date"
              : item.route === "AR"
                ? "Invoice date"
                : "Bill date"
          }
        >
          {date(f.date)}
        </Field>
        <Field label={journal ? "Reference date" : "Due date"}>
          {date(f.due)}
        </Field>
        <Field
          label={
            journal
              ? "Reference number"
              : item.route === "AR"
                ? "Invoice number"
                : "Supplier invoice"
          }
        >
          {f.invoiceNo || "—"}
        </Field>
        <Field label="Voucher type">{f.voucherType || "—"}</Field>
        <Field label="GST registration">{f.gst || "—"}</Field>
        {/* The header holds a class or one cost centre, never both, so it is
            one field named for whichever it holds. */}
        <Field
          label={
            headerLock && f.costMode === "class"
              ? "Cost centre class"
              : "Cost centre"
          }
          title={headerLock?.detail}
        >
          {headerLock ? (
            headerLock.label
          ) : (
            <span className="text-pi-faint">Set per line</span>
          )}
        </Field>
        {(f.partyCostCentre || f.partyCostAllocation?.length) && (
          <Field
            label={
              item.route === "AR"
                ? "Customer cost centre"
                : "Vendor cost centre"
            }
            title={
              f.partyCostAllocation?.length
                ? allocationDetail(f.partyCostAllocation)
                : undefined
            }
          >
            {f.partyCostAllocation?.length
              ? allocationLabel(f.partyCostAllocation)
              : f.partyCostCentre}
          </Field>
        )}
        {/*
          Nothing has been paid against a voucher the moment it posts, so the
          outstanding balance is the whole of it. Part-payments live in the
          ledger, which this prototype does not read.
        */}
        {!journal && (
          <Field label="Outstanding amount">
            <span className="fig">{credit(item.amount)}</span>
          </Field>
        )}
      </dl>

      <Block label={journal ? "Journal entries" : "Line items"}>
        <div className={BOX}>
          <table className={TABLE}>
            <thead>
              <tr>
                {/* Description and ledger are two columns, as on the bills
                    screen — a line's own wording and the account it lands in
                    are different facts. */}
                <th className={TH}>Description</th>
                <th className={TH}>{journal ? "Ledger" : "Ledger name"}</th>
                {lineCost && <th className={TH}>Cost centre</th>}
                {stocked && <th className={TH}>Godown</th>}
                <th className={cn(TH, "text-right")}>
                  {journal ? "Debit" : "Amount"}
                </th>
                {journal && <th className={cn(TH, "text-right")}>Credit</th>}
              </tr>
            </thead>
            <tbody>
              {f.lines.map((line, index) => (
                <tr key={index}>
                  <td className={TD}>{line.description || "—"}</td>
                  <td className={TD}>{line.ledger || "—"}</td>
                  {lineCost && (
                    <td
                      className={TD}
                      title={
                        line.costAllocation?.length
                          ? allocationDetail(line.costAllocation)
                          : undefined
                      }
                    >
                      {line.costAllocation?.length
                        ? allocationLabel(line.costAllocation)
                        : line.costCentre || "—"}
                    </td>
                  )}
                  {stocked && (
                    <td
                      className={TD}
                      title={
                        line.godownAllocation?.length
                          ? godownDetail(line.godownAllocation)
                          : undefined
                      }
                    >
                      {line.godownAllocation?.length
                        ? `Split · ${line.godownAllocation.length} godowns`
                        : line.godown || "—"}
                    </td>
                  )}
                  <td className={cn(TD, NUM)}>
                    {money(journal ? line.dr : line.amount)}
                  </td>
                  {journal && <td className={cn(TD, NUM)}>{money(line.cr)}</td>}
                </tr>
              ))}
            </tbody>
            {journal && (
              <tfoot>
                <tr className={TOTAL_ROW}>
                  <th scope="row" colSpan={lead} className={TD}>
                    Total
                  </th>
                  <td className={cn(TD, NUM)}>
                    {money(f.lines.reduce((s, l) => s + l.dr, 0))}
                  </td>
                  <td className={cn(TD, NUM)}>
                    {money(f.lines.reduce((s, l) => s + l.cr, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {ar && (
          <details className="rounded-lg border border-pi-line px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-medium text-pi-brand">
              Item and tax breakdown
              {ar.salesLedger && (
                <span className="font-normal text-pi-body">
                  {" "}
                  · Sales ledger {ar.salesLedger}
                </span>
              )}
            </summary>
            <div className="mt-4 space-y-4">
              {ar.items
                .filter((row) => row.amount || row.description || row.item)
                .map((row) => (
                  <div
                    key={row.id}
                    className="rounded-md border border-pi-line bg-pi-head-bg p-4"
                  >
                    <p className="text-[13px] font-medium text-pi-ink">
                      {row.item || row.description || "Item"}
                    </p>
                    {row.item && row.description && (
                      <p className="mt-1 text-[12px] text-pi-body">
                        {row.description}
                      </p>
                    )}
                    <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <Detail label="Quantity" value={String(row.quantity)} />
                      <Detail label="Unit rate" value={money(row.unitRate)} />
                      <Detail label="Discount" value={`${row.discount}%`} />
                      <Detail label="Tax" value={row.tax} />
                      <Detail label="Godown" value={row.godown} />
                      {!headerLock && (
                        <Detail label="Cost centre" value={row.costCentre} />
                      )}
                    </dl>
                  </div>
                ))}
              {ar.ledgers
                .filter((row) => row.amount || row.ledger)
                .map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap justify-between gap-2 text-[12px] text-pi-body"
                  >
                    <span>
                      {row.ledger || "Ledger"} · {row.description || "—"} ·{" "}
                      {row.tax || "No tax"}
                      {!headerLock &&
                        ` · ${row.costCentre || "No cost centre"}`}
                    </span>
                    <span className="fig text-pi-ink">{money(row.amount)}</span>
                  </div>
                ))}
              {ar.taxes
                .filter((row) => row.amount || row.ledger)
                .map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap justify-between gap-2 text-[12px] text-pi-body"
                  >
                    {/* a tax ledger takes no cost centre, so none is shown */}
                    <span>{row.ledger || "Tax"}</span>
                    <span className="fig text-pi-ink">{money(row.amount)}</span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </Block>

      {/*
        Read top down: what the lines add to, the tax that goes on, and the
        total. GST is stated head by head, as the bills screen states it.
      */}
      {!journal && (
        <Block label="Summary">
          <div className={BOX}>
            <table className={TABLE}>
              <tbody>
                {(adjustments !== 0 || taxHeads.length > 0) && (
                  <tr>
                    <th scope="row" className={TD}>
                      Sub total
                    </th>
                    <td className={cn(TD, NUM)}>{money(subtotal)}</td>
                  </tr>
                )}
                {taxHeads.length > 0 ? (
                  <>
                    <tr>
                      <th scope="row" className={cn(TD, "font-medium")}>
                        GST
                      </th>
                      <td className={cn(TD, NUM)}>{money(taxTotal)}</td>
                    </tr>
                    {taxHeads.map(([head, amount]) => (
                      <tr key={head}>
                        <th scope="row" className={cn(TD, "pl-8 text-pi-body")}>
                          {taxSide} {head}
                        </th>
                        <td className={cn(TD, NUM, "text-pi-body")}>
                          {money(amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  adjustments !== 0 && (
                    <tr>
                      <th scope="row" className={TD}>
                        Taxes &amp; adjustments
                      </th>
                      <td className={cn(TD, NUM)}>{money(adjustments)}</td>
                    </tr>
                  )
                )}
                <tr className={TOTAL_ROW}>
                  <th scope="row" className={TD}>
                    Total
                  </th>
                  <td className={cn(TD, NUM)}>{money(item.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {allocation && (
        <Block label="Bill allocation">
          <div className={BOX}>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Ref type</th>
                  <th className={TH}>Ref name</th>
                  <th className={TH}>Due date</th>
                  <th className={cn(TH, "text-right")}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>{allocation.refType}</td>
                  <td className={cn(TD, "code")}>{allocation.refName}</td>
                  <td className={TD}>{date(allocation.due)}</td>
                  <td className={cn(TD, NUM)}>{credit(allocation.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Block>
      )}

      <Block label="Attachment">
        {item.file?.name ? (
          <button
            type="button"
            onClick={() => setDocumentOpen(true)}
            className="grid min-h-[44px] w-full grid-cols-[16px_minmax(0,1fr)_16px] items-center gap-3 rounded-lg border border-pi-line px-4 py-2.5 text-left text-[14px] text-pi-ink transition-colors duration-150 hover:bg-pi-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <FileText className="h-4 w-4 text-pi-body" aria-hidden />
            <span className="truncate">{item.file.name}</span>
            <Eye className="h-4 w-4 text-pi-body" aria-hidden />
            <span className="sr-only">Preview</span>
          </button>
        ) : (
          <p className="text-[14px] text-pi-faint">No document attached</p>
        )}
      </Block>

      {narration && (
        <Block label="Narration">
          <p className="whitespace-pre-wrap break-words text-[14px] leading-6">
            {narration}
          </p>
        </Block>
      )}

      <PageDialog
        title={item.route === "AR" ? "Invoice document" : "Bill document"}
        description={item.file?.name}
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        className="w-[calc(100%-32px)] max-w-[900px]"
      >
        <div className="h-[65vh] min-h-0">
          <Preview item={item} />
        </div>
      </PageDialog>
    </article>
  );
}
