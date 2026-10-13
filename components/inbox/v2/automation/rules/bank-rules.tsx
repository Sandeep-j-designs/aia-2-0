import React from "react";
import type { RulesSectionProps } from "./types";

/** Bank rules: placeholder until its feature lands. */
const BankRules = (_props: RulesSectionProps) => (
  <div className="px-[var(--inset-page)] py-6 text-[13px] text-pi-body">
    Bank rules is being built.
  </div>
);

export default BankRules;

/** The tab's count on Rules & learning; undefined draws no count. */
export const useBankRulesCount = (_company: string): number | undefined =>
  undefined;
