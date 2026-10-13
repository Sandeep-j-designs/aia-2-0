import React, { useMemo } from "react";
import { Zap } from "@/components/icons";
import { DotChip, TableCard } from "@/components/inbox/v2/banking/page-parts";
import {
  HEADER_CLASS,
  TABLE_CLASS,
} from "@/components/inbox/v2/banking/table-parts";
import { ROW_GROUND } from "@/components/inbox/v2/banking/page-parts";
import EmptyState from "@/components/inbox/v2/empty-state";
import { AmountText, T, type PillTone } from "@/components/inbox/v2/ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  autoApproveActions,
  evidenceFor,
  evidenceShort,
  statusLine,
  trustStatus,
  useAutoApprove,
} from "@/hooks/pages/inbox/use-auto-approve";
import { cn } from "@/lib/utils";
import type { TrustStatus } from "@/types/pages/inbox/automation";
import { timeAgo } from "@/utils/pages/notifications";
import type { RulesSectionProps } from "./types";

const TONE: Record<TrustStatus, PillTone> = {
  trusted: "ok",
  building: "neutral",
  edited: "warn",
  paused: "neutral",
};
const ORDER: Record<TrustStatus, number> = {
  trusted: 0,
  edited: 1,
  building: 2,
  paused: 3,
};

const COLUMNS: {
  key: string;
  label: string;
  width: number;
  right?: boolean;
}[] = [
  { key: "vendor", label: "Vendor", width: 220 },
  { key: "ledger", label: "Ledger", width: 180 },
  { key: "evidence", label: "Evidence", width: 280 },
  { key: "usual", label: "Usual bill", width: 120, right: true },
  { key: "last", label: "Last bill", width: 96 },
  { key: "status", label: "Status", width: 196 },
];
const ACTION_WIDTH = 96;

