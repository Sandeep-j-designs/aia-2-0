import React from "react";
import type { RulesSectionProps } from "./types";

/** Auto-approve: placeholder until its feature lands. */
const AutoApproveRules = (_props: RulesSectionProps) => (
  <div className="px-[var(--inset-page)] py-6 text-[13px] text-pi-body">
    Auto-approve is being built.
  </div>
);

export default AutoApproveRules;

/** The tab's count on Rules & learning; undefined draws no count. */
export const useAutoApproveCount = (_company: string): number | undefined =>
  undefined;
