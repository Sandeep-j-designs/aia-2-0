import React from "react";
import PageTopBar from "@/components/common/page-top-bar";
import { UNDERLINE_TAB } from "@/components/inbox/v2/banking/table-parts";
import { CountPill } from "@/components/inbox/v2/ui";
import { cn } from "@/lib/utils";
import AutoApproveRules, { useAutoApproveCount } from "./rules/auto-approve";
import BankRules, { useBankRulesCount } from "./rules/bank-rules";
import TallyLearning, { useTallyLearningCount } from "./rules/tally-learning";
import type { RulesSectionProps, RulesTab } from "./rules/types";

type Props = Omit<RulesSectionProps, "onTab"> & {
  tab: RulesTab;
  onTab: (tab: RulesTab) => void;
};

const TABS: { id: RulesTab; label: string }[] = [
  { id: "auto-approve", label: "Auto-approve" },
  { id: "bank", label: "Bank rules" },
  { id: "tally", label: "Learned from Tally" },
];

export const RULES_TABS = TABS.map((t) => t.id);

/**
 * Automation › Rules & learning: what the AI is allowed to do without being
 * asked, and what it has learned to do it with.
 *
 * - Auto-approve: which vendors have earned skipping review, and on what
 *   evidence.
 * - Bank rules: narrations coded the same way every month, turned into rules
 *   the accountant accepted.
 * - Learned from Tally: the coding history read from the books at
 *   onboarding, and the inconsistencies it found.
 *
 * Each tab is its own file under ./rules, and owns its own store.
 */
const RulesPage = ({ tab, onTab, ...props }: Props) => {
  const counts: Record<RulesTab, number | undefined> = {
    "auto-approve": useAutoApproveCount(props.company),
    bank: useBankRulesCount(props.company),
    tally: useTallyLearningCount(props.company),
  };
  const section: RulesSectionProps = { ...props, onTab };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 bg-pi-page px-[var(--inset-page)] pt-6">
        <PageTopBar
          title="Rules & learning"
          className="flex-wrap gap-x-4 gap-y-2"
          leading={
            <div
              role="tablist"
              aria-label="Rules and learning"
              className="flex shrink-0 gap-6 overflow-x-auto overflow-y-hidden border-b border-pi-line"
            >
              {TABS.map((entry) => (
                <button
                  key={entry.id}
                  role="tab"
                  type="button"
                  aria-selected={tab === entry.id}
                  data-state={tab === entry.id ? "active" : "inactive"}
                  onClick={() => onTab(entry.id)}
                  className={cn(
                    UNDERLINE_TAB,
                    "inline-flex flex-none items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                  )}
                >
                  {entry.label}
                  {counts[entry.id] !== undefined ? (
                    <CountPill>{counts[entry.id]}</CountPill>
                  ) : null}
                </button>
              ))}
            </div>
          }
        />
      </div>
      {tab === "auto-approve" ? (
        <AutoApproveRules {...section} />
      ) : tab === "bank" ? (
        <BankRules {...section} />
      ) : (
        <TallyLearning {...section} />
      )}
    </div>
  );
};

export default RulesPage;
