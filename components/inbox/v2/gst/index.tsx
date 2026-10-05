import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleCheck,
  Download,
  FileSpreadsheet,
  FolderSync,
  NeedsYou,
  Plus,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import {
  DEFAULT_PERIOD,
  GSTR2B_MATCH_TYPE,
  GST_RECON_TABS,
  MATCHED_TYPES,
} from "@/config/pages/inbox/gst";
import {
  hasDataFor,
  invoicesFor,
  useGstState,
} from "@/hooks/pages/inbox/use-gst";
import type {
  GstinOption,
  GstPeriod,
  InvoiceTableFilterState,
} from "@/types/pages/inbox/gst";
import {
  buildExportCsv,
  buildMonthView,
  buildSummaryView,
  buildVendorView,
  downloadText,
  filterInvoiceRows,
  isoDay,
  monthsIn,
} from "@/utils/pages/inbox/gst";
import { SearchBox } from "@/components/inbox/v2/banking/table-parts";
import { AmountText, T } from "@/components/inbox/v2/ui";
import {
  EmptyState,
  KpiCard,
  KpiRow,
  PageHead,
  TOOLBAR,
  TableCard,
} from "@/components/inbox/v2/banking/page-parts";
import InvoiceView from "./invoice-view";
import MonthView from "./month-view";
import PeriodPicker from "./period-picker";
import ReconciliationSheet from "./reconciliation-sheet";
import SummaryView from "./summary-view";
import { ResultTabs } from "./table-parts";
import VendorView from "./vendor-view";

export type GstTab = "summary" | "month" | "vendor" | "invoice";

export type GstView = {
  /** The results tab. Absent: Summary View. */
  tab?: GstTab;
};

type Props = {
  view: GstView;
  company: string;
  /** The active organisation's name — renames flow through. */
  companyName: string;
  /** Move between tabs. Every tab is a URL, so Back works. */
  onNavigate: (view: GstView) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  /** Real in the app, not built here. */
  onUnbuilt: (what: string) => void;
};

/**
 * GST reconciliation: GSTR-2B against the Purchase Register.
 *
 * Production: components/gst-reconciliation/gstr2b-reconciliations-gate/
 * gstr2b-reconciliations (the page, the sheet and the four result tabs). The
 * product-enrolment landing in front of it and the GSTIN add / edit / delete
 * modals are not built here.
 *
 * Mocks and timers stand in for the API — see hooks/pages/inbox/use-gst.ts,
 * where every seam names its endpoint.
 */
