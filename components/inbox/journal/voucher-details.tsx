import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { JOURNAL_VOUCHER_TYPES } from "@/config/pages/inbox/journal-masters";
import { DateField, EditedMark } from "@/components/inbox/v2/ui";
import CostCentrePicker from "./cost-centre-picker";
import type { Form } from "@/components/inbox/v2/store";

/**
 * The journal's voucher details, as the Finops review form draws them
 * (Oct 2026): a card of label rows — label, value and a status dot — with
 * every field in one Voucher section (cost centre included since 7 Oct 2026).
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
  check,
  label,
  required,
  tone,
  group,
  source,
  className,
  children,
}: {
  id: string;
  /** The row's key, as the bill's rows carry it (`data-check`). */
  check: string;
  label: string;
  required?: boolean;
  tone: Tone;
  /** Under More details: the group it sits in, as on the bill. */
  group?: string;
  /**
   * Where the source document prints this value (a region key, see
   * `SourceDocument`); the viewer highlights it while the field has focus.
   */
  source?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("cr-row", group && "cr-more-row", className)}
      data-check={check}
      data-group={group}
      data-tone={tone}
      data-source={source}
      data-source-label={source ? label : undefined}
    >
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

/*
  Priority form (6 Oct 2026), as on the bill and the invoice: the voucher's
  own fields stay on the form in a Voucher section; the header cost centre
  sits in the Voucher section too (7 Oct 2026): it was the only field under
  More details, so the toggle and its Accounting heading were dropped.
*/
/** The cost centre picker's "nothing at the header" value (Radix needs one). */

const VoucherDetails = ({
  form,
  attempted,
  branches,
  edited,
  readOnly,
  onChange,
}: Props) => {
  const mark = (key: keyof Form) =>
    edited.includes(key as string) ? <EditedMark /> : null;
  const tone = (key: "gst" | "voucherType" | "voucherNo" | "date"): Tone =>
    form[key].trim() ? "ok" : attempted ? "err" : "warn";
  const optional = (value: string): Tone => (value.trim() ? "ok" : "muted");

  const costValue =
    form.costMode === "class" ? form.costClass : form.costCentre;

  const field = {
    voucherNo: (
      <Row
        key="voucherNo"
        id="jv-voucher-no"
        check="voucherNo"
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
    ),
    gst: (
      <Row
        key="gst"
        id="jv-gst"
        check="gst"
        label="GST registration"
        required
        tone={tone("gst")}
      >
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
    ),
    /*
      The header holds a class OR one cost centre, as production and Tally
      model it. One picker, not a switch over a picker (6 Oct 2026); since
      7 Oct it is the bill form's tabbed picker (cost-centre-picker.tsx).
      Either answer clears and locks the lines' own cost centres; empty — the
      × — leaves them to the lines.
    */
    costCentre: (
      <Row
        key="costCentre"
        id="jv-cost-header"
        check="costCentre"
        className="jv-row--cc"
        label="Cost centre"
        tone={optional(costValue)}
      >
        <div className="jv-cc">
          <CostCentrePicker
            mode={form.costMode}
            value={costValue}
            disabled={readOnly}
            onChange={(mode, name) =>
              onChange({
                costMode: mode,
                costClass: mode === "class" ? name : "",
                costCentre: mode === "centre" ? name : "",
                lines: form.lines.map((line) => ({
                  ...line,
                  costCentre: "",
                  costAllocation: null,
                })),
              })
            }
          />
        </div>
        {mark(form.costMode === "class" ? "costClass" : "costCentre")}
      </Row>
    ),
  };

  /*
    Laid out as the bill (6 Oct 2026, the user asked for the AP form's changes
    on every form): the same markup — one main card, labels above boxed
    fields, three across — so the bill's grid and More details styles carry
    over. Voucher: date, number, GST registration / reference, its date and
    the narration — two full rows.
  */
  return (
    <section>
      <div className="cr-section-label">
        {/*
          The voucher type heads the form, as on the bill (6 Oct 2026): a
          choice about the whole voucher, set as a title-sized picker rather
          than one more field.
        */}
        <div className="cr-type">
          <span className="cr-type-label" id="jv-voucher-type-label">
            Voucher type
          </span>
          <Select
            value={form.voucherType}
            disabled={readOnly}
            onValueChange={(value) => onChange({ voucherType: value })}
          >
            <SelectTrigger
              id="jv-voucher-type"
              className="cr-type-trigger"
              aria-labelledby="jv-voucher-type-label"
            >
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
        </div>
        <div className="cr-section-tools">
          <small>All fields required unless marked optional</small>
        </div>
      </div>

      <div className="cr-cards">
        <section className="cr-card" data-card="main" aria-label="Journal">
          <div className="cr-card-body">
            <div className="cr-subhead cr-subhead--main">
              <span className="cr-card-title">Voucher</span>
            </div>
            <Row
              id="jv-voucher-date"
              source="doc.date"
              check="date"
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
            {field.voucherNo}
            {field.gst}

            <Row
              id="jv-reference-no"
              source="doc.number"
              check="invoiceNo"
              label="Reference no."
              tone={optional(form.invoiceNo)}
            >
              <Input
                id="jv-reference-no"
                aria-label="Reference no."
                placeholder="Not on the document"
                readOnly={readOnly}
                value={form.invoiceNo}
                onChange={(event) =>
                  onChange({ invoiceNo: event.target.value })
                }
              />
              {mark("invoiceNo")}
            </Row>

            <Row
              id="jv-reference-date"
              source="doc.date"
              check="due"
              label="Reference date"
              tone={optional(form.due)}
            >
              <DateField
                id="jv-reference-date"
                value={form.due}
                disabled={readOnly}
                onChange={(iso) => onChange({ due: iso })}
              />
              {mark("due")}
            </Row>

            {/*
              Cost centre sits in the Voucher section (7 Oct 2026, user: "In
              journals there is only cost centre in the accounting section so
              you can just remove it"). With it, row two is filled edge to edge
              and narration takes the last row across the card; More details
              and its Accounting heading went with it, having nothing left to
              hold.
            */}
            {field.costCentre}

            <Row
              id="jv-narration"
              source="doc.narration"
              check="narration"
              label="Narration"
              tone={optional(form.narration)}
            >
              <Textarea
                id="jv-narration"
                rows={1}
                placeholder="What this entry is for"
                readOnly={readOnly}
                value={form.narration}
                onChange={(event) =>
                  onChange({ narration: event.target.value })
                }
              />
              {mark("narration")}
            </Row>
          </div>
        </section>
      </div>
    </section>
  );
};

export default VoucherDetails;
