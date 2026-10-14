import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Boxes,
  ChevronRight,
  Coins,
  Inbox,
  Landmark,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  RefreshCw,
  Wallet,
  Workflow,
} from "@/components/icons";
import AppTopBar, { type Crumb } from "@/components/top-bar-layout";
import { basePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import type { UserCompany } from "@/types/pages/organisation";

/**
 * PROTOTYPE STUB: same path and Props contract as
 * components/sidebar-layout/index.tsx in aiaccountant-app. Deleted at handoff.
 *
 * Precision Indigo workbench shell, after ai-accountant-redesign
 * (src/components/Sidebar.tsx + src/workbench.css):
 * - an ink navigation rail on a navy gradient, 216px expanded and 64px
 *   collapsed;
 * - groups that open in place, with a guide rail descending from the group
 *   icon and a 3px light rail on the active child;
 * - the company card and collapse toggle pinned to the foot;
 * - a white 56px top bar (AppTopBar) over a slate content canvas.
 */

type Props = {
  children: ReactNode;
  defaultSidebarState?: boolean;
  contentClassName?: string;
  crumbs?: Crumb[];
  /** Prototype-only: the Needs Review count on the Inbox entry. */
  inboxCount?: number;
  /** Prototype-only: PRD §4.1's launch tag on the Inbox entry. */
  inboxNew?: boolean;
  onGuide?: () => void;
  /** Prototype-only: every route is /inbox, so the caller resolves nav ids. */
  onNavSelect?: (id: string) => void;
  activeNavId?: string;
  companies?: UserCompany[];
  companyId?: string;
  onCompanyChange?: (id: string) => void;
  onCompanyCreate?: (name: string) => string;
  onCompanyRename?: (id: string, name: string) => void;
  companyAction?: ReactNode;
};

type Leaf = { id: string; label: string; path: string; tag?: string };
type NavNode =
  | { kind: "item"; id: string; label: string; path: string; icon: ReactNode }
  | {
      kind: "group";
      id: string;
      label: string;
      icon: ReactNode;
      children: Leaf[];
    };

const NAV: NavNode[] = [
  {
    kind: "item",
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard />,
  },
  {
    kind: "item",
    id: "inbox",
    label: "Inbox",
    path: "/inbox",
    icon: <Inbox />,
  },
  {
    kind: "item",
    id: "agents",
    label: "Agents",
    path: "/inbox?module=AGENTS",
    icon: <Workflow />,
  },
  {
    kind: "group",
    id: "payables",
    label: "Payables",
    icon: <Wallet />,
    children: [
      { id: "purchases", label: "Purchases", path: "/accounts-payable" },
    ],
  },
  {
    kind: "group",
    id: "receivables",
    label: "Receivables",
    icon: <Coins />,
    children: [{ id: "sales", label: "Sales", path: "/accounts-receivable" }],
  },
  {
    kind: "group",
    id: "accounting",
    label: "Accounting",
    icon: <BookOpen />,
    children: [
      { id: "journal-vouchers", label: "Journal Vouchers", path: "/journals" },
      { id: "chart-of-accounts", label: "Chart of Accounts", path: "/coa" },
    ],
  },
  {
    kind: "group",
    id: "inventory-group",
    label: "Inventory",
    icon: <Boxes />,
    children: [
      { id: "inventory", label: "Stock items", path: "/inventory-masters" },
    ],
  },
  {
    kind: "group",
    id: "compliance",
    label: "Compliance",
    icon: <Percent />,
    children: [
      { id: "gst", label: "GST Reconciliation", path: "/gst-reconciliation" },
      {
        id: "checks",
        label: "Compliance checks",
        path: "/inbox?module=CHECKS",
      },
    ],
  },
  {
    kind: "item",
    id: "banking",
    label: "Banking",
    path: "/bank",
    icon: <Landmark />,
  },
  {
    kind: "item",
    id: "configuration",
    label: "Sync Management",
    path: "/configuration",
    icon: <RefreshCw />,
  },
];

/** Breadcrumb trail shown in the top bar for each nav id. */
export const NAV_TRAIL: Record<string, Crumb[]> = {
  agents: ["Agents"],
  dashboard: ["Dashboard"],
  inbox: ["Workspace", "Inbox"],
  purchases: ["Payables", "Purchases"],
  sales: ["Receivables", "Sales"],
  "journal-vouchers": ["Accounting", "Journal Vouchers"],
  "chart-of-accounts": ["Accounting", "Chart of Accounts"],
  inventory: ["Inventory", "Stock items"],
  gst: ["Compliance", "GST Reconciliation"],
  banking: ["Banking", "Bank accounts"],
  activity: ["Automation", "Activity log"],
  rules: ["Automation", "Rules & learning"],
  checks: ["Compliance", "Compliance checks"],
  policy: ["Automation", "Client policy"],
  playbooks: ["Automation", "Playbooks"],
  whatsapp: ["Automation", "WhatsApp"],
};

const COLLAPSE_KEY = "sb-collapsed";
const ICON = "flex-none [&>svg]:size-5 [&>svg]:stroke-[1.75]";

const SidebarLayout = ({
  children,
  defaultSidebarState,
  contentClassName,
  crumbs,
  inboxCount,
  inboxNew,
  onGuide,
  onNavSelect,
  activeNavId,
  companies,
  companyId,
  onCompanyChange,
  onCompanyCreate,
  onCompanyRename,
  companyAction,
}: Props) => {
  const router = useRouter();
  const current =
    activeNavId ?? (router.pathname.startsWith("/inbox") ? "inbox" : "");
  const activeGroup = NAV.find(
    (n) => n.kind === "group" && n.children.some((c) => c.id === current)
  )?.id;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (activeGroup)
      setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);

  const [desktopCollapsed, setCollapsed] = useState(
    defaultSidebarState !== undefined ? !defaultSidebarState : false
  );
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1050px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  // sessionStorage in an effect keeps server and client markup identical.
  useEffect(() => {
    const stored = window.sessionStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) setCollapsed(stored === "1");
  }, []);
  useEffect(() => {
    window.sessionStorage.setItem(COLLAPSE_KEY, desktopCollapsed ? "1" : "0");
  }, [desktopCollapsed]);
  const collapsed = compact || desktopCollapsed;

  const company = companies?.find((c) => c.companyUuid === companyId);
  const companyName = company?.companyName ?? "Shakunthalam Oil & Refineries";

  const select = (id: string) => (e: React.MouseEvent) => {
    if (!onNavSelect) return;
    e.preventDefault();
    onNavSelect(id);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-pi-page">
      <aside
        className={cn(
          "workbench-sidebar flex h-full flex-none flex-col px-1 transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-16" : "w-[216px]"
        )}
      >
        <div
          className={cn(
            "flex h-14 flex-none items-center gap-3 border-b border-[var(--nav-line)]",
            collapsed ? "justify-center" : "pl-4"
          )}
        >
          <Image
            src={`${basePath}/images/ai-accountant-mark.png`}
            alt="AI Accountant"
            width={28}
            height={30}
            className="h-[30px] w-7 flex-none object-contain brightness-0 invert"
            unoptimized
            priority
          />
          {!collapsed && (
            <span className="whitespace-nowrap text-[18px] font-medium tracking-[-0.02em] text-[var(--nav-ink)]">
              AI Accountant
            </span>
          )}
        </div>

        <nav
          id="prototype-main-navigation"
          aria-label="Main"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pb-4 pt-3"
        >
          {NAV.map((node) => {
            if (node.kind === "item") {
              const active = current === node.id;
              const badge = node.id === "inbox" ? inboxCount : undefined;
              const isNew = node.id === "inbox" && inboxNew;
              return (
                <Link
                  key={node.id}
                  href={node.path}
                  onClick={select(node.id)}
                  aria-current={active ? "page" : undefined}
                  data-guide-id={`nav-${node.id}`}
                  title={collapsed ? node.label : undefined}
                  aria-label={collapsed ? node.label : undefined}
                  className={cn(
                    "group relative flex h-10 items-center rounded-md text-[14px] transition-colors duration-150",
                    collapsed ? "justify-center" : "gap-3 pl-3 pr-3",
                    active
                      ? "border border-[var(--nav-active-edge)] bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-ink)] shadow-[0_2px_8px_#09132615]"
                      : "border border-transparent text-[var(--nav-body)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]"
                  )}
                >
                  <span
                    className={cn(
                      ICON,
                      active
                        ? "text-[var(--nav-active-ink)]"
                        : "text-[var(--nav-faint)] group-hover:text-[var(--nav-body)]"
                    )}
                  >
                    {node.icon}
                  </span>
                  {!collapsed && (
                    <span className="flex-1 truncate">{node.label}</span>
                  )}
                  {isNew && !collapsed ? (
                    <span className="rounded-xs border border-[var(--nav-line)] px-2 py-px text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--nav-faint)]">
                      New
                    </span>
                  ) : badge ? (
                    <span
                      className={cn(
                        "grid min-w-5 place-items-center rounded-xs bg-[#ffffff14] px-1 py-px text-[12px] font-medium tabular-nums text-[var(--nav-ink)]",
                        collapsed && "absolute right-2 top-1"
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            }
            const isOpen = !collapsed && !!open[node.id];
            const childActive = node.children.some((c) => c.id === current);
            return (
              <div key={node.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setOpen((o) => ({ ...o, [node.id]: true }));
                    } else setOpen((o) => ({ ...o, [node.id]: !o[node.id] }));
                  }}
                  aria-expanded={isOpen}
                  title={collapsed ? node.label : undefined}
                  aria-label={collapsed ? node.label : undefined}
                  data-guide-id={`nav-${node.id}`}
                  className={cn(
                    "group relative flex h-10 w-full items-center rounded-md text-[14px] transition-colors duration-150 hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]",
                    collapsed ? "justify-center" : "gap-3 pl-3 pr-3",
                    childActive && collapsed
                      ? "text-[var(--nav-ink)]"
                      : "text-[var(--nav-body)]"
                  )}
                >
                  <span
                    className={cn(
                      ICON,
                      "text-[var(--nav-faint)] group-hover:text-[var(--nav-body)]"
                    )}
                  >
                    {node.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{node.label}</span>
                      <ChevronRight
                        className={cn(
                          "size-3.5 flex-none text-[var(--nav-faint)] transition-transform duration-200",
                          isOpen && "rotate-90"
                        )}
                      />
                    </>
                  )}
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="relative pb-1 pt-1">
                      <span
                        aria-hidden
                        className="absolute bottom-2 left-[21px] top-1 w-px bg-[var(--nav-line)]"
                      />
                      <div className="flex flex-col gap-0.5">
                        {node.children.map((child) => {
                          const active = current === child.id;
                          return (
                            <Link
                              key={child.id}
                              href={child.path}
                              onClick={select(child.id)}
                              aria-current={active ? "page" : undefined}
                              data-guide-id={`nav-${child.id}`}
                              tabIndex={isOpen ? undefined : -1}
                              className={cn(
                                "relative ml-8 mr-1 flex h-8 items-center rounded-md border px-3 text-[13px] transition-colors duration-[120ms]",
                                active
                                  ? "border-[var(--nav-active-edge)] bg-[var(--nav-active-bg)] font-semibold text-[var(--nav-active-ink)] shadow-[0_2px_8px_#09132615]"
                                  : "border-transparent font-medium text-[var(--nav-body)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-ink)]"
                              )}
                            >
                              {active && (
                                <span
                                  aria-hidden
                                  className="absolute inset-y-1.5 left-[-12px] w-[3px] rounded-full bg-[var(--nav-active-rail)]"
                                />
                              )}
                              <span className="flex-1 truncate">
                                {child.label}
                              </span>
                              {child.tag && (
                                <span className="flex-none rounded-xs border border-[var(--nav-line)] px-2 py-px text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--nav-faint)]">
                                  {child.tag}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* No company card here (8 Oct 2026): the organisation chip in the
            top bar already names it. */}
        <div
          className={cn(
            "mt-auto flex flex-none items-center border-t border-[var(--nav-line)] py-3",
            collapsed ? "justify-center" : "justify-end px-3"
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="prototype-main-navigation"
            className="hidden size-7 flex-none place-items-center rounded-md text-[var(--nav-faint)] transition-colors hover:bg-[var(--nav-hover)] hover:text-[var(--nav-body)] md:grid"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar
          crumbs={crumbs?.length ? crumbs : (NAV_TRAIL[current] ?? [])}
          company={{ initials: companyName.charAt(0), name: companyName }}
          user={{ initials: "SB", email: "sandeep.balaji@aiaccountant.com" }}
          onGuide={onGuide}
          companies={companies}
          companyId={companyId}
          onCompanyChange={onCompanyChange}
          onCompanyCreate={onCompanyCreate}
          onCompanyRename={onCompanyRename}
          companyAction={companyAction}
        />
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-pi-page">
          <div
            className={cn("min-w-0 flex-1 overflow-hidden", contentClassName)}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
