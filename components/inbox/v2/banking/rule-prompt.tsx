import React from "react";
import { Wand2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ruleThen, ruleWords } from "@/hooks/pages/inbox/use-bank-rules";
import type { BankRuleSuggestion } from "@/types/pages/inbox/bank-automation";
import { AiMark } from "../ai-mark";

type Props = {
  suggestion: BankRuleSuggestion;
  onCreate: () => void;
  onLater: () => void;
  onNever: () => void;
};

/**
 * The rule suggestion, raised in place on the third time the same payee went
 * to the same ledger by hand. A quiet white strip under the toolbar, not a
 * banner: it is an offer, and it stays until it is answered or put off.
 * "Not now" keeps it on Rules & learning; "Never" retires the words.
 */
const RulePrompt = ({ suggestion: s, onCreate, onLater, onNever }: Props) => (
  <div className="px-[var(--inset-page)] pb-4">
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-pi-line bg-background px-4 py-3 shadow-contact"
    >
      <AiMark
        reason={`drawn from ${s.repeats} lines you coded by hand`}
        className="flex-none"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-5 text-pi-ink">
          <span className="font-medium">{s.evidence}</span> Always do this?
        </p>
        <p className="text-[12px] leading-4 text-pi-faint">
          New lines with “{ruleWords(s.contains)}” will go to{" "}
          {ruleThen(s.action)}, and still wait for your review.
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onNever}>
          Never
        </Button>
        <Button variant="ghost" size="sm" onClick={onLater}>
          Not now
        </Button>
        <Button variant="secondary" size="sm" onClick={onCreate}>
          <Wand2 className="h-4 w-4" />
          Create rule
        </Button>
      </div>
    </div>
  </div>
);

export default RulePrompt;
