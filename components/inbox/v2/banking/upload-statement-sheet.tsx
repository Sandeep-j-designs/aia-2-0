import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  FilePlus2,
  FileText,
  Lightbulb,
  Trash2,
  X,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { isCashLedger } from "@/hooks/pages/inbox/use-banking";
import { BANK_OPTIONS } from "@/config/pages/inbox/mock-banking";
import type {
  BankAccountType,
  BankLedgerData,
  BankUploadTarget,
  FileStatus,
  Statement,
} from "@/types/pages/inbox/banking";
import { Field, RequiredNote, T } from "@/components/inbox/v2/ui";
import { DotChip } from "./page-parts";
import {
  DeleteStatementDialog,
  StatementStatusPill,
  canDeleteStatement,
  periodOf,
} from "./statement-parts";

/**
 * Upload Statement — a right sheet, 800px.
 *
 * Production: components/bank/upload-statements-sheet.tsx with
 * hooks/pages/bank/useBankUploadSheetController.ts. Ledger, account type and
 * bank come first; the drop zone opens once all three are set. Each file is
 * checked (corrupt? password?) and uploaded with a progress bar.
 *
 * Simulated here: a file named with "corrupt" fails the check; one named with
 * "protected" or "password" asks for its password (any password but "wrong"
 * opens it).
 *
 * DEV: the check reads the PDF with pdfjs; the upload is
 * POST /api/upload-file-to-dms → PUT presigned URL → POST /api/statements.
 */

const MAX_FILE_SIZE_MB = 50;
const ACCOUNT_TYPES: { label: string; value: BankAccountType }[] = [
  { label: "Bank", value: "bank" },
  { label: "Credit Card", value: "credit_card" },
];
const TYPE_LABEL: Record<string, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
};
/** production's DEFAULT_STATUS_PROGRESS for a file without a real figure. */
const STEP_PROGRESS = { pending: 18, checking: 32, uploading: 55 };

const EMPTY_TARGET: BankUploadTarget = {
  ledgerId: "",
  ledgerName: "",
  accountType: "",
  accountTypeLabel: "",
  bankName: "",
  bankId: null,
};