const GstReconciliation = ({
  view,
  company,
  companyName,
  onNavigate,
  notify,
  onUnbuilt,
}: Props) => {
  const state = useGstState(company);
  // DEV: GET /api/gst-reconciliation/gstin?companyId=…
  const gstinOptions: GstinOption[] = useMemo(
    () =>
      state.gstins.map((g) => ({
        label: g.gstin,
        value: g.gstin,
        gstrGstDetailsUuid: g.gstrGstDetailsUuid,
      })),
    [state.gstins]
  );
  const [gstin, setGstin] = useState(gstinOptions[0]?.value ?? "");
  const [period, setPeriod] = useState<GstPeriod>(DEFAULT_PERIOD);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<InvoiceTableFilterState>({});
  const tab: GstTab = view.tab ?? "summary";

  useEffect(() => setFilters({}), [period.from.getTime(), period.to.getTime()]);

  const hasData = hasDataFor(state, period);
  const rows = useMemo(() => invoicesFor(state, period), [state, period]);
  const summaryRows = useMemo(() => buildSummaryView(rows), [rows]);
  const monthRows = useMemo(
    () => buildMonthView(rows, monthsIn(period)),
    [rows, period]
  );
  const term = search.trim().toLowerCase();
  const vendorRows = useMemo(
    () =>
      buildVendorView(rows).filter(
        (v) =>
          !term ||
          v.vendorName.toLowerCase().includes(term) ||
          v.gstin.toLowerCase().includes(term)
      ),
    [rows, term]
  );
  const invoiceCount = useMemo(
    () => filterInvoiceRows(rows, filters, search).length,
    [rows, filters, search]
  );

  const drill = (next: InvoiceTableFilterState) => {
    setFilters(next);
    setSearch("");
    onNavigate({ tab: "invoice" });
  };

  const exportResults = () => {
    // DEV: POST /api/gst-reconciliation/export-results { companyId, customerGstin, dateFrom, dateTo, companyName } → .xlsx
    const fileName = `gst-reconciliation-export-${isoDay(period.from)}-${isoDay(period.to)}.csv`;
    downloadText(fileName, buildExportCsv(rows));
    notify("File downloaded successfully", "success");
  };

  // Read-only KPIs from the summary rows already computed for the period.
  const byStatus = (types: string[]) =>
    summaryRows.filter((r) => types.includes(r.matchStatus));
  const sum = (
    list: typeof summaryRows,
    field: "gstr2bCount" | "prCount" | "prTaxValue"
  ) => list.reduce((n, r) => n + r[field], 0);
  const twoBTotal = summaryRows.find((r) => r.matchStatus === "total");
  const matched = sum(byStatus(MATCHED_TYPES), "gstr2bCount");
  const probable = sum(
    byStatus([GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]),
    "gstr2bCount"
  );
  const missing2b = byStatus([GSTR2B_MATCH_TYPE.MISSING_IN_2B]);
  const missingPr = sum(
    byStatus([GSTR2B_MATCH_TYPE.MISSING_IN_PR]),
    "gstr2bCount"
  );
  const atRisk = sum(missing2b, "prTaxValue");
  const atRiskCount = sum(missing2b, "prCount");
  const toReview = probable + missingPr + atRiskCount;

  return (
    // The page scrolls as a whole when the KPI row, strips and table card
    // outgrow a short window; the table card keeps its own scrollport.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <PageHead
        eyebrow="Compliance"
        title="GSTR-2B"
        actions={
          <>
            <label className="flex items-center gap-2">
              <span className={T.label}>GSTIN</span>
              <span className="w-[200px] [&_button]:font-mono [&_button]:text-[13px]">
                <ComboBox<string>
                  title="Select GSTIN"
                  options={gstinOptions}
                  selectedValue={gstin}
                  onChange={(value) =>
                    setGstin(Array.isArray(value) ? value[0] : value)
                  }
                  isMultiSelect={false}
                  hideClearButton
                  actionLabel="Add New GSTIN"
                  actionIcon={Plus}
                  onAction={() => onUnbuilt("Adding a GSTIN")}
                  wrapperClassName="w-[--radix-popover-trigger-width] p-1"
                />
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span className={T.label}>GSTR Period</span>
              <PeriodPicker value={period} onChange={setPeriod} />
            </div>
            {hasData && (
              <Button onClick={() => setSheetOpen(true)}>
                <FolderSync className="h-3.5 w-3.5" aria-hidden />
                New Reconciliation
              </Button>
            )}
          </>
        }
      />

      {!hasData ? (
        <TableCard className="min-h-[400px] justify-center">
          <EmptyState
            icon={FileSpreadsheet}
            title="No reconciliation for this period"
            body={
              <>
                Click on &quot;Start Reconciliation&quot; to upload your
                purchase register and fetch GSTR-2B data to get AI-powered
                matches
              </>
            }
            action={
              <Button onClick={() => setSheetOpen(true)}>
                Start Reconciliation
              </Button>
            }
          />
        </TableCard>
      ) : (
        <>
          <KpiRow>
            <KpiCard
              icon={CircleCheck}
              label="Matched"
              value={matched}
              unit={matched === 1 ? "invoice" : "invoices"}
              meta={`of ${twoBTotal?.gstr2bCount ?? 0} GSTR-2B invoices`}
            />
            <KpiCard
              icon={NeedsYou}
              label="To review"
              value={toReview}
              unit={toReview === 1 ? "invoice" : "invoices"}
              meta={`${probable} probable · ${missingPr} missing in PR · ${atRiskCount} missing in 2B`}
            />
            <KpiCard
              icon={AlertTriangle}
              label="ITC at risk"
              value={<AmountText value={atRisk} />}
              tone={atRisk > 0 ? "danger" : undefined}
              meta={
                atRiskCount
                  ? `Tax on ${atRiskCount} PR invoice${atRiskCount === 1 ? "" : "s"} not in 2B`
                  : "Every PR invoice is in 2B"
              }
            />
          </KpiRow>
          <ResultTabs
            value={tab}
            onChange={(next) => onNavigate({ tab: next as GstTab })}
            tabs={GST_RECON_TABS.map((t) => ({
              id: t.value,
              label: t.label,
              count:
                t.value === "month"
                  ? monthRows.length - 1
                  : t.value === "vendor"
                    ? vendorRows.length
                    : t.value === "invoice"
                      ? invoiceCount
                      : undefined,
            }))}
          />
          <div className={TOOLBAR}>
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search..."
              label="Search vendor name, GSTIN or invoice no"
            />
            <span className="flex-1" />
            <Button variant="outline" onClick={exportResults}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export Results
            </Button>
          </div>

          {tab === "summary" && (
            <SummaryView
              rows={summaryRows}
              onOpenStatus={(matchStatus) =>
                drill({ matchType: [matchStatus] })
              }
            />
          )}
          {tab === "month" && <MonthView rows={monthRows} />}
          {tab === "vendor" && (
            <VendorView
              rows={vendorRows}
              searching={!!term}
              onOpenVendor={(g) => drill({ gstin: [g] })}
            />
          )}
          {tab === "invoice" && (
            <InvoiceView
              company={company}
              rows={rows}
              search={search}
              filters={filters}
              onFiltersChange={setFilters}
              notify={notify}
            />
          )}
        </>
      )}

      {sheetOpen && (
        <ReconciliationSheet
          open
          company={company}
          companyName={companyName}
          gstinOptions={gstinOptions}
          gstin={gstin}
          period={period}
          notify={notify}
          onUnbuilt={onUnbuilt}
          onClose={(nextGstin, nextPeriod) => {
            setGstin(nextGstin);
            setPeriod(nextPeriod);
            setSheetOpen(false);
          }}
          onReconciled={(nextGstin, nextPeriod) => {
            setGstin(nextGstin);
            setPeriod(nextPeriod);
            setSheetOpen(false);
            onNavigate({ tab: "summary" });
          }}
        />
      )}
    </div>
  );
};

export default GstReconciliation;
