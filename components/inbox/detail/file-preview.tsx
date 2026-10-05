import React from "react";
import { Expand, FileText, Lock, ZoomIn, ZoomOut } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { InboxItem } from "@/types/pages/inbox";
import { printedSupplier } from "@/config/pages/inbox/ap-document";

/**
 * The left pane of the detail shell — a facsimile of the source document.
 * Ported from FilePreview in js/file-preview.jsx.
 *
 * DEV: **replace this whole component.** It draws a mock of the document so the
 *      prototype has something to review against. Production already has the
 *      real thing — `components/common/pdf-document-viewer-page.tsx`, built on
 *      `@react-pdf-viewer/*` — pointed at the stored file. Nothing below this
 *      line survives the transplant except the two-pane layout that hosts it.
 *
 * The greys here are *paper*, not app chrome: this is simulating a printed
 * invoice, so it deliberately does not look like the surrounding UI. They still
 * come from production's neutral tokens rather than raw hex, so the prototype
 * keeps its no-hex property.
 */

type Props = {
  item: InboxItem;
};

const PreviewFrame = ({
  label,
  children,
  showZoom = true,
}: {
  label: string;
  children: React.ReactNode;
  showZoom?: boolean;
}) => (
  <div className="flex h-full min-h-0 flex-col bg-section">
    <div className="flex flex-none items-center gap-1 border-b border-neutral-gray px-3 py-1.5">
      <span className="mr-auto truncate text-xs text-secondary-foreground">
        {label}
      </span>
      {showZoom ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Fullscreen"
          >
            <Expand className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : null}
    </div>

    <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
  </div>
);

/** The sheet of paper the document is drawn on. */
const Paper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`mx-auto w-[min(720px,96%)] rounded border border-neutral-gray bg-background p-8 shadow-sm ${className ?? ""}`}
  >
    {children}
  </div>
);

/**
 * Always two decimals. A printed tax invoice never renders ₹5,817.6 — and the
 * bare toLocaleString this was ported from dropped the trailing zero, which is
 * the same defect the conversion panel had.
 */
