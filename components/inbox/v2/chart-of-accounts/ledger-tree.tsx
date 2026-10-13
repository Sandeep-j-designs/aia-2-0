import React, { useMemo, useState } from "react";
import {
  Ban,
  ChevronRight,
  CircleCheck,
  CloudUpload,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  FolderTree,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import {
  ROOT_KEY,
  pathKey,
  searchCoa,
} from "@/hooks/pages/inbox/use-chart-of-accounts";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import usePinEdges from "@/hooks/pages/inbox/use-pin-edges";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import type {
  AccountingMastersCounts,
  CoaTreeNode,
} from "@/types/pages/inbox/chart-of-accounts";
import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
} from "@/components/inbox/v2/table-sizing";
import {
  EmptyBlock,
  HeaderCell,
} from "@/components/inbox/v2/banking/table-parts";
import { PageDialog, T } from "@/components/inbox/v2/ui";
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
  SyncChip,
  PAGE_CHROME,
  PAGE_SCROLLER,
  SCROLLER_BOX,
  TABLE_SHELL,
  cellGround,
  syncStateOf,
} from "./master-parts";

/**
 * Chart of Accounts — the group and ledger tree.
 *
 * Production: components/accounting-masters/index.tsx, ledger-tab/* and the
 * shared components/common/async-tree-items. One tab ("Groups (N) & Ledgers
 * (M)"), a search that flattens the tree into matches with their path, and a
 * tree whose groups open in place. Ledgers that never reached Tally (or
 * failed to) can be ticked and synced.
 *
 * Drawn as the reference app's Chart of Accounts master register
 * (Precision Indigo): eyebrow and title, summary cards, then the tree in a
 * white table card — head strip, hairline rows, 44px group bands and 56px
 * ledger rows, a pinned checkbox column and a pinned actions column.
 */

type ColumnKey = "name" | "nature" | "subGroups" | "ledgers" | "sync";
const COLUMNS: {
  key: ColumnKey;
  label: string;
  align?: "right";
}[] = [
  { key: "name", label: "Name" },
  { key: "nature", label: "Nature" },
  { key: "subGroups", label: "Sub Group Count", align: "right" },
  { key: "ledgers", label: "Ledger Count", align: "right" },
  { key: "sync", label: "Tally sync" },
];
const SHOWN = COLUMNS.map((c) => c.key);

/**
 * Under TABLE-RESIZING.md: no minimum below the header's own label. The
 * minimums carry the Precision Indigo 16px header padding (+8 over 12px), and
 * Tally sync is wide enough for its dot-chip ("Not synced").
 */
const COA_SIZES: ColumnSizes = {
  name: { min: 248, preferred: 460, max: 960 },
  nature: { min: 104, preferred: 160, max: 260 },
  subGroups: { min: 136, preferred: 160, max: 220 },
  ledgers: { min: 120, preferred: 150, max: 220 },
  sync: { min: 132, preferred: 140, max: 140 },
};

const isLedger = (node: CoaTreeNode) => !!node.accountUuid;
const syncOf = (node: CoaTreeNode) => node.thirdPartySyncStatus || "not_synced";

/** production's isCheckboxEnable: only what has not reached Tally. */
const canSelect = (node: CoaTreeNode) =>
  isLedger(node) &&
  ["not_synced", "event_creations_failed", "event_processing_failed"].includes(
    syncOf(node)
  );

const txnsOf = (node: CoaTreeNode) =>
  Number(node.transactionCount ?? node.txnCount ?? 0) || 0;

/**
 * production's SyncStatus tooltip over SyncStatusIcon, drawn as a Precision
 * Indigo dot-chip. Not synced has no tooltip, as production draws nothing.
 */
const SyncCell = ({ node }: { node: CoaTreeNode }) => {
  const status = syncOf(node);
  const product = node.thirdPartyProduct || "";
  const state = syncStateOf(status);
  const [title, detail] =
    state === "synced"
      ? [`Synced ${product ? `to ${product}` : ""}`, ""]
      : state === "syncing"
        ? [
            `Syncing to ${product.toLowerCase()}...`,
            "Updates will appear shortly",
          ]
        : state === "failed"
          ? ["Failed to Sync", node.thirdPartySyncMessage ?? ""]
          : [undefined, undefined];
  // -ml-2: the chip's own padding, so its dot sits on the header's line.
  return (
    <SyncChip status={status} title={title} detail={detail} className="-ml-2" />
  );
};

type Row = { node: CoaTreeNode; level: number; expanded: boolean };

