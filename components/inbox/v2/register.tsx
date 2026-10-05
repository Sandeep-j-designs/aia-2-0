import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Upload,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import FilterChip from "@/components/common/filter-chip";
import DateFilter from "@/components/common/date-filter";
import PageTopBar from "@/components/common/page-top-bar";
import { useSalesBatches } from "@/hooks/pages/inbox/use-sales-upload";
import { AmountText, CountPill, PageButton, T } from "./ui";
import { actor, routeNames, useStore, type Item, type Route } from "./store";
import UploadedInvoicesTable from "./sales-upload/uploaded-invoices-table";
import {
  ColumnsButton,
  EmptyBlock,
  HEADER_CLASS,
  SearchBox,
  UNDERLINE_TAB,
} from "./banking/table-parts";

/**
 * The posted-voucher registers — Purchases, Sales, Journal Vouchers.
 *
 * Built from Figma 25568:65382 (Purchases), 25568:78235 (Sales) and
 * 25568:78839 (Journal Vouchers).
 *
 * These used to be the Inbox's own table with a route filter on it, which put
 * a document queue's vocabulary — File, Status, Source, AI Route — on three
 * screens that are registers of accounting records. A register answers a
 * different question: which vouchers exist, what they are worth, and whether
 * Tally has them. So it carries voucher columns and the sync state, and the
 * document that produced each one is a click away rather than the subject.
 *
 * Create is deliberately inert. There is no manual voucher flow anywhere in
 * this prototype, and a button that opens the upload dialog instead would be
 * describing a product decision nobody has made.
 */

export type RegisterFilters = {
  /** Vendor on a purchase register, customer on a sales one. */
  party: string;
  from: string;
  to: string;
  min: string;
  max: string;
};

