import React, { useEffect, useState } from "react";
import { Building2 } from "@/components/icons";
import { createPortal } from "react-dom";
import type { Gstr2bVendorViewTableData } from "@/types/pages/inbox/gst";
import { EmptyBlock, Pager } from "@/components/inbox/v2/banking/table-parts";
import { T } from "@/components/inbox/v2/ui";
import { cn } from "@/lib/utils";
import { TableCard } from "@/components/inbox/v2/banking/page-parts";
import LedgerTable, { type LedgerGroup } from "./breakdown-table";
import { Count, Rupees, StatusMix } from "./table-parts";

/**
 * Vendor View — production's vendor-view: one row per supplier GSTIN with
 * both sides' counts and values and the Status Breakdown, paged.
 *
 * PROTOTYPE: a vendor row opens Invoice View filtered to that GSTIN.
 */

type Breakdown = {
  gstr2bCount: number;
  prCount: number;
  gstr2bTaxableValue: number;
  prTaxableValue: number;
  gstr2bTaxValue: number;
  prTaxValue: number;
  diffTaxValue: number;
  matchStatusMatched: number;
  matchStatusAiProbableMatch: number;
  matchStatusMissing: number;
};

/**
 * The ledger's columns for a month or a vendor: 2B beside PR for invoices,
 * taxable value and tax, the tax gap, and the status mix as one small bar.
 * Whole rupees; the invoice lines carry the paise.
 */
export const breakdownGroups = <R extends Breakdown>(
  sortable: boolean
): LedgerGroup<R>[] => {
  const by = (f: (r: R) => number) => (sortable ? f : undefined);
  return [
    {
      label: "Invoices",
      cols: [
        {
          id: "c2b",
          label: "2B",
          render: (r) => <Count value={r.gstr2bCount} />,
          sortValue: by((r) => r.gstr2bCount),
        },
        {
          id: "cpr",
          label: "PR",
          render: (r) => <Count value={r.prCount} />,
          sortValue: by((r) => r.prCount),
        },
      ],
    },
    {
      label: "Taxable value",
      cols: [
        {
          id: "t2b",
          label: "2B",
          render: (r) => <Rupees value={r.gstr2bTaxableValue} />,
          sortValue: by((r) => r.gstr2bTaxableValue),
        },
        {
          id: "tpr",
          label: "PR",
          render: (r) => <Rupees value={r.prTaxableValue} />,
          sortValue: by((r) => r.prTaxableValue),
        },
      ],
    },
    {
      label: "Tax",
      cols: [
        {
          id: "x2b",
          label: "2B",
          render: (r) => <Rupees value={r.gstr2bTaxValue} />,
          sortValue: by((r) => r.gstr2bTaxValue),
        },
        {
          id: "xpr",
          label: "PR",
          render: (r) => <Rupees value={r.prTaxValue} />,
          sortValue: by((r) => r.prTaxValue),
        },
      ],
    },
    {
      cols: [
        {
          id: "gap",
          label: "Tax gap",
          width: 132,
          render: (r) => <Rupees value={r.diffTaxValue} signed />,
        },
      ],
    },
    {
      cols: [
        {
          id: "mix",
          label: "Matched",
          width: 196,
          render: (r) => (
            <StatusMix
              matched={r.matchStatusMatched}
              probable={r.matchStatusAiProbableMatch}
              missing={r.matchStatusMissing}
            />
          ),
        },
      ],
    },
  ];
};

const GROUPS = breakdownGroups<Gstr2bVendorViewTableData>(true);

type Props = {
  rows: Gstr2bVendorViewTableData[];
  searching: boolean;
  onOpenVendor: (gstin: string) => void;
  /** Below the page scroller (gst/index.tsx): the pager is portalled there. */
  pagerSlot: HTMLElement | null;
};

const VendorView = ({ rows, searching, onOpenVendor, pagerSlot }: Props) => {
  const [page, setPage] = useState(0);
  // 25, as every other table in the app opens.
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => setPage(0), [rows.length]);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <>
      <TableCard>
        <div className="min-w-0 flex-1">
          <LedgerTable
            lead={{ label: "Vendor", width: 264 }}
            groups={GROUPS}
            rows={pageRows}
            rowKey={(r) => r.gstin}
            tall
            renderLead={(r) => (
              <span className="flex min-w-0 max-w-[216px] flex-col">
                <span
                  className="truncate font-medium text-pi-ink"
                  title={r.vendorName}
                >
                  {r.vendorName}
                </span>
                <span className={cn(T.sub, "code truncate")}>{r.gstin}</span>
              </span>
            )}
            onRowClick={(r) => onOpenVendor(r.gstin)}
            rowTitle="Open this vendor's invoices"
            minWidth={1100}
          />
          {!rows.length && (
            <EmptyBlock
              {...(searching
                ? {
                    title: "No vendors match your search",
                    body: "Try a vendor name or GSTIN.",
                    filters: [],
                  }
                : {
                    icon: Building2,
                    title: "No vendors in this period",
                    body: "Vendors appear here once the purchase register or GSTR-2B has invoices for the period.",
                  })}
            />
          )}
        </div>
      </TableCard>
      {pagerSlot &&
        createPortal(
          <Pager
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />,
          pagerSlot
        )}
    </>
  );
};

export default VendorView;