const money = (value: number) =>
  value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const FilePreview = ({ item }: Props) => {
  /* --------------------------------------------------------- spreadsheet */

  if (item.file.ext === "xlsx") {
    const headers = item.ar?.headers ?? ["Col A", "Col B", "Col C", "Col D"];

    return (
      <PreviewFrame
        label={`${item.file.name} · ${item.ar?.sheetName ?? "Sheet 1"}`}
      >
        <div className="mx-auto w-[min(720px,96%)] overflow-auto rounded border border-neutral-gray bg-background">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-neutral-gray bg-section">
                <th className="w-8 px-2 py-1.5 text-center text-[10px] font-medium text-secondary-foreground">
                  #
                </th>
                {headers.slice(0, 8).map((header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-medium text-secondary-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(item.ar?.rows ?? []).slice(0, 20).map((row, index) => (
                <tr
                  key={row.invoiceNo}
                  className="border-b border-panel-border"
                >
                  <td className="px-2 py-1 text-center text-[10px] text-secondary-foreground">
                    {index + 2}
                  </td>
                  <td className="px-2 py-1">{row.invoiceNo}</td>
                  <td className="px-2 py-1">{row.customer}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {money(row.amount)}
                  </td>
                  <td className="px-2 py-1">{row.voucherType}</td>
                  <td className="px-2 py-1">{row.gstin}</td>
                  <td className="px-2 py-1">{row.state}</td>
                  <td className="px-2 py-1">{row.ledger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PreviewFrame>
    );
  }

  /* ------------------------------------------------------ bank statement */

  if (item.route === "Banking" && item.banking) {
    const { banking } = item;

    return (
      <PreviewFrame label={item.file.name}>
        <Paper>
          <div className="mb-6 text-center">
            <div className="text-xl font-bold">HDFC BANK</div>
            <div className="text-[11px] text-secondary-foreground">
              Account Statement
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <strong>Account Holder</strong>
              <br />
              SHAKUNTHALAM OIL &amp; REFINERIES PVT LTD
            </div>
            <div>
              <strong>Account No.</strong>
              <br />
              50100123456 (Current)
            </div>
            <div>
              <strong>Statement Period</strong>
              <br />
              {banking.dateRange}
            </div>
            <div>
              <strong>Branch</strong>
              <br />
              Bangalore — Indiranagar
            </div>
          </div>

          <hr className="border-neutral-gray" />

          <div className="mt-3 text-[11px]">
            <div className="grid grid-cols-[70px_1fr_70px_70px_70px] gap-1.5 border-b border-neutral-gray pb-1 font-bold">
              <span>Date</span>
              <span>Narration</span>
              <span className="text-right">Dr</span>
              <span className="text-right">Cr</span>
              <span className="text-right">Balance</span>
            </div>
            {banking.sample.map((txn) => (
              <div
                key={`${txn.date}-${txn.narration}`}
                className="grid grid-cols-[70px_1fr_70px_70px_70px] gap-1.5 border-b border-dotted border-panel-border py-1"
              >
                <span>{txn.date}</span>
                <span className="truncate">{txn.narration}</span>
                <span className="text-right text-destructive-foreground">
                  {txn.dr ? money(txn.dr) : ""}
                </span>
                <span className="text-right text-success-green-foreground">
                  {txn.cr ? money(txn.cr) : ""}
                </span>
                <span className="text-right">—</span>
              </div>
            ))}
            <div className="py-1.5 italic text-secondary-foreground">
              … +{banking.txnCount - banking.sample.length} more transactions
            </div>
          </div>

          <hr className="my-4 border-neutral-gray" />

          <div className="flex justify-between text-[11px]">
            <span>
              <strong>Opening</strong> ₹ {money(banking.opening)}
            </span>
            <span>
              <strong>Closing</strong> ₹ {money(banking.closing)}
            </span>
          </div>
        </Paper>
      </PreviewFrame>
    );
  }

  /* ----------------------------------------------------------- failures */

  if (item.status === "failed" && item.failure?.type === "scanned-pdf") {
    return (
      <PreviewFrame label={item.file.name} showZoom={false}>
        {/* A hatch, standing in for a page image with no extractable text. */}
        <div className="mx-auto flex w-[min(720px,96%)] items-center justify-center rounded border border-neutral-gray bg-[repeating-linear-gradient(45deg,hsl(var(--section))_0_6px,hsl(var(--muted))_6px_12px)] p-20">
          <div className="inline-block rounded-md border border-neutral-gray bg-background p-4 text-center">
            <FileText className="mx-auto h-9 w-9 text-secondary-foreground" />
            <div className="mt-2 text-sm font-semibold">
              Scanned image — text not extractable
            </div>
            <div className="mt-1 text-[11px] text-secondary-foreground">
              Preview shown as page-image only
            </div>
          </div>
        </div>
      </PreviewFrame>
    );
  }

  if (item.status === "failed" && item.failure?.type === "password-protected") {
    return (
      <PreviewFrame label={item.file.name} showZoom={false}>
        <Paper className="py-20 text-center">
          <Lock className="mx-auto h-12 w-12 text-secondary-foreground" />
          <div className="mt-3 text-sm font-semibold">
            This PDF is password-protected
          </div>
          <div className="mt-1.5 text-xs text-secondary-foreground">
            Provide the password and we&apos;ll retry extraction.
          </div>
        </Paper>
      </PreviewFrame>
    );
  }

  /* ------------------------------------------------------------ bill PDF */

  if (item.bill) {
    const bill = item.bill;

    return (
      <PreviewFrame label={`${item.file.name} · Page 1 of 1`}>
        <Paper>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold">{item.vendor}</div>
              {/* Same header the AP sheet is handed — see `printedSupplier`. A
                  GSTIN on the facsimile that the sheet never saw would be a
                  document the form cannot account for. */}
              <div className="text-[11px] text-secondary-foreground">
                GSTIN {printedSupplier(item).gstin} · CIN{" "}
                {printedSupplier(item).cin}
              </div>
              <div className="text-[11px] text-secondary-foreground">
                {printedSupplier(item).address}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold">TAX INVOICE</div>
              <div className="text-[11px] text-secondary-foreground">
                {bill.supplierInvoiceNo}
              </div>
              <div className="text-[11px] text-secondary-foreground">
                {bill.billDate}
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-md bg-accent px-3 py-2.5 text-[11px]">
            <strong>Bill to:</strong> Shakunthalam Oil &amp; Refineries Pvt Ltd
            <br />
            13, Mahatma Gandhi Road, Dollar Colony, Delhi 110001 ·{" "}
            {bill.gstReg.split("·")[1]?.trim()}
          </div>

          <table className="mb-4 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1.5 text-left">Description</th>
                <th className="w-24 py-1.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((line) => (
                <tr
                  key={line.desc}
                  className="border-b border-dotted border-panel-border"
                >
                  <td className="py-2">{line.desc}</td>
                  <td className="py-2 text-right tabular-nums">
                    {money(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end text-[11px]">
            <table className="w-60">
              <tbody>
                <tr>
                  <td>Sub-total</td>
                  <td className="text-right tabular-nums">
                    {money(bill.subTotal)}
                  </td>
                </tr>
                {bill.taxes.cgst != null ? (
                  <tr>
                    <td>CGST (9%)</td>
                    <td className="text-right tabular-nums">
                      {money(bill.taxes.cgst)}
                    </td>
                  </tr>
                ) : null}
                {bill.taxes.sgst != null ? (
                  <tr>
                    <td>SGST (9%)</td>
                    <td className="text-right tabular-nums">
                      {money(bill.taxes.sgst)}
                    </td>
                  </tr>
                ) : null}
                {bill.taxes.igst != null ? (
                  <tr>
                    <td>IGST (18%)</td>
                    <td className="text-right tabular-nums">
                      {money(bill.taxes.igst)}
                    </td>
                  </tr>
                ) : null}
                <tr className="border-t border-foreground font-bold">
                  <td className="pt-1.5">Total</td>
                  <td className="pt-1.5 text-right tabular-nums">
                    {money(bill.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 border-t border-panel-border pt-2 text-[10px] text-secondary-foreground">
            Subject to Bangalore jurisdiction. Payment due within 30 days. E.
            &amp; O.E.
          </div>
        </Paper>
      </PreviewFrame>
    );
  }

  /* -------------------------------------------------------------- JV memo */

  if (item.jv) {
    return (
      <PreviewFrame label={item.file.name} showZoom={false}>
        <Paper className="text-xs">
          <div className="mb-1.5 text-base font-bold">Adjustment Memo</div>
          <div className="mb-6 text-[11px] text-secondary-foreground">
            Internal note · {item.id}
          </div>
          <p className="leading-relaxed">{item.jv.narration}</p>

          <table className="mt-6 w-full border-collapse">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1 text-left">Ledger</th>
                <th className="py-1 text-right">Dr</th>
                <th className="py-1 text-right">Cr</th>
              </tr>
            </thead>
            <tbody>
              {item.jv.lines.map((line) => (
                <tr
                  key={line.ledger}
                  className="border-b border-dotted border-panel-border"
                >
                  <td className="py-1.5">{line.ledger}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {line.dr ? money(line.dr) : ""}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {line.cr ? money(line.cr) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Paper>
      </PreviewFrame>
    );
  }

  /* ------------------------------------------------------------ fallback */

  return (
    <PreviewFrame label={item.file.name} showZoom={false}>
      <Paper className="py-20 text-center">
        <FileText className="mx-auto h-12 w-12 text-secondary-foreground" />
        <div className="mt-3 text-sm">{item.file.name}</div>
      </Paper>
    </PreviewFrame>
  );
};

export default FilePreview;
