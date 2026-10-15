import { useMemo, useSyncExternalStore } from "react";
import {
  MOCK_BANK_RULES,
  MOCK_BANK_RULE_SUGGESTIONS,
} from "@/config/pages/inbox/mock-bank-rules";
import { bankingActions } from "@/hooks/pages/inbox/use-banking";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import type {
  BankRule,
  BankRuleAction,
  BankRuleSuggestion,
} from "@/types/pages/inbox/bank-automation";
import type { BankTransaction } from "@/types/pages/inbox/banking";
import { hasWords, narrationKey } from "@/utils/pages/inbox/bank-text";

/**
 * Bank rules: "narration contains X, then code it as Y", accepted by an
 * accountant, and the suggestions the AI raises when it sees the same coding
 * done by hand again and again.
 *
 * A suggestion is raised on the third consistent repeat (`observe`), shown
 * inline on the account it came from, and kept on Rules & learning until it
 * is answered. "Not now" leaves it there; "Never" retires the words for good.
 *
 * Module-level per company, reseeded on load.
 *
 * DEV: GET /api/bank/rules, POST /api/bank/rules (create; the server codes
 * the matching lines), PATCH /api/bank/rules/:id (on/off, edit),
 * DELETE /api/bank/rules/:id; suggestions come from
 * GET /api/bank/rules/suggestions and are answered with
 * POST /api/bank/rules/suggestions/:id/{accept|snooze|dismiss}. `observe`
 * runs server-side after each categorisation.
 */

/** How many consistent manual repeats raise a suggestion. */
export const RULE_REPEATS = 3;

type RulesState = {
  rules: BankRule[];
  suggestions: BankRuleSuggestion[];
  /** Words the accountant said Never to. */
  never: string[];
};

const stores = new Map<string, RulesState>();
const listeners = new Set<() => void>();

