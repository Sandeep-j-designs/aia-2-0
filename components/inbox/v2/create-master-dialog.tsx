import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, RequiredNote } from "./ui";

export type MasterKind = "ledger" | "vendor";

/**
 * The groups a new ledger can be filed under, from Tally's chart of accounts.
 *
 * Trimmed to the heads a line on a bill, invoice or journal is posted to. The
 * AP sheet's New Ledger dialog carries the full tree with book sub-groups;
 * this is the short form for a bulk edit, not a second chart.
 *
 * DEV: replace with GET /api/accounting-masters/groups.
 */
const LEDGER_GROUPS = [
  "Indirect Expenses",
  "Direct Expenses",
  "Purchase Accounts",
  "Sales Accounts",
  "Indirect Incomes",
  "Direct Incomes",
  "Fixed Assets",
  "Current Assets",
  "Current Liabilities",
  "Duties & Taxes",
];
/** Tally's two answers a new ledger can give; "Undefined" is migration debris. */
const GST_APPLICABILITY = ["Not Applicable", "Applicable"];
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

type Props = {
  kind: MasterKind | null;
  /** What was typed in the dropdown's search box, carried into Name. */
  initialName: string;
  /** Names already in the book, for the uniqueness check. */
  existing: string[];
  onClose: () => void;
  onCreate: (name: string) => void;
  /** What happens to the new master, in the words of the place that asked. */
  description?: string;
};

/**
 * Create a ledger or a vendor from any picker's "+ Create" row — the bulk-edit
 * bar, a journal line, a table cell. The caller says what happens next through
 * `description`; from the bar it is staged and written on Save.
 *
 * A vendor is a ledger too, filed under Sundry Creditors, so both are one
 * dialog. It asks only what the new master cannot be made without. Anything
 * more (credit period, bank details, TDS) belongs to the master's own page,
 * not to a bulk edit.
 *
 * DEV: prototype-only. On Create, POST /api/accounting-masters/ledgers (a
 * vendor is `{ group: "Sundry Creditors", gstin }`), then stage the returned
 * name for the selection.
 */
const CreateMasterDialog = ({
  kind,
  initialName,
  existing,
  onClose,
  onCreate,
  description = "It is added to your books, and set on the selected documents when you save.",
}: Props) => {
  const [name, setName] = useState("");
  const [group, setGroup] = useState(LEDGER_GROUPS[0]);
  const [gst, setGst] = useState(GST_APPLICABILITY[0]);
  const [gstin, setGstin] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!kind) return;
    setName(initialName);
    setGroup(LEDGER_GROUPS[0]);
    setGst(GST_APPLICABILITY[0]);
    setGstin("");
    setTried(false);
  }, [kind, initialName]);

  const noun = kind === "vendor" ? "vendor" : "ledger";
  const trimmed = name.trim();
  const taken = existing.some(
    (value) => value.trim().toLowerCase() === trimmed.toLowerCase()
  );
  const nameError = !trimmed
    ? `Enter a ${noun} name.`
    : taken
      ? `A ${noun} called “${trimmed}” already exists.`
      : "";
  const gstinError =
    kind === "vendor" && gstin.trim() && !GSTIN.test(gstin.trim())
      ? "A GSTIN is 15 characters, like 29ABCDE1234F1Z5."
      : "";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (nameError || gstinError) {
      document
        .getElementById(nameError ? "master-name" : "master-gstin")
        ?.focus();
      return;
    }
    onCreate(trimmed);
  };

  return (
    <Dialog open={!!kind} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="refined-dialog max-h-[calc(100dvh-48px)] w-[calc(100vw-32px)] max-w-[520px] gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
        <form
          onSubmit={submit}
          noValidate
          className="flex min-h-0 max-h-[calc(100dvh-48px)] flex-col"
        >
          <DialogHeader className="refined-dialog-header shrink-0 space-y-0 border-b border-pi-line px-7 pb-5 pt-7 text-left">
            <DialogTitle className="pr-8 text-[22px] font-medium tracking-[-0.02em] text-pi-ink">
              {kind === "vendor" ? "New vendor" : "New ledger"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-[13px] leading-5 text-pi-body">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* The form standard (7 Oct 2026): Field boxes at 38px, required
              unmarked with the note top-right, GSTIN marked optional, one
              12px error line under its box. */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-7 py-6">
            <RequiredNote className="-mb-2 self-end" />
            <Field
              label={kind === "vendor" ? "Vendor name" : "Ledger name"}
              htmlFor="master-name"
              error={tried && nameError ? nameError : undefined}
            >
              <Input
                id="master-name"
                autoFocus
                placeholder={
                  kind === "vendor" ? "e.g. Acme Supplies" : "e.g. Office rent"
                }
                autoComplete="off"
                aria-required="true"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={tried && !!nameError}
              />
            </Field>

            {kind === "ledger" ? (
              <div className="grid grid-cols-1 items-start gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field label="Account group" htmlFor="master-group">
                  <Select value={group} onValueChange={setGroup}>
                    <SelectTrigger id="master-group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEDGER_GROUPS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="GST applicability" htmlFor="master-gst">
                  <Select value={gst} onValueChange={setGst}>
                    <SelectTrigger id="master-gst">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_APPLICABILITY.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field
                  label="GSTIN"
                  htmlFor="master-gstin"
                  optional
                  error={tried && gstinError ? gstinError : undefined}
                >
                  <Input
                    id="master-gstin"
                    value={gstin}
                    onChange={(event) =>
                      setGstin(event.target.value.toUpperCase())
                    }
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    maxLength={15}
                    aria-invalid={tried && !!gstinError}
                  />
                </Field>
                <Field label="Under">
                  {/* Not a choice: a vendor is a Sundry Creditors ledger. Said,
                    so the accountant knows where it lands. */}
                  <p className="flex h-[38px] items-center text-[14px] text-pi-ink">
                    Sundry Creditors
                  </p>
                </Field>
              </div>
            )}

            <div className="rounded-xl border border-pi-line bg-pi-head-bg px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pi-faint">
                Quick review
              </p>
              <p className="mt-1 text-[13px] font-medium text-pi-ink">
                {trimmed ||
                  (kind === "vendor" ? "Your new vendor" : "Your new ledger")}
              </p>
              <p className="mt-1 text-[12px] text-pi-body">
                {kind === "vendor" ? "Sundry Creditors" : group} ·{" "}
                {kind === "vendor"
                  ? gstin
                    ? "GSTIN provided"
                    : "No GSTIN added"
                  : `GST: ${gst.toLowerCase()}`}
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-3 border-t border-pi-line bg-background px-7 py-4 sm:space-x-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {kind === "vendor" ? "Create vendor" : "Create ledger"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMasterDialog;
