import React from "react";
import { actor } from "@/components/inbox/v2/store";
import ActivityLog from "./activity-log";
import RulesPage, { RULES_TABS } from "./rules-page";
import type { RulesTab } from "./rules/types";

export type AutomationPage = "activity" | "rules";
export const AUTOMATION_PAGES: AutomationPage[] = ["activity", "rules"];

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
