import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageDialog } from "@/components/inbox/v2/ui";
import { useStore } from "@/components/inbox/v2/store";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import {
  applyFirmPolicy,
  parsePolicy,
  policyHistory,
  savePolicies,
  useClientPolicy,
} from "@/hooks/pages/inbox/use-client-policy";
import type { PolicyRule } from "@/types/pages/inbox/ai-features";
type Props = { company: string };
const PolicyPage = ({ company }: Props) => {
  const router = useRouter(),
    state = useStore(),
    rules = useClientPolicy(company);
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [preview, setPreview] = useState<PolicyRule[]>([]),
    [error, setError] = useState(""),
    [edit, setEdit] = useState<string>();
  const start = (rule?: PolicyRule) => {
    setEdit(rule?.id);
    setText(rule?.text || "");
    setPreview([]);
    setError("");
    setOpen(true);
  };
  return (
    <FeaturePage
      title="Client policy"
      tabs={[{ id: "policy", label: "Client policy", count: rules.length }]}
      tab="policy"
      actions={<Button onClick={() => start()}>Write policy</Button>}
    >
      <p className="text-sm text-pi-body">
        Coding conventions for this organisation. Review the interpretation
        before activating a rule.
      </p>
      {!rules.length && (
        <div className="rounded-lg border border-pi-line bg-background p-8">
          <p className="mb-4">No client policy yet.</p>
          <Button onClick={() => applyFirmPolicy([company])}>
            Start from the firm template
          </Button>
        </div>
      )}
      <div className="divide-y divide-pi-line rounded-lg border border-pi-line bg-background">
        {rules.map((r) => (
          <article key={r.id} className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium">{r.text}</p>
              <Switch
                aria-label={`Enable ${r.text}`}
                checked={r.active}
                onCheckedChange={(active) =>
                  savePolicies(company, [{ ...r, active }])
                }
              />
            </div>
            <p className="text-sm text-pi-faint">
              {r.template ? "Firm template · " : "Client rule · "}
              {r.action.ledger}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-pi-brand">
                {policyHistory(r).length} matching bills in history
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {policyHistory(r).map((x) => (
                  <Button
                    key={x.id}
                    variant="ghost"
                    onClick={() => void router.push(`/inbox?id=${x.id}`)}
                  >
                    {x.form.voucherNo}
                  </Button>
                ))}
              </div>
            </details>
            <Button variant="outline" onClick={() => start(r)}>
              Edit rule
            </Button>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-pi-line p-5">
        <div>
          <h2 className="font-medium">Firm template</h2>
          <p className="mt-1 text-sm text-pi-body">
            Equipment, lab testing and generator diesel conventions.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => applyFirmPolicy(state.companies.map((c) => c.id))}
        >
          Apply template to all {state.companies.length} organisations
        </Button>
      </div>
      <PageDialog
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Edit policy rule" : "Write client policy"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (preview.length) {
                  savePolicies(
                    company,
                    preview.map((r, i) =>
                      edit && i === 0 ? { ...r, id: edit } : r
                    )
                  );
                  setOpen(false);
                } else
                  try {
                    setPreview(parsePolicy(text, company));
                  } catch (e) {
                    setError((e as Error).message);
                  }
              }}
              disabled={!text.trim()}
            >
              {preview.length
                ? "Confirm and activate"
                : "Preview interpretation"}
            </Button>
          </>
        }
      >
        <textarea
          aria-label="Policy rules"
          placeholder="Equipment purchases over ₹10,000 go to Plant & Machinery."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview([]);
            setError("");
          }}
          className="min-h-32 w-full rounded-sm border border-pi-line bg-background p-3 text-sm"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-pi-danger">
            {error}
          </p>
        )}
        {preview.map((r) => (
          <div
            key={r.id}
            className="mt-4 space-y-2 border-t border-pi-line pt-4 text-sm"
          >
            <p>
              Condition: description matches {r.condition.description}
              {r.condition.minimum
                ? ` · amount over ₹${r.condition.minimum.toLocaleString("en-IN")}`
                : ""}
            </p>
            <p>Action: {r.action.ledger}</p>
            <p>
              {
                policyHistory(r).filter((x) =>
                  x.form.lines.some((l) => l.ledger !== r.action.ledger)
                ).length
              }{" "}
              past bills would change.
            </p>
          </div>
        ))}
      </PageDialog>
    </FeaturePage>
  );
};
export default PolicyPage;
