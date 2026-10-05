import React from "react";
import { Check, Copy, FileText, Lock, ShieldCheck } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Item, routeNames } from "./store";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value
  );
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
}: {
  tone: "success" | "warning";
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  label: string;
}) {
  const success = tone === "success";
  const Icon = success ? Check : Copy;
  return (
    <section
      aria-label={title}
      /*
        The banner is the first thing under the header bar, and the bar has a
        border of its own — without the top margin the card's own border landed
        on it and the two read as one collided edge.
      */
      className="mx-5 my-3 flex shrink-0 flex-wrap items-center gap-4 rounded-lg border border-pi-line bg-pi-surface-panel px-5 py-4 shadow-contact"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          success
            ? "bg-pi-success-bg text-pi-success"
            : "bg-pi-warning-bg text-pi-warning"
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-80">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-[14px] font-medium tracking-[-0.01em] text-pi-ink">
            {title}
          </h2>
          {/* A dot-chip: the meaning lives in the 7px dot, the label stays
              body ink, and the lock says the state is held. */}
          <span className="inline-flex items-center gap-2 rounded-full bg-pi-fill px-2 py-0.5 text-[12px] leading-4 text-pi-body">
            <span
              aria-hidden
              className={cn(
                "size-[7px] flex-none rounded-full",
                success ? "bg-pi-success-dot" : "bg-pi-warning-dot"
              )}
            />
            {label}
            <Lock className="size-3 text-pi-faint" aria-hidden />
          </span>
        </div>
        <div className="mt-1 text-[12px] leading-5 text-pi-body">
          {children}
        </div>
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

/**
 * A field row, as the cockpit's voucher card draws one: label at 12px, a
 * status dot, the value at 13px. A posted record's values are settled, so a
 * filled field takes the success dot and an empty one a hollow ring.
 */
function FieldRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-h-[44px] items-center gap-3 border-b border-pi-line px-4 py-3 last:border-b-0">
      <dt className="w-[34%] min-w-[120px] max-w-[200px] shrink-0 text-[12px] text-pi-body">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center gap-3 text-[13px] text-pi-ink">
        <span
          aria-hidden
          className={cn(
            "size-1.5 flex-none rounded-full",
            value ? "bg-pi-success-dot" : "border border-pi-line-strong"
          )}
        />
        <span className="min-w-0 break-words">{value || "—"}</span>
      </dd>
    </div>
  );
}

/** Overline above a section card, as the cockpit's "VOUCHER". */
function SectionTitle({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="type-overline">{children}</h2>
      {meta ? <span className="text-[12px] text-pi-faint">{meta}</span> : null}
    </div>
  );
}

const CARD =
  "overflow-hidden rounded-lg border border-pi-line bg-pi-surface-panel shadow-contact";
const TABLE_CARD =
  "overflow-hidden rounded-lg border border-pi-line bg-pi-surface-panel shadow-table";
const THEAD =
  "border-b border-pi-line bg-pi-head-bg text-[12px] text-pi-body";

