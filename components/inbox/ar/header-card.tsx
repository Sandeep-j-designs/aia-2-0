import React from "react";
import Typography from "@/components/common/typography";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AR_VOUCHER_TYPES, CUSTOMERS } from "@/config/pages/inbox/ar-masters";
import {
  COST_CENTRES,
  COST_CENTRE_CLASSES,
  costCentreClassByName,
} from "@/config/pages/inbox/journal-masters";
import { DateField, EditedMark } from "@/components/inbox/v2/ui";
import { cn } from "@/lib/utils";
import type { Form } from "@/components/inbox/v2/store";

/**
 * Header Box — Invoice. Figma node 11105:66567.
 *
 * Two 286px columns on a 16px gutter inside a 20px-padded card, in the order
 * the frame lays them out:
 *
 *   GST Registration (My Branch)* | Voucher Type*
 *   Voucher No*                   | Voucher Date*
 *   Invoice Date*                 | Due Date*
 *   Invoice No*                   | Cost Centre Class ⇄ Cost Centre
 *   ── Customer Details ──
 *   Customer Name*                | Cost Centre
 *
 * Voucher No is a PICKER in the design, not a text field — it reads "Auto
 * Generated", which is a numbering series rather than a value the accountant
 * types. It offers the series and the number it produced, so the automatic
 * case is one click and the manual one is still reachable.
 */

type Props = {
  form: Form;
  branches: string[];
  edited: string[];
  customerMissing?: boolean;
  readOnly?: boolean;
  onChange: (patch: Partial<Form>) => void;
};

/**
 * One field, dressed the way the AP bill sheet dresses its own.
 *
 * Taken from that sheet's `.control` and `.t-value` rules rather than from the
 * shadcn defaults, because the two sit a route apart in the same queue and were
 * visibly different objects: 36px against 44, 12px of side padding against 16,
 * and — the one that gave it away — near-black values against the muted grey
 * every field on the bill sheet uses. The picker was also rendering its value
 * at 12px while the text inputs beside it used 14, because the project's
 * SelectTrigger ends in `text-xs`.
 *
 * `--brand-soft` is already what `border-input` resolves to here, so the edge
 * needs nothing said about it.
 */
const FIELD = cn(
  "h-11 rounded-md px-4 py-2",
  "text-sm font-normal leading-5 tracking-[-0.16px] text-secondary-foreground",
  "drop-shadow-[0_1px_1px_rgba(0,0,0,0.07)]",
  // A disabled picker here means "the switch beside it is off", not "this is
  // broken" — so it reads inert through its ground rather than by fading its
  // own label to half strength.
  "disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-section"
);

