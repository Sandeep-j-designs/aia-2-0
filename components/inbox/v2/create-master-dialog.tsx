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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          <DialogHeader className="refined-dialog-header shrink-0 space-y-1 border-b border-pi-line px-7 pb-5 pt-7">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-pi-brand">
              Add to your books
            </p>
            <DialogTitle className="text-[22px] font-medium tracking-[-0.02em] text-pi-ink">
              {kind === "vendor" ? "New vendor" : "New ledger"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5 text-pi-body">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-7 py-6">
            <div className="modern-field space-y-2">
              <Label
                htmlFor="master-name"
                className="text-[12px] font-medium text-pi-body"
              >
                {kind === "vendor" ? "Vendor name" : "Ledger name"}{" "}
                <span aria-hidden="true" className="text-pi-danger">
                  *
                </span>
              </Label>
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
                aria-describedby={
                  tried && nameError ? "master-name-error" : undefined
                }
              />
              {tried && nameError && (
                <p
                  id="master-name-error"
                  className="text-[12px] text-pi-danger"
                >
                  {nameError}
                </p>
              )}
            </div>

            {kind === "ledger" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="modern-field space-y-2">
                  <Label
                    htmlFor="master-group"
                    className="text-[12px] font-medium text-pi-body"
                  >
                    Account group
                  </Label>
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
                </div>
                <div className="modern-field space-y-2">
                  <Label
                    htmlFor="master-gst"
                    className="text-[12px] font-medium text-pi-body"
                  >
                    GST applicability
                  </Label>
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
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="modern-field space-y-2">
                  <Label
                    htmlFor="master-gstin"
                    className="text-[12px] font-medium text-pi-body"
                  >
                    GSTIN (optional)
                  </Label>
                  <Input
                    id="master-gstin"
                    value={gstin}
                    onChange={(event) =>
                      setGstin(event.target.value.toUpperCase())
                    }
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    maxLength={15}
                    aria-invalid={tried && !!gstinError}
                    aria-describedby={
                      tried && gstinError ? "master-gstin-error" : undefined
                    }
                  />
                  {tried && gstinError && (
                    <p
                      id="master-gstin-error"
                      className="text-[12px] text-pi-danger"
                    >
                      {gstinError}
                    </p>
                  )}
                </div>
                <div className="modern-field space-y-2">
                  <span className="text-[12px] font-medium text-pi-body">
                    Under
                  </span>
                  {/* Not a choice: a vendor is a Sundry Creditors ledger. Said,
                    so the accountant knows where it lands. */}
                  <p className="flex h-10 items-center text-[13px] text-pi-ink">
                    Sundry Creditors
                  </p>
                </div>
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

          <DialogFooter className="shrink-0 gap-2 border-t border-pi-line bg-pi-head-bg px-7 py-4 sm:space-x-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create {noun}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMasterDialog;
