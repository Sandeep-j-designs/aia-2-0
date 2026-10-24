import React, { ReactNode, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Bell,
  BookOpen,
  ChevronsUpDown,
  MonitorPlay,
  Moon,
  Search,
  Settings,
  Sun,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/notifications/bell";
import NeoLauncher from "@/components/neo/common/launcher";
import { notificationActions } from "@/hooks/pages/notifications/use-notifications";
import { cn } from "@/lib/utils";
import type { UserCompany } from "@/types/pages/organisation";
import OrganisationSwitcher from "./organization-switcher";

/**
 * Precision Indigo top bar, after ai-accountant-redesign src/components/
 * TopBar.tsx and the workbench `.app-topbar`:
 * - a 56px white bar with a section / page breadcrumb on the left;
 * - a search pill with its ⌘K hint (it focuses the current screen's
 *   search);
 * - the organisation chip, the company-scoped action slot (Tally sync),
 *   notifications, preferences and the profile.
 */

/** A plain label, or one that goes somewhere: a page above the current one. */
export type Crumb =
  | string
  | { label: string; onClick: () => void }
  /** A crumb that is a control of its own, like Neo's chat title menu. */
  | { node: ReactNode; label: string };

type Props = {
  crumbs?: Crumb[];
  company: { initials: string; name: string };
  user: { initials: string; email: string };
  leadingContent?: ReactNode;
  onGuide?: () => void;
  companies?: UserCompany[];
  companyId?: string;
  onCompanyChange?: (id: string) => void;
  onCompanyCreate?: (name: string) => string;
  onCompanyRename?: (id: string, name: string) => void;
  /** Rendered after the organisation chip: the company-scoped Tally sync. */
  companyAction?: ReactNode;
};

const iconButton =
  "grid size-9 flex-none place-items-center rounded-sm text-pi-faint transition-colors duration-150 hover:bg-pi-fill hover:text-pi-body data-[state=open]:bg-pi-fill";

/** The page's own search listens for "/", so the pill and ⌘K both send it. */
const focusPageSearch = () =>
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "/", bubbles: true })
  );

const AppTopBar = ({
  crumbs = [],
  company,
  user,
  leadingContent,
  onGuide,
  companies,
  companyId,
  onCompanyChange,
  onCompanyCreate,
  onCompanyRename,
  companyAction,
}: Props) => {
  const { theme = "light", setTheme } = useTheme();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusPageSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 flex-none items-center gap-0.5 border-b border-pi-line bg-background px-6">
      <div className="flex min-w-0 items-center gap-2 text-[14px]">
        {leadingContent}
        {crumbs.map((crumb, i) => {
          const label = typeof crumb === "string" ? crumb : crumb.label;
          const last = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${i}-${label}`}>
              {i > 0 && <span className="flex-none text-pi-faint">/</span>}
              {typeof crumb !== "string" && "node" in crumb ? (
                <span className="min-w-0">{crumb.node}</span>
              ) : typeof crumb !== "string" && !last ? (
                // Back up the trail: the page this one was opened from.
                <button
                  type="button"
                  onClick={"onClick" in crumb ? crumb.onClick : undefined}
                  className="-mx-1 flex-none rounded-xs px-1 text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink"
                >
                  {label}
                </button>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    last
                      ? "min-w-0 truncate font-medium text-pi-ink"
                      : "flex-none text-pi-body"
                  )}
                >
                  {label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="min-w-4 flex-1" />

      <button
        type="button"
        onClick={focusPageSearch}
        className="hidden h-9 w-[280px] flex-none items-center gap-2 rounded-sm border border-pi-line-2 bg-background px-3 text-[13px] text-pi-faint shadow-[0_1px_2px_rgba(21,26,38,0.05)] transition-[border-color] duration-150 hover:border-pi-line-strong lg:flex"
      >
        <Search className="size-4 flex-none" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="flex-none rounded-xs border border-pi-line bg-background px-1 py-0.5 font-sans text-[12px] font-medium text-pi-faint shadow-[inset_0_-1px_var(--pi-line)]">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      {companies?.length && onCompanyChange ? (
        <OrganisationSwitcher
          companies={companies}
          selectedCompanyUuid={companyId}
          onSelect={onCompanyChange}
          onCreate={onCompanyCreate ?? (() => companyId ?? "")}
          onRename={onCompanyRename ?? (() => undefined)}
          className="group ml-3 flex h-9 max-w-[280px] flex-none items-center gap-2 overflow-hidden rounded-sm border border-pi-line-2 bg-background py-1 pl-2 pr-3 text-left shadow-[0_1px_2px_rgba(21,26,38,0.05)] transition-[border-color] duration-150 hover:border-pi-line-strong data-[state=open]:border-pi-line-strong"
        />
      ) : (
        <span className="ml-3 flex h-9 max-w-[280px] items-center gap-2 overflow-hidden rounded-sm border border-pi-line-2 bg-background py-1 pl-2 pr-3">
          <span className="grid size-6 place-items-center rounded-xs bg-gradient-to-br from-[#3146B0] to-[#6478D2] text-[12px] font-semibold text-white">
            {company.initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-pi-ink">
            {company.name}
          </span>
          <ChevronsUpDown className="ml-auto size-3.5 flex-none text-pi-faint" />
        </span>
      )}

      <div className="mx-3 h-5 w-px flex-none bg-pi-line" />

      <div className="flex flex-none items-center gap-2">
        {companyAction}

        <NeoLauncher className="text-pi-body hover:bg-pi-row-hover" />
        {companyId ? (
          <NotificationBell
            companyId={companyId}
            companies={companies ?? []}
            onCompanyChange={onCompanyChange}
            className={iconButton}
          />
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Preferences"
              className={iconButton}
            >
              <Settings className="size-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-pi-faint">
              Appearance
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun className="mr-2 size-4" /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="mr-2 size-4" /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorPlay className="mr-2 size-4" /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={notificationActions.openSettings}>
              <Bell className="size-4" />
              Notification settings
            </DropdownMenuItem>
            {onGuide && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onGuide}>
                  <BookOpen className="size-4" />
                  Guide and what&apos;s new
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Profile menu"
              title={user.email}
              className="ml-1 grid size-8 flex-none place-items-center rounded-full bg-pi-fill-2 text-[12px] font-semibold text-pi-body transition-colors hover:bg-pi-line-2"
            >
              {user.initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="break-all font-normal">
              <span className="block text-[12px] text-pi-faint">
                Signed in as
              </span>
              <span className="mt-1 block text-[13px] text-pi-ink">
                {user.email}
              </span>
            </DropdownMenuLabel>
            {onGuide && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onGuide}>
                  <BookOpen className="size-4" />
                  Open guide
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppTopBar;