/** The frame's label: a red asterisk, a space, then the name, at 12/16 600. */
const FieldLabel = ({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <Label
    htmlFor={htmlFor}
    // 6px to the control, as the sheet's `.field` gap — 8 read as a gap
    // between two things rather than a label belonging to one.
    className="mb-2 flex min-h-5 gap-1 text-xs font-semibold leading-4 tracking-[-0.12px] text-secondary-foreground"
  >
    {required ? (
      <span aria-hidden className="text-destructive-foreground">
        *
      </span>
    ) : null}
    {children}
  </Label>
);

/** 286px in the frame; fluid here so the card survives a narrow pane. */
const CELL = "min-w-0 flex-1 basis-[286px]";
const ROW = "flex flex-wrap items-start gap-4";

const HeaderCard = ({
  form,
  branches,
  edited,
  customerMissing,
  readOnly,
  onChange,
}: Props) => {
  const mark = (key: keyof Form) =>
    edited.includes(key as string) ? <EditedMark /> : null;
  const klass = costCentreClassByName(form.costClass);
  const centres = klass
    ? COST_CENTRES.filter((c) => c.classId === klass.id)
    : COST_CENTRES;
  /** The numbering series, plus whatever number this voucher already carries. */
  const voucherNoOptions = [
    ...new Set(["Auto Generated", form.voucherNo].filter(Boolean)),
  ];

  return (
    <section className="max-w-[630px] rounded-md bg-section p-5">
      <div className="flex flex-col gap-6">
        <div className={ROW}>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-gst" required>
              GST Registration (My Branch)
            </FieldLabel>
            <Select
              value={form.gst || undefined}
              disabled={readOnly}
              onValueChange={(v) => onChange({ gst: v })}
            >
              <SelectTrigger id="ar-gst" className={FIELD}>
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([form.gst, ...branches].filter(Boolean))].map(
                  (b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {mark("gst")}
          </div>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-voucher-type" required>
              Voucher Type
            </FieldLabel>
            <Select
              value={form.voucherType || undefined}
              disabled={readOnly}
              onValueChange={(v) => onChange({ voucherType: v })}
            >
              <SelectTrigger id="ar-voucher-type" className={FIELD}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  ...new Set(
                    [...AR_VOUCHER_TYPES, form.voucherType].filter(Boolean)
                  ),
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mark("voucherType")}
          </div>
        </div>

        <div className={ROW}>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-voucher-no" required>
              Voucher No
            </FieldLabel>
            <Select
              value={form.voucherNo || "Auto Generated"}
              disabled={readOnly}
              onValueChange={(v) =>
                onChange({ voucherNo: v === "Auto Generated" ? "" : v })
              }
            >
              <SelectTrigger id="ar-voucher-no" className={FIELD}>
                <SelectValue placeholder="Auto Generated" />
              </SelectTrigger>
              <SelectContent>
                {voucherNoOptions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mark("voucherNo")}
          </div>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-voucher-date" required>
              Voucher Date
            </FieldLabel>
            {/* The voucher's own booking date, distinct from the invoice's.
                The Inbox has one date on `Form`, so the voucher date follows
                the invoice date unless Reference Date is switched on in Field
                Configuration — which is exactly what that toggle is for. */}
            <DateField
              id="ar-voucher-date"
              className={FIELD}
              value={form.date}
              disabled={readOnly}
              onChange={(iso) => onChange({ date: iso })}
            />
          </div>
        </div>

        <div className={ROW}>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-invoice-date" required>
              Invoice Date
            </FieldLabel>
            <DateField
              id="ar-invoice-date"
              className={FIELD}
              value={form.date}
              disabled={readOnly}
              onChange={(iso) => onChange({ date: iso })}
            />
            {mark("date")}
          </div>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-due-date" required>
              Due Date
            </FieldLabel>
            <DateField
              id="ar-due-date"
              className={FIELD}
              value={form.due}
              disabled={readOnly}
              onChange={(iso) => onChange({ due: iso })}
            />
            {mark("due")}
          </div>
        </div>

        <div className={ROW}>
          <div className={CELL}>
            <FieldLabel htmlFor="ar-invoice-no" required>
              Invoice No
            </FieldLabel>
            <Input
              id="ar-invoice-no"
              className={FIELD}
              placeholder="Enter Invoice No"
              readOnly={readOnly}
              value={form.invoiceNo}
              onChange={(e) => onChange({ invoiceNo: e.target.value })}
            />
            {mark("invoiceNo")}
          </div>
          <div className={CELL}>
            <div className="mb-4 flex items-center gap-6 whitespace-nowrap">
              <Label
                htmlFor="ar-cost-class"
                className="text-xs font-semibold leading-4 tracking-[-0.12px] text-secondary-foreground"
              >
                Cost Centre Class
              </Label>
              <Switch
                id="ar-cost-class-toggle"
                checked={form.costClassEnabled}
                disabled={readOnly}
                aria-label="Enable cost centre class"
                onCheckedChange={(on) =>
                  onChange({
                    costClassEnabled: on,
                    costClass: on ? form.costClass : "",
                    costCentre: on ? form.costCentre : "",
                  })
                }
              />
              <Label
                htmlFor="ar-cost-class"
                className="text-xs font-semibold leading-4 tracking-[-0.12px] text-secondary-foreground"
              >
                Cost Centre
              </Label>
            </div>
            <Select
              value={form.costClass || undefined}
              disabled={readOnly || !form.costClassEnabled}
              onValueChange={(v) => onChange({ costClass: v, costCentre: "" })}
            >
              <SelectTrigger id="ar-cost-class" className={FIELD}>
                <SelectValue placeholder="Select Cost Centre Class" />
              </SelectTrigger>
              <SelectContent>
                {COST_CENTRE_CLASSES.map((k) => (
                  <SelectItem key={k.id} value={k.name}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mark("costClass")}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Typography
            variant="p"
            weight="medium"
            className="text-lg text-secondary-foreground"
          >
            Customer Details
          </Typography>
          {/* The frame gutters this row at 24px, which with two 286px fields
              comes to 596 inside 590 of card — 6px over, and it wrapped both
              fields to full width. 16px, as every other row in the card. */}
          <div className={ROW}>
            <div className={CELL}>
              <FieldLabel htmlFor="ar-customer" required>
                Customer Name
              </FieldLabel>
              <Input
                id="ar-customer"
              className={FIELD}
                list="ar-customers"
                placeholder="Select Customer Name"
                readOnly={readOnly}
                value={form.party}
                onChange={(e) => onChange({ party: e.target.value })}
              />
              <datalist id="ar-customers">
                {CUSTOMERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {customerMissing && !CUSTOMERS.includes(form.party) ? (
                <p className="mt-1 text-[12px] leading-4 text-warning-foreground">
                  Not in your customer masters — approving will propose creating
                  it.
                </p>
              ) : null}
              {mark("party")}
            </div>
            <div className={CELL}>
              <FieldLabel htmlFor="ar-customer-cc">Cost Centre</FieldLabel>
              <Select
                value={form.costCentre || undefined}
                disabled={readOnly || !form.costClassEnabled}
                onValueChange={(v) => onChange({ costCentre: v })}
              >
                <SelectTrigger id="ar-customer-cc" className={FIELD}>
                  <SelectValue placeholder="Select Cost Centre" />
                </SelectTrigger>
                <SelectContent>
                  {centres.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mark("costCentre")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeaderCard;
