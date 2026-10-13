import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  ArrowRight,
  Bell,
  CheckCheck,
  CircleCheck,
  Inbox,
  Settings,
} from "@/components/icons";
import EmptyState from "@/components/inbox/v2/empty-state";
import { CountPill } from "@/components/inbox/v2/ui";
import { UNDERLINE_TAB } from "@/components/inbox/v2/banking/table-parts";
import NotificationRow from "@/components/notifications/common/notification-row";
import SettingsDialog from "@/components/notifications/settings-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  notificationActions,
  useNotifications,
} from "@/hooks/pages/notifications/use-notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/pages/notifications";
import type { UserCompany } from "@/types/pages/organisation";
import { titleWithCount } from "@/utils/pages/notifications";

type Props = {
  companyId: string;
  companies: UserCompany[];
  onCompanyChange?: (id: string) => void;
  /** The top bar's icon-button classes, so the bell matches its neighbours. */
  className?: string;
};

type Tab = "action" | "updates";

/** The panel lists this many; the full page has the rest. */
const PANEL_LIMIT = 30;

/**
 * The bell and its panel.
 *
 * Two tabs, because the two kinds of notice leave differently: Needs action
 * holds what is stuck until someone acts, and empties only as the work gets
 * done; Updates is what finished or arrived, and reading clears it. The panel
 * opens on Needs action when it has anything, else on Updates.
 *
 * The badge counts unread notices for the organisation on screen. Other
 * organisations with open work get one line at the foot of the panel, with
 * a way to switch — an accountant running several clients' books should not
 * have to visit each to find the one that's on fire.
 */
const NotificationBell = ({
  companyId,
  companies,
  onCompanyChange,
  className,
}: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { needsAction, updates, counts, others, settingsOpen } =
    useNotifications(
      companyId,
      companies.map((c) => c.companyUuid)
    );
  const [tab, setTab] = useState<Tab>("action");
  useEffect(() => {
    if (open) setTab(needsAction.length ? "action" : "updates");
  }, [open]);

  // The tab title carries the count, so it shows from another tab too.
  useEffect(() => {
    const apply = () => {
      const next = titleWithCount(document.title, counts.unread);
      // Compare trimmed: setting a title the browser then trims would
      // otherwise wake the observer forever.
      if (next.trim() !== document.title.trim()) document.title = next;
    };
    apply();
    const head = document.querySelector("title");
    if (!head) return;
    const observer = new MutationObserver(apply);
    observer.observe(head, { childList: true });
    return () => observer.disconnect();
  }, [counts.unread]);

  const openOne = (n: Notification) => {
    notificationActions.markRead(n.id);
    setOpen(false);
    void router.push(n.target.href);
  };
  const toggleRead = (n: Notification) =>
    n.readAt
      ? notificationActions.markUnread(n.id)
      : notificationActions.markRead(n.id);

  const list = tab === "action" ? needsAction : updates;
  const unreadUpdates = updates.filter((n) => !n.readAt).length;
  const nameOf = (id: string) =>
    companies.find((c) => c.companyUuid === id)?.companyName ?? id;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              counts.unread
                ? `Notifications, ${counts.unread} unread`
                : "Notifications"
            }
            className={cn("relative", className)}
          >
            <Bell className="size-[18px]" />
            {counts.unread > 0 ? (
              <span
                aria-hidden
                className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-background bg-pi-brand px-1 text-[10px] font-semibold leading-none tabular-nums text-white"
              >
                {counts.unread > 99 ? "99+" : counts.unread}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="flex max-h-[min(640px,calc(100dvh-80px))] w-[400px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-lg p-0"
        >
          <div className="flex items-center gap-1 px-4 pb-1 pt-3">
            <h2 className="flex-1 text-[14px] font-semibold text-pi-ink">
              Notifications
            </h2>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Mark all as read"
                    disabled={!counts.unread}
                    onClick={() => notificationActions.markAllRead(companyId)}
                    className="grid size-8 place-items-center rounded-sm text-pi-faint transition-colors hover:bg-pi-fill hover:text-pi-body disabled:pointer-events-none disabled:opacity-40"
                  >
                    <CheckCheck className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Mark all as read</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Notification settings"
                    onClick={() => {
                      setOpen(false);
                      notificationActions.openSettings();
                    }}
                    className="grid size-8 place-items-center rounded-sm text-pi-faint transition-colors hover:bg-pi-fill hover:text-pi-body"
                  >
                    <Settings className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Notification settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="shrink-0 border-b border-pi-line px-4"
          >
            <TabsList className="h-auto gap-6 rounded-none bg-transparent p-0">
              <TabsTrigger value="action" className={UNDERLINE_TAB}>
                Needs action
                <CountPill>{needsAction.length}</CountPill>
              </TabsTrigger>
              <TabsTrigger value="updates" className={UNDERLINE_TAB}>
                Updates
                {unreadUpdates ? <CountPill>{unreadUpdates}</CountPill> : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {list.length ? (
              <ul className="divide-y divide-pi-line">
                {list.slice(0, PANEL_LIMIT).map((n) => (
                  <li key={n.id}>
                    <NotificationRow
                      notification={n}
                      onOpen={openOne}
                      onToggleRead={toggleRead}
                    />
                  </li>
                ))}
              </ul>
            ) : tab === "action" ? (
              <EmptyState
                sticky={false}
                className="py-10"
                icon={CircleCheck}
                title="Nothing needs you"
                body="Unreadable files, duplicates and anything Tally turns away land here."
              />
            ) : (
              <EmptyState
                sticky={false}
                className="py-10"
                icon={Inbox}
                title="No updates yet"
                body="Documents arriving, statements read and syncs finishing show up here."
              />
            )}
          </div>

          {others.length && onCompanyChange ? (
            <div className="flex flex-col gap-1 border-t border-pi-line bg-pi-head-bg px-4 py-2.5">
              {others.map((c) => (
                <div
                  key={c.companyId}
                  className="flex items-center gap-2 text-[12px] leading-5 text-pi-body"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-pi-ink">
                      {nameOf(c.companyId)}
                    </span>{" "}
                    has {c.action} {c.action === 1 ? "thing" : "things"} that
                    need{c.action === 1 ? "s" : ""} you
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onCompanyChange(c.companyId);
                    }}
                    className="flex-none rounded-xs px-1 font-medium text-pi-brand hover:underline"
                  >
                    Switch
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void router.push("/notifications");
            }}
            className="flex shrink-0 items-center justify-center gap-1.5 border-t border-pi-line px-4 py-2.5 text-[13px] font-medium text-pi-brand transition-colors hover:bg-pi-row-hover"
          >
            View all notifications
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </PopoverContent>
      </Popover>
      <SettingsDialog
        open={settingsOpen}
        onClose={notificationActions.closeSettings}
      />
    </>
  );
};

export default NotificationBell;
