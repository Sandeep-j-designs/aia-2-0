import React, { useMemo } from "react";
import type { Gstr2bSummaryViewTableData } from "@/types/pages/inbox/gst";
import { MATCHED_TYPES } from "@/config/pages/inbox/gst";
import { TableCard } from "@/components/inbox/v2/banking/page-parts";
import LedgerTable, { type LedgerGroup } from "./breakdown-table";
import { Count, MatchStatusPill, Rupees, STATUS_ORDER } from "./table-parts";

/**
 * Summary View as a reconciliation ledger (13 Oct 2026): the statuses in two
 * sections — Matched, and Needs attention — each with its subtotal, then the
 * Total. GSTR-2B sits beside the Purchase Register in each group, and one
 * Tax gap column replaces the three Difference columns, which were mostly
 * dashes. Whole rupees: this view compares totals; paise stay on Invoices.
 *
 * PROTOTYPE: a status row opens Invoice View filtered to that status.
 * Production's rows are not clickable.
 */

type Row = Gstr2bSummaryViewTableData;

const MISSING_IN_2B = "missing_in_2b";

const GROUPS: LedgerGroup<Row>[] = [
  {
    label: "Invoices",
    cols: [
      {
        id: "c2b",
        label: "2B",
        render: (r) => <Count value={r.gstr2bCount} />,
      },
      { id: "cpr", label: "PR", render: (r) => <Count value={r.prCount} /> },
    ],
  },
  {
    label: "Taxable value",
    cols: [
      {
        id: "t2b",
        label: "2B",
        render: (r) => <Rupees value={r.gstr2bTaxableValue} />,
      },
      {
        id: "tpr",
        label: "PR",
        render: (r) => <Rupees value={r.prTaxableValue} />,
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
      },
      {
        id: "xpr",
        label: "PR",
        render: (r) => <Rupees value={r.prTaxValue} />,
      },
    ],
  },
  {
    cols: [
      {
        id: "gap",
        label: "Tax gap",
        width: 148,
        // the one red figure: tax on purchases the vendor never filed
        render: (r) => (
          <Rupees
            value={r.differenceTaxValue}
            signed
            className={
              r.matchStatus === MISSING_IN_2B ? "text-pi-danger" : undefined
            }
          />
        ),
      },
    ],
  },
];

const FIGURES: (keyof Omit<Row, "matchStatus">)[] = [
  "gstr2bCount",
  "gstr2bTaxableValue",
  "gstr2bTaxValue",
  "prCount",
  "prTaxableValue",
  "prTaxValue",
  "differenceCount",
  "differenceTaxableValue",
  "differenceTaxValue",
];

const subtotal = (label: string, rows: Row[]): Row =>
  Object.fromEntries([
    ["matchStatus", label],
    ...FIGURES.map((f) => [f, rows.reduce((n, r) => n + r[f], 0)]),
  ]) as Row;

type Props = {
  rows: Row[];
  onOpenStatus: (matchStatus: string) => void;
};

const SummaryView = ({ rows, onOpenStatus }: Props) => {
  const total = rows.find((r) => r.matchStatus === "total");
  const sections = useMemo(() => {
    const ordered = STATUS_ORDER.map((s) =>
      rows.find((r) => r.matchStatus === s)
    ).filter((r): r is Row => !!r);
    const matched = ordered.filter((r) =>
      (MATCHED_TYPES as string[]).includes(r.matchStatus)
    );
    const open = ordered.filter(
      (r) => !(MATCHED_TYPES as string[]).includes(r.matchStatus)
    );
    return [
      {
        label: "Matched",
        subtotal: subtotal("matched", matched),
        rows: matched,
      },
      {
        label: "Needs attention",
        subtotal: subtotal("open", open),
        rows: open,
      },
    ];
  }, [rows]);

  return (
    <TableCard>
      <div className="min-w-0 flex-1">
        <LedgerTable
          lead={{ label: "Status", width: 232 }}
          groups={GROUPS}
          sections={sections}
          rowKey={(r) => r.matchStatus}
          renderLead={(r) => <MatchStatusPill matchType={r.matchStatus} />}
          total={total}
          onRowClick={(r) => onOpenStatus(r.matchStatus)}
          rowTitle="Open these invoices"
          minWidth={1040}
        />
      </div>
    </TableCard>
  );
};

export default SummaryView;
