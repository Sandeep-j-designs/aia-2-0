import { Check, CircleCheck, DotFilled } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import NotificationGlyph from "@/components/notifications/common/notification-glyph";
import {
  MODULE_LABEL,
  NOTIFICATION_KINDS,
} from "@/config/pages/notifications/kinds";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/pages/notifications";
import { fullTime, timeAgo } from "@/utils/pages/notifications";

type Props = {
  notification: Notification;
  /** Go to the notice's target. The caller marks it read and closes. */
  onOpen: (notification: Notification) => void;
  onToggleRead: (notification: Notification) => void;
  /** The full page gives the body two lines more and shows who did it. */
  roomy?: boolean;
};

/**
 * One notice. The title is the row's link (stretched over the row), so the
 * whole row opens the target; the action button and the read toggle sit
 * above that link and keep their own clicks.
 *
 * Unread is said twice, quietly: a semibold title and a brand dot at the end
 * of it. Read rows drop both. A resolved action keeps its place in history
 * with "Done" in place of its button.
 */
const NotificationRow = ({
  notification: n,
  onOpen,
  onToggleRead,
  roomy,
}: Props) => {
  const meta = NOTIFICATION_KINDS[n.kind];
  const unread = !n.readAt;
  const resolved = !!n.resolvedAt;
  const showAction = n.category === "action" && !resolved;
  const by =
    n.actor.kind === "ai"
      ? "AI Accountant"
      : n.actor.kind === "user" || n.actor.kind === "channel"
        ? n.actor.name
        : undefined;

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3 transition-colors duration-100 hover:bg-pi-row-hover",
        roomy && "px-6 py-4"
      )}
    >
      <NotificationGlyph notification={n} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onOpen(n)}
            className={cn(
              "min-w-0 text-left text-[13px] leading-5 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring",
              unread ? "font-semibold text-pi-ink" : "font-medium text-pi-ink",
              resolved && "text-pi-body"
            )}
          >
            {n.title}
          </button>
          {unread ? (
            <span
              aria-label="Unread"
              className="mt-1.5 size-2 flex-none rounded-full bg-pi-brand"
            />
          ) : null}
        </div>

        {n.body ? (
          <p
            className={cn(
              "mt-0.5 text-[13px] leading-5 text-pi-body",
              roomy ? "line-clamp-3" : "line-clamp-2"
            )}
          >
            {n.body}
          </p>
        ) : null}

        <div className="mt-2 flex min-h-7 items-center gap-3">
          {showAction ? (
            <Button
              variant="outline"
              size="sm"
              className="relative z-[1]"
              onClick={() => onOpen(n)}
            >
              {meta.action}
            </Button>
          ) : resolved && n.category === "action" ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-pi-success">
              <CircleCheck className="size-3.5" aria-hidden />
              Done
            </span>
          ) : null}
          <span className="min-w-0 truncate text-[12px] leading-4 text-pi-faint">
            {MODULE_LABEL[n.module]}
            {roomy && by ? ` · ${by}` : null}
            {" · "}
            <time dateTime={n.createdAt} title={fullTime(n.createdAt)}>
              {timeAgo(n.createdAt)}
            </time>
          </span>
        </div>
      </div>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={unread ? "Mark as read" : "Mark as unread"}
              onClick={() => onToggleRead(n)}
              className="relative z-[1] -mr-1 grid size-7 flex-none place-items-center self-start rounded-sm text-pi-faint opacity-0 transition-opacity duration-100 hover:bg-pi-fill hover:text-pi-body focus-visible:opacity-100 group-hover:opacity-100"
            >
              {unread ? (
                <Check className="size-4" />
              ) : (
                <DotFilled className="size-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {unread ? "Mark as read" : "Mark as unread"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default NotificationRow;
