import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { companyOf } from "@/components/inbox/v2/store";
import {
  connectSource,
  configureCollectionAgent,
  previewSource,
} from "@/hooks/pages/inbox/use-inbox-sources";
import {
  SOURCE_PROVIDERS,
  SOURCE_SCOPES,
} from "@/config/pages/inbox/mock-sources";
import type {
  AgentRunMode,
  InboxSource,
  SourceProvider,
} from "@/types/pages/inbox/sources";
import RunMode from "@/components/agents/run-mode";
import { ProviderIcon } from "@/components/agents/provider-icon";
import styles from "./workspace.module.css";

type Props = {
  company: string;
  source?: InboxSource;
  initialSetup: boolean;
  onSaved: (mode: AgentRunMode) => void;
  onCancel: () => void;
  busy: boolean;
};

export default function ConnectionSetup({
  company,
  source,
  initialSetup,
  onSaved,
  onCancel,
  busy,
}: Props) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<SourceProvider>(
    source?.provider || "Gmail"
  );
  const accountName = companyOf(company)?.slug || company;
  const [account, setAccount] = useState(
    source?.account || `accounts@${accountName}.example`
  );
  const [scope, setScope] = useState(source?.scope || SOURCE_SCOPES.Gmail[0]);
  const [since, setSince] = useState(source?.since || "2026-09-01");
  const [mode, setMode] = useState<AgentRunMode>("on-demand");
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const candidates = previewSource(company, provider, scope, since);
  const issueCount = candidates.filter((c) => c.problem).length;
  const save = () => {
    try {
      connectSource(company, provider, scope, since, {
        account,
        id: source?.id,
      });
      if (initialSetup) configureCollectionAgent(company, mode);
      onSaved(mode);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save this connection. Please try again."
      );
    }
  };
  const selectProvider = (p: SourceProvider) => {
    setProvider(p);
    setScope(SOURCE_SCOPES[p][0]);
    setAccount(
      p === "WhatsApp Business"
        ? "Registered business number · demo"
        : `accounts@${accountName}.example`
    );
    setError("");
  };
  return (
    <section className={styles.setup} aria-label="Document Collection setup">
      <div className={styles.setupMain}>
        <ol className={styles.progress} aria-label="Setup progress">
          {[source ? "Update access" : "Connect a source", "Make it yours"].map(
            (label, i) => (
              <li
                key={label}
                aria-current={step === i ? "step" : undefined}
                className={step >= i ? styles.currentStep : ""}
              >
                <span>{step > i ? <Check size={13} /> : i + 1}</span>
                {label}
                {i === 0 && <div className={styles.stepLine} />}
              </li>
            )
          )}
        </ol>
        <div key={step} className={styles.stepBody}>
          <p className={styles.eyebrow}>
            {source
              ? "Connection settings"
              : initialSetup
                ? "LET’S GET YOU STARTED"
                : "GROW YOUR AGENT’S REACH"}
          </p>
          <h2 ref={heading} tabIndex={-1} className={styles.setupTitle}>
            {step === 0
              ? source
                ? "Fine-tune what your agent sees."
                : "Your invoices have a new way in."
              : "A little help. On your terms."}
          </h2>
          <p className={styles.description}>
            {step === 0
              ? "Choose where invoices arrive. We’ve filled in the rest to get you started."
              : initialSetup
                ? "Decide when your agent collects. You’ll always have the final say on every draft."
                : "Your connection is ready to save. Check the access below before you finish."}
          </p>
          {step === 0 ? (
            <fieldset disabled={busy} className="mt-7 min-w-0 space-y-5">
              <legend className="sr-only">Source and access</legend>
              {!source && (
                <div
                  role="radiogroup"
                  aria-label="Source provider"
                  className={styles.providers}
                >
                  {SOURCE_PROVIDERS.map((p) => (
                    <label
                      key={p}
                      className={cn(
                        styles.provider,
                        provider === p && styles.providerSelected
                      )}
                    >
                      <input
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        type="radio"
                        name="source-provider"
                        aria-label={p}
                        checked={provider === p}
                        onChange={() => selectProvider(p)}
                      />
                      <ProviderIcon provider={p} />
                      <span>{p === "WhatsApp Business" ? "WhatsApp" : p}</span>
                      <span className={styles.providerCheck}>
                        {provider === p && <Check size={11} />}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {source && (
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={provider} />
                  <span className="text-sm font-medium">{provider}</span>
                </div>
              )}
              <div className={styles.accessCard}>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-pi-ink">
                    Connection details
                  </span>
                  <span className={styles.demoTag}>Sample account</span>
                </div>
                <label className={styles.field}>
                  <span>
                    {provider === "WhatsApp Business"
                      ? "Business account"
                      : "Account"}
                  </span>
                  <span className={styles.selectControl}>
                    <select
                      aria-label="Source account"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    >
                      {[
                        ...new Set(
                          provider === "WhatsApp Business"
                            ? [
                                source?.account,
                                "Registered business number · demo",
                              ].filter(Boolean)
                            : [
                                source?.account,
                                `accounts@${accountName}.example`,
                                `purchases@${accountName}.example`,
                              ].filter(Boolean)
                        ),
                      ].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </span>
                </label>
                <label className={styles.field}>
                  <span>
                    {provider === "Gmail"
                      ? "Collect from this label"
                      : provider === "Google Drive"
                        ? "Collect from this folder"
                        : "Conversations"}
                  </span>
                  <span className={styles.selectControl}>
                    <select
                      aria-label="Collection scope"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                    >
                      {SOURCE_SCOPES[provider].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </span>
                </label>
                <details
                  className={styles.advanced}
                  open={source ? true : undefined}
                >
                  <summary>
                    <span>
                      Include invoices from{" "}
                      <strong>{since || "Choose a date"}</strong>
                    </span>
                    <ChevronDown size={14} />
                  </summary>
                  <label className="mt-3 block">
                    <span className="mb-2 block text-xs text-pi-body">
                      Earlier invoices won’t be included.
                    </span>
                    <Input
                      aria-label="Collection start date"
                      type="date"
                      value={since}
                      onChange={(e) => setSince(e.target.value)}
                    />
                  </label>
                </details>
              </div>
              <p className="flex items-start gap-2 text-xs leading-5 text-pi-body">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-pi-success"
                />
                Read access to your selected source only. Nothing is sent or
                approved automatically.
              </p>
            </fieldset>
          ) : (
            <div className="mt-7 space-y-6">
              <div className={styles.summaryConnection}>
                <ProviderIcon provider={provider} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{provider}</p>
                  <p className="mt-1 break-all text-xs text-pi-body">
                    {account}
                  </p>
                  <p className="mt-1 text-xs text-pi-body">
                    {scope} · From {since}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                  Edit
                </Button>
              </div>
              {initialSetup && (
                <RunMode value={mode} onChange={setMode} disabled={busy} />
              )}
              <div className={styles.finishNote}>
                <CheckCircle2 size={19} className="shrink-0 text-pi-success" />
                <div>
                  <p className="text-sm font-medium text-pi-ink">
                    {initialSetup && mode === "continuous"
                      ? "Your first collection starts after activation"
                      : "Ready now. Run whenever you need."}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-pi-body">
                    {initialSetup && mode === "continuous"
                      ? "New invoices will be collected while this app is open. You can pause at any time."
                      : "Saving connects your source. Select Run now from your agent’s workspace to collect documents."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={styles.setupFooter}>
          {error && (
            <p role="alert" className="basis-full text-sm text-pi-danger">
              {error}
            </p>
          )}
          <Button
            variant="ghost"
            onClick={
              step
                ? () => {
                    setStep(0);
                    setError("");
                  }
                : onCancel
            }
          >
            <ArrowLeft />
            {step ? "Back" : "Cancel"}
          </Button>
          <Button
            className="h-11 rounded-xl px-5"
            disabled={busy || !since}
            onClick={() => {
              setError("");
              step === 0 ? setStep(1) : save();
            }}
          >
            {step === 0
              ? "Review setup"
              : initialSetup
                ? mode === "continuous"
                  ? "Activate agent"
                  : "Save agent"
                : "Save connection"}
            {step === 0 ? <ArrowRight /> : <Check />}
          </Button>
        </div>
      </div>
      <aside className={styles.preview}>
        <div className={styles.previewHeading}>
          <div>
            <h3 className="text-sm font-semibold text-pi-ink">
              Document preview
            </h3>
            <p className="mt-1 text-xs leading-5 text-pi-body">
              Sample invoices from your selected source.
            </p>
          </div>
          <span className={styles.demoTag}>Preview only</span>
        </div>
        <div className={styles.previewSource}>
          <ProviderIcon provider={provider} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-pi-ink">{provider}</p>
            <p className="mt-1 break-words text-xs text-pi-body">{scope}</p>
          </div>
        </div>
        <div className={styles.previewPaper}>
          <div className="flex items-center justify-between gap-2 border-b border-pi-line px-4 py-4">
            <p className="text-xs font-medium text-pi-body">
              Supplier invoices
            </p>
            <span className={styles.demoTag}>{candidates.length} in scope</span>
          </div>
          <div aria-live="polite" className={styles.previewFiles}>
            {candidates.length ? (
              candidates.map((c) => (
                <div key={c.key} className={styles.setupPreviewFile}>
                  <span className={styles.fileIcon}>
                    <FileText size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs font-medium text-pi-ink">
                      {c.document.file.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-pi-body">
                      {c.document.vendor}
                    </p>
                  </div>
                  <span
                    className={cn(
                      styles.documentStatus,
                      c.problem ? styles.statusReview : styles.statusReady
                    )}
                  >
                    {c.problem === "unreadable"
                      ? "Unreadable"
                      : c.problem
                        ? "Needs review"
                        : "Ready"}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm leading-6 text-pi-body">
                No sample documents match this selection. Adjust the source or
                date, or save it for future collections.
              </p>
            )}
          </div>
          <div className="border-t border-pi-line px-4 py-3 text-xs text-pi-body">
            {candidates.length
              ? `${candidates.length - issueCount} ready to prepare${issueCount ? ` · ${issueCount} need a closer look` : ""}`
              : "Your Inbox will update after a collection."}
          </div>
        </div>
        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-pi-body">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          Your agent prepares. You review and approve.
        </p>
      </aside>
    </section>
  );
}