const day = (value?: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

/** Whether Tally has this voucher, as the register states it. */
export type RegisterSyncState = "synced" | "syncing" | "failed" | "pending";

const SYNC_LABELS: Record<RegisterSyncState, string> = {
  synced: "Synced",
  syncing: "Syncing….",
  failed: "Sync Failed",
  pending: "Not Synced",
};

/**
 * Tally sync as the reference register's SyncPill: a dot-chip, colour only in
 * the 7px dot and the label in body ink. Synced and syncing sit on no ground;
 * the two that need attention — waiting, failed — earn a tint.
 */
const SYNC_DOT: Record<RegisterSyncState, string> = {
  synced: "bg-pi-success-dot",
  syncing: "bg-pi-brand-vivid animate-pulse motion-reduce:animate-none",
  pending: "bg-pi-warning-dot",
  failed: "bg-pi-danger-dot",
};
const SYNC_GROUND: Partial<Record<RegisterSyncState, string>> = {
  pending: "bg-pi-warning-bg",
  failed: "bg-pi-danger-bg text-pi-danger",
};

const SyncStatus = ({ state }: { state: RegisterSyncState }) => (
  <span
    title={SYNC_LABELS[state]}
    className={cn(
      "inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-[13px] leading-4 text-pi-body",
      SYNC_GROUND[state]
    )}
  >
    <span
      aria-hidden
      className={cn("size-[7px] flex-none rounded-full", SYNC_DOT[state])}
    />
    <span className="min-w-0 truncate">{SYNC_LABELS[state]}</span>
  </span>
);

/** The initial-in-a-circle the Journals frame puts beside Created By. */
const Person = ({ name }: { name: string }) => (
  <span className="inline-flex min-w-0 items-center gap-2">
    <span
      aria-hidden
      className="grid h-6 w-6 flex-none place-items-center rounded-full bg-pi-brand-tint text-[11px] font-medium uppercase text-pi-brand"
    >
      {name.trim()[0] || "—"}
    </span>
    <span className="truncate">{name}</span>
  </span>
);

type Column = {
  key: string;
  label: string;
  className?: string;
  cell: (item: Item) => React.ReactNode;
};

/**
 * One of the register's filter dropdowns, on a Bloocks FilterChip trigger —
 * the same chip as the Inbox's filter bar, so a filter reads "Vendor: Dell"
 * once set and its × clears it in place.
 */
const FilterMenu = ({
  label,
  value,
  onClear,
  children,
}: {
  label: string;
  /** What is applied, as the chip should say it; empty when nothing is. */
  value: string;
  onClear: () => void;
  children: React.ReactNode;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <FilterChip label={label} value={value} onClearButtonClick={onClear} />
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="w-64 rounded-md border-pi-line p-2 shadow-pi-2"
    >
      {children}
    </PopoverContent>
  </Popover>
);

/** "₹1,000 – ₹5,000", "≥ ₹1,000", "≤ ₹5,000" for the amount chip. */
const amountRange = (min: string, max: string) => {
  const rupees = (v: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(v));
  if (min && max) return `${rupees(min)} – ${rupees(max)}`;
  if (min) return `≥ ${rupees(min)}`;
  if (max) return `≤ ${rupees(max)}`;
  return "";
};

const RangeField = ({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: "date" | "number";
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="block">
    <span className={cn(T.label, "mb-1 block")}>{label}</span>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-sm"
    />
  </label>
);

type RegisterProps = {
  route: Route;
  /** Every item for the company, already scoped to this route. */
  items: Item[];
  syncState: (item: Item) => RegisterSyncState;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  onOpen: (item: Item) => void;
  onDelete: (item: Item) => void;
  /** Says a thing is real in the app but not here — Create, Columns, exports. */
  onUnbuilt: (what: string) => void;
  /** Create Invoice / New Journal Voucher: a blank voucher, entered by hand. */
  onCreate: () => void;
  /** Upload Sales: the spreadsheet upload flow. Sales only. */
  onUpload?: () => void;
  /** Open an import batch from the Uploaded Invoice tab at the given step. */
  onOpenUploadBatch?: (batchId: string, step: "mapping" | "preview") => void;
  /** The tab to open on, from the URL (?tab=uploads after an upload). */
  initialTab?: string;
  search: string;
  onSearchChange: (value: string) => void;
  /** Party, date range and amount range — the three the frames name. */
  filters: RegisterFilters;
  onFilterChange: (key: keyof RegisterFilters, value: string) => void;
  onResetFilters: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizes: number[];
  /** Rendered under the toolbar — the workspace's own filter controls. */
  children?: React.ReactNode;
};

const REGISTER_COPY: Record<
  Route,
  {
    /** The workspace eyebrow over the title — where the register lives. */
    eyebrow: string;
    title: string;
    create: string;
    upload?: string;
    /** The party column's name, which is the whole difference between AP and AR. */
    party: string;
    dateLabel: string;
    tabs: { id: string; label: string }[];
  }
> = {
  AP: {
    eyebrow: "Payables",
    title: "Purchases",
    create: "Create Purchase Voucher",
    upload: "Upload Purchases",
    party: "Vendor",
    dateLabel: "Bill Date",
    tabs: [
      { id: "all", label: "All Bills" },
      { id: "review", label: "Needs Review" },
      { id: "uploads", label: "Bill Uploads" },
    ],
  },
  AR: {
    eyebrow: "Receivables",
    title: "Sales",
    create: "Create Sales Voucher",
    upload: "Upload Sales",
    party: "Customer",
    dateLabel: "Invoice Date",
    tabs: [
      { id: "all", label: "All Invoices" },
      { id: "uploads", label: "Uploaded Invoice" },
    ],
  },
  JV: {
    eyebrow: "Accounting",
    title: "Journal Vouchers",
    create: "New Journal Voucher",
    party: "Counterparty",
    dateLabel: "Voucher Date",
    tabs: [],
  },
};

/** Posted is the register's subject; the other tabs are work on its way in. */
export const tabRows = (tab: string, items: Item[]) =>
  tab === "review"
    ? items.filter((x) => !["Approved", "Deleted"].includes(x.status))
    : tab === "uploads"
      ? items.filter((x) => x.source === "upload" && x.status !== "Deleted")
      : items.filter((x) => x.status === "Approved");

const Register = ({
  route,
  items,
  syncState,
  selected,
  onSelectedChange,
  onOpen,
  onDelete,
  onUnbuilt,
  onCreate,
  onUpload,
  onOpenUploadBatch,
  initialTab,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  pageSize,
  onPageSizeChange,
  pageSizes,
  children,
}: RegisterProps) => {
  const copy = REGISTER_COPY[route];
  const journal = route === "JV";
  const [tab, setTab] = useState(
    initialTab && copy.tabs.some((entry) => entry.id === initialTab)
      ? initialTab
      : "all"
  );
  const { company } = useStore();
  /** For the Uploaded Invoice tab's count chip; a read, nothing more. */
  const salesBatches = useSalesBatches(company);
  /*
    Sales' Uploaded Invoice tab lists spreadsheet import batches, not
    vouchers: its own table, and none of the voucher filters apply to it.
  */
  const batchTab = route === "AR" && tab === "uploads";
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tabRows(tab, items)
      .filter((x) =>
        !term
          ? true
          : [
              x.form.voucherNo,
              x.form.party,
              x.form.invoiceNo,
              x.form.narration,
              x.file.name,
            ].some((value) => (value || "").toLowerCase().includes(term))
      )
      .filter(
        (x) =>
          (!filters.party || x.form.party === filters.party) &&
          // The voucher's own date, not the day the file arrived: a register
          // is read against the books, and the books are dated by the voucher.
          (!filters.from || x.form.date >= filters.from) &&
          (!filters.to || x.form.date <= filters.to) &&
          (!filters.min || x.amount >= Number(filters.min)) &&
          (!filters.max || x.amount <= Number(filters.max))
      );
  }, [items, search, tab, filters]);

  /** The names actually in this register, for the party filter. */
  const parties = useMemo(
    () => [...new Set(items.map((x) => x.form.party).filter(Boolean))].sort(),
    [items]
  );

  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const start = rows.length === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(rows.length, (page + 1) * pageSize);

  const partyColumn: Column = {
    key: "party",
    label: copy.party,
    cell: (item) => (
      <span
        className="block truncate font-medium text-pi-ink"
        title={item.form.party || undefined}
      >
        {item.form.party || "—"}
      </span>
    ),
  };
  const amountColumn: Column = {
    key: "amount",
    label: "Amount",
    className: "text-right",
    cell: (item) => (
      <span className="block whitespace-nowrap text-right">
        <AmountText value={item.amount} />
      </span>
    ),
  };
  const syncColumn: Column = {
    key: "sync",
    label: "Sync Status",
    cell: (item) => <SyncStatus state={syncState(item)} />,
  };
  /*
    The voucher number carries the pencil the Figma draws on it. It is a mark
    that this field is the editable one, not a second way in — editing happens
    on the voucher, which is where the rest of it is.
  */
  const voucherNoColumn: Column = {
    key: "voucherNo",
    label: "Voucher  No.",
    // An ID, so the reference register's mono cut ("AP/005/25-26").
    cell: (item) => (
      <span className="inline-flex max-w-full min-w-0 items-center gap-2">
        <span
          className={cn(
            "truncate",
            item.form.voucherNo && "code text-[13px] text-pi-body"
          )}
        >
          {item.form.voucherNo || "—"}
        </span>
        <Pencil className="h-3.5 w-3.5 flex-none text-pi-faint" aria-hidden />
      </span>
    ),
  };
  const dateColumn: Column = {
    key: "date",
    label: "Voucher Date",
    cell: (item) => (
      <span className="whitespace-nowrap tabular-nums text-pi-ink">
        {day(item.form.date)}
      </span>
    ),
  };

  const columns: Column[] = journal
    ? [
        {
          key: "voucherType",
          label: "Voucher Type",
          cell: (item) => (
            <span className="font-medium text-pi-ink">
              {item.form.voucherType || "Journal"}
            </span>
          ),
        },
        {
          ...dateColumn,
          cell: (item) => (
            <span className="whitespace-nowrap tabular-nums">
              {day(item.form.date)}
            </span>
          ),
        },
        voucherNoColumn,
        {
          key: "narration",
          label: "Narration",
          cell: (item) => (
            <span className="block truncate" title={item.form.narration}>
              {item.form.narration || "—"}
            </span>
          ),
        },
        amountColumn,
        {
          key: "createdBy",
          label: "Created By",
          cell: (item) => <Person name={item.doneBy || actor} />,
        },
        syncColumn,
        {
          key: "updatedAt",
          label: "Last Updated At",
          cell: (item) => (
            <span className="whitespace-nowrap tabular-nums">
              {day(item.doneAt || item.received)}
            </span>
          ),
        },
      ]
    : [
        dateColumn,
        voucherNoColumn,
        partyColumn,
        amountColumn,
        {
          key: "editedBy",
          label: "Last Edited By",
          cell: (item) => (
            <span className="block truncate">{item.doneBy || actor}</span>
          ),
        },
        {
          key: "editedAt",
          label: "Last Edited At",
          cell: (item) => (
            <span className="whitespace-nowrap tabular-nums">
              {day(item.doneAt || item.received)}
            </span>
          ),
        },
        syncColumn,
      ];

  const allOnPage =
    !!pageRows.length && pageRows.every((x) => selected.includes(x.id));

  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const tabCount = (id: string) =>
    route === "AR" && id === "uploads"
      ? salesBatches.length
      : tabRows(id, items).length;

  return (
    // The page's one scroller, both axes: heading, table and pager scroll as
    // a page, and the table header sticks at the top of the content area.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none">
      {/* Heading and toolbar, pinned against the horizontal scroll so a
          widened table slides under them alone. */}
      <div className="sticky left-0 shrink-0 [transform:translateZ(0)]">
      <div className="shrink-0 px-[var(--inset-page)] pt-6">
        {/*
          Create opens the register's own voucher form, blank. Upload is a
          real destination in the app that is not built here, and saying so
          is better than a button that quietly does something adjacent.
        */}
        <PageTopBar
          className="flex-wrap gap-2 pb-4"
          eyebrow={copy.eyebrow}
          title={copy.title}
          secondaryButtonText={copy.create}
          secondaryIcon={Plus}
          onSecondaryButtonClick={onCreate}
          primaryText={copy.upload}
          primaryIcon={Upload}
          onPrimaryButtonClick={() =>
            onUpload ? onUpload() : onUnbuilt(copy.upload as string)
          }
        />
      </div>

      {copy.tabs.length > 0 && (
        <div
          role="tablist"
          aria-label={`${copy.title} views`}
          className="mx-[var(--inset-page)] flex shrink-0 gap-6 overflow-x-auto border-b border-pi-line"
        >
          {copy.tabs.map((entry) => (
            <button
              key={entry.id}
              role="tab"
              type="button"
              aria-selected={tab === entry.id}
              // Radix's attribute, so the shared tab and CountPill styles
              // read the active state the same way here.
              data-state={tab === entry.id ? "active" : "inactive"}
              onClick={() => {
                setTab(entry.id);
                setPage(0);
                onSelectedChange([]);
              }}
              className={cn(
                UNDERLINE_TAB,
                "-mb-px inline-flex flex-none items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
              )}
            >
              {entry.label}
              <CountPill>{tabCount(entry.id)}</CountPill>
            </button>
          ))}
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-[var(--inset-page)] py-4">
        <SearchBox
          label={`Search ${copy.title.toLowerCase()}`}
          placeholder="Search…"
          value={search}
          onChange={(value) => {
            onSearchChange(value);
            setPage(0);
          }}
        />
        {/*
          The three filters the frames name, and no more. A journal register
          has none of them: it is filtered by narration, which is what the
          search box is for.
        */}
        {!journal && !batchTab && (
          <>
            <span aria-hidden className="h-6 w-px flex-none bg-pi-line" />
            <FilterMenu
              label={copy.party}
              value={filters.party}
              onClear={() => {
                onFilterChange("party", "");
                setPage(0);
              }}
            >
              <div className="max-h-64 overflow-y-auto">
                {parties.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onFilterChange(
                        "party",
                        filters.party === name ? "" : name
                      );
                      setPage(0);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      filters.party === name
                        ? "bg-pi-brand-tint font-medium text-pi-brand"
                        : "text-pi-ink hover:bg-pi-fill"
                    )}
                  >
                    <span className="truncate">{name}</span>
                  </button>
                ))}
                {!parties.length && (
                  <p className={cn(T.value, "px-2 py-2")}>
                    Nothing to filter yet.
                  </p>
                )}
              </div>
            </FilterMenu>
            <DateFilter
              label={copy.dateLabel}
              value={{
                from: filters.from ? parseISO(filters.from) : undefined,
                to: filters.to ? parseISO(filters.to) : undefined,
              }}
              onChange={({ from, to }) => {
                onFilterChange("from", from ? format(from, "yyyy-MM-dd") : "");
                onFilterChange("to", to ? format(to, "yyyy-MM-dd") : "");
                setPage(0);
              }}
            />
            <FilterMenu
              label="Total Amount"
              value={amountRange(filters.min, filters.max)}
              onClear={() => {
                onFilterChange("min", "");
                onFilterChange("max", "");
                setPage(0);
              }}
            >
              <div className="space-y-3 p-2">
                <RangeField
                  label="Minimum"
                  type="number"
                  value={filters.min}
                  onChange={(v) => {
                    onFilterChange("min", v);
                    setPage(0);
                  }}
                />
                <RangeField
                  label="Maximum"
                  type="number"
                  value={filters.max}
                  onChange={(v) => {
                    onFilterChange("max", v);
                    setPage(0);
                  }}
                />
              </div>
            </FilterMenu>
          </>
        )}
        {!batchTab && children}
        <span className="flex-1" />
        {!journal && !batchTab && (
          <Button
            variant="ghost"
            className="whitespace-nowrap"
            onClick={() => {
              onResetFilters();
              onSearchChange("");
              setPage(0);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </Button>
        )}
        {!batchTab && (
          <ColumnsButton onClick={() => onUnbuilt("Choosing columns")} />
        )}
      </div>
      </div>

      {/* The table, edge to edge: no card and no scroll of its own. The
          pager follows the last row. */}
      <div className="flex min-w-0 flex-1 flex-col border-t border-pi-line bg-background">
        {batchTab ? (
          <UploadedInvoicesTable
            company={company}
            search={search}
            onOpen={(batchId, step) => onOpenUploadBatch?.(batchId, step)}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            pageSizes={pageSizes}
          />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <Table className="border-separate border-spacing-0 bg-background [&_td]:border-b [&_td]:border-pi-line">
                <TableHeader className={HEADER_CLASS}>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 w-12 px-4 py-0 align-middle">
                      <Checkbox
                        aria-label={`Select every ${journal ? "voucher" : "row"} on this page`}
                        checked={allOnPage}
                        onCheckedChange={(checked) =>
                          onSelectedChange(
                            checked ? pageRows.map((x) => x.id) : []
                          )
                        }
                      />
                    </TableHead>
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={cn(
                          "h-11 whitespace-nowrap px-4 py-0 align-middle",
                          T.head,
                          column.className
                        )}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                    {/* Pinned right, opaque, so the kebab stays in reach when
                        a narrow window scrolls the register sideways. */}
                    <TableHead
                      className={cn(
                        "sticky right-0 z-10 h-11 w-20 bg-pi-head-bg px-4 py-0 align-middle",
                        T.head
                      )}
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((item) => {
                    const ticked = selected.includes(item.id);
                    // Row hover wash, or the brand tint once ticked.
                    const ground = ticked
                      ? "bg-pi-brand-tint"
                      : "transition-colors duration-100 group-hover:bg-pi-row-hover motion-reduce:transition-none";
                    return (
                      <TableRow
                        key={item.id}
                        aria-selected={ticked}
                        className="group cursor-pointer hover:bg-transparent"
                        onClick={() => onOpen(item)}
                      >
                        <TableCell
                          className={cn(
                            "h-14 px-4 py-0 align-middle",
                            ground,
                            ticked && "shadow-[inset_2px_0_0_var(--pi-brand)]"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            aria-label={`Select ${item.form.voucherNo || item.file.name}`}
                            checked={ticked}
                            onCheckedChange={(checked) =>
                              onSelectedChange(
                                checked
                                  ? [...selected, item.id]
                                  : selected.filter((id) => id !== item.id)
                              )
                            }
                          />
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={cn(
                              "h-14 max-w-[240px] px-4 py-0 align-middle",
                              T.cell,
                              ground,
                              column.className
                            )}
                          >
                            {column.cell(item)}
                          </TableCell>
                        ))}
                        <TableCell
                          className={cn(
                            "sticky right-0 z-[1] h-14 px-4 py-0 align-middle",
                            !ticked && "bg-background",
                            ground
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${item.form.voucherNo || item.file.name}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => onOpen(item)}>
                                {item.status === "Approved"
                                  ? "View voucher"
                                  : "Open in Inbox"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => onDelete(item)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!pageRows.length && (
                <EmptyBlock
                  title={
                    tab === "all"
                      ? `Nothing posted here yet`
                      : tab === "review"
                        ? "Nothing waiting for review"
                        : "Nothing uploaded yet"
                  }
                  body={
                    tab === "all"
                      ? `Approve a ${route === "AP" ? "bill" : route === "AR" ? "sales invoice" : "journal"} in the Inbox and the voucher it creates is listed here.`
                      : "Documents arrive here as they are received."
                  }
                />
              )}
            </div>

            {/* The Inbox footer: rows per page, then the page controls. */}
            <div className="sticky left-0 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-pi-line bg-background px-6 py-2">
              <div className="flex items-center gap-2">
                <span className={cn(T.cell, "text-foreground")}>
                  Rows per page:
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    onPageSizeChange(Number(value));
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
                    {pageSizes.map((n) => (
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
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft />
                </PageButton>
                <span
                  className={cn(T.cell, "px-2 tabular-nums text-foreground")}
                >
                  {rows.length ? `${start} - ${end} of ${rows.length}` : "0 of 0"}
                </span>
                <PageButton
                  label="Next page"
                  disabled={end >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight />
                </PageButton>
                <PageButton
                  label="Last page"
                  disabled={end >= rows.length}
                  onClick={() => setPage(lastPage)}
                >
                  <ChevronsRight />
                </PageButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
