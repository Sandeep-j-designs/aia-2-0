import React, { useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  MoreHorizontal,
  Trash2,
  Undo2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DateRangePanel from "@/components/common/date-filter/panel";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import { FY_PRESETS } from "@/components/common/date-filter";
import { cn } from "@/lib/utils";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import usePinEdges from "@/hooks/pages/inbox/use-pin-edges";
import type { BankLedgerData, Statement } from "@/types/pages/inbox/banking";
import { ColumnFilter, QuickFilter } from "@/components/inbox/v2/filter-panel";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
} from "@/components/inbox/v2/table-sizing";
import { T } from "@/components/inbox/v2/ui";
import { STATEMENT_SIZES } from "./table-sizing";
import {
  CellBox,
  EmptyBlock,
  HEADER_CLASS,
  HeaderCell,
  Pager,
  SearchBox,
  TABLE_CLASS,
  nextSort,
  sortRows,
  type SortState,
} from "./table-parts";
import {
  DeleteStatementDialog,
  StatementStatusPill,
  canDeleteStatement,
  periodOf,
  resolveStatementStatus,
} from "./statement-parts";
import {
  PAGE_SCROLL,
  PageHead,
  Pinned,
  ROW_GROUND,
  TOOLBAR,
  TableCard,
  ToolbarRule,
} from "./page-parts";

/**
 * Statement Logs — every statement uploaded, or one account's.
 *
 * Production: components/statements/index.tsx and statements-table-view.tsx.
 * DEV: GET /api/statements?companyId=…&groupName=bank[&customerBank=<id>]
 * &fileName=…&status=…&dateRangeAfter=…&dateRangeBefore=…
 */

type ColumnKey = "period" | "fileName" | "account" | "status";
type DateRange = { from?: Date; to?: Date };

const STATUS_OPTIONS = [
  "Extracted",
  "Extracting",
  "Processing",
  "Failed To Extract",
  "Paused",
].map((label) => ({ value: label, label }));
/** "Enriching 64%" files under Processing for filtering. */
const statusKey = (s: Statement) => {
  const label = resolveStatementStatus(s).label;
  return label.startsWith("Enriching") ? "Processing" : label;
};

const SORT_VALUE: Partial<Record<ColumnKey, (s: Statement) => string>> = {
  period: (s) => s.statementStartDate,
  fileName: (s) => s.fileName,
  account: (s) => s.bankAccountName,
};