export function ApprovedDetails({
  item,
  company,
}: {
  item: Item;
  company: string;
}) {
  const f = item.snapshot || item.form;
  const journal = item.route === "JV";
  const ar = item.route === "AR" ? item.arSnapshot || item.arSheet : undefined;
  const subtotal = f.lines.reduce((sum, line) => sum + line.amount, 0);
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
  return (
    <article
      aria-label="Approved voucher details"
      className="min-w-0 space-y-6"
    >
      {/* Identity and money block, on the page, as the cockpit heads its
          editor: eyebrow, 22px party, the voucher ID in mono, then the figure. */}
      <header>
        <div className="flex items-center gap-2">
          <span className="workspace-eyebrow !mb-0 inline-flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Posted · {routeNames[item.route]}
          </span>
          <span className="ml-auto rounded-xs bg-pi-brand-tint px-2 py-0.5 text-[12px] font-medium text-pi-brand">
            {f.voucherType}
          </span>
        </div>
        <h1 className="mt-2 text-[22px] font-medium leading-tight tracking-[-0.02em] text-pi-ink">
          {f.party || f.voucherType}
        </h1>
        <p className="mt-1 text-[12px] text-pi-faint">
          Voucher <span className="code text-pi-body">{f.voucherNo}</span> ·{" "}
          {company}
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="fig text-[28px] font-medium leading-none tracking-[-0.02em] text-pi-ink">
            {money(total)}
          </span>
          <span className="type-overline">
            {journal ? "Total debit" : "Voucher total"} · INR · in books
          </span>
        </div>
      </header>

      <section>
        <SectionTitle>Voucher</SectionTitle>
        <dl className={CARD}>
          <FieldRow
            label={
              journal
                ? "Voucher date"
                : item.route === "AR"
                  ? "Invoice date"
                  : "Bill date"
            }
            value={date(f.date)}
          />
          <FieldRow
            label={
              journal
                ? "Reference number"
                : item.route === "AR"
                  ? "Invoice number"
                  : "Supplier invoice"
            }
            value={f.invoiceNo}
          />
          <FieldRow
            label={journal ? "Reference date" : "Due date"}
            value={date(f.due)}
          />
          <FieldRow label="GST registration" value={f.gst} />
          <FieldRow label="Cost centre" value={f.costCentre} />
          <FieldRow label="Cost centre class" value={f.costClass} />
          {/* The document this voucher was read off, named the way the bills
              screen names it. */}
          <FieldRow label="Bill document" value={item.file?.name} />
          {/*
            Nothing has been paid against a voucher the moment it posts, so the
            outstanding balance is the whole of it. Part-payments live in the
            ledger, which this prototype does not read.
          */}
          {!journal && (
            <FieldRow label="Outstanding amount" value={credit(item.amount)} />
          )}
        </dl>
      </section>

      <section>
        <SectionTitle
          meta={`${f.lines.length} ${f.lines.length === 1 ? "entry" : "entries"} posted`}
        >
          {journal ? "Journal entries" : "Line items"}
        </SectionTitle>
        <div className={TABLE_CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] text-pi-ink">
              <thead className={THEAD}>
                <tr>
                  {/* Description and ledger are two columns, as on the bills
                      screen — a line's own wording and the account it lands in
                      are different facts, and stacking them read as one. */}
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">
                    {journal ? "Ledger" : "Ledger name"}
                  </th>
                  <th className="px-4 py-3 font-medium">Cost centre</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {journal ? "Debit" : "Amount"}
                  </th>
                  {journal && (
                    <th className="px-4 py-3 text-right font-medium">Credit</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-pi-line">
                {f.lines.map((line, index) => (
                  <tr key={index} className="hover:bg-pi-row-hover">
                    <td className="px-4 py-4">{line.description || "—"}</td>
                    <td className="px-4 py-4 font-medium">
                      {line.ledger || "—"}
                    </td>
                    <td className="px-4 py-4 text-[12px] text-pi-body">
                      {line.costCentre || "—"}
                    </td>
                    <td className="fig whitespace-nowrap px-4 py-4 text-right">
                      {money(journal ? line.dr : line.amount)}
                    </td>
                    {journal && (
                      <td className="fig whitespace-nowrap px-4 py-4 text-right">
                        {money(line.cr)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-pi-line bg-pi-head-bg">
                {!journal && (adjustments !== 0 || taxHeads.length > 0) && (
                  <>
                    <tr>
                      <th
                        colSpan={3}
                        className="px-4 pt-4 text-[12px] font-normal text-pi-body"
                      >
                        Sub total
                      </th>
                      <td className="fig px-4 pt-4 text-right text-[13px]">
                        {money(subtotal)}
                      </td>
                    </tr>
                    {/*
                      GST by head, as the bills screen states it. It used to be a
                      single "Taxes & adjustments" figure, which is the one line
                      of a bill an accountant checks head by head.
                    */}
                    {taxHeads.length > 0 ? (
                      <>
                        <tr>
                          <th
                            colSpan={3}
                            className="px-4 pt-3 text-[12px] font-medium text-pi-ink"
                          >
                            GST
                          </th>
                          <td className="fig px-4 pt-3 text-right text-[13px] font-medium">
                            {money(taxTotal)}
                          </td>
                        </tr>
                        {taxHeads.map(([head, amount]) => (
                          <tr key={head}>
                            <th
                              colSpan={3}
                              className="px-4 pl-8 pt-2 text-left text-[12px] font-normal text-pi-body"
                            >
                              {taxSide} {head}
                            </th>
                            <td className="fig px-4 pt-2 text-right text-[12px] text-pi-body">
                              {money(amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <th
                          colSpan={3}
                          className="px-4 pt-3 text-[12px] font-normal text-pi-body"
                        >
                          Taxes &amp; adjustments
                        </th>
                        <td className="fig px-4 pt-3 text-right text-[13px]">
                          {money(adjustments)}
                        </td>
                      </tr>
                    )}
                    {/* the rule the grand total sits under */}
                    <tr aria-hidden>
                      <td colSpan={4} className="px-4 pt-4">
                        <div className="h-px bg-pi-rule-ledger" />
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <th
                    colSpan={3}
                    className="px-4 py-4 text-[13px] font-medium text-pi-ink"
                  >
                    {journal ? "Total" : "Grand total"}
                  </th>
                  <td className="fig whitespace-nowrap px-4 py-4 text-right text-[16px] font-medium">
                    {money(
                      journal
                        ? f.lines.reduce((s, l) => s + l.dr, 0)
                        : item.amount
                    )}
                  </td>
                  {journal && (
                    <td className="fig whitespace-nowrap px-4 py-4 text-right text-[16px] font-medium">
                      {money(f.lines.reduce((s, l) => s + l.cr, 0))}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
          {ar && (
            <div className="border-t border-pi-line px-4 py-4 text-[12px] text-pi-body">
              Sales ledger:{" "}
              <span className="text-pi-ink">{ar.salesLedger || "—"}</span>
            </div>
          )}
          {ar && (
            <details className="border-t border-pi-line px-4 py-4">
              <summary className="cursor-pointer text-[12px] font-medium text-pi-brand">
                Item and tax breakdown
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
                        <Detail label="Cost centre" value={row.costCentre} />
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
                        {row.tax || "No tax"} ·{" "}
                        {row.costCentre || "No cost centre"}
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
                      <span>
                        {row.ledger || "Tax"} ·{" "}
                        {row.costCentre || "No cost centre"}
                      </span>
                      <span className="fig text-pi-ink">{money(row.amount)}</span>
                    </div>
                  ))}
              </div>
            </details>
          )}
          {f.narration && f.narration !== "—" && (
            <div className="border-t border-pi-line px-4 py-4">
              <h3 className="type-overline">Narration</h3>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5 text-pi-ink">
                {f.narration}
              </p>
            </div>
          )}
        </div>
      </section>
      {allocation && (
        <section>
          <SectionTitle>Bill allocation</SectionTitle>
          <div className={TABLE_CARD}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] text-pi-ink">
                <thead className={THEAD}>
                  <tr>
                    <th className="px-4 py-3 font-medium">Ref type</th>
                    <th className="px-4 py-3 font-medium">Ref name</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-4">{allocation.refType}</td>
                    <td className="code px-4 py-4">{allocation.refName}</td>
                    <td className="px-4 py-4">{date(allocation.due)}</td>
                    <td className="fig whitespace-nowrap px-4 py-4 text-right">
                      {credit(allocation.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
      <div className="flex items-start gap-3 px-1 pb-4 text-[12px] leading-5 text-pi-body">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-pi-success"
          aria-hidden
        />
        <p>
          Approved by{" "}
          <span className="font-medium text-pi-ink">
            {item.doneBy || "Unknown approver"}
          </span>
          {item.doneAt && (
            <>
              {" "}
              on {date(item.doneAt)} at{" "}
              {new Date(item.doneAt).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </>
          )}
          .<br />
          This is the posted record. To change it, use Edit entry.
        </p>
      </div>
    </article>
  );
}
