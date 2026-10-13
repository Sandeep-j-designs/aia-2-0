import { useEffect, useRef } from "react";
import type { Item, Status } from "@/components/inbox/v2/store";
import { ROUTE_MODULE } from "@/config/pages/notifications/kinds";
import { notificationActions } from "@/hooks/pages/notifications/use-notifications";
import type { NotificationInput } from "@/types/pages/notifications";

/**
 * Turns the Inbox queue's changes into notices.
 *
 * It watches the store rather than being called from it, so store.ts stays
 * the plain document store it is, and every way a document changes — a
 * timer finishing a read, a bulk approve, a teammate's edit arriving — is
 * covered by one comparison.
 *
 * On its first run it raises what is already true (documents waiting,
 * unreadable files, duplicates), dated from when each document arrived, so
 * the bell opens on the seeded queue rather than empty.
 *
 * DEV: production raises these server-side when a document's status
 * changes (the same transitions that write the Inbox audit events). Delete
 * this hook and its call in workspace.tsx once the realtime feed is wired.
 */

type Snap = {
  status: Status;
  route: Item["route"];
  switching: boolean;
  resync: boolean;
  company: string;
};

const CHANNEL: Record<Item["source"], string> = {
  email: "email",
  whatsapp: "WhatsApp",
  upload: "upload",
};

/** Documents in the queue: not raised by hand, not an old voucher. */
const queueDocs = (items: Item[]) =>
  items.filter((x) => !x.created && !x.priorVoucher);

const snap = (x: Item): Snap => ({
  status: x.status,
  route: x.route,
  switching: !!x.routeSwitch,
  resync: !!x.resyncNeeded,
  company: x.company,
});

const BOOK_NAME: Record<Item["route"], string> = {
  AP: "Purchases",
  AR: "Sales",
  JV: "Journal Vouchers",
};

const itemHref = (x: Item) => `/inbox?id=${encodeURIComponent(x.id)}`;

/** What a duplicate matches, as the accountant would recognise it. */
const matchOf = (x: Item, items: Item[]) => {
  if (x.hardRef) {
    const posted = items.find((y) => y.id === x.hardRef);
    return posted?.form.voucherNo || x.hardRef;
  }
  if (x.softRef) {
    const other = items.find((y) => y.id === x.softRef);
    return other?.form.voucherNo || other?.file.name || "";
  }
  return "";
};

const reviewReady = (x: Item, createdAt?: string): NotificationInput => ({
  companyId: x.company,
  kind: "review_ready",
  module: ROUTE_MODULE[x.route],
  data: { route: x.route, count: 1 },
  // The notice names one book, so it opens that book's Needs Review — the
  // same list the review screen then walks and returns to.
  target: {
    href: `/inbox?module=${x.route}&tab=review`,
    label: `${BOOK_NAME[x.route]} › Needs Review`,
  },
  actor: { kind: "ai" },
  refs: [x.id],
  groupKey: `review:${x.route}`,
  createdAt,
});

const failed = (x: Item, createdAt?: string): NotificationInput => ({
  companyId: x.company,
  kind: "extraction_failed",
  data: { file: x.file.name, reason: x.error || "" },
  target: { href: itemHref(x), label: x.file.name },
  actor: { kind: "ai" },
  refs: [x.id],
  createdAt,
});

const duplicate = (
  x: Item,
  items: Item[],
  createdAt?: string
): NotificationInput => ({
  companyId: x.company,
  kind: "duplicate_detected",
  data: { file: x.file.name, match: matchOf(x, items) },
  target: { href: itemHref(x), label: x.file.name },
  actor: { kind: "ai" },
  refs: [x.id],
  createdAt,
});

const resync = (x: Item): NotificationInput => ({
  companyId: x.company,
  kind: "resync_needed",
  data: { voucher: x.form.voucherNo || x.file.name },
  target: {
    href: `${itemHref(x)}&voucher=1`,
    label: x.form.voucherNo || x.file.name,
  },
  actor: { kind: "user" },
  refs: [x.id],
});