/** A compact inline picker that sits inside a sentence. */
const InlinePick = ({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger
      aria-label={label}
      className="mx-1 inline-flex h-7 w-auto gap-1 rounded-sm border-pi-line-2 bg-background px-2 align-baseline text-[13px] font-medium text-pi-ink shadow-contact [&>svg]:size-3.5"
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/**
 * Rules & learning › Auto-approve: the organisation's switch, the evidence
 * it asks for written as a sentence with its two thresholds inline, and every
 * vendor + ledger pattern with the evidence behind it.
 *
 * Evidence, never scores (user decision, 13 Oct 2026): a pattern is trusted
 * on "6 of 6 past bills to Internet Charges, no edits", which is what an
 * accountant would accept from a colleague.
 */
const AutoApproveRules = ({
  company,
  companyName,
  user,
}: RulesSectionProps) => {
  const { settings, patterns, trusted } = useAutoApprove(company);
  const rows = useMemo(
    () =>
      [...patterns].sort(
        (a, b) =>
          ORDER[trustStatus(a, settings)] - ORDER[trustStatus(b, settings)] ||
          b.approvals - a.approvals
      ),
    [patterns, settings]
  );
  const tableWidth =
    COLUMNS.reduce((sum, c) => sum + c.width, 0) + ACTION_WIDTH;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <section
        aria-label="Auto-approve settings"
        className="mx-[var(--inset-page)] my-4 rounded-lg border border-pi-line bg-background px-5 py-4 shadow-contact"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid size-8 flex-none place-items-center rounded-md bg-pi-brand-tint text-pi-brand"
          >
            <Zap className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="auto-approve-on"
              className="block text-[14px] font-semibold text-pi-ink"
            >
              Approve bills from trusted vendors on their own
            </label>
            <p className="mt-1 text-[13px] leading-6 text-pi-body">
              A vendor and ledger are trusted after
              <InlinePick
                label="Approvals in a row needed"
                value={String(settings.minApprovals)}
                disabled={!settings.enabled}
                options={[3, 5, 8, 10].map((n) => ({
                  value: String(n),
                  label: `${n} approvals`,
                }))}
                onChange={(v) =>
                  autoApproveActions.setSettings(
                    company,
                    { minApprovals: Number(v) },
                    user
                  )
                }
              />
              in a row with no edits. A bill is approved on its own only when it
              is within
              <InlinePick
                label="Allowed distance from the usual amount"
                value={String(settings.amountBand)}
                disabled={!settings.enabled}
                options={[1.5, 2, 3].map((n) => ({
                  value: String(n),
                  label: `${n}×`,
                }))}
                onChange={(v) =>
                  autoApproveActions.setSettings(
                    company,
                    { amountBand: Number(v) },
                    user
                  )
                }
              />
              of the usual amount, is not a duplicate and its GST checks pass.
              Auto-approved bills wait in Approved; nothing reaches Tally until
              someone syncs, and any of them can be undone until then.
            </p>
          </div>
          <Switch
            id="auto-approve-on"
            checked={settings.enabled}
            onCheckedChange={(enabled) =>
              autoApproveActions.setSettings(company, { enabled }, user)
            }
            aria-label={`Auto-approve for ${companyName}`}
          />
        </div>
        <p className="mt-3 border-t border-pi-line pt-3 text-[12px] text-pi-faint">
          {settings.enabled
            ? `On for ${companyName} · ${trusted} of ${patterns.length} patterns trusted`
            : `Off for ${companyName} · every bill comes to a person for review`}
        </p>
      </section>

      {rows.length ? (
        <TableCard>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <Table
              style={{ minWidth: tableWidth }}
              className={cn(TABLE_CLASS, "w-full")}
            >
              <TableHeader className={HEADER_CLASS}>
                <TableRow>
                  {COLUMNS.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ width: c.width, minWidth: c.width }}
                      className={cn(
                        "h-11 px-4 py-0 align-middle",
                        c.right && "text-right"
                      )}
                    >
                      <span className={T.head}>{c.label}</span>
                    </TableHead>
                  ))}
                  <TableHead
                    style={{ width: ACTION_WIDTH }}
                    className="h-11 px-4 py-0 align-middle"
                  >
                    <span className={T.head}>Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const status = trustStatus(p, settings);
                  const cell = cn(
                    "h-14 overflow-hidden px-4 py-0 align-middle",
                    T.cell,
                    ROW_GROUND
                  );
                  return (
                    <TableRow key={p.id} className="group hover:bg-transparent">
                      <TableCell
                        className={cn(cell, "font-medium text-pi-ink")}
                      >
                        <span className="block truncate" title={p.vendor}>
                          {p.vendor}
                        </span>
                      </TableCell>
                      <TableCell className={cn(cell, "text-pi-body")}>
                        <span className="block truncate">{p.ledger}</span>
                      </TableCell>
                      <TableCell className={cn(cell, "text-pi-body")}>
                        <span className="block truncate" title={evidenceFor(p)}>
                          {evidenceShort(p)}
                        </span>
                        {p.lastEditNote && status !== "trusted" ? (
                          <span
                            className="block truncate text-[12px] leading-4 text-pi-faint"
                            title={p.lastEditNote}
                          >
                            Last edit: {p.lastEditNote}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className={cn(cell, "text-right tabular-nums")}
                      >
                        <AmountText value={p.usualAmount} />
                      </TableCell>
                      <TableCell className={cn(cell, "text-pi-body")}>
                        {timeAgo(p.lastSeenAt)}
                      </TableCell>
                      <TableCell className={cell}>
                        <DotChip tone={TONE[status]} className="-ml-2">
                          {statusLine(p, settings)}
                        </DotChip>
                      </TableCell>
                      <TableCell className={cn(cell, "px-3")}>
                        {p.paused ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              autoApproveActions.resume(p.id, user)
                            }
                          >
                            Resume
                          </Button>
                        ) : status === "edited" ? null : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => autoApproveActions.pause(p.id, user)}
                          >
                            Pause
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TableCard>
      ) : (
        <div className="flex-1 border-t border-pi-line bg-background">
          <EmptyState
            icon={Zap}
            title="No vendor has a history yet"
            body="Each approved bill adds to its vendor and ledger's evidence. After enough approvals in a row with no edits, bills like it can be approved on their own."
          />
        </div>
      )}
    </div>
  );
};

export default AutoApproveRules;

/** The tab's count on Rules & learning: patterns trusted right now. */
export const useAutoApproveCount = (company: string): number | undefined =>
  useAutoApprove(company).trusted;
