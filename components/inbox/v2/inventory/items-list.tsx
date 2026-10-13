import React, { useMemo, useState } from "react";
import {
  Boxes,
  CloudUpload,
  Coins,
  Plus,
  Trash2,
  Undo2,
  Package,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import usePinEdges from "@/hooks/pages/inbox/use-pin-edges";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import {
  inventoryActions,
  isCheckboxEnable,
  isSyncInProgress,
} from "@/hooks/pages/inbox/use-inventory";
import type { StockItemRow } from "@/types/pages/inbox/inventory";
import { ColumnFilter } from "@/components/inbox/v2/filter-panel";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
} from "@/components/inbox/v2/table-sizing";
import { AmountText, PageDialog, T } from "@/components/inbox/v2/ui";
import {
  EmptyBlock,
  HeaderCell,
  Pager,
  nextSort,
  sortRows,
  type SortState,
} from "@/components/inbox/v2/banking/table-parts";
import {
  HEAD_BOOKEND,
  MASTER_HEADER_CLASS,
  MASTER_TABLE_CLASS,
  MasterHeading,
  MasterSearch,
  MasterTabs,
  MasterToolbar,
  SELECTED_EDGE,
  SummaryCard,
  SummaryGrid,
  PAGE_CHROME,
  PAGE_SCROLLER,
  SCROLLER_BOX,
  TABLE_SHELL,
  cellGround,
} from "@/components/inbox/v2/chart-of-accounts/master-parts";
import ItemActionsMenu from "./item-actions-menu";
import SyncStatus from "./sync-status";
import { ITEM_SIZES } from "./table-sizing";

/**
 * Inventory Masters → Items: every stock item, its Tally sync state and its
 * opening stock.
 *
 * Production: components/inventory-masters/index.tsx, items-tab.tsx,
 * items-table-columns.tsx. Drawn as the reference app's Inventory master
 * register (Precision Indigo; chart-of-accounts/master-parts.tsx) instead of
 * production's DataTable.
 */

type ColumnKey =
  "name" | "sync" | "under" | "category" | "unit" | "openingStocks";
const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "under", label: "Under" },
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit" },
  { key: "openingStocks", label: "Opening Stocks" },
  { key: "sync", label: "Tally sync" },
];
const SHOWN = COLUMNS.map((c) => c.key);
type FilterKey = "under" | "category" | "unit";
const FILTER_LABEL: Record<FilterKey, string> = {
  under: "Under",
  category: "Category",
  unit: "Unit",
};

const valueOf = (row: StockItemRow) => Number(row.openingStockValue || 0);
const SORT_VALUE: Partial<
  Record<ColumnKey, (row: StockItemRow) => string | number>
> = {
  name: (r) => r.name,
  under: (r) => r.under,
  category: (r) => r.category,
  unit: (r) => r.unit,
  openingStocks: valueOf,
};