/** The first run: what the queue already holds, dated from arrival. */
const seedFrom = (docs: Item[], all: Item[]) => {
  // Arrivals, one notice per sender, read: they are history by now.
  const arrivals = new Map<string, Item[]>();
  docs
    .filter((x) => x.source !== "upload" && x.status !== "Deleted")
    .forEach((x) => {
      const key = `${x.company}|${x.source}|${x.sender}`;
      arrivals.set(key, [...(arrivals.get(key) ?? []), x]);
    });
  arrivals.forEach((group) => {
    const first = group[0];
    const latest = group
      .map((x) => x.received)
      .sort()
      .at(-1);
    notificationActions.push(
      {
        companyId: first.company,
        kind: "documents_arrived",
        data: {
          count: group.length,
          channel: CHANNEL[first.source],
          sender: first.sender,
        },
        target: { href: "/inbox", label: "Inbox" },
        actor: { kind: "channel", name: first.sender },
        refs: group.map((x) => x.id),
        createdAt: latest,
        readAt: latest,
      },
      { toast: false }
    );
  });
  docs.forEach((x) => {
    if (x.status === "Needs Review")
      notificationActions.push(reviewReady(x, x.received), { toast: false });
    if (x.status === "Failed")
      notificationActions.push(failed(x, x.received), { toast: false });
    if (x.status === "Duplicate")
      notificationActions.push(duplicate(x, all, x.received), {
        toast: false,
      });
    if (x.resyncNeeded) notificationActions.push(resync(x), { toast: false });
  });
};

export const useInboxNotifications = (items: Item[]) => {
  const previous = useRef<Map<string, Snap> | null>(null);

  useEffect(() => {
    const docs = queueDocs(items);
    const before = previous.current;
    previous.current = new Map(docs.map((x) => [x.id, snap(x)]));
    if (!before) {
      seedFrom(docs, items);
      return;
    }

    docs.forEach((x) => {
      const was = before.get(x.id);
      const now = snap(x);

      // New in the queue. Uploads are the user's own doing and already get
      // "Preparing N documents"; email and WhatsApp arrive unasked.
      if (!was) {
        if (x.source !== "upload")
          notificationActions.push(
            {
              companyId: x.company,
              kind: "documents_arrived",
              data: {
                count: 1,
                channel: CHANNEL[x.source],
                sender: x.sender,
              },
              target: { href: "/inbox", label: "Inbox" },
              actor: { kind: "channel", name: x.sender },
              refs: [x.id],
              groupKey: `arrived:${x.source}:${x.sender}`,
            },
            { toast: false }
          );
        if (x.status === "Needs Review")
          notificationActions.push(reviewReady(x));
        return;
      }

      const left = (status: Status) =>
        was.status === status && now.status !== status;
      const entered = (status: Status) =>
        was.status !== status && now.status === status;

      if (
        left("Needs Review") ||
        (was.route !== now.route && was.status === "Needs Review")
      )
        notificationActions.resolve(x.company, ["review_ready"], x.id);
      if (left("Failed"))
        notificationActions.resolve(x.company, ["extraction_failed"], x.id);
      if (left("Duplicate"))
        notificationActions.resolve(x.company, ["duplicate_detected"], x.id);

      if (
        now.status === "Needs Review" &&
        (entered("Needs Review") || was.route !== now.route)
      )
        notificationActions.push(reviewReady(x));
      if (entered("Failed")) notificationActions.push(failed(x));
      if (entered("Duplicate"))
        notificationActions.push(duplicate(x, items), { toast: false });

      // A "Post as" change takes the backend 20 seconds or more; you will
      // have moved on by the time it lands.
      if (was.switching && !now.switching)
        notificationActions.push({
          companyId: x.company,
          kind: "route_switch_done",
          module: ROUTE_MODULE[x.route],
          data: { file: x.file.name, voucher: x.form.voucherType },
          target: { href: itemHref(x), label: x.file.name },
          actor: { kind: "ai" },
          refs: [x.id],
        });

      if (!was.resync && now.resync) notificationActions.push(resync(x));
      if (was.resync && !now.resync)
        notificationActions.resolve(x.company, ["resync_needed"], x.id);
    });

    // Gone from the queue (a company reset, a scenario switch).
    before.forEach((was, id) => {
      if (previous.current?.has(id)) return;
      notificationActions.resolve(
        was.company,
        [
          "review_ready",
          "extraction_failed",
          "duplicate_detected",
          "resync_needed",
        ],
        id
      );
    });
  }, [items]);
};
