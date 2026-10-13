import React from "react";
import type { RulesSectionProps } from "./types";

/** Learned from Tally: placeholder until its feature lands. */
const TallyLearning = (_props: RulesSectionProps) => (
  <div className="px-[var(--inset-page)] py-6 text-[13px] text-pi-body">
    Learned from Tally is being built.
  </div>
);

export default TallyLearning;

/** The tab's count on Rules & learning; undefined draws no count. */
export const useTallyLearningCount = (_company: string): number | undefined =>
  undefined;
