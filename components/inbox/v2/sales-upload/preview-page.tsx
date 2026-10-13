import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  FileSpreadsheet,
  ListFilter,
  Pencil,
  Slash,
  Trash2,
  TriangleAlert,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BulkActionBar from "@/components/common/bulk-action-bar";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import {
  DEFAULT_PREVIEW_ROW_STATUS_FILTER,
  FIXED_PREVIEW_COLUMN_KEY_SET,
  PREVIEW_AMOUNT_COLUMNS,
  PREVIEW_COLUMNS,
  PREVIEW_DATE_COLUMNS,
  PREVIEW_LOCKED_FIELDS,
  PREVIEW_NUMBER_COLUMNS,
  PREVIEW_ROW_STATUS_OPTIONS,
} from "@/config/pages/inbox/sales-upload";
import {
  COST_CENTRES,
  isLeafCostCentre,
} from "@/config/pages/inbox/mock-cost-centres";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import usePinEdges from "@/hooks/pages/inbox/use-pin-edges";
import {
  salesUpload,
  type SalesBatchEntry,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  type PreviewColumnKey,
  type ResponseARVoucherImportPreviewRow,
} from "@/types/pages/inbox/sales-upload";
import { ColumnFilter, type FilterOption } from "../filter-panel";
import { ACTIONS_WIDTH, SELECT_WIDTH } from "../table-sizing";
import { AmountText, PageButton, PageDialog, T } from "../ui";
import { FlowHeader, IssueCardContent, RowStatusPill } from "./common";
import { PREVIEW_COLUMN_SIZES } from "./table-sizing";

/**
 * Preview — production's PreviewPage: every row the AI read, editable in
 * place, with what is wrong with each one, ahead of Create Invoices.
 *
 * The grid is the Purchases register's: the same header (sort, filter,
 * resize handle), sticky checkbox and right-hand bookends, pager and empty
 * block. Production pins Invoice Date, Reference No. and Customer Name left
 * and Status right; so does this.
 */

