/** What every tab on Rules & learning is handed by the page. */
export type RulesSectionProps = {
  company: string;
  companyName: string;
  /** The person using the prototype, who rule changes are attributed to. */
  user: string;
  onOpenDocument: (id: string) => void;
  /** Move to another tab of Rules & learning. */
  onTab: (tab: RulesTab) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  onUnbuilt: (what: string) => void;
};

export type RulesTab = "auto-approve" | "bank" | "tally";
