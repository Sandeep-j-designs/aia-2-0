import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { PageDialog } from "@/components/inbox/v2/ui";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import {
  runComplianceChecks,
  useCompliance,
  resolveCompliance,
} from "@/hooks/pages/inbox/use-compliance";
import { rupees } from "@/utils/pages/inbox/ai-calculations";
import type { ComplianceIssue } from "@/types/pages/inbox/ai-features";
type Props = { company: string };
const CompliancePage = ({ company }: Props) => {
  const router = useRouter();
  const issues = useCompliance(company);
  const tab = router.query.tab === "resolved" ? "resolved" : "open";
  const [check, setCheck] = useState("");
  const [selected, setSelected] = useState<ComplianceIssue | null>(null);
  const [body, setBody] = useState("");
  const [dismiss, setDismiss] = useState(false);
  useEffect(() => {
    runComplianceChecks(company);
  }, [company]);
  const rows = issues
    .filter((x) => x.status === tab && (!check || x.check === check))
    .sort((a, b) => b.impact - a.impact);
  const preview = (x: ComplianceIssue, dismissing = false) => {
    setSelected(x);
    setDismiss(dismissing);
    setBody(
      dismissing
        ? ""
        : `Dear ${x.kind === "note" ? "Priya" : x.vendor},\n\n${x.evidence}\n\n${x.kind === "note" ? "Please review the deduction before the next payment." : "Please send the supporting bill or corrected invoice for our review."}\n\nRegards,\nAccounts team`
    );
  };
  return (
    <FeaturePage
      title="Compliance checks"
      tab={tab}
      onTab={(next) =>
        void router.replace(
          { pathname: "/inbox", query: { module: "CHECKS", tab: next } },
          undefined,
          { shallow: true }
        )
      }
      tabs={[
        {
          id: "open",
          label: "Open",
          count: issues.filter((x) => x.status === "open").length,
        },
        {
          id: "resolved",
          label: "Resolved",
          count: issues.filter((x) => x.status === "resolved").length,
        },
      ]}
      actions={
        <Button variant="outline" onClick={() => runComplianceChecks(company)}>
          Run checks
        </Button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-pi-body">
          {rows.length} issues ·{" "}
          {rupees(rows.reduce((n, x) => n + x.impact, 0))} affected
        </p>
        <select
          aria-label="Check type"
          className="rounded-sm border border-pi-line bg-background p-2 text-sm"
          value={check}
          onChange={(e) => setCheck(e.target.value)}
        >
          <option value="">All check types</option>
          {[...new Set(issues.map((x) => x.check))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {!rows.length && (
        <p className="rounded-lg border border-pi-line bg-background p-8 text-pi-body">
          No {tab} issues for this organisation and filter.
        </p>
      )}
      <div className="divide-y divide-pi-line rounded-lg border border-pi-line bg-background">
        {rows.map((x) => (
          <article key={x.id} className="space-y-3 p-5">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="font-semibold text-pi-ink">{x.check}</h2>
                <p className="mt-1 text-sm text-pi-body">{x.vendor}</p>
              </div>
              <span className="font-semibold tabular-nums">
                {rupees(x.impact)}
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-pi-body">
              {x.evidence}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  void router.push(
                    x.documentId
                      ? `/inbox?id=${x.documentId}`
                      : "/inbox?module=GST&tab=invoices"
                  )
                }
              >
                {x.documentId ? "View document" : "View GST records"}
              </Button>
              {x.status === "open" ? (
                <>
                  <Button variant="outline" onClick={() => preview(x)}>
                    {x.fix}
                  </Button>
                  <Button variant="ghost" onClick={() => preview(x, true)}>
                    Dismiss
                  </Button>
                </>
              ) : (
                <>
                  <span className="p-2 text-sm text-pi-faint">
                    {x.resolution}
                  </span>
                  {x.draftId && (
                    <Button
                      variant="outline"
                      onClick={() => void router.push(`/inbox?id=${x.draftId}`)}
                    >
                      Review draft JV
                    </Button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <PageDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          dismiss ? "Dismiss with reason" : selected?.fix || "Review correction"
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={dismiss && !body.trim()}
              onClick={() => {
                if (selected)
                  resolveCompliance(
                    selected,
                    dismiss
                      ? `Dismissed: ${body.trim()}`
                      : selected.kind === "journal"
                        ? "Draft created"
                        : "Sent (simulated)",
                    body
                  );
                setSelected(null);
              }}
            >
              {dismiss
                ? "Dismiss issue"
                : selected?.kind === "journal"
                  ? "Create draft JV"
                  : "Send (simulated)"}
            </Button>
          </>
        }
      >
        {selected?.kind === "journal" && !dismiss ? (
          <div className="space-y-4 text-sm">
            <p>{selected.evidence}</p>
            <p>
              Dr {selected.debit} {rupees(selected.impact)}
            </p>
            <p>Cr Input GST {rupees(selected.impact)}</p>
            <p className="text-pi-faint">
              Creates a balanced journal in Needs Review. Approval and Sync
              remain with you.
            </p>
          </div>
        ) : (
          <textarea
            aria-label={dismiss ? "Dismissal reason" : "Message preview"}
            className="min-h-56 w-full rounded-sm border border-pi-line bg-background p-3 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        )}
      </PageDialog>
    </FeaturePage>
  );
};
export default CompliancePage;
