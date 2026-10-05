import { routes, type Item, type Route } from "@/components/inbox/v2/store";
import {
  SYNC_MASTER_MODULES,
  SYNC_ROUTE_MODULES,
} from "@/config/pages/inbox/sync";
import type {
  SyncDoc,
  SyncModule,
  SyncModuleKey,
} from "@/types/pages/inbox/sync";

/**
 * Unified Inbox — what a sync would push.
 *
 * Approved is the whole rule. The Inbox exists to put a human in front of a
 * document before it reaches Tally, so an unapproved document is not a thing
 * the Sync button may quietly send — the set grows as the accountant works
 * through the queue, which is the product's loop showing up in a number.
 *
 * Already-synced ids are excluded because a second press must not push the
 * same voucher twice.
 */
export const syncableItems = (
  items: Item[],
  syncedIds: Set<string>,
  route: Route | null
): Item[] =>
  items.filter(
    (item) =>
      item.status === "Approved" &&
      !syncedIds.has(item.id) &&
      (route === null || item.route === route)
  );

/**
 * The modules offered in the "Sync to Tally" modal.
 *
 * `current` is the bucket the workspace is already scoped to — it maps to the
 * Figma's "Current Module" block, the featured card that names what the user
 * pressed Sync on. `included` is everything else: the remaining routes, then
 * the masters.
 *
 * On the Inbox proper there is no module scope, and `current` is null. The
 * Inbox is not a module — it is all of them at once — so there is nothing for
 * a "Current Module" card to name, and nominating the largest bucket for the
 * role only invented a lead the screen never had. Every bucket goes in one
 * flat grid instead. The featured card stays on the AP / AR / JV pages, where
 * it is still answering the question it was drawn for.
 */
export const buildSyncModules = (
  items: Item[],
  syncedIds: Set<string>,
  route: Route | null
): { current: SyncModule | null; included: SyncModule[] } => {
  const routeModules: SyncModule[] = routes.map((key) => ({
    key,
    ...SYNC_ROUTE_MODULES[key],
    count: syncableItems(items, syncedIds, key).length,
  }));

  const current =
    route === null
      ? null
      : (routeModules.find((module) => module.key === route) ??
        routeModules[0]);

  const included: SyncModule[] = [
    ...routeModules.filter((module) => module.key !== current?.key),
    ...SYNC_MASTER_MODULES,
  ];

  return { current, included };
};

/**
 * Every module the modal is offering, lead first where there is one. The Inbox
 * has no lead, so this is just the grid.
 */
export const syncModuleList = (
  current: SyncModule | null,
  included: SyncModule[]
): SyncModule[] => (current ? [current, ...included] : included);

/**
 * Which modules start checked.
 *
 * Scoped to a module, the one you pressed Sync on — and only that one, because
 * naming a bucket and then sending three is not what the press said.
 *
 * On the Inbox the press says the opposite: it carries no scope, so everything
 * with something in it starts checked and the modal opens on the sync the user
 * came to do. Leaving one arbitrary bucket ticked there made the common case —
 * send what's approved — a chore of ticking the other two, and the uncommon
 * case no easier. Empty buckets stay off: their cards are already disabled,
 * and a checked box over a zero claims work that isn't there.
 */
export const defaultSelectedKeys = (
  current: SyncModule | null,
  included: SyncModule[]
): Set<SyncModuleKey> =>
  current
    ? new Set<SyncModuleKey>([current.key])
    : new Set<SyncModuleKey>(
        included.filter((module) => module.count > 0).map((module) => module.key)
      );

/**
 * The modules a run will actually send, in the order it sends them.
 *
 * Current module first, then the rest in route order. Masters are dropped —
 * they carry no documents of their own; checking one only says "create what
 * these vouchers need", which the run does anyway.
 */
export const runModulesFor = (
  current: SyncModule | null,
  included: SyncModule[],
  selectedKeys: Set<SyncModuleKey>
): SyncModule[] =>
  syncModuleList(current, included).filter(
    (module) =>
      selectedKeys.has(module.key) &&
      module.count > 0 &&
      routes.includes(module.key as Route)
  );

/**
 * The documents a run will push, in the order the progress list walks them.
 *
 * Grouped by module, then oldest first inside each one. Module-at-a-time is
 * what makes the multi-module rollup legible — interleaving by date would
 * leave every module sitting at a part-finished count for the whole run, so
 * nothing on that screen would ever read as done.
 */
export const buildSyncQueue = (
  items: Item[],
  syncedIds: Set<string>,
  runModules: SyncModule[]
): SyncDoc[] =>
  runModules.flatMap((module) =>
    syncableItems(items, syncedIds, module.key as Route)
      .slice()
      .sort((a, b) => a.received.localeCompare(b.received))
      .map((item) => ({
        id: item.id,
        // The voucher no is what Tally will show. Falling back to the file name
        // keeps the row identifiable for anything approved without one.
        label: item.form.voucherNo || item.file.name,
        route: item.route,
        state: "queued" as const,
      }))
  );

/** Total across the checked modules, for the confirm button and the counter. */
export const countSelected = (
  modules: SyncModule[],
  selectedKeys: Set<SyncModuleKey>
): number =>
  modules
    .filter((module) => selectedKeys.has(module.key))
    .reduce((total, module) => total + module.count, 0);
