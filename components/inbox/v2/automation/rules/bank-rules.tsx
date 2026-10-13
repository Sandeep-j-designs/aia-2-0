import React, { useMemo, useState } from "react";
import { Pencil, Trash2, Wand2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComboBox } from "@/components/common/combo-box";
import { AiMark } from "@/components/inbox/v2/ai-mark";
import {
  HEADER_CLASS,
  SearchBox,
  TABLE_CLASS,
} from "@/components/inbox/v2/banking/table-parts";
import EmptyState from "@/components/inbox/v2/empty-state";
import { Field, PageDialog, T } from "@/components/inbox/v2/ui";
import { ledgerGroupsOf } from "@/config/pages/inbox/mock-banking";
import {
  bankRuleActions,
  ruleThen,
  ruleWords,
  useBankRules,
} from "@/hooks/pages/inbox/use-bank-rules";
import { cn } from "@/lib/utils";
import type { BankRule } from "@/types/pages/inbox/bank-automation";
import type { RulesSectionProps } from "./types";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const HEAD = cn(T.head, "h-11 px-4 py-0 align-middle bg-pi-head-bg");
const CELL = cn(T.cell, "h-14 px-4 py-0 align-middle");

/** Change a rule's words, or the ledger it codes to. */
const EditRuleDialog = ({
  rule,
  company,
  onClose,
  onSave,
}: {
  rule: BankRule;
  company: string;
  onClose: () => void;
  onSave: (change: Pick<BankRule, "contains" | "action">) => void;
}) => {
  const [contains, setContains] = useState(rule.contains);
  const [ledger, setLedger] = useState(
    rule.action.kind === "categorise" ? rule.action.ledger : ""
  );
  const groups = ledgerGroupsOf(company);
  const valid =
    !!contains.trim() && (rule.action.kind !== "categorise" || !!ledger);
  return (
    <PageDialog
      open
      title="Edit bank rule"
      onClose={onClose}
      className="max-w-[520px]"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              onSave({
                contains: contains.trim().toUpperCase(),
                action:
                  rule.action.kind === "categorise"
                    ? { ...rule.action, ledger }
                    : rule.action,
              })
            }
          >
            Save rule
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Narration contains" htmlFor="rule-contains">
          <Input
            id="rule-contains"
            className="code"
            value={contains}
            onChange={(e) => setContains(e.target.value)}
          />
        </Field>
        {rule.action.kind === "categorise" ? (
          <Field label="Categorise as">
            <ComboBox
              title="Select Ledger"
              options={groups.flatMap((g) =>
                g.options.map((o) => ({ label: o, value: o }))
              )}
              optionGroups={groups.map((g) => ({
                label: g.heading,
                options: g.options.map((o) => ({ label: o, value: o })),
              }))}
              selectedValue={ledger}
              onChange={(value) => setLedger(String(value))}
              isMultiSelect={false}
              hideClearButton
            />
          </Field>
        ) : (
          <p className={T.value}>
            Links each payment to the oldest open bill from {rule.action.party}.
          </p>
        )}
      </div>
    </PageDialog>
  );
};

/**
 * Rules & learning › Bank rules: the narration rules the team has accepted,
 * and the ones the AI is proposing from repeated manual coding.
 *
 * A rule never makes a line Accounting Ready. It fills the type and ledger,
 * marks them as the AI's with the rule as the reason, and the line waits for
 * review like any other.
 */