type Props = {
  entry: SalesBatchEntry;
  onEditMapping: () => void;
  onExit: (tab?: "all" | "uploads") => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

type SortDir = "asc" | "desc";
const PAGE_SIZES = [25, 50, 100];
const SORTABLE = new Set<PreviewColumnKey>([
  "invoice_date",
  "reference_number",
  "customer_name",
  "item_amount",
  "tax_amount",
  "total_amount",
]);
const FILTERABLE = new Set<PreviewColumnKey>(["customer_name", "row_status"]);
const LEFT_PINNED = PREVIEW_COLUMNS.filter((c) => c.pinned === "left").map(
  (c) => c.key
);
const LABEL = Object.fromEntries(
  PREVIEW_COLUMNS.map((c) => [c.key, c.label])
) as Record<PreviewColumnKey, string>;
const STATUS_OPTIONS: FilterOption[] = PREVIEW_ROW_STATUS_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const blank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

/** Production: formatPreviewDate — dd/mm/yyyy. */
const formatDate = (value: unknown) => {
  if (blank(value)) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

/** Row hover wash, the Inbox's: the whole row, no lift, no edge. */
const wash =
  "transition-colors duration-100 group-hover:bg-pi-row-hover motion-reduce:transition-none";

const PreviewPage = ({ entry, onEditMapping, onExit, notify }: Props) => {
  const { batch, rows } = entry;
  const id = batch.importBatchUuid;
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>(
    DEFAULT_PREVIEW_ROW_STATUS_FILTER
  );
  const [customers, setCustomers] = useState<string[]>([]);
  const [visible, setVisible] = useState<PreviewColumnKey[]>(
    PREVIEW_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [sort, setSort] = useState<{
    key: PreviewColumnKey;
    dir: SortDir;
  } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<{
    row: string;
    key: PreviewColumnKey;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);

  const complete = batch.status === ARVoucherImportBatchStatus.COMPLETE;
  const shown = PREVIEW_COLUMNS.map((c) => c.key).filter((key) =>
    visible.includes(key)
  );

  const customerOptions: FilterOption[] = useMemo(
    () =>
      [...new Set(rows.map((r) => String(r.finalPayload.customer_name ?? "")))]
        .filter(Boolean)
        .sort()
        .map((name) => ({ value: name, label: name })),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const out = rows.filter(
      (row) =>
        statuses.includes(row.rowStatus) &&
        (!customers.length ||
          customers.includes(String(row.finalPayload.customer_name ?? ""))) &&
        (!term ||
          Object.values(row.finalPayload).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(term)
          ))
    );
    if (!sort) return out;
    const sign = sort.dir === "asc" ? 1 : -1;
    return out.slice().sort((a, b) => {
      const x = a.finalPayload[sort.key];
      const y = b.finalPayload[sort.key];
      return (
        sign *
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""), "en-IN", {
              numeric: true,
            }))
      );
    });
  }, [rows, search, statuses, customers, sort]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [lastPage]);

  /** Production's summary: the whole batch, not the filtered view. */
  const summary = {
    totalRecords: rows.length,
    issueRows: rows.filter(
      (r) => r.rowStatus === "error" || r.rowStatus === "warning"
    ).length,
    validRows: rows.filter((r) => r.rowStatus === "ready").length,
  };

  const resize = useColumnResize({
    shown,
    sizes: PREVIEW_COLUMN_SIZES,
    storageKey: "sales-upload-preview.widths.v1",
  });
  // The page scroller, which owns the horizontal scroll; the resize hook's
  // element is the table's box inside it, not the element that scrolls.
  const scroller = useRef<HTMLDivElement | null>(null);
  // Shades the pinned edges while columns are scrolled under them.
  const pinEdges = usePinEdges(scroller);
  // The pinned edges: the last left-pinned column shown (else the checkbox),
  // and Status on the right, the innermost of the two right bookends (else
  // Actions).
  const leftPinEdge = [...LEFT_PINNED].reverse().find((k) => shown.includes(k));
  const rightPinEdge = shown.includes("row_status");
  const leftOffset = (key: PreviewColumnKey) => {
    let left = SELECT_WIDTH;
    for (const k of LEFT_PINNED) {
      if (k === key) return left;
      if (shown.includes(k)) left += resize.colWidth(k);
    }
    return left;
  };
  const toggleSort = (key: PreviewColumnKey) => {
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "desc" }
        : current.dir === "desc"
          ? { key, dir: "asc" }
          : null
    );
    setPage(0);
  };

  /* --------------------------------------------------------------- create */
  const createScope = selected.length
    ? rows.filter((r) => selected.includes(r.importRowUuid))
    : rows.filter((r) => r.rowStatus !== "created");
  const eligibleRows = createScope.filter(
    (r) => r.rowStatus === "ready" || r.rowStatus === "warning"
  ).length;
  const errorRows = createScope.filter((r) => r.rowStatus === "error").length;
  const selectedMode = selected.length > 0;
  const createLabel = selectedMode
    ? "Create Selected Invoices"
    : "Create Invoices";

  const openCreate = () => {
    if (!eligibleRows) {
      notify(
        selectedMode
          ? "No eligible selected rows are available to create invoices."
          : "No eligible rows are available to create invoices.",
        "error"
      );
      return;
    }
    setCreateOpen(true);
  };

  // Ctrl/Cmd+Enter, as production binds it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      if (createOpen || deleteIds || complete) return;
      e.preventDefault();
      openCreate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const confirmCreate = async () => {
    setCreating(true);
    const result = await salesUpload.createInvoices(
      id,
      selectedMode ? selected : undefined
    );
    setCreating(false);
    setCreateOpen(false);
    setSelected([]);
    // Production says "rows(s)" here; the typo is fixed, the words are kept.
    notify(
      !result.createdCount
        ? "No new invoices were created."
        : `Created ${result.createdCount} row(s).${
            result.remainingErrorCount
              ? ` ${result.remainingErrorCount} row(s) still need review.`
              : ""
          }`,
      result.createdCount ? "success" : "info"
    );
  };

  /* --------------------------------------------------------------- delete */
  const confirmDelete = () => {
    if (!deleteIds) return;
    const count = salesUpload.deleteRows(id, deleteIds);
    setSelected((current) => current.filter((x) => !deleteIds.includes(x)));
    setDeleteIds(null);
    notify(`Deleted ${count} preview row${count === 1 ? "" : "s"}.`);
  };

  /* ---------------------------------------------------------------- cells */
  const commit = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey,
    raw: string
  ) => {
    setEditing(null);
    const value = PREVIEW_NUMBER_COLUMNS.has(key)
      ? raw.trim() === ""
        ? ""
        : Number(raw)
      : raw.trim();
    if (String(row.finalPayload[key] ?? "") === String(value)) return;
    salesUpload.updateRow(id, row.importRowUuid, key, value);
  };

  const display = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey
  ) => {
    const value = row.finalPayload[key];
    if (blank(value)) return <span className="text-pi-faint">-</span>;
    if (PREVIEW_DATE_COLUMNS.has(key)) return formatDate(value);
    if (PREVIEW_AMOUNT_COLUMNS.has(key))
      return <AmountText value={Number(value)} />;
    return String(value);
  };

  const editable = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey
  ) =>
    row.rowStatus !== "created" &&
    key !== "row_status" &&
    !PREVIEW_LOCKED_FIELDS.has(key);

  const selectable = pageRows.filter((r) => r.rowStatus !== "created");
  const allOnPage =
    !!selectable.length &&
    selectable.every((r) => selected.includes(r.importRowUuid));

  const headCell = (key: PreviewColumnKey) => {
    const label = LABEL[key];
    const width = resize.colWidth(key);
    const size = PREVIEW_COLUMN_SIZES[key];
    const pinnedLeft = LEFT_PINNED.includes(key);
    const pinnedRight = key === "row_status";
    const filterActive =
      key === "customer_name"
        ? !!customers.length
        : key === "row_status"
          ? statuses.join() !== DEFAULT_PREVIEW_ROW_STATUS_FILTER.join()
          : false;
    return (
      <TableHead
        key={key}
        style={{
          width,
          left: pinnedLeft ? leftOffset(key) : undefined,
          right: pinnedRight ? ACTIONS_WIDTH : undefined,
        }}
        aria-sort={
          !SORTABLE.has(key)
            ? undefined
            : sort?.key !== key
              ? "none"
              : sort.dir === "asc"
                ? "ascending"
                : "descending"
        }
        className={cn(
          "relative h-11 whitespace-nowrap bg-pi-head-bg px-4 py-0 align-middle",
          T.head,
          (pinnedLeft || pinnedRight) && "sticky z-20",
          key === leftPinEdge && "pin-edge-l",
          pinnedRight && "pin-edge-r"
        )}
      >
        <div
          className={cn(
            "flex h-4 min-w-0 items-center gap-1",
            PREVIEW_AMOUNT_COLUMNS.has(key) && "justify-end"
          )}
        >
          <span className="truncate" title={label}>
            {label}
          </span>
          {SORTABLE.has(key) && (
            <button
              type="button"
              onClick={() => toggleSort(key)}
              aria-label={`Sort by ${label}`}
              className="grid h-5 w-5 flex-none place-items-center rounded-xs text-pi-faint hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sort?.key === key ? (
                sort.dir === "asc" ? (
                  <ArrowUp className="h-3 w-3 text-pi-brand" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-pi-brand" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3" />
              )}
            </button>
          )}
          {FILTERABLE.has(key) && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Filter ${label}`}
                  className={cn(
                    "grid h-5 w-5 flex-none place-items-center rounded-xs hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    filterActive ? "text-pi-brand" : "text-pi-faint"
                  )}
                >
                  <ListFilter className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align={pinnedRight ? "end" : "start"}
                className="w-auto overflow-hidden p-0"
              >
                {key === "row_status" ? (
                  <ColumnFilter
                    label="Status"
                    options={STATUS_OPTIONS}
                    selected={statuses}
                    onChange={(next) => {
                      setStatuses(next);
                      setPage(0);
                    }}
                  />
                ) : (
                  <ColumnFilter
                    label="Customer Name"
                    options={customerOptions}
                    selected={customers}
                    onChange={(next) => {
                      setCustomers(next);
                      setPage(0);
                    }}
                  />
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          tabIndex={0}
          aria-valuemin={size.min}
          aria-valuemax={size.max}
          aria-valuenow={width}
          title={`${width} px · Drag or use arrow keys to resize. Double-click or Enter to reset.`}
          onPointerDown={(e) => resize.startResize(key, e)}
          onDoubleClick={() => {
            if (resize.isManual) resize.resizeColumn(key, size.preferred);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 10;
            const next =
              e.key === "ArrowRight"
                ? width + step
                : e.key === "ArrowLeft"
                  ? width - step
                  : e.key === "Home"
                    ? size.min
                    : e.key === "End"
                      ? size.max
                      : e.key === "Enter"
                        ? size.preferred
                        : null;
            if (next !== null) {
              e.preventDefault();
              resize.resizeColumn(key, next);
            }
          }}
          className="group absolute -right-[5px] top-0 z-20 flex h-full w-[10px] cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none"
        >
          <span
            className={cn(
              "w-[2px] transition-colors group-hover:bg-pi-brand group-focus-visible:bg-pi-brand",
              resize.resizing === key ? "bg-pi-brand" : "bg-transparent"
            )}
          />
        </span>
      </TableHead>
    );
  };

  const bodyCell = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey,
    ground: string
  ) => {
    const pinnedLeft = LEFT_PINNED.includes(key);
    const pinnedRight = key === "row_status";
    const issues = row.issuePayload.filter((issue) => issue.field === key);
    const error = issues.some((issue) => issue.severity === "error");
    const isEditing = editing?.row === row.importRowUuid && editing.key === key;
    const canEdit = editable(row, key);
    return (
      <TableCell
        key={key}
        style={{
          left: pinnedLeft ? leftOffset(key) : undefined,
          right: pinnedRight ? ACTIONS_WIDTH : undefined,
        }}
        onClick={() =>
          canEdit && !isEditing && setEditing({ row: row.importRowUuid, key })
        }
        className={cn(
          "h-14 overflow-hidden px-4 py-0 align-middle",
          T.cell,
          (pinnedLeft || pinnedRight) && "sticky z-[1]",
          key === leftPinEdge && "pin-edge-l",
          pinnedRight && "pin-edge-r",
          // An error cell is a red inset edge on the row's own ground — no
          // pink fill (7 Oct 2026, the form standard's error rule).
          issues.length
            ? error
              ? cn(ground, "shadow-[inset_0_0_0_1px_var(--pi-danger)]")
              : "bg-pi-warning-bg"
            : ground,
          canEdit && !isEditing && "cursor-text",
          isEditing && "p-0"
        )}
      >
        {key === "row_status" ? (
          // -ml-2: the chip's padding, so its dot sits on the header's line.
          <span className="-ml-2 inline-flex max-w-full">
            <RowStatusPill row={row} />
          </span>
        ) : isEditing ? (
          <Input
            autoFocus
            aria-label={LABEL[key]}
            type={
              PREVIEW_DATE_COLUMNS.has(key)
                ? "date"
                : PREVIEW_NUMBER_COLUMNS.has(key)
                  ? "number"
                  : "text"
            }
            // the cost centre column suggests the leaf centres it accepts
            list={key === "cost_centre" ? "sales-cost-centres" : undefined}
            defaultValue={String(row.finalPayload[key] ?? "")}
            onBlur={(e) => commit(row, key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(null);
            }}
            className={cn(
              "h-[55px] rounded-none border-0 px-4 shadow-none ring-2 ring-inset ring-pi-brand focus-visible:ring-2 focus-visible:ring-pi-brand",
              T.cell,
              PREVIEW_AMOUNT_COLUMNS.has(key) && "text-right"
            )}
          />
        ) : (
          <span
            className={cn(
              "flex min-w-0 items-center gap-2",
              PREVIEW_AMOUNT_COLUMNS.has(key) && "justify-end"
            )}
          >
            <span
              className={cn(
                "truncate",
                PREVIEW_AMOUNT_COLUMNS.has(key) && "tabular-nums"
              )}
              title={
                blank(row.finalPayload[key])
                  ? undefined
                  : String(row.finalPayload[key])
              }
            >
              {display(row, key)}
            </span>
            {issues.length > 0 && (
              <HoverCard openDelay={100} closeDelay={0}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={issues.map((i) => i.message).join(" ")}
                    className={cn(
                      "ml-auto grid size-4 flex-none place-items-center rounded-sm",
                      error ? "text-pi-danger" : "text-pi-warning"
                    )}
                  >
                    <AlertCircle className="size-3.5" />
                  </button>
                </HoverCardTrigger>
                <IssueCardContent issues={issues} />
              </HoverCard>
            )}
          </span>
        )}
      </TableCell>
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-pi-page">
      <datalist id="sales-cost-centres">
        {COST_CENTRES.filter(isLeafCostCentre).map((centre) => (
          <option key={centre.id} value={centre.name}>
            {centre.category}
          </option>
        ))}
      </datalist>
      {/* The scroller's own box, not scrolling itself: the positioning
        context the overlay bars and the selection bar hang off, so they sit
        over the table, neither scroll nor clip with the page, and end above
        the pager. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* The page's one scroller, both axes: header and table scroll as a
        page and the table header sticks at the top of the content area. Not
        positioned, so the absolute selection bar inside resolves against the
        box above. Native bars reserve a strip under the last row; the overlay
        bars float over the rows instead. */}
        <div
          ref={scroller}
          className="table-scroller scrollbar-hide flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none"
        >
          {/* Pinned against horizontal scroll so only the table slides. */}
          <div className="sticky left-0 shrink-0 [transform:translateZ(0)]">
            <FlowHeader
              title="Preview"
              fileName={batch.originalFileName}
              onClose={() => onExit("uploads")}
              step={2}
            />

            <div className="flex shrink-0 flex-wrap items-center gap-2 px-[var(--inset-page)] pb-4">
              <div className="relative w-full sm:w-[222px]">
                <Input
                  aria-label="Search preview rows"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className={cn(
                    "h-9 bg-background pr-9",
                    T.cell,
                    "text-foreground"
                  )}
                />
                {!search && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-xs border border-pi-line bg-pi-head-bg"
                  >
                    <Slash className="h-3 w-3 text-pi-faint" />
                  </span>
                )}
              </div>
              <span className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9">
                    <Columns3 aria-hidden />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-[360px] w-56 overflow-y-auto"
                >
                  <DropdownMenuLabel className={T.label}>
                    Show columns
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PREVIEW_COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visible.includes(column.key)}
                      disabled={FIXED_PREVIEW_COLUMN_KEY_SET.has(column.key)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) =>
                        setVisible((current) =>
                          checked
                            ? [...current, column.key]
                            : current.filter((k) => k !== column.key)
                        )
                      }
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="secondary"
                disabled={complete}
                onClick={onEditMapping}
              >
                <Pencil aria-hidden />
                Edit Mapping
              </Button>
              <Button
                disabled={complete}
                onClick={openCreate}
                title="Ctrl/Cmd+Enter"
              >
                {createLabel}
              </Button>
            </div>

            {/* The reference history-metrics line: figure first, its label faint. */}
            <div className="mx-[var(--inset-page)] mb-3 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 text-[12px] leading-5 text-pi-faint">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="size-3.5" aria-hidden />
                <span className="fig text-[16px] font-medium text-pi-ink">
                  {summary.totalRecords}
                </span>
                Total Records
              </span>
              <span className="flex items-center gap-2">
                <TriangleAlert
                  className="size-3.5 text-pi-danger"
                  aria-hidden
                />
                <span className="fig text-[16px] font-medium text-pi-danger">
                  {summary.issueRows}
                </span>
                Issues Found
              </span>
              <span className="flex items-center gap-2">
                <CheckCheck className="size-3.5 text-pi-success" aria-hidden />
                <span className="fig text-[16px] font-medium text-pi-ink">
                  {summary.validRows}
                </span>
                Valid Rows
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Edge to edge, no card. It no longer scrolls — the page does — but
          still carries the resize ref, since its width is the space the
          columns are sized to. */}
            <div
              ref={resize.gridRef}
              role="region"
              aria-label="Preview rows"
              {...pinEdges}
              className="table-region flex min-w-0 flex-1 flex-col bg-background"
            >
              {/* Hairline column rules on every column but Actions; the pinned
              edges shade instead while columns scroll under them. */}
              <Table
                style={{ width: resize.tableWidth }}
                className="table-fixed border-separate border-spacing-0 [&_:is(th,td):not(:last-child)]:border-r [&_td]:border-b [&_td]:border-pi-line"
              >
                <TableHeader className="sticky top-0 z-10 bg-pi-head-bg [&_tr]:shadow-none [&_th]:border-b [&_th]:border-pi-line">
                  <TableRow className="hover:bg-transparent">
                    <TableHead
                      style={{ width: SELECT_WIDTH }}
                      className={cn(
                        "sticky left-0 z-20 h-11 bg-pi-head-bg px-3 py-0 align-middle",
                        !leftPinEdge && "pin-edge-l"
                      )}
                    >
                      <Checkbox
                        aria-label="Select every row on this page"
                        checked={allOnPage}
                        disabled={!selectable.length}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked
                              ? [
                                  ...new Set([
                                    ...selected,
                                    ...selectable.map((r) => r.importRowUuid),
                                  ]),
                                ]
                              : selected.filter(
                                  (x) =>
                                    !selectable.some(
                                      (r) => r.importRowUuid === x
                                    )
                                )
                          )
                        }
                      />
                    </TableHead>
                    {shown.map(headCell)}
                    <TableHead
                      style={{ width: ACTIONS_WIDTH }}
                      className={cn(
                        "sticky right-0 z-20 h-11 bg-pi-head-bg px-4 py-0 align-middle",
                        !rightPinEdge && "pin-edge-r"
                      )}
                    >
                      <span className={cn(T.head, "flex h-4 items-center")}>
                        Actions
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const ticked = selected.includes(row.importRowUuid);
                    // Opaque grounds for the sticky bookends, so scrolled columns
                    // never show through; the row hover wash rides on top.
                    const ground = ticked
                      ? "bg-pi-brand-tint"
                      : cn("bg-background", wash);
                    const created = row.rowStatus === "created";
                    const name = String(
                      row.finalPayload.reference_number || row.sourceRowNumber
                    );
                    return (
                      <TableRow
                        key={row.importRowUuid}
                        aria-selected={ticked}
                        className={cn(
                          "group hover:bg-transparent",
                          ticked && "bg-pi-brand-tint hover:bg-pi-brand-tint"
                        )}
                      >
                        <TableCell
                          className={cn(
                            "sticky left-0 z-[1] h-14 px-3 py-0 align-middle",
                            !leftPinEdge && "pin-edge-l",
                            ground,
                            ticked && "shadow-[inset_2px_0_0_var(--pi-brand)]"
                          )}
                        >
                          <Checkbox
                            aria-label={`Select row ${name}`}
                            checked={ticked}
                            disabled={created}
                            onCheckedChange={(checked) =>
                              setSelected(
                                checked
                                  ? [...selected, row.importRowUuid]
                                  : selected.filter(
                                      (x) => x !== row.importRowUuid
                                    )
                              )
                            }
                          />
                        </TableCell>
                        {shown.map((key) => bodyCell(row, key, ground))}
                        <TableCell
                          className={cn(
                            "sticky right-0 z-[1] h-14 px-4 py-0 align-middle",
                            !rightPinEdge && "pin-edge-r",
                            ground
                          )}
                        >
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            // Grey until hovered: a column of red bins down every
                            // row shouts louder than the data it sits beside.
                            className="text-pi-faint hover:bg-pi-danger-bg hover:text-pi-danger"
                            disabled={created}
                            aria-label={`Delete row ${name}`}
                            title="Delete row"
                            onClick={() => setDeleteIds([row.importRowUuid])}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!pageRows.length && (
                <div className="sticky left-0 px-6 py-16 text-center">
                  {rows.length &&
                  rows.every((r) => r.rowStatus === "created") ? (
                    <>
                      <h2 className="text-[16px] font-medium leading-[22px] text-pi-ink">
                        Every row in this upload has been created
                      </h2>
                      <p className={cn(T.value, "mt-2")}>
                        The invoices are in All Invoices. Show Created rows with
                        the Status filter to look back at them here.
                      </p>
                      <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => onExit("all")}
                      >
                        Go to All Invoices
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-[16px] font-medium leading-[22px] text-pi-ink">
                        No rows match these filters
                      </h2>
                      <p className={cn(T.value, "mt-2")}>
                        Clear the search or widen the Status filter to see more.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <OverlayScrollbars scroller={scroller} />

        {selected.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <BulkActionBar
              className="pointer-events-auto"
              selectedCount={selected.length}
              onDelete={() => setDeleteIds(selected)}
              deleteLabel="Delete selected rows"
              onClearSelection={() => setSelected([])}
            />
          </div>
        )}
      </div>

      {/* Below the page scroller, not inside it: the pager stays at the
          bottom of the viewport, and the horizontal bar ends above it. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-pi-line bg-background px-6 py-2">
        <div className="flex items-center gap-2">
          <span className={cn(T.cell, "text-foreground")}>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className={cn(
                "h-auto w-[72px] rounded-md border-border px-2 py-1",
                T.cell,
                "text-foreground"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-0 sm:gap-1">
          <PageButton
            label="First page"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            <ChevronsLeft />
          </PageButton>
          <PageButton
            label="Previous page"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
          </PageButton>
          <span className={cn(T.cell, "px-2 tabular-nums text-foreground")}>
            {filtered.length
              ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`
              : "0 of 0"}
          </span>
          <PageButton
            label="Next page"
            disabled={page >= lastPage}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight />
          </PageButton>
          <PageButton
            label="Last page"
            disabled={page >= lastPage}
            onClick={() => setPage(lastPage)}
          >
            <ChevronsRight />
          </PageButton>
        </div>
      </div>

      <PageDialog
        title={selectedMode ? "Create selected invoices" : "Create invoices"}
        open={createOpen}
        onClose={creating ? undefined : () => setCreateOpen(false)}
        className="max-w-[480px]"
        footer={
          <>
            <Button
              variant="outline"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              loading={creating}
              disabled={!eligibleRows}
              onClick={() => void confirmCreate()}
            >
              {selectedMode ? "Create selected invoices" : "Create invoices"}
            </Button>
          </>
        }
      >
        <p className={T.value}>
          {selectedMode
            ? `${eligibleRows} of ${selected.length} selected row${selected.length === 1 ? "" : "s"} will be created.`
            : `${eligibleRows} row${eligibleRows === 1 ? "" : "s"} will be created.`}
          {errorRows
            ? ` ${errorRows} row${errorRows === 1 ? "" : "s"} with errors will stay in preview.`
            : ""}
        </p>
      </PageDialog>

      <PageDialog
        title="Delete preview rows"
        open={!!deleteIds}
        onClose={() => setDeleteIds(null)}
        className="max-w-[480px]"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteIds(null)}>
              Cancel
            </Button>
            <Button isDestructive onClick={confirmDelete}>
              {deleteIds?.length === 1 ? "Delete row" : "Delete rows"}
            </Button>
          </>
        }
      >
        <p className={T.value}>
          This will remove {deleteIds?.length ?? 0} selected preview row
          {deleteIds?.length === 1 ? "" : "s"} from this upload batch.
        </p>
      </PageDialog>
    </div>
  );
};

export default PreviewPage;