type Props = {
  statements: Statement[];
  /** Set when the logs are one account's. */
  ledger?: BankLedgerData;
  onBack: () => void;
  onDelete: (statement: Statement) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const StatementLogs = ({
  statements,
  ledger,
  onBack,
  onDelete,
  notify,
}: Props) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState<ColumnKey>>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [period, setPeriod] = useState<DateRange>({});
  const [deleting, setDeleting] = useState<Statement | null>(null);

  const columns: { key: ColumnKey; label: string }[] = [
    { key: "period", label: "Period Date" },
    { key: "fileName", label: "File Name" },
    // One account's logs do not need to name the account on every row.
    ...(ledger ? [] : [{ key: "account" as const, label: "Account" }]),
    { key: "status", label: "Status" },
  ];
  const shown = columns.map((c) => c.key);

  const accountOptions = useMemo(
    () =>
      [...new Set(statements.map((s) => s.bankAccountName))]
        .sort()
        .map((value) => ({ value, label: value })),
    [statements]
  );

  const scoped = ledger
    ? statements.filter((s) => s.bankAccountUuid === ledger.id)
    : statements;
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");
    const filtered = scoped.filter(
      (s) =>
        (!term || s.fileName.toLowerCase().includes(term)) &&
        (!accounts.length || accounts.includes(s.bankAccountName)) &&
        (!statuses.length || statuses.includes(statusKey(s))) &&
        (!period.from ||
          (!!s.statementEndDate && s.statementEndDate >= iso(period.from))) &&
        (!period.to ||
          (!!s.statementStartDate && s.statementStartDate <= iso(period.to)))
    );
    return sortRows(filtered, sort, SORT_VALUE);
  }, [scoped, search, accounts, statuses, period, sort]);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  const resize = useColumnResize({
    shown,
    sizes: STATEMENT_SIZES,
    storageKey: "banking.statements.widths.v1",
  });
  // The page scroller; it owns the horizontal scroll the pinned bookends
  // shade against.
  const scroller = useRef<HTMLDivElement | null>(null);
  const pinEdges = usePinEdges(scroller);

  const anyFilter = !!(
    search ||
    accounts.length ||
    statuses.length ||
    period.from ||
    period.to
  );
  const reset = () => {
    setSearch("");
    setAccounts([]);
    setStatuses([]);
    setPeriod({});
    setPage(0);
  };

  const filterFor = (key: ColumnKey) => {
    if (key === "period")
      return (
        <DateRangePanel
          value={period}
          onApply={(next) => {
            setPeriod(next);
            setPage(0);
          }}
          presets={FY_PRESETS}
          presetsLabel="Date range"
          today={new Date()}
        />
      );
    if (key === "account")
      return (
        <ColumnFilter
          label="Account"
          options={accountOptions}
          selected={accounts}
          onChange={(next) => {
            setAccounts(next);
            setPage(0);
          }}
        />
      );
    if (key === "status")
      return (
        <ColumnFilter
          label="Status"
          options={STATUS_OPTIONS}
          selected={statuses}
          onChange={(next) => {
            setStatuses(next);
            setPage(0);
          }}
        />
      );
    return undefined;
  };

  const cell = (key: ColumnKey, s: Statement) => {
    switch (key) {
      case "period":
        return <span className="truncate tabular-nums">{periodOf(s)}</span>;
      case "fileName":
        return (
          <span className="truncate font-medium text-pi-ink" title={s.fileName}>
            {s.fileName}
          </span>
        );
      case "account":
        return (
          <>
            <span className="truncate" title={s.bankAccountName}>
              {s.bankAccountName}
            </span>
            <span className={cn(T.sub, "truncate")}>{s.bankName}</span>
          </>
        );
      case "status":
        return <StatementStatusPill statement={s} className="-ml-2" />;
    }
  };

  return (
    <>
      {/* The scroller's own box, so the overlay bars sit over the table and
          end above the pager. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
    <div ref={scroller} className={PAGE_SCROLL} {...pinEdges}>
      <Pinned>
        <PageHead
          eyebrow={ledger ? ledger.ledgerName : "Banking"}
          back={{
            label: ledger ? `Back to ${ledger.ledgerName}` : "Back to Banking",
            onClick: onBack,
          }}
          title="Statement Logs"
        />

        <div className={TOOLBAR}>
          <SearchBox
            label="Search statements by file name"
            placeholder="File name..."
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
          />
          <ToolbarRule />
          <QuickFilter
            label="Status"
            options={STATUS_OPTIONS}
            selected={statuses}
            onChange={(next) => {
              setStatuses(next);
              setPage(0);
            }}
          />
          <span className="flex-1" />
          {anyFilter && (
            <Button variant="ghost" onClick={reset}>
              <Undo2 className="h-3 w-3" />
              Reset Filters
            </Button>
          )}
        </div>
      </Pinned>

      <TableCard>
        <div ref={resize.gridRef} className="min-w-0 flex-1">
          <Table style={{ width: resize.tableWidth }} className={TABLE_CLASS}>
            <TableHeader className={HEADER_CLASS}>
              <TableRow>
                <TableHead
                  style={{ width: SELECT_WIDTH }}
                  className="pin-edge-l sticky left-0 z-10 h-11 bg-pi-head-bg px-3 py-0"
                >
                  <span className="sr-only">File</span>
                </TableHead>
                {columns.map(({ key, label }) => (
                  <HeaderCell
                    key={key}
                    columnKey={key}
                    label={label}
                    sizes={STATEMENT_SIZES}
                    resize={resize}
                    sort={
                      SORT_VALUE[key]
                        ? sort?.key === key
                          ? sort.dir
                          : "none"
                        : undefined
                    }
                    onSort={() => {
                      setSort((current) => nextSort(current, key));
                      setPage(0);
                    }}
                    filter={filterFor(key)}
                    filterActive={
                      key === "period"
                        ? !!(period.from || period.to)
                        : key === "account"
                          ? !!accounts.length
                          : key === "status"
                            ? !!statuses.length
                            : false
                    }
                  />
                ))}
                <TableHead
                  style={{ width: ACTIONS_WIDTH }}
                  className="pin-edge-r sticky right-0 z-10 h-11 bg-pi-head-bg px-4 py-0 align-middle"
                >
                  <span
                    className={cn(T.head, "flex h-4 items-center truncate")}
                  >
                    Action
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((s) => (
                <TableRow
                  key={s.bankStmtStatusUuid}
                  className="group hover:bg-transparent"
                >
                  <TableCell
                    className={cn(
                      "pin-edge-l sticky left-0 z-[1] h-14 bg-background px-3 py-0 align-middle",
                      ROW_GROUND
                    )}
                  >
                    <FileText aria-hidden className="h-4 w-4 text-pi-faint" />
                  </TableCell>
                  {shown.map((key) => (
                    <TableCell
                      key={key}
                      className={cn(
                        "h-14 overflow-hidden px-4 py-0 align-middle",
                        T.cell,
                        // Body ink; the file name carries its own.
                        "text-pi-body",
                        ROW_GROUND
                      )}
                    >
                      <CellBox>{cell(key, s)}</CellBox>
                    </TableCell>
                  ))}
                  <TableCell
                    className={cn(
                      "pin-edge-r sticky right-0 z-[1] h-14 bg-background px-4 py-0 align-middle",
                      ROW_GROUND
                    )}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${s.fileName}`}
                          className="text-pi-faint hover:text-pi-ink"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {/* DEV: GET /api/get-download-url?fileUuid=… */}
                        <DropdownMenuItem
                          onSelect={() => notify(`${s.fileName} downloaded`)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        {canDeleteStatement(s) ? (
                          <DropdownMenuItem
                            className="text-pi-danger focus:text-pi-danger"
                            onSelect={() => setDeleting(s)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!pageRows.length && (
            <EmptyBlock
              {...(anyFilter
                ? {
                    title: "No statements match these filters",
                    body: "Clear the filters to see every statement uploaded for this account.",
                    filters: [],
                    onClear: reset,
                  }
                : {
                    icon: FileText,
                    title: "No statements uploaded yet",
                    body: "Each bank statement you upload is logged here, with its period, how many lines were read and whether any failed.",
                  })}
            />
          )}
        </div>
      </TableCard>
    </div>
        <OverlayScrollbars scroller={scroller} />
      </div>

      {/* Below the page scroller, not inside it: the pager stays at the
          bottom of the viewport, and the horizontal bar ends above it. */}
      <Pager
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <DeleteStatementDialog
        statement={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={(statement) => {
          onDelete(statement);
          setDeleting(null);
          notify("Statement deleted");
        }}
      />
    </>
  );
};

export default StatementLogs;
