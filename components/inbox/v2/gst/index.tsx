import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CircleCheck,
  CloudDownload,
  FileSpreadsheet,
  FolderSync,
  Plus,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import {
  DEFAULT_PERIOD,
  GSTR2B_MATCH_TYPE,
  GST_RECON_TABS,
  MATCHED_TYPES,
} from "@/config/pages/inbox/gst";
import {
  hasDataFor,
  invoicesFor,
  statusFor,
  useGstState,
} from "@/hooks/pages/inbox/use-gst";
import usePinEdges from "@/hooks/pages/inbox/use-pin-edges";
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
import PageTopBar from "@/components/common/page-top-bar";
import {
  SearchBox,
  UNDERLINE_TAB,
} from "@/components/inbox/v2/banking/table-parts";
import { AmountText, CountPill } from "@/components/inbox/v2/ui";
import FlowEmptyState from "@/components/inbox/v2/empty-state";
import {
  TOOLBAR,
  PAGE_SCROLL,
  Pinned,
  TableCard,
  ToolbarRule,
} from "@/components/inbox/v2/banking/page-parts";
import { cn } from "@/lib/utils";
import InvoiceView from "./invoice-view";
import MonthView from "./month-view";
import PeriodPicker from "./period-picker";
import ReconciliationSheet from "./reconciliation-sheet";
import SummaryView from "./summary-view";
import { ReconOverview, STATUS_ORDER } from "./table-parts";
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
  // The page scroller; it owns the horizontal scroll that Invoice View's
  // pinned ITC and Actions columns shade against.
  const scroller = useRef<HTMLDivElement | null>(null);
  const pinEdges = usePinEdges(scroller);
  // Where a paged view puts its pager: below the scroller, not inside it.
  // The views keep their own page state and portal the pager here.
  const [pagerSlot, setPagerSlot] = useState<HTMLDivElement | null>(null);

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
    notify(`Exported ${fileName}`, "success");
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
  /** "Aug 2026", or "Jul – Sep 2026" across months. */
  const periodName = (() => {
    const keys = monthsIn(period);
    const name = (key: string) =>
      format(new Date(`${key}-01T00:00:00`), "MMM yyyy");
    return keys.length > 1
      ? `${name(keys[0]).split(" ")[0]} – ${name(keys[keys.length - 1])}`
      : name(keys[0]);
  })();

  /** Search applies to the lists, not to the period's totals. */
  const searchable = tab === "vendor" || tab === "invoice";
  const tabCount = (id: GstTab) =>
    id === "summary"
      ? summaryRows.filter((r) => r.matchStatus !== "total").length
      : id === "month"
        ? monthRows.length - 1
        : id === "vendor"
          ? vendorRows.length
          : invoiceCount;
  const { twoB, pr } = statusFor(state, period);
  const twoBLines = twoB.reduce((n, item) => n + item.gstr2bLineCount, 0);

  return (
    <>
      {/* The scroller's own box, so the overlay bars sit over the table and
          end above the pager. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* One scroller for the whole page: tabs, toolbar, strip and table
            scroll together and the table header sticks at the top. */}
        <div ref={scroller} className={PAGE_SCROLL} {...pinEdges}>
          <Pinned>
            {/*
              The page pattern every module uses (8 Oct 2026): the tabs and
              the page's actions share the first row, the toolbar comes next,
              then the table. The top bar's trail names the page.
            */}
            <div className="px-[var(--inset-page)] pt-6">
              <PageTopBar
                title="GST Reconciliation"
                className={cn("flex-wrap gap-x-4 gap-y-2", !hasData && "pb-0")}
                leading={
                  hasData ? (
                    <div
                      role="tablist"
                      aria-label="Reconciliation results"
                      className="flex shrink-0 gap-6 overflow-x-auto overflow-y-hidden border-b border-pi-line"
                    >
                      {GST_RECON_TABS.map((entry) => (
                        <button
                          key={entry.value}
                          role="tab"
                          type="button"
                          aria-selected={tab === entry.value}
                          data-state={
                            tab === entry.value ? "active" : "inactive"
                          }
                          onClick={() => onNavigate({ tab: entry.value })}
                          className={cn(
                            UNDERLINE_TAB,
                            "inline-flex flex-none items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                          )}
                        >
                          {entry.label}
                          <CountPill>{tabCount(entry.value)}</CountPill>
                        </button>
                      ))}
                    </div>
                  ) : undefined
                }
                showExportButton={hasData}
                onExport={exportResults}
                primaryText="New Reconciliation"
                primaryIcon={FolderSync}
                onPrimaryButtonClick={() => setSheetOpen(true)}
              />
            </div>

            {/* What the results are for — the GSTIN and the period — beside
                the search, as every register's filters sit. */}
            <div className={TOOLBAR}>
              {hasData && searchable ? (
                <>
                  <SearchBox
                    value={search}
                    onChange={setSearch}
                    placeholder="Search..."
                    label={
                      tab === "vendor"
                        ? "Search vendor name or GSTIN"
                        : "Search vendor name, GSTIN or invoice no"
                    }
                  />
                  <ToolbarRule />
                </>
              ) : null}
              <label className="flex items-center gap-2">
                <span className="text-[13px] text-pi-body">GSTIN</span>
                <span className="w-[196px] [&_button]:font-mono [&_button]:text-[13px]">
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
                <span className="text-[13px] text-pi-body">Period</span>
                <PeriodPicker value={period} onChange={setPeriod} />
              </div>
            </div>

            {/* The period at a glance, on Summary only: every other tab
                starts straight at its table. Each figure opens its invoices. */}
            {hasData && tab === "summary" ? (
              <ReconOverview
                matched={matched}
                of={twoBTotal?.gstr2bCount ?? 0}
                statuses={STATUS_ORDER.map((type) => {
                  const row = summaryRows.find((r) => r.matchStatus === type);
                  return {
                    type,
                    count: row ? Math.max(row.gstr2bCount, row.prCount) : 0,
                  };
                })}
                atRisk={atRisk}
                atRiskCount={atRiskCount}
                onOpen={(types) => drill({ matchType: types })}
              />
            ) : null}
          </Pinned>

          {!hasData ? (
            <TableCard className="border-t border-pi-line">
              {/* Where the period's data is: the stages a reconciliation
                  needs, with what is already in, as the other modules'
                  empty states draw them. */}
              <FlowEmptyState
                flow={[
                  {
                    label: "GSTR-2B invoices",
                    count: twoBLines,
                    icon: CloudDownload,
                    current: !twoBLines,
                  },
                  {
                    label: "Purchase registers",
                    count: pr.length,
                    icon: FileSpreadsheet,
                    current: !!twoBLines && !pr.length,
                  },
                  {
                    label: "Reconciled",
                    count: 0,
                    icon: CircleCheck,
                    current: !!twoBLines && !!pr.length,
                  },
                ]}
                title={`No reconciliation for ${periodName}`}
                body="Bring in GSTR-2B for the period and your purchase register, then run the reconciliation. Every invoice is matched and anything missing on either side is flagged."
                actions={
                  <Button onClick={() => setSheetOpen(true)}>
                    <FolderSync className="h-4 w-4" aria-hidden />
                    Start Reconciliation
                  </Button>
                }
              />
            </TableCard>
          ) : (
            <>
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
                  pagerSlot={pagerSlot}
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
                  pagerSlot={pagerSlot}
                />
              )}
            </>
          )}
        </div>
        <OverlayScrollbars scroller={scroller} />
      </div>

      {/* Below the page scroller, not inside it: the pager stays at the
          bottom of the viewport, and the horizontal bar ends above it. */}
      <div ref={setPagerSlot} className="contents" />

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
    </>
  );
};

export default GstReconciliation;