const read = (company: string): RulesState => {
  let state = stores.get(company);
  if (!state) {
    state = {
      rules: structuredClone(
        MOCK_BANK_RULES.filter((r) => r.company === company)
      ),
      suggestions: structuredClone(
        MOCK_BANK_RULE_SUGGESTIONS.filter((s) => s.company === company)
      ),
      never: [],
    };
    stores.set(company, state);
  }
  return state;
};
const write = (company: string, next: Partial<RulesState>) => {
  stores.set(company, { ...read(company), ...next });
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The words as the accountant reads them: "BESCOM DVG". */
export const ruleWords = (contains: string) => contains.toUpperCase();

/** "BESCOM DVG → Electricity Charges", or "→ oldest open bill". */
export const ruleThen = (action: BankRuleAction) =>
  action.kind === "categorise"
    ? action.ledger
    : `Oldest open bill from ${action.party}`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** "Rule: CHRG → Bank Charges (created by Priya Raghavan, 2 Sep)". */
export const ruleCitation = (rule: BankRule) =>
  `Rule: ${ruleWords(rule.contains)} → ${ruleThen(rule.action)} (created by ${rule.createdBy}, ${shortDate(rule.createdAt)})`;

/**
 * The rule that coded a line, if one did: the one it was stamped with, or an
 * enabled rule whose words are in the narration and whose ledger the AI chose.
 */
export const ruleFor = (company: string, txn: BankTransaction) => {
  if (txn.categorisedBy !== "ai") return undefined;
  const rules = read(company).rules;
  if (txn.ruleId) return rules.find((r) => r.id === txn.ruleId);
  return rules.find(
    (r) =>
      r.on &&
      r.action.kind === "categorise" &&
      r.action.ledger === txn.ledgersNameList[0] &&
      hasWords(txn.description, r.contains)
  );
};

let seq = 0;
const id = () => `bank-rule-${Date.now().toString(36)}-${++seq}`;

export const bankRuleActions = {
  run: (company: string) =>
    read(company)
      .rules.filter((r) => r.on && r.action.kind === "categorise")
      .flatMap((r) =>
        r.action.kind === "categorise"
          ? bankingActions.applyRule(company, {
              id: r.id,
              contains: r.contains,
              type: r.action.type,
              ledger: r.action.ledger,
            })
          : []
      ),
  /**
   * After a person codes a line: if this is the third time the same payee
   * words went to the same ledger by hand, and nothing already covers them,
   * raise a suggestion on the account.
   */
  observe: (company: string, txn: BankTransaction, all: BankTransaction[]) => {
    const ledger = txn.ledgersNameList[0];
    const key = narrationKey(txn.description);
    if (!ledger || !txn.paymentType || txn.categorisedBy !== "user" || !key)
      return;
    const state = read(company);
    if (
      state.never.includes(key) ||
      state.rules.some((r) => hasWords(txn.description, r.contains)) ||
      state.suggestions.some(
        (s) => s.status !== "dismissed" && hasWords(txn.description, s.contains)
      )
    )
      return;
    const same = all.filter(
      (t) =>
        t.categorisedBy === "user" &&
        t.ledgersNameList.length &&
        narrationKey(t.description) === key
    );
    // Consistent only: one line elsewhere breaks the pattern.
    if (same.some((t) => t.ledgersNameList[0] !== ledger)) return;
    if (same.length < RULE_REPEATS) return;
    write(company, {
      suggestions: [
        {
          id: id(),
          company,
          contains: key,
          action: { kind: "categorise", type: txn.paymentType, ledger },
          evidence: `You've put ${same.length} ${key} ${txn.crDr === "debit" ? "debits" : "credits"} in ${ledger}.`,
          repeats: same.length,
          status: "pending",
          fresh: true,
          bankAccountUuid: txn.bankAccountUuid,
        },
        ...state.suggestions,
      ],
    });
  },

  /**
   * Turn a suggestion into a rule, code what it covers now, and log both:
   * the person created it, the AI coded the lines it covers.
   */
  accept: (company: string, suggestionId: string, user: string) => {
    const state = read(company);
    const s = state.suggestions.find((x) => x.id === suggestionId);
    if (!s) return { rule: undefined, coded: 0 };
    const rule: BankRule = {
      id: id(),
      company,
      contains: s.contains,
      action: s.action,
      hits: 0,
      createdBy: user,
      createdAt: new Date().toISOString(),
      on: true,
    };
    const coded =
      s.action.kind === "categorise"
        ? bankingActions.applyRule(company, {
            id: rule.id,
            contains: rule.contains,
            type: s.action.type,
            ledger: s.action.ledger,
          })
        : s.action.kind === "link-oldest-open"
          ? bankingActions.applyRule(company, {
              id: rule.id,
              contains: rule.contains,
              type: "payment",
              ledger: s.action.party,
            })
          : [];
    rule.hits = coded.length;
    write(company, {
      rules: [rule, ...read(company).rules],
      suggestions: read(company).suggestions.map((x) =>
        x.id === suggestionId ? { ...x, status: "created", fresh: false } : x
      ),
    });
    logActivity({
      company,
      actor: { kind: "person", name: user },
      kind: "rule",
      module: "Banking",
      action: "Created a bank rule",
      subject: `${ruleWords(rule.contains)} → ${ruleThen(rule.action)}`,
      reason: s.evidence,
    });
    coded.forEach((t) =>
      logActivity({
        company,
        actor: { kind: "ai", name: "Neo · Bank rule" },
        kind: "rule",
        module: "Banking",
        action: "Categorised by rule",
        subject: `${t.bankAccountName} · ${t.description}`,
        ref: { kind: "transaction", id: t.bankLineUuid },
        reason: ruleCitation(rule),
      })
    );
    return { rule, coded: coded.length };
  },

  /** Not now: off the account, still on Rules & learning. */
  snooze: (company: string, suggestionId: string) =>
    write(company, {
      suggestions: read(company).suggestions.map((x) =>
        x.id === suggestionId ? { ...x, fresh: false } : x
      ),
    }),

  /** Never: the suggestion goes, and these words are not suggested again. */
  dismiss: (company: string, suggestionId: string, user: string) => {
    const s = read(company).suggestions.find((x) => x.id === suggestionId);
    if (!s) return;
    write(company, {
      never: [...read(company).never, s.contains],
      suggestions: read(company).suggestions.map((x) =>
        x.id === suggestionId ? { ...x, status: "dismissed", fresh: false } : x
      ),
    });
    logActivity({
      company,
      actor: { kind: "person", name: user },
      kind: "override",
      module: "Banking",
      action: "Turned down a rule suggestion",
      subject: `${ruleWords(s.contains)} → ${ruleThen(s.action)}`,
    });
  },

  toggle: (company: string, ruleId: string, on: boolean) =>
    write(company, {
      rules: read(company).rules.map((r) =>
        r.id === ruleId ? { ...r, on } : r
      ),
    }),

  update: (
    company: string,
    ruleId: string,
    change: Pick<BankRule, "contains" | "action">
  ) =>
    write(company, {
      rules: read(company).rules.map((r) =>
        r.id === ruleId ? { ...r, ...change } : r
      ),
    }),

  remove: (company: string, ruleId: string) =>
    write(company, {
      rules: read(company).rules.filter((r) => r.id !== ruleId),
    }),
};

export const useBankRules = (company: string) => {
  const state = useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  );
  return useMemo(
    () => ({
      rules: state.rules,
      pending: state.suggestions.filter((s) => s.status === "pending"),
      /** The one just raised on screen, for the inline prompt. */
      fresh: state.suggestions.find((s) => s.status === "pending" && s.fresh),
    }),
    [state]
  );
};