const targetFor = (ledger?: BankLedgerData): BankUploadTarget =>
  ledger
    ? {
        ledgerId: ledger.id,
        ledgerName: ledger.ledgerName,
        accountType: ledger.accountType,
        accountTypeLabel: TYPE_LABEL[ledger.accountType] ?? "",
        bankName: ledger.bankName || ledger.korefiBankName || "",
        bankId: ledger.bankId,
      }
    : EMPTY_TARGET;

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** A row in the file list: name • state, then its control. */
const FileRow = ({
  file,
  onRemove,
  onPassword,
}: {
  file: FileStatus;
  onRemove: () => void;
  onPassword: (password: string) => void;
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const name = (
    <span className="max-w-[240px] truncate text-[13px] text-pi-ink">
      {file.file.name}
    </span>
  );
  const remove = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${file.file.name}`}
      onClick={onRemove}
      className="shrink-0 text-pi-faint hover:text-pi-danger"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
  if (
    file.status === "pending" ||
    file.status === "checking" ||
    file.status === "uploading"
  )
    return (
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">{name}</div>
        <Progress
          value={file.progress || STEP_PROGRESS[file.status]}
          className="h-1.5 w-[290px] shrink-0 rounded-full bg-pi-fill"
          indicatorClassName="rounded-full bg-pi-brand motion-reduce:transition-none"
          aria-label={`Uploading ${file.file.name}`}
        />
      </div>
    );
  if (file.status === "password_required")
    return (
      // Top-aligned on the 38px box line, so the error line under the box
      // grows the row downward instead of lifting the name and chip.
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
          <span className="flex h-[38px] min-w-0 items-center">{name}</span>
          <span className="flex h-[38px] items-center">
            <DotChip tone="warn">Password required</DotChip>
          </span>
          {/* The form box (38px, 12px error line) without a visible label:
              the row's file name is the label (7 Oct 2026). */}
          <div
            className="modern-field flex w-[196px] flex-col"
            data-invalid={error ? "true" : undefined}
          >
            <Input
              type="password"
              placeholder="Enter Password"
              aria-label={`Password for ${file.file.name}`}
              value={password}
              aria-invalid={!!error}
              error={error || undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.target.value) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </div>
          <Button
            variant="link"
            className="h-[38px] p-0 font-semibold"
            onClick={() => {
              if (!password) return setError("Password is required");
              // Simulated: "wrong" stands in for a password pdfjs rejects.
              if (password === "wrong") return setError("Incorrect password");
              setError("");
              onPassword(password);
            }}
          >
            Give Access
          </Button>
        </div>
        <span className="flex h-[38px] items-center">{remove}</span>
      </div>
    );
  if (file.status === "corrupted" || file.status === "error")
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {name}
          <DotChip tone="error">
            {file.status === "corrupted"
              ? "Corrupted file found"
              : file.error || "Upload failed"}
          </DotChip>
        </div>
        {remove}
      </div>
    );
  return null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgers: BankLedgerData[];
  /** Opening from a ledger's row or its transactions pre-fills it. */
  initialLedgerId?: string;
  statements: Statement[];
  /** Called once a file has uploaded, with the target it went to. */
  onUploaded: (target: BankUploadTarget, fileName: string) => void;
  onDeleteStatement: (statement: Statement) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
  onUnbuilt: (what: string) => void;
};

const UploadStatementSheet = ({
  open,
  onOpenChange,
  ledgers,
  initialLedgerId,
  statements,
  onUploaded,
  onDeleteStatement,
  notify,
  onUnbuilt,
}: Props) => {
  const uploadLedgers = ledgers.filter((l) => !isCashLedger(l));
  const [target, setTarget] = useState<BankUploadTarget>(() =>
    targetFor(uploadLedgers.find((l) => l.id === initialLedgerId))
  );
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<Statement | null>(null);
  // Set when an upload is tried before the three pickers are filled: each
  // empty one then says so under its box, beside the toast (7 Oct 2026).
  const [showErrors, setShowErrors] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const ready = !!(target.ledgerId && target.accountType && target.bankName);
  // Account type and bank stay disabled until a ledger is picked (and the
  // ledger fills them), so only the ledger speaks up before that.
  const errors = showErrors
    ? {
        ledger: target.ledgerId ? undefined : "Select a ledger",
        accountType:
          target.ledgerId && !target.accountType
            ? "Select an account type"
            : undefined,
        bank: target.ledgerId && !target.bankName ? "Select a bank" : undefined,
      }
    : {};
  const refuseUpload = () => {
    setShowErrors(true);
    notify(
      "Select a ledger, account type, and bank before uploading.",
      "error"
    );
  };
  const browse = () => (ready ? inputRef.current?.click() : refuseUpload());

  const update = (id: string, change: Partial<FileStatus>) =>
    mounted.current &&
    setFiles((list) =>
      list.map((f) => (f.id === id ? { ...f, ...change } : f))
    );

  const upload = async (entry: FileStatus) => {
    update(entry.id, { status: "uploading", progress: 55 });
    for (const progress of [70, 85, 100]) {
      await wait(350);
      update(entry.id, { progress });
    }
    update(entry.id, { status: "completed" });
    onUploaded(entry.uploadTarget ?? target, entry.file.name);
    notify(
      `${entry.file.name} uploaded\nAIA is reading it now. Extraction can take up to 30 minutes.`
    );
  };

  const process = async (entry: FileStatus) => {
    await wait(300);
    update(entry.id, { status: "checking" });
    await wait(500);
    const lower = entry.file.name.toLowerCase();
    if (lower.includes("corrupt"))
      return update(entry.id, {
        status: "corrupted",
        error: "Corrupted File; please obtain new copy of the file.",
      });
    if (lower.includes("protected") || lower.includes("password"))
      return update(entry.id, { status: "password_required" });
    await upload(entry);
  };

  const addFiles = (list: FileList | File[]) => {
    if (!ready) {
      refuseUpload();
      return;
    }
    const all = Array.from(list);
    if (all.some((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)) {
      notify(
        `File exceeds the maximum size of ${MAX_FILE_SIZE_MB} MB.`,
        "error"
      );
      return;
    }
    // Production drops anything that is not a PDF without a word.
    const entries: FileStatus[] = all
      .filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name))
      .map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "pending",
        progress: 0,
        uploadTarget: { ...target },
      }));
    setFiles((current) => [...current, ...entries]);
    entries.forEach((entry) => void process(entry));
  };

  const chooseLedger = (id: string) =>
    setTarget(targetFor(uploadLedgers.find((l) => l.id === id)));

  const shownStatements = target.ledgerId
    ? statements.filter((s) => s.bankAccountUuid === target.ledgerId)
    : statements;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-pi-line bg-background p-0 sm:max-w-[800px] sm:rounded-l-xl"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-pi-line px-6 py-5 text-left">
          <div className="min-w-0">
            <span className="workspace-eyebrow mb-1">Banking</span>
            <SheetTitle className="text-[22px] font-medium leading-tight tracking-[-0.02em] text-foreground">
              Upload Statement
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Choose the ledger, then upload its PDF statements.
          </SheetDescription>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-5 w-5 text-pi-faint" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <RequiredNote />
            </div>
            <div className="grid grid-cols-1 items-start gap-x-5 gap-y-4 sm:grid-cols-3">
              <Field label="Ledger" error={errors.ledger}>
                <ComboBox
                  title="Select a Ledger type..."
                  options={uploadLedgers.map((l) => ({
                    value: l.id,
                    label: l.ledgerName,
                  }))}
                  selectedValue={target.ledgerId}
                  onChange={(value) => chooseLedger(String(value))}
                  isMultiSelect={false}
                  actionLabel="+ Create Ledger"
                  invalid={!!errors.ledger}
                  onAction={() => onUnbuilt("Creating a ledger")}
                  hideClearButton
                />
              </Field>
              <Field label="Account Type" error={errors.accountType}>
                <ComboBox
                  title="Select an account type..."
                  options={ACCOUNT_TYPES}
                  selectedValue={target.accountType}
                  onChange={(value) =>
                    setTarget((t) => ({
                      ...t,
                      accountType: value as BankAccountType,
                      accountTypeLabel: TYPE_LABEL[String(value)] ?? "",
                    }))
                  }
                  hasSearch={false}
                  isMultiSelect={false}
                  disabled={!target.ledgerId}
                  invalid={!!errors.accountType}
                  hideClearButton
                />
              </Field>
              <Field label="Bank" error={errors.bank}>
                <ComboBox
                  title="Select Bank"
                  options={BANK_OPTIONS.map((b) => ({ value: b, label: b }))}
                  selectedValue={target.bankName}
                  onChange={(value) =>
                    setTarget((t) => ({ ...t, bankName: String(value) }))
                  }
                  isMultiSelect={false}
                  disabled={!target.ledgerId}
                  invalid={!!errors.bank}
                  hideClearButton
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              aria-disabled={!ready}
              aria-label="Drop your files or browse"
              onClick={browse}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && ready) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (ready) setDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex h-[209px] flex-col items-center justify-center rounded-lg border border-dashed border-pi-line-strong bg-pi-page p-6 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pi-brand motion-reduce:transition-none",
                ready
                  ? "cursor-pointer hover:border-pi-brand-border hover:bg-pi-brand-tint"
                  : "cursor-not-allowed opacity-60",
                dragging && "border-pi-brand bg-pi-brand-tint"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="grid size-11 place-items-center rounded-lg border border-pi-line bg-background text-pi-body shadow-contact">
                  <FilePlus2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-pi-ink">
                    Drop your files or{" "}
                    <span className="text-pi-brand underline decoration-pi-brand-border underline-offset-[3px]">
                      browse
                    </span>
                  </p>
                  <p className="text-[13px] text-pi-body">
                    Supported format: pdf.
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              disabled={!ready}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.some((f) => f.status !== "completed") ? (
              <div className="space-y-2 py-1">
                {files.map((f) =>
                  f.status === "completed" ? null : (
                    <div
                      key={f.id}
                      className="border-b border-pi-line pb-2 last:border-b-0"
                    >
                      <FileRow
                        file={f}
                        onRemove={() =>
                          setFiles((list) => list.filter((x) => x.id !== f.id))
                        }
                        onPassword={(password) => {
                          update(f.id, { password });
                          void upload({ ...f, password });
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-pi-line bg-pi-page px-4 py-3">
            <span className="flex items-center gap-2 text-[13px] font-medium text-pi-ink">
              <Lightbulb className="h-4 w-4 text-pi-faint" />
              Upload guidelines
            </span>
            <ul className="list-disc space-y-0.5 pl-10 text-[13px] leading-5 text-pi-body">
              <li>
                Only PDF statements downloaded from your bank&apos;s netbanking
                are supported. Scanned PDFs are not supported.
              </li>
              <li>Extraction might take up to 30 mins.</li>
              <li>
                If extraction fails, our system automatically retries after 30
                minutes.
              </li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h2 className={cn(T.section, "mb-1")}>Statements</h2>
            {shownStatements.length ? (
              <div className="divide-y divide-pi-line">
                {shownStatements.map((s) => (
                  <div
                    key={s.bankStmtStatusUuid}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-pi-line bg-pi-page">
                        <FileText className="h-4 w-4 text-pi-body" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="max-w-[400px] truncate text-[13px] font-medium text-pi-ink">
                            {s.fileName}
                          </span>
                          <StatementStatusPill statement={s} />
                        </div>
                        <p className={cn(T.sub, "mt-1 flex flex-wrap gap-1")}>
                          <span className="mr-1 text-pi-body">
                            {s.bankAccountName}
                          </span>
                          {s.statementStartDate ? (
                            <>
                              <span>&bull;</span>
                              <span>{periodOf(s)}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    {canDeleteStatement(s) ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Download ${s.fileName}`}
                          className="text-pi-faint hover:text-pi-ink"
                          onClick={() => notify(`${s.fileName} downloaded`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          isDestructive
                          aria-label={`Delete ${s.fileName}`}
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn(T.value, "py-6")}>
                No statement found, upload statements to see statements here.
              </p>
            )}
          </div>
        </div>

        {/* The sheet's footer band (7 Oct 2026): white, a hairline above,
            Cancel then the action. Files upload as they are dropped, so the
            primary opens the file picker — the drop zone's own click. */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-pi-line bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={browse}>
            <FilePlus2 className="h-4 w-4" />
            Choose statements
          </Button>
        </div>
        <DeleteStatementDialog
          statement={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={(statement) => {
            onDeleteStatement(statement);
            setDeleting(null);
            notify("Statement deleted");
          }}
        />
      </SheetContent>
    </Sheet>
  );
};

export default UploadStatementSheet;