type Props = {
  nodesByParent: Record<string, CoaTreeNode[]>;
  allNodes: CoaTreeNode[];
  counts: AccountingMastersCounts;
  onAdd: () => void;
  onEdit: (node: CoaTreeNode) => void;
  onDelete: (node: CoaTreeNode) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const LedgerTree = ({
  nodesByParent,
  allNodes,
  counts,
  onAdd,
  onEdit,
  onDelete,
  notify,
}: Props) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<CoaTreeNode | null>(null);
  const searching = search.trim().length > 0;

  // The tree flattened to the rows on screen: each open group's children
  // follow it, one level deeper.
  const browseRows = useMemo(() => {
    const rows: Row[] = [];
    const walk = (key: string, level: number) =>
      (nodesByParent[key] ?? []).forEach((node) => {
        const own = pathKey(node.path);
        const open = !isLedger(node) && expanded.has(own);
        rows.push({ node, level, expanded: open });
        if (open) walk(own, level + 1);
      });
    walk(ROOT_KEY, 0);
    return rows;
  }, [nodesByParent, expanded]);

  const results = useMemo(
    () => (searching ? searchCoa(allNodes, search) : []),
    [allNodes, search, searching]
  );
  const rows: Row[] = searching
    ? results.map((node) => ({ node, level: 0, expanded: false }))
    : browseRows;

  // Like production, "select all" reaches the ledgers already loaded — here,
  // the ones on screen.
  const selectableIds = rows
    .map((r) => r.node)
    .filter(canSelect)
    .map((n) => n.accountUuid as string);
  const selectedOnScreen = selectableIds.filter((id) => selection[id]).length;
  const headerChecked: boolean | "indeterminate" =
    selectableIds.length > 0 && selectedOnScreen === selectableIds.length
      ? true
      : selectedOnScreen > 0
        ? "indeterminate"
        : false;

  const toggle = (node: CoaTreeNode) => {
    const key = pathKey(node.path);
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resize = useColumnResize({
    shown: SHOWN,
    sizes: COA_SIZES,
    storageKey: "coa.tree.widths.v1",
  });
  // The resize hook's element is the page scroller, so the pinned edges
  // shade against the same scroll.
  const pinEdges = usePinEdges(resize.gridElement);

  const askDelete = (node: CoaTreeNode) => {
    // production's handleDelete: anything Tally already has stays.
    if (syncOf(node) !== "not_synced") {
      notify("Synced ledger cannot be deleted", "error");
      return;
    }
    setDeleting(node);
  };


  // The summary cards: what the tree already knows, counted. Read-only.
  const summary = useMemo(() => {
    const ledgers = allNodes.filter(isLedger);
    const states = ledgers.map((n) => syncStateOf(syncOf(n)));
    return {
      ledgers: ledgers.length,
      failed: states.filter((s) => s === "failed").length,
      notSynced: states.filter((s) => s === "not_synced").length,
      synced: states.filter((s) => s === "synced").length,
      unused: ledgers.filter((n) => txnsOf(n) === 0).length,
    };
  }, [allNodes]);
  const unsynced = summary.failed + summary.notSynced;
  const ledgerTotal = counts.totalLedgerCount || summary.ledgers;
  const groupTotal =
    counts.totalGroupCount || allNodes.filter((n) => !isLedger(n)).length;

  const cell = (key: ColumnKey, row: Row) => {
    const { node, level } = row;
    const ledger = isLedger(node);
    switch (key) {
      case "name": {
        const txns = txnsOf(node);
        const name = (
          <span
            className={cn(
              "block min-w-0 truncate leading-tight",
              ledger
                ? "text-[14px] font-medium text-pi-ink"
                : "text-[13px] font-semibold text-pi-ink"
            )}
            title={node.label}
          >
            {node.label}
          </span>
        );
        if (searching)
          return (
            <div className="min-w-0">
              {name}
              <div className="mt-0.5 truncate text-[12px] leading-tight text-pi-faint">
                {/* A group's path ends with itself; show where it sits. */}
                {(ledger ? node.path : node.path.slice(0, -1)).join(" / ") ||
                  "Root"}
              </div>
            </div>
          );
        return (
          <div
            className="flex min-w-0 items-center gap-2"
            style={{ paddingLeft: level * 20 }}
          >
            {node.isLeaf ? (
              <span className="h-7 w-5 flex-none" />
            ) : (
              <button
                type="button"
                aria-label={`${row.expanded ? "Collapse" : "Expand"} ${node.label}`}
                aria-expanded={row.expanded}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(node);
                }}
                className="grid h-7 w-5 flex-none place-items-center rounded-xs text-pi-faint hover:bg-pi-fill hover:text-pi-ink"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
                    row.expanded && "rotate-90"
                  )}
                />
              </button>
            )}
            {ledger ? (
              <div className="min-w-0">
                {name}
                <div className="mt-0.5 truncate text-[12px] leading-tight text-pi-faint">
                  {txns
                    ? `${txns} ${txns === 1 ? "transaction" : "transactions"}`
                    : "No transactions yet"}
                </div>
              </div>
            ) : (
              name
            )}
          </div>
        );
      }
      case "sync":
        return ledger ? <SyncCell node={node} /> : null;
      case "nature":
        return ledger ? null : (
          <span className="truncate text-[13px] text-pi-body">
            {node.nature || "-"}
          </span>
        );
      case "subGroups":
        return ledger ? null : (
          <span
            className={cn(
              "text-[13px] tabular-nums",
              node.subGroups ? "text-pi-body" : "text-pi-faint"
            )}
          >
            {node.subGroups}
          </span>
        );
      case "ledgers":
        return ledger ? null : (
          <span
            className={cn(
              "text-[13px] tabular-nums",
              node.ledgers ? "text-pi-body" : "text-pi-faint"
            )}
          >
            {node.ledgers}
          </span>
        );
    }
  };

  return (
    <div className={SCROLLER_BOX}>
      {/* The column-resize hook measures its element's width and horizontal
        scroll, and the page scroller is now the element that has both. */}
      <div ref={resize.gridRef} className={PAGE_SCROLLER}>
        <div className={PAGE_CHROME}>
          <MasterHeading
            eyebrow="Accounting workspace"
            title="Chart of Accounts"
            meta={`${ledgerTotal} ${ledgerTotal === 1 ? "ledger" : "ledgers"} in ${groupTotal} ${groupTotal === 1 ? "group" : "groups"}`}
            actions={
              // Sync lives in the top bar only (8 Oct 2026).
              <Button onClick={onAdd}>
                <Plus />
                Add Ledger
              </Button>
            }
          />

          <SummaryGrid>
            <SummaryCard
              hero
              label="Not synced to Tally"
              icon={<CloudUpload />}
              value={unsynced}
              unit={unsynced === 1 ? "ledger" : "ledgers"}
              meta={
                unsynced
                  ? `${summary.failed} failed · ${summary.notSynced} not synced`
                  : "Every ledger is in Tally"
              }
            />
            <SummaryCard
              label="Synced to Tally"
              icon={<CircleCheck />}
              value={summary.synced}
              unit={summary.synced === 1 ? "ledger" : "ledgers"}
              meta={`of ${summary.ledgers} ${summary.ledgers === 1 ? "ledger" : "ledgers"}`}
            />
            <SummaryCard
              label="Unused"
              icon={<Ban />}
              value={summary.unused}
              unit={summary.unused === 1 ? "ledger" : "ledgers"}
              meta="No transactions posted yet"
            />
          </SummaryGrid>

          <MasterToolbar>
            <MasterTabs
              value="ledger"
              tabs={[
                {
                  id: "ledger",
                  // production's formatLedgerMastersTabLabel
                  label:
                    counts.totalGroupCount && counts.totalLedgerCount
                      ? `Groups (${counts.totalGroupCount}) & Ledgers (${counts.totalLedgerCount})`
                      : "Groups & Ledgers",
                },
              ]}
            />
            <MasterSearch
              label="Search Ledgers or groups"
              placeholder="Search Ledgers or groups"
              value={search}
              onChange={setSearch}
            />
          </MasterToolbar>
        </div>

        <div className={TABLE_SHELL}>
          <div className="min-w-0 flex-1" {...pinEdges}>
            <Table
              aria-label="Chart of Accounts"
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
                      aria-label="Select all ledgers"
                      checked={headerChecked}
                      disabled={!selectableIds.length}
                      onCheckedChange={(checked) =>
                        setSelection((current) => {
                          const next = { ...current };
                          selectableIds.forEach((id) => {
                            if (checked) next[id] = true;
                            else delete next[id];
                          });
                          return next;
                        })
                      }
                    />
                  </TableHead>
                  {COLUMNS.map(({ key, label, align }) => (
                    <HeaderCell
                      key={key}
                      columnKey={key}
                      label={label}
                      sizes={COA_SIZES}
                      resize={resize}
                      align={align}
                      resizable={key !== "sync"}
                    />
                  ))}
                  <TableHead
                    style={{ width: ACTIONS_WIDTH }}
                    className={cn(HEAD_BOOKEND, "pin-edge-r right-0")}
                  >
                    <span
                      className={cn(T.head, "flex h-4 items-center truncate")}
                    >
                      Actions
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const { node } = row;
                  const ledger = isLedger(node);
                  const id = node.accountUuid ?? "";
                  const ticked = ledger && !!selection[id];
                  // Group rows are the reference's register-group-row: a
                  // quieter 44px band on the head ground; ledgers are 56px.
                  const rest =
                    ledger || searching ? "bg-background" : "bg-pi-head-bg";
                  const height = ledger || searching ? "h-14" : "h-11";
                  return (
                    <TableRow
                      key={`${node.id}-${row.level}`}
                      data-node={ledger ? "ledger" : "group"}
                      aria-selected={ticked || undefined}
                      onClick={() => (ledger ? onEdit(node) : toggle(node))}
                      className={cn(
                        "group cursor-pointer hover:bg-transparent",
                        ticked && "bg-pi-brand-tint hover:bg-pi-brand-tint",
                        !ledger && node.isLeaf && !searching && "cursor-default"
                      )}
                    >
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "pin-edge-l sticky left-0 z-[1] px-3 py-0 align-middle",
                          height,
                          cellGround(ticked, true, rest),
                          ticked && SELECTED_EDGE
                        )}
                      >
                        {ledger ? (
                          <Checkbox
                            aria-label={`Select ${node.label}`}
                            checked={ticked}
                            disabled={!canSelect(node)}
                            onCheckedChange={(checked) =>
                              setSelection((current) => {
                                const next = { ...current };
                                if (checked) next[id] = true;
                                else delete next[id];
                                return next;
                              })
                            }
                          />
                        ) : null}
                      </TableCell>
                      {COLUMNS.map(({ key, align }) => (
                        <TableCell
                          key={key}
                          className={cn(
                            "overflow-hidden px-4 py-0 align-middle",
                            height,
                            cellGround(ticked, true, rest),
                            T.cell,
                            align === "right" && "text-right"
                          )}
                        >
                          <div
                            className={cn(
                              "flex min-w-0 flex-col justify-center overflow-hidden",
                              ledger || searching ? "h-[55px]" : "h-[43px]",
                              align === "right" && "items-end",
                              key === "sync" && "items-start"
                            )}
                          >
                            {cell(key, row)}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "pin-edge-r sticky right-0 z-[1] px-4 py-0 align-middle",
                          height,
                          cellGround(ticked, true, rest)
                        )}
                      >
                        {ledger ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${node.label}`}
                                className="size-7 text-pi-faint hover:text-pi-ink"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onSelect={() => onEdit(node)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {Number(node.transactionCount ?? 0) === 0 ? (
                                <DropdownMenuItem
                                  onSelect={() => askDelete(node)}
                                  className="text-pi-danger focus:bg-pi-danger-bg focus:text-pi-danger"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {!rows.length && (
              <EmptyBlock
                {...(searching
                  ? {
                      title: "No ledgers or groups match your search",
                      body: "Try part of the name, or the group it sits under.",
                      filters: [{ label: `Search: “${search.trim()}”` }],
                      onClear: () => setSearch(""),
                    }
                  : {
                      icon: FolderTree,
                      title: "No ledgers yet",
                      body: "Sync your chart of accounts from Tally, or add a ledger here. Groups and ledgers appear as one tree.",
                      actions: (
                        <Button onClick={onAdd}>
                          <Plus />
                          Add Ledger
                        </Button>
                      ),
                    })}
              />
            )}
          </div>
        </div>
        <PageDialog
          open={!!deleting}
          title="Delete ledger?"
          onClose={() => setDeleting(null)}
          className="max-w-[460px]"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                isDestructive
                onClick={() => {
                  if (deleting) onDelete(deleting);
                  setDeleting(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete ledger
              </Button>
            </>
          }
        >
          <p className={T.value}>
            <span className="font-semibold text-foreground">
              {deleting?.label}
            </span>{" "}
            has no transactions and has not been synced to Tally. Deleting it
            removes it from AI Accountant for good.
          </p>
        </PageDialog>
      </div>
      <OverlayScrollbars scroller={resize.gridElement} />
    </div>
  );
};

export default LedgerTree;
