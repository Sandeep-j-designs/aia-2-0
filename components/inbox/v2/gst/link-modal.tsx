import React, { useEffect, useMemo, useState } from "react";
import { Link, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  HEADER_CLASS,
  TABLE_CLASS,
  EmptyBlock,
} from "@/components/inbox/v2/banking/table-parts";
import type { InvoiceViewData, InvoiceViewRow } from "@/types/pages/inbox/gst";
import { gstDate, rowId } from "@/utils/pages/inbox/gst";
import { AmountText, PageDialog, T } from "@/components/inbox/v2/ui";
import { HeadCell, Money } from "./table-parts";

/**
 * Link to an Existing Bill — production's link-gstr2b-modal and
 * link-pr-modal in one: the unmatched line on top, then the other side's
 * unmatched lines to pick from (the same vendor's first), and the running
 * difference at the foot.
 *
 * Production's 2B-line modal labels its footer backwards ("Selected 2B
 * Value" shows the picked PR lines). Here each label names its own side.
 */

type Props = {
  /** The unmatched row whose missing side is being linked. */
  base: InvoiceViewRow | null;
  /** Every row in the period, to find the other side's unmatched lines. */
  rows: InvoiceViewRow[];
  onClose: () => void;
  onLink: (base: InvoiceViewRow, picked: string[]) => void;
};

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <span className="flex items-center gap-2 whitespace-nowrap">
    <span className="text-[13px] text-pi-body">{label}</span>
    <span className="text-[13px] font-medium text-pi-ink">{children}</span>
  </span>
);

const Bar = () => (
  <span className="h-[18px] w-px flex-none bg-pi-line-2" aria-hidden />
);

const LinkModal = ({ base, rows, onClose, onLink }: Props) => {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked([]), [base]);

  // Base is a 2B line: link PR lines to it ("Linking for PR"), and back.
  const forPr = !!base?.gstr2b;
  const own = (base?.gstr2b ?? base?.pr) as InvoiceViewData | undefined;

  const candidates = useMemo(() => {
    if (!base || !own) return [];
    return rows
      .filter((r) => (forPr ? r.pr && !r.gstr2b : r.gstr2b && !r.pr))
      .map((r) => ({ id: rowId(r), d: (forPr ? r.pr : r.gstr2b)! }))
      .sort(
        (a, b) =>
          Number(b.d.gstin === own.gstin) - Number(a.d.gstin === own.gstin) ||
          a.d.vendorName.localeCompare(b.d.vendorName)
      );
  }, [base, rows]);

  const selectedValue = candidates
    .filter((c) => picked.includes(c.id))
    .reduce((n, c) => n + c.d.invoiceAmount, 0);
  const ownValue = own?.invoiceAmount ?? 0;
  const twoBValue = forPr ? ownValue : selectedValue;
  const prValue = forPr ? selectedValue : ownValue;

  const allPicked =
    !!candidates.length && candidates.every((c) => picked.includes(c.id));

  return (
    <PageDialog
      open={!!base}
      onClose={onClose}
      title="Link to an Existing Bill"
      description={forPr ? "Linking for PR" : "Linking for GSTR-2B"}
      className="max-w-[960px]"
    >
      {own && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pi-line bg-pi-page px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Detail label="Source:">
              <span className="text-pi-brand">{forPr ? "GSTR-2B" : "PR"}</span>
            </Detail>
            <Bar />
            <Detail label="Invoice:">{own.invoiceNo}</Detail>
            <Bar />
            <Detail label="Date:">{gstDate(own.invoiceDate)}</Detail>
            <Bar />
            <Detail label="Vendor:">{own.vendorName}</Detail>
          </div>
          <Detail label="Total Value:">
            <AmountText value={own.invoiceAmount} />
          </Detail>
        </div>
      )}

      <div className="mt-4 max-h-[46vh] overflow-auto overscroll-none rounded-lg border border-pi-line bg-background">
        <Table className={cn(TABLE_CLASS, "w-full")}>
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 170 }} />
            <col />
            <col style={{ width: 150 }} />
            <col style={{ width: 130 }} />
          </colgroup>
          <TableHeader className={HEADER_CLASS}>
            <TableRow className="hover:bg-transparent">
              <th className="h-11 border-b border-pi-line bg-pi-head-bg px-4 align-middle">
                <Checkbox
                  aria-label="Select every line"
                  checked={allPicked}
                  onCheckedChange={(checked) =>
                    setPicked(checked ? candidates.map((c) => c.id) : [])
                  }
                />
              </th>
              <HeadCell label="Invoice Date" />
              <HeadCell label="Invoice No" />
              <HeadCell label="Vendor Name" />
              <HeadCell label="Taxable Amount" align="right" />
              <HeadCell label="Total Tax" align="right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map(({ id, d }) => {
              const on = picked.includes(id);
              return (
                <TableRow
                  key={id}
                  onClick={() =>
                    setPicked((p) =>
                      on ? p.filter((x) => x !== id) : [...p, id]
                    )
                  }
                  className={cn(
                    "cursor-pointer hover:bg-pi-row-hover",
                    on && "bg-pi-brand-tint hover:bg-pi-brand-tint"
                  )}
                >
                  <TableCell
                    className={cn(
                      "h-14 px-4 py-0 align-middle",
                      on && "shadow-[inset_2px_0_0_var(--pi-brand)]"
                    )}
                  >
                    <Checkbox
                      checked={on}
                      aria-label={`Select ${d.invoiceNo}`}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() =>
                        setPicked((p) =>
                          on ? p.filter((x) => x !== id) : [...p, id]
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className={cn("px-4 py-0 tabular-nums", T.cell)}>
                    {gstDate(d.invoiceDate)}
                  </TableCell>
                  <TableCell className={cn("px-4 py-0", T.cell)}>
                    <span className="block truncate">{d.invoiceNo}</span>
                  </TableCell>
                  <TableCell className={cn("px-4 py-0", T.cell)}>
                    <span className="block truncate" title={d.vendorName}>
                      {d.vendorName}
                    </span>
                  </TableCell>
                  <TableCell className={cn("px-4 py-0", T.cell)}>
                    <Money value={d.taxableAmount} />
                  </TableCell>
                  <TableCell className={cn("px-4 py-0", T.cell)}>
                    <Money value={d.totalGst} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!candidates.length && (
          <EmptyBlock
            title="Nothing to link"
            body={
              forPr
                ? "Every Purchase Register line in this period is already matched."
                : "Every GSTR-2B line in this period is already matched."
            }
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-pi-line bg-pi-page px-4 py-3">
        <div className="flex items-center gap-5">
          {(
            [
              ["Selected 2B Value", twoBValue],
              ["Selected PR Value", prValue],
              ["Difference", ownValue - selectedValue],
            ] as const
          ).map(([label, value], i) => (
            <React.Fragment key={label}>
              {i ? <Bar /> : null}
              <span className="flex flex-col">
                <span className="text-[12px] text-pi-body">{label}</span>
                <span
                  className={cn(
                    "text-[14px] text-pi-ink [&_.fig]:[color:inherit]",
                    label === "Difference" &&
                      picked.length > 0 &&
                      Math.abs(value) >= 0.01 &&
                      "text-pi-danger"
                  )}
                >
                  <AmountText value={value} />
                </span>
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            <X aria-hidden />
            Cancel
          </Button>
          <Button
            disabled={!picked.length}
            onClick={() => base && onLink(base, picked)}
          >
            <Link aria-hidden />
            Link Bill
          </Button>
        </div>
      </div>
    </PageDialog>
  );
};

export default LinkModal;
