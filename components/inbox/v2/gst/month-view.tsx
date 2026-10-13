import React from "react";
import { CalendarDays } from "@/components/icons";
import type { Gstr2bMonthViewTableData } from "@/types/pages/inbox/gst";
import { EmptyBlock } from "@/components/inbox/v2/banking/table-parts";
import { TableCard } from "@/components/inbox/v2/banking/page-parts";
import LedgerTable from "./breakdown-table";
import { breakdownGroups } from "./vendor-view";

/**
 * Month View — each GSTR-2B month on the reconciliation ledger: invoices,
 * taxable value and tax with 2B beside PR, the tax gap, and how the month's
 * invoices settled. The Total only appears once there is more than one
 * month to add up.
 */

type Props = {
  rows: Gstr2bMonthViewTableData[];
};

const MonthView = ({ rows }: Props) => {
  const months = rows.filter((r) => r.month !== "total");
  const total = rows.find((r) => r.month === "total");
  return (
    <TableCard>
      <div className="min-w-0 flex-1">
        <LedgerTable
          lead={{ label: "Month", width: 168 }}
          groups={breakdownGroups<Gstr2bMonthViewTableData>(false)}
          rows={months}
          rowKey={(r) => r.month}
          renderLead={(r) => (
            <span className="font-medium text-pi-ink">{r.month}</span>
          )}
          total={months.length > 1 ? total : undefined}
          minWidth={0}
        />
        {!months.length && (
          <EmptyBlock
            icon={CalendarDays}
            title="No months in this period"
            body="Pick a wider GSTR period to compare month by month."
          />
        )}
      </div>
    </TableCard>
  );
};

export default MonthView;
