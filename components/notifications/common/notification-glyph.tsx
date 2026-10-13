import {
  Cloud,
  CloudAlert,
  Copy,
  FileSpreadsheet,
  FileWarning,
  Inbox,
  Landmark,
  Ledger,
  Mail,
  MessageCircle,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Split,
  type IconComponent,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type {
  Notification,
  NotificationModule,
} from "@/types/pages/notifications";

const MODULE_GLYPH: Record<NotificationModule, IconComponent> = {
  inbox: Inbox,
  purchases: Receipt,
  sales: ShoppingBag,
  journals: Ledger,
  banking: Landmark,
  gst: Percent,
  masters: Package,
  sync: Cloud,
};

/** The kind's own glyph where it says more than the module's. */
const glyphOf = (n: Notification): IconComponent => {
  switch (n.kind) {
    case "documents_arrived":
      return n.data.channel === "WhatsApp"
        ? MessageCircle
        : n.data.channel === "email"
          ? Mail
          : Inbox;
    case "extraction_failed":
      return FileWarning;
    case "duplicate_detected":
      return Copy;
    case "sync_failed":
      return CloudAlert;
    case "resync_needed":
      return RefreshCw;
    case "master_sync_failed":
      return n.data.type === "Ledger" ? Ledger : Package;
    case "sales_preview_ready":
    case "sales_import_failed":
      return FileSpreadsheet;
    case "split_ready":
    case "split_failed":
      return Split;
    default:
      return MODULE_GLYPH[n.module];
  }
};

/**
 * Where a notice comes from, in a 32px box. The glyph stays body ink; only
 * the 7px dot in the corner carries severity, the way StatusPill does, so a
 * list of failures doesn't turn into a wall of red.
 */
const NotificationGlyph = ({
  notification,
}: {
  notification: Notification;
}) => {
  const Glyph = glyphOf(notification);
  const dot =
    !notification.resolvedAt &&
    (notification.severity === "critical"
      ? "bg-pi-danger-dot"
      : notification.severity === "warning"
        ? "bg-pi-warning-dot"
        : null);
  return (
    <span
      aria-hidden
      className="relative grid size-8 flex-none place-items-center rounded-md border border-pi-line bg-background text-pi-body"
    >
      <Glyph className="size-4" />
      {dot ? (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 size-[9px] rounded-full border-2 border-background",
            dot
          )}
        />
      ) : null}
    </span>
  );
};

export default NotificationGlyph;