type Props = {
  company: string;
  rows: StockItemRow[];
  onCreate: () => void;
  onEdit: (itemUuid: string) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const ItemsList = ({ company, rows, onCreate, onEdit, notify }: Props) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState<ColumnKey>>(null);
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    under: [],
    category: [],
    unit: [],
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<StockItemRow | null>(null);

  const filterOptions = useMemo(() => {
    const of = (pick: (r: StockItemRow) => string) =>
      [...new Set(rows.map(pick))]
        .sort()
        .map((value) => ({ value, label: value }));
    return {
      under: of((r) => r.under),
      category: of((r) => r.category),
      unit: of((r) => r.unit),
    };
  }, [rows]);

  // production searches name, under, category and unit server-side.
  // DEV: GET /api/inventory-masters/items?search=…&page=…&limit=…
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (!term ||
          [r.name, r.under, r.category, r.unit].some((v) =>
            v.toLowerCase().includes(term)
          )) &&
        (Object.keys(filters) as FilterKey[]).every(
          (key) => !filters[key].length || filters[key].includes(r[key])
        )
    );
    return sortRows(filtered, sort, SORT_VALUE);
  }, [rows, search, filters, sort]);
  const pageRows = visible.slice(page * pageSize, (page + 1) * pageSize);

  // A row that has synced since it was ticked can no longer be picked.
  const selectable = (r: StockItemRow) =>
    isCheckboxEnable(r.thirdPartySyncStatus);
  const ticked = selected.filter((id) =>
    rows.some((r) => r.itemUuid === id && selectable(r))
  );
  const pickable = pageRows.filter(selectable);
  const allOnPage =
    !!pickable.length &&
    pickable.every((r) => ticked.includes(r.itemUuid as string));

  const resize = useColumnResize({
    shown: SHOWN,
    sizes: ITEM_SIZES,
    storageKey: "inventory.items.widths.v1",
  });
  // The resize hook's element is the page scroller, so the pinned edges
  // shade against the same scroll.
  const pinEdges = usePinEdges(resize.gridElement);

  const anyFilter = !!(
    search ||
    filters.under.length ||
    filters.category.length ||
    filters.unit.length
  );
  const resetFilters = () => {
    setSearch("");
    setFilters({ under: [], category: [], unit: [] });
    setPage(0);
  };


  const handleEdit = (row: StockItemRow) => {
    if (isSyncInProgress(row.thirdPartySyncStatus)) {
      notify("Cannot edit an item while sync is in progress", "warning");
      return;
    }
    onEdit(row.itemUuid as string);
  };

  const confirmDelete = () => {
    if (!deleting?.itemUuid) return;
    inventoryActions.deleteItem(company, deleting.itemUuid);
    setSelected((current) => current.filter((id) => id !== deleting.itemUuid));
    setDeleting(null);
    notify("Stock item deleted successfully");
  };

  // The summary cards: what the list already knows, counted. Read-only.
  const summary = useMemo(() => {
    const failed = rows.filter(
      (r) =>
        r.thirdPartySyncStatus === "event_creations_failed" ||
        r.thirdPartySyncStatus === "event_processing_failed"
    ).length;
    const unsynced = rows.filter((r) =>
      isCheckboxEnable(r.thirdPartySyncStatus)
    ).length;
    return {
      unsynced,
      failed,
      notSynced: unsynced - failed,
      value: rows.reduce((n, r) => n + valueOf(r), 0),
      withStock: rows.filter((r) => valueOf(r) > 0).length,
      groups: new Set(rows.map((r) => r.under || "Primary")).size,
      categories: new Set(rows.map((r) => r.category).filter(Boolean)).size,
    };
  }, [rows]);

  const cell = (key: ColumnKey, row: StockItemRow) => {
    switch (key) {
      case "name":
        return (
          <span
            className="truncate text-[14px] font-medium leading-tight text-pi-ink"
            title={row.name}
          >
            {row.name}
          </span>
        );
      case "sync":
        // -ml-2: the chip's own padding, so its dot sits on the header's
        // line.
        return (
          <span className="-ml-2 inline-flex max-w-full">
            <SyncStatus
              status={row.thirdPartySyncStatus || "not_synced"}
              syncDate={row.thirdPartyPostingDate}
              syncProduct={row.thirdPartyProduct}
              syncError={row.thirdPartySyncError || row.thirdPartySyncMessage}
            />
          </span>
        );
      case "under":
        return (
          <span className="truncate text-pi-body" title={row.under}>
            {row.under || "Primary"}
          </span>
        );
      case "category":
        return (
          <span className="truncate text-pi-body" title={row.category}>
            {row.category}
          </span>
        );
      case "unit":
        return (
          <span className="truncate text-pi-body">
            {row.unit || "Not Applicable"}
          </span>
        );
      case "openingStocks":
        return valueOf(row) ? (
          <>
            <span className="truncate text-[14px] tabular-nums">
              <AmountText value={valueOf(row)} />
            </span>
            {Number(row.openingStockQty) ? (
              <span className="mt-0.5 truncate text-[12px] leading-tight text-pi-faint">
                <span className="fig">
                  {Number(row.openingStockQty).toLocaleString("en-IN")}
                </span>{" "}
                {row.unit}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-pi-faint">-</span>
        );
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className={SCROLLER_BOX}>
        {/* The column-resize hook measures its element's width and horizontal
        scroll, and the page scroller is now the element that has both. */}
        <div ref={resize.gridRef} className={PAGE_SCROLLER}>
          <div className={PAGE_CHROME}>
            <MasterHeading
              eyebrow="Inventory workspace"
              title="Inventory Masters"
              meta={
                <>
                  <span className="fig text-pi-body">
                    ₹{Math.round(summary.value).toLocaleString("en-IN")}
                  </span>{" "}
                  opening stock across {rows.length}{" "}
                  {rows.length === 1 ? "item" : "items"}
                </>
              }
              actions={
                // Sync lives in the top bar only (8 Oct 2026).
                <Button onClick={onCreate}>
                  <Plus />
                  Add Item
                </Button>
              }
            />

            <SummaryGrid>
              <SummaryCard
                hero
                label="Not synced to Tally"
                icon={<CloudUpload />}
                value={summary.unsynced}
                unit={summary.unsynced === 1 ? "item" : "items"}
                meta={
                  summary.unsynced
                    ? `${summary.failed} failed · ${summary.notSynced} not synced`
                    : "Every item is in Tally"
                }
              />
              <SummaryCard
                label="Opening stock value"
                icon={<Coins />}
                value={
                  <span className="fig">
                    ₹{Math.round(summary.value).toLocaleString("en-IN")}
                  </span>
                }
                meta={`${summary.withStock} of ${rows.length} ${rows.length === 1 ? "item" : "items"} carry stock`}
              />
              <SummaryCard
                label="Stock groups"
                icon={<Boxes />}
                value={summary.groups}
                unit={summary.groups === 1 ? "group" : "groups"}
                meta={`${summary.categories} ${summary.categories === 1 ? "category" : "categories"}`}
              />
            </SummaryGrid>

            <MasterToolbar>
              <MasterTabs
                value="items"
                tabs={[{ id: "items", label: "Items", count: rows.length }]}
              />
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                {anyFilter && (
                  <Button variant="ghost" onClick={resetFilters}>
                    <Undo2 className="size-3.5" />
                    Reset Filters
                  </Button>
                )}
                <MasterSearch
                  className="sm:w-[320px]"
                  label="Search inventory items"
                  placeholder="Search by name, under, category, or unit"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(0);
                  }}
                />
              </div>
            </MasterToolbar>
          </div>

          <div className={TABLE_SHELL}>
            <div className="min-w-0 flex-1" {...pinEdges}>
              <Table
                style={{ width: resize.tableWidth }}
                className={MASTER_TABLE_CLASS}
              >
                <TableHeader className={MASTER_HEADER_CLASS}>
                  <TableRow>
                    <TableHead
                      style={{ width: SELECT_WIDTH }}
                      className={cn(HEAD_BOOKEND, "pin-edge-l left-0 px-3")}
                    >
                      <Checkbox
                        aria-label="Select every unsynced item on this page"
                        checked={allOnPage}
                        disabled={!pickable.length}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked
                              ? [
                                  ...new Set([
                                    ...ticked,
                                    ...pickable.map(
                                      (r) => r.itemUuid as string
                                    ),
                                  ]),
                                ]
                              : ticked.filter(
                                  (id) =>
                                    !pickable.some((r) => r.itemUuid === id)
                                )
                          )
                        }
                      />
                    </TableHead>
                    {COLUMNS.map(({ key, label }) => {
                      const filterKey =
                        key === "under" || key === "category" || key === "unit"
                          ? key
                          : null;
                      return (
                        <HeaderCell
                          key={key}
                          columnKey={key}
                          label={label}
                          sizes={ITEM_SIZES}
                          resize={resize}
                          align={key === "openingStocks" ? "right" : "left"}
                          sort={
                            key === "sync"
                              ? undefined
                              : sort?.key === key
                                ? sort.dir
                                : "none"
                          }
                          onSort={() => {
                            setSort((current) => nextSort(current, key));
                            setPage(0);
                          }}
                          filter={
                            filterKey ? (
                              <ColumnFilter
                                label={FILTER_LABEL[filterKey]}
                                options={filterOptions[filterKey]}
                                selected={filters[filterKey]}
                                onChange={(next) => {
                                  setFilters((f) => ({
                                    ...f,
                                    [filterKey]: next,
                                  }));
                                  setPage(0);
                                }}
                              />
                            ) : undefined
                          }
                          filterActive={
                            !!filterKey && !!filters[filterKey].length
                          }
                          resizable={key !== "sync"}
                        />
                      );
                    })}
                    <TableHead
                      style={{ width: ACTIONS_WIDTH }}
                      className={cn(HEAD_BOOKEND, "pin-edge-r right-0")}
                    >
                      <span
                        className={cn(
                          T.head,
                          "flex h-4 items-center justify-center truncate"
                        )}
                      >
                        Action
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => {
                    const id = row.itemUuid as string;
                    const isTicked = ticked.includes(id);
                    return (
                      <TableRow
                        key={id}
                        aria-selected={isTicked}
                        onClick={() => handleEdit(row)}
                        className={cn(
                          "group cursor-pointer hover:bg-transparent",
                          isTicked && "bg-pi-brand-tint hover:bg-pi-brand-tint"
                        )}
                      >
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "pin-edge-l sticky left-0 z-[1] h-14 px-3 py-0 align-middle",
                            cellGround(isTicked, true),
                            isTicked && SELECTED_EDGE
                          )}
                        >
                          <Checkbox
                            aria-label={`Select ${row.name}`}
                            checked={isTicked}
                            disabled={!selectable(row)}
                            onCheckedChange={(checked) =>
                              setSelected(
                                checked
                                  ? [...ticked, id]
                                  : ticked.filter((x) => x !== id)
                              )
                            }
                          />
                        </TableCell>
                        {COLUMNS.map(({ key }) => (
                          <TableCell
                            key={key}
                            onClick={
                              key === "sync"
                                ? (e) => e.stopPropagation()
                                : undefined
                            }
                            className={cn(
                              "h-14 overflow-hidden px-4 py-0 align-middle",
                              cellGround(isTicked, false),
                              T.cell,
                              key === "openingStocks" && "text-right"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-[55px] min-w-0 flex-col justify-center overflow-hidden [&>.inline-flex]:self-start",
                                key === "openingStocks" && "items-end"
                              )}
                            >
                              {cell(key, row)}
                            </div>
                          </TableCell>
                        ))}
                        <TableCell
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "pin-edge-r sticky right-0 z-[1] h-14 px-4 py-0 text-center align-middle",
                            cellGround(isTicked, true)
                          )}
                        >
                          <span className="inline-flex">
                            <ItemActionsMenu
                              name={row.name}
                              syncStatus={row.thirdPartySyncStatus || ""}
                              onEdit={() => handleEdit(row)}
                              onDelete={() => setDeleting(row)}
                              notify={notify}
                            />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!pageRows.length && (
                <EmptyBlock
                  {...(anyFilter
                    ? {
                        title: "No stock items match these filters",
                        body: `None of the ${rows.length} items match. Clear the search or filters to see them all.`,
                        filters: [],
                        onClear: resetFilters,
                      }
                    : {
                        icon: Package,
                        title: "No stock items yet",
                        body: "Sync your items from Tally, or add one here. Bills you approve can also create items for the goods on them.",
                        actions: (
                          <Button onClick={onCreate}>
                            <Plus />
                            Add Item
                          </Button>
                        ),
                      })}
                />
              )}
            </div>
          </div>
          {/* PROTOTYPE: production deletes straight from the menu; the designer
          asked for a confirmation first. */}
          <PageDialog
            open={!!deleting}
            title="Delete stock item?"
            onClose={() => setDeleting(null)}
            className="max-w-[460px]"
            footer={
              <>
                <Button variant="outline" onClick={() => setDeleting(null)}>
                  Cancel
                </Button>
                <Button isDestructive onClick={confirmDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete item
                </Button>
              </>
            }
          >
            <p className={T.value}>
              <span className="font-semibold text-foreground">
                {deleting?.name}
              </span>{" "}
              will be removed from Inventory Masters, along with its opening
              stock and godown allocation. This cannot be undone.
            </p>
          </PageDialog>
        </div>
        <OverlayScrollbars scroller={resize.gridElement} />
      </div>

      {/* Below the page scroller, not inside it: the pager stays at the bottom
        of the viewport, and the horizontal bar ends above it. */}
      <Pager
        page={page}
        pageSize={pageSize}
        total={visible.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default ItemsList;
