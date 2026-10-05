import React, { useState } from "react";
import { ChevronRight } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  COST_CENTRE_CLASSES,
  JOURNAL_VOUCHER_TYPES,
} from "@/config/pages/inbox/journal-masters";
import { DateField, EditedMark } from "@/components/inbox/v2/ui";
import type { Form } from "@/components/inbox/v2/store";
import { Sheet } from "./sheet";

/**
 * The journal's voucher details, as the Finops review form draws them
 * (Oct 2026): a card of label rows — label, value and a status dot — with
 * the Voucher details sheet behind the card's footer link.
 *
 * Rows hold what identifies the voucher: type, date, number, reference and
 * the GST registration. The sheet holds the rest: the reference date, the cost
 * centre class and the narration.
 */
type Props = {
  form: Form;
  attempted?: boolean;
  branches: string[];
  edited: string[];
  readOnly?: boolean;
  onChange: (patch: Partial<Form>) => void;
};

type Tone = "ok" | "warn" | "err" | "muted";

function Row({
  id,
  label,
  required,
  tone,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <div className="cr-row" data-tone={tone}>
      <label className="cr-row-label" htmlFor={id}>
        {label}
        {required ? <i aria-hidden="true"> *</i> : null}
      </label>
      <div className="cr-row-value">
        <div className="jv-row-control">{children}</div>
      </div>
      <span className="cr-status" aria-hidden="true" />
    </div>
  );
}

const VoucherDetails = ({
  form,
  attempted,
  branches,
  edited,
  readOnly,
  onChange,
}: Props) => {
  const [sheet, setSheet] = useState(false);
  const mark = (key: keyof Form) =>
    edited.includes(key as string) ? <EditedMark /> : null;
  const tone = (key: "gst" | "voucherType" | "voucherNo" | "date"): Tone =>
    form[key].trim() ? "ok" : attempted ? "err" : "warn";
  const optional = (value: string): Tone => (value.trim() ? "ok" : "muted");

  return (
    <section>
      <div className="cr-section-label">
        <h2 className="cr-section-title">Voucher details</h2>
        <small>
          Required fields marked <i>*</i>
        </small>
      </div>

      <div className="cr-card">
        <Row
          id="jv-voucher-type"
          label="Voucher type"
          required
          tone={tone("voucherType")}
        >
          <Select
            value={form.voucherType}
            disabled={readOnly}
            onValueChange={(value) => onChange({ voucherType: value })}
          >
            <SelectTrigger id="jv-voucher-type" aria-label="Voucher type">
              <SelectValue placeholder="Select voucher type" />
            </SelectTrigger>
            <SelectContent>
              {[
                ...new Set(
                  [...JOURNAL_VOUCHER_TYPES, form.voucherType].filter(Boolean)
                ),
              ].map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mark("voucherType")}
        </Row>

        <Row
          id="jv-voucher-date"
          label="Voucher date"
          required
          tone={tone("date")}
        >
          <DateField
            id="jv-voucher-date"
            value={form.date}
            disabled={readOnly}
            onChange={(iso) => onChange({ date: iso })}
          />
          {mark("date")}
        </Row>

        <Row
          id="jv-voucher-no"
          label="Voucher no."
          required
          tone={tone("voucherNo")}
        >
          <Input
            id="jv-voucher-no"
            aria-label="Voucher no."
            placeholder="Enter voucher no."
            readOnly={readOnly}
            value={form.voucherNo}
            onChange={(event) => onChange({ voucherNo: event.target.value })}
          />
          {mark("voucherNo")}
        </Row>

        <Row
          id="jv-reference-no"
          label="Reference no."
          tone={optional(form.invoiceNo)}
        >
          <Input
            id="jv-reference-no"
            aria-label="Reference no."
            placeholder="Not on the document"
            readOnly={readOnly}
            value={form.invoiceNo}
            onChange={(event) => onChange({ invoiceNo: event.target.value })}
          />
          {mark("invoiceNo")}
        </Row>

        <Row id="jv-gst" label="GST registration" required tone={tone("gst")}>
          <Select
            value={form.gst || undefined}
            disabled={readOnly}
            onValueChange={(value) => onChange({ gst: value })}
          >
            <SelectTrigger id="jv-gst" aria-label="GST registration">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {[...new Set([form.gst, ...branches].filter(Boolean))].map(
                (branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {mark("gst")}
        </Row>
        <div className="cr-card-foot">
          <button
            type="button"
            className="cr-foot-link"
            onClick={() => setSheet(true)}
          >
            <span>Reference date, cost centres &amp; narration</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Voucher details"
        blurb="Reference date, cost centres and narration"
        pill={{ tone: "ok", label: "Complete" }}
      >
        <div className="field">
          <Label htmlFor="jv-reference-date" className="t-label">
            Reference date
          </Label>
          <DateField
            id="jv-reference-date"
            value={form.due}
            disabled={readOnly}
            onChange={(iso) => onChange({ due: iso })}
          />
          {mark("due")}
        </div>

        <div className="field">
          <p className="t-label">Cost centre class</p>
          <div className="flex items-center gap-3">
            <Switch
              id="jv-cost-class-toggle"
              checked={form.costClassEnabled}
              disabled={readOnly}
              aria-label="Allocate by cost centre class"
              onCheckedChange={(enabled) =>
                // Turning the class off drops the class, not the allocations
                // already made on lines.
                onChange({
                  costClassEnabled: enabled,
                  costClass: enabled ? form.costClass : "",
                })
              }
            />
            <span className="text-[13px] text-pi-body">
              {form.costClassEnabled ? "By class" : "Per line"}
            </span>
          </div>
          <Select
            value={form.costClass || undefined}
            disabled={readOnly || !form.costClassEnabled}
            onValueChange={(value) => onChange({ costClass: value })}
          >
            <SelectTrigger id="jv-cost-class" aria-label="Cost centre class">
              <SelectValue placeholder="Select cost centre class" />
            </SelectTrigger>
            <SelectContent>
              {COST_CENTRE_CLASSES.map((klass) => (
                <SelectItem key={klass.id} value={klass.name}>
                  {klass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mark("costClass")}
        </div>

        <div className="field">
          <Label htmlFor="jv-narration" className="t-label">
            Narration
          </Label>
          <Textarea
            id="jv-narration"
            rows={4}
            placeholder="Optional note on the voucher"
            readOnly={readOnly}
            value={form.narration}
            onChange={(event) => onChange({ narration: event.target.value })}
          />
          {mark("narration")}
        </div>
      </Sheet>
    </section>
  );
};

export default VoucherDetails;
