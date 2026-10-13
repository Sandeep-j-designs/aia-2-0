import React from "react";
import { actor } from "@/components/inbox/v2/store";
import ActivityLog from "./activity-log";
import RulesPage, { RULES_TABS } from "./rules-page";
import type { RulesTab } from "./rules/types";
import PolicyPage from "@/components/inbox/v2/automation/policy-page";
import PlaybooksPage from "@/components/inbox/v2/automation/playbooks-page";
import WhatsAppPage from "@/components/inbox/v2/automation/whatsapp-page";

export type AutomationPage =
  "activity" | "rules" | "policy" | "playbooks" | "whatsapp";
export const AUTOMATION_PAGES: AutomationPage[] = [
  "activity",
  "rules",
  "policy",
  "playbooks",
  "whatsapp",
];

export type AutomationView = {
  page: AutomationPage;
  /** A page's own tab (Rules & learning: auto-approve | bank | tally). */
  tab?: string;
};

type Props = {
  view: AutomationView;
  company: string;
  companyName: string;
  onNavigate: (view: AutomationView) => void;
  onOpenDocument: (id: string) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  onUnbuilt: (what: string) => void;
};

/**
 * Automation: what the AI may do on its own, and the record of what it did
 * (13 Oct 2026). Views of one module, picked by the URL
 * (?module=AUTO&page=activity|rules[&tab=]), like Banking.
 *
 * Production: pages/automation/activity.tsx and pages/automation/rules.tsx.
 */
const Automation = ({
  view,
  company,
  companyName,
  onNavigate,
  onOpenDocument,
  notify,
  onUnbuilt,
}: Props) => {
  if (view.page === "policy") return <PolicyPage company={company} />;
  if (view.page === "playbooks")
    return (
      <PlaybooksPage
        company={company}
        tab={view.tab}
        onTab={(tab) => onNavigate({ page: "playbooks", tab })}
      />
    );
  if (view.page === "whatsapp") return <WhatsAppPage company={company} />;
  if (view.page === "rules") {
    const tab = RULES_TABS.includes(view.tab as RulesTab)
      ? (view.tab as RulesTab)
      : "auto-approve";
    return (
      <RulesPage
        tab={tab}
        onTab={(next) => onNavigate({ page: "rules", tab: next })}
        company={company}
        companyName={companyName}
        user={actor}
        onOpenDocument={onOpenDocument}
        notify={notify}
        onUnbuilt={onUnbuilt}
      />
    );
  }
  return (
    <ActivityLog
      company={company}
      user={actor}
      onOpenDocument={onOpenDocument}
      notify={notify}
    />
  );
};

export default Automation;