const BankRules = ({ company, user, notify }: RulesSectionProps) => {
  const { rules, pending } = useBankRules(company);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BankRule | null>(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter(
      (r) =>
        !q ||
        `${r.contains} ${ruleThen(r.action)} ${r.createdBy}`
          .toLowerCase()
          .includes(q)
    );
  }, [rules, search]);

  return (
    <div className="flex min-w-0 flex-col pb-8">
      <div className="flex flex-wrap items-center gap-2 px-[var(--inset-page)] py-4">
        <SearchBox
          label="Search bank rules"
          placeholder="Search words or ledger…"
          value={search}
          onChange={setSearch}
        />
        <p className="ml-2 text-[13px] text-pi-body">
          Lines a rule codes are marked as the AI&apos;s and still wait for your
          review.
        </p>
      </div>

      {pending.length ? (
        <section aria-label="Suggested rules" className="mb-6">
          <h2 className="border-y border-pi-line bg-pi-head-bg px-6 py-2 text-[12px] font-medium text-pi-body">
            Suggested from your coding · {pending.length}
          </h2>
          <ul className="divide-y divide-pi-line border-b border-pi-line bg-background">
            {pending.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4"
              >
                <AiMark
                  reason={`drawn from ${s.repeats} lines coded by hand`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-5 text-pi-ink">
                    <span className="code">{ruleWords(s.contains)}</span>
                    <span className="text-pi-faint"> → </span>
                    <span className="font-medium">{ruleThen(s.action)}</span>
                  </p>
                  <p className="text-[12px] leading-4 text-pi-body">
                    {s.evidence}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      bankRuleActions.dismiss(company, s.id, user);
                      notify("Suggestion dismissed.", "info");
                    }}
                  >
                    Dismiss
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const { coded } = bankRuleActions.accept(
                        company,
                        s.id,
                        user
                      );
                      notify(
                        coded
                          ? `Rule created. ${coded} ${coded === 1 ? "line was coded by it and waits" : "lines were coded by it and wait"} for review.`
                          : "Rule created. It codes these lines from the next statement on."
                      );
                    }}
                  >
                    <Wand2 className="h-4 w-4" />
                    Create rule
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Bank rules">
        {shown.length ? (
          <Table className={cn(TABLE_CLASS, "w-full min-w-[920px]")}>
            <TableHeader className={HEADER_CLASS}>
              <TableRow>
                <TableHead className={cn(HEAD, "w-[24%]")}>
                  Narration contains
                </TableHead>
                <TableHead className={cn(HEAD, "w-[28%]")}>Then</TableHead>
                <TableHead className={cn(HEAD, "w-[10%] text-right")}>
                  Lines coded
                </TableHead>
                <TableHead className={cn(HEAD, "w-[20%]")}>Created</TableHead>
                <TableHead className={cn(HEAD, "w-[8%]")}>On</TableHead>
                <TableHead className={cn(HEAD, "w-[10%] text-center")}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow
                  key={r.id}
                  className="group hover:bg-transparent [&>td]:transition-colors [&>td]:group-hover:bg-pi-row-hover"
                >
                  <TableCell className={CELL}>
                    <span className="code truncate font-medium text-pi-ink">
                      {ruleWords(r.contains)}
                    </span>
                  </TableCell>
                  <TableCell className={CELL}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-pi-ink">
                        {ruleThen(r.action)}
                      </span>
                      <span className={cn(T.sub, "truncate")}>
                        {r.action.kind === "categorise"
                          ? `${r.action.type[0].toUpperCase()}${r.action.type.slice(1)} voucher`
                          : "Link the payment to the bill"}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className={cn(CELL, "text-right tabular-nums")}>
                    {r.hits}
                  </TableCell>
                  <TableCell className={CELL}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-pi-body">
                        {r.createdBy}
                      </span>
                      <span className={T.sub}>{day(r.createdAt)}</span>
                    </span>
                  </TableCell>
                  <TableCell className={CELL}>
                    <Switch
                      checked={r.on}
                      aria-label={`${r.on ? "Turn off" : "Turn on"} the ${ruleWords(r.contains)} rule`}
                      onCheckedChange={(on) => {
                        bankRuleActions.toggle(company, r.id, on);
                        notify(
                          on
                            ? `${ruleWords(r.contains)} rule is on.`
                            : `${ruleWords(r.contains)} rule is off. Lines it coded keep their ledger.`
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell className={cn(CELL, "text-center")}>
                    <span className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit the ${ruleWords(r.contains)} rule`}
                        className="text-pi-faint hover:text-pi-ink"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete the ${ruleWords(r.contains)} rule`}
                        className="text-pi-faint hover:text-pi-danger"
                        onClick={() => {
                          bankRuleActions.remove(company, r.id);
                          notify(`${ruleWords(r.contains)} rule deleted.`);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="border-t border-pi-line bg-background">
            {search.trim() ? (
              <EmptyState
                title="No rule matches"
                body="No bank rule has these words or this ledger."
                filters={[{ label: `“${search.trim()}”` }]}
                onClear={() => setSearch("")}
              />
            ) : (
              <EmptyState
                icon={Wand2}
                title="No bank rules yet"
                body="Code the same payee to the same ledger three times and a rule is suggested here and on the account."
              />
            )}
          </div>
        )}
      </section>

      {editing ? (
        <EditRuleDialog
          rule={editing}
          company={company}
          onClose={() => setEditing(null)}
          onSave={(change) => {
            bankRuleActions.update(company, editing.id, change);
            notify("Rule saved.");
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default BankRules;

/** The tab's count on Rules & learning: the rules in force or paused. */
export const useBankRulesCount = (company: string): number | undefined =>
  useBankRules(company).rules.length;
