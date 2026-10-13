import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ComboBox } from "@/components/common/combo-box";
import RupeeInput from "@/components/common/rupee-input";
import { cn } from "@/lib/utils";
import { DR_CR_OPTIONS } from "@/config/pages/inbox/chart-of-accounts";
import type { LedgerFormValues } from "@/schemas/inbox/chart-of-accounts";
import type { Option } from "@/types/pages/inbox/chart-of-accounts";
import { Label as LabelPrimitive } from "@/components/ui/label";
import {
  DateField,
  FieldError,
  OptionalTag,
  T,
} from "@/components/inbox/v2/ui";

/**
 * The ledger form's field vocabulary: one shape per control, so the eight
 * forms differ only in which fields they draw. Production's equivalents are
 * FormLabel + Controller + ErrorMessage, repeated per field.
 */

/** A dotted path into the form values ("name", "gstDetails.0.gstin"). */
export type FieldName = string;

export type FormApi = {
  values: LedgerFormValues;
  /** Write one value; re-validates once the form has been submitted. */
  set: (name: FieldName, value: unknown) => void;
  /** The field's message, once Save has been pressed. */
  error: (name: FieldName) => string | undefined;
};

/** Read a dotted path out of the values. */
export const valueAt = (values: LedgerFormValues, name: FieldName): unknown =>
  name
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      values
    );

const idOf = (name: FieldName) => `coa-${name.replace(/\./g, "-")}`;

/* ------------------------------------------------------------- the grid
   Symmetric field grids (7 Oct 2026, carried over from the bill form): a
   card is a twelve-track grid and every field in it takes the same share —
   quarters by default, thirds or halves where a card holds fewer fields —
   so every box sits on the same column lines. The boxes are the review
   form's (38px, 14px text) and the gaps its 16px rows / 20px columns
   (7 Oct 2026: every form matches the AP/AR/JV review forms). The card says how
   many columns it runs; a field may claim more tracks (a long legal name)
   or a fixed start (the GST row keeps its columns while a field hides). */

const GridSpan = React.createContext(3);

export type Cols = 2 | 3 | 4;

/** Halves for one or two fields, thirds beyond — the review form never runs
 *  quarters (8 Oct 2026: a quarter cut "Indirect Expenses" short). */
export const colsFor = (count: number): Cols => (count <= 2 ? 2 : 3);

/** Inline grid placement; collapses to one column under sm. */
const placement = (span: number, start?: number): React.CSSProperties =>
  ({
    "--span": span,
    "--start": start ?? "auto",
  }) as React.CSSProperties;

const PLACED = "col-span-full sm:[grid-column:var(--start)/span_var(--span)]";

/**
 * A form section, the review form's (7 Oct 2026): no card, a 14px/600 brand
 * heading with a hairline above it, and the symmetric grid under it. The
 * first section has no hairline (`first`, since the journey's intro sits
 * before it in the DOM) and carries the "All fields required" note on its
 * heading line (`aside`). `form-section` + the h2 are how FormJourney finds
 * its steps.
 */
export const FormCard = ({
  title,
  cols = 3,
  first,
  aside,
  children,
  className,
}: {
  title?: string;
  cols?: Cols;
  first?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "form-section scroll-mt-6",
      !first && "border-t border-pi-line pt-5",
      className
    )}
  >
    {title || aside ? (
      <div className="mb-4 flex min-h-5 items-center justify-between gap-4">
        {title ? <h2 className={SECTION_HEAD}>{title}</h2> : <span />}
        {aside}
      </div>
    ) : null}
    <GridSpan.Provider value={12 / cols}>
      <FieldGrid>{children}</FieldGrid>
    </GridSpan.Provider>
  </section>
);

/** The section heading: ui.tsx FieldCard's. */
export const SECTION_HEAD = "text-[14px] font-semibold leading-5 text-pi-brand";

/** The bare twelve-track grid, for a block inside a card (party tabs). */
export const FieldGrid = ({
  cols,
  children,
}: {
  cols?: Cols;
  children: React.ReactNode;
}) => {
  const grid = (
    <div className="grid grid-cols-1 items-start gap-x-5 gap-y-4 sm:grid-cols-12">
      {children}
    </div>
  );
  return cols ? (
    <GridSpan.Provider value={12 / cols}>{grid}</GridSpan.Provider>
  ) : (
    grid
  );
};

export type CellProps = {
  /** Tracks of twelve; the card's share when absent. */
  span?: number;
  /** A fixed first track, so a column holds while a neighbour hides. */
  start?: number;
};

/**
 * One grid cell: a one-line label over one box — `.modern-field`, so the box
 * is the review form's 38px and the label sits 6px above it. The label never
 * wraps (ellipsis, full text in its title). A note that used to wrap under
 * the box ("set by …", "from GSTIN") is a faint 12px tag beside the label
 * instead, drawn only while it applies, with the whole sentence in its title
 * — so no box is pushed out of its row (7 Oct 2026).
 *
 * Required is the norm and unmarked; `optional` adds the faint "Optional".
 * The error is one 12px line under the box, which turns its edge red.
 */
export const FieldCell = ({
  label,
  optional,
  tag,
  tagTitle,
  htmlFor,
  error,
  span,
  start,
  hideLabel,
  children,
}: CellProps & {
  label: string;
  optional?: boolean;
  tag?: string;
  tagTitle?: string;
  htmlFor?: string;
  error?: string;
  /** Column heads already name it (the GST rows after the first). */
  hideLabel?: boolean;
  children: React.ReactNode;
}) => {
  const share = React.useContext(GridSpan);
  return (
    <div
      className={cn("modern-field flex min-w-0 flex-col", PLACED)}
      style={placement(span ?? share, start)}
      data-invalid={error ? "true" : undefined}
    >
      <div
        className={cn(
          "flex h-4 min-w-0 items-center gap-2",
          hideLabel && "sm:sr-only"
        )}
      >
        <LabelPrimitive
          htmlFor={htmlFor}
          title={label}
          // The tag gives way first; the label truncates only when it alone
          // overflows the column.
          className={cn(T.label, "max-w-full shrink-0 truncate")}
        >
          {label}
        </LabelPrimitive>
        {optional ? <OptionalTag /> : null}
        {tag ? (
          <span
            title={tagTitle}
            className="min-w-0 truncate text-[12px] leading-4 text-pi-faint"
          >
            {tag}
          </span>
        ) : null}
      </div>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
};

/** A tag shown only while it applies. */
export type FieldTag = { tag?: string; tagTitle?: string };

type TextFieldProps = CellProps &
  FieldTag & {
    f: FormApi;
    name: FieldName;
    label: string;
    required?: boolean;
    /**
     * "Optional" beside the label. Defaults to any field neither required
     * nor locked; a setting that always holds a value passes false.
     */
    optional?: boolean;
    placeholder?: string;
    disabled?: boolean;
    /** Strip what the field never accepts, as production's onChange does. */
    filter?: (raw: string) => string;
    maxLength?: number;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    type?: string;
    /** "+91" ahead of a phone number. */
    prefix?: string;
    /** "days" or "%" after the figure. */
    suffix?: string;
    /** Span the card's full width. */
    wide?: boolean;
    multiline?: boolean;
    hideLabel?: boolean;
  };

export const TextField = ({
  f,
  name,
  label,
  required,
  optional,
  placeholder,
  disabled,
  filter,
  maxLength,
  inputMode,
  type = "text",
  prefix,
  suffix,
  wide,
  multiline,
  span,
  start,
  tag,
  tagTitle,
  hideLabel,
}: TextFieldProps) => {
  const message = f.error(name);
  const value = String(valueAt(f.values, name) ?? "");
  const id = idOf(name);
  const change = (raw: string) => f.set(name, filter ? filter(raw) : raw);
  return (
    <FieldCell
      label={label}
      optional={optional ?? (!required && !disabled)}
      htmlFor={id}
      error={message}
      span={wide ? 12 : span}
      start={start}
      tag={tag}
      tagTitle={tagTitle}
      hideLabel={hideLabel}
    >
      {multiline ? (
        // One line at rest like every other box, the full text while it
        // has focus — the JV narration's rule (7 Oct 2026).
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!message}
          rows={1}
          onChange={(e) => change(e.target.value)}
          // !min-h: .modern-field gives a textarea two lines; this one
          // keeps one at rest, level with the boxes beside it.
          className="h-[38px] !min-h-[38px] resize-none overflow-hidden px-3 py-[8px] leading-5 focus:h-24 focus:overflow-auto"
        />
      ) : (
        <div className="relative">
          {prefix ? (
            <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[14px] text-pi-faint">
              {prefix}
            </span>
          ) : null}
          <Input
            id={id}
            type={type}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            inputMode={inputMode}
            aria-invalid={!!message}
            data-invalid={!!message}
            onChange={(e) => change(e.target.value)}
            className={cn(prefix && "pl-11", suffix && "pr-12")}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] text-pi-faint">
              {suffix}
            </span>
          ) : null}
        </div>
      )}
    </FieldCell>
  );
};

/** production's WholeNumberInputField: up to 3 digits and 2 decimals, ≤ max. */
export const rateFilter =
  (max = 100) =>
  (previous: string) =>
  (raw: string) => {
    const next = raw.trim();
    if (!next) return "";
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(next)) return previous;
    const parsed = Number.parseFloat(next);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > max) return previous;
    return next;
  };

export const RateField = ({
  f,
  name,
  label,
  required,
  placeholder,
  disabled,
  suffix = "%",
  max = 100,
  span,
}: {
  f: FormApi;
  name: FieldName;
  label: string;
  required?: boolean;
  placeholder: string;
  disabled?: boolean;
  suffix?: string;
  max?: number;
  span?: number;
}) => (
  <TextField
    f={f}
    name={name}
    label={label}
    required={required}
    placeholder={placeholder}
    disabled={disabled}
    inputMode="decimal"
    maxLength={6}
    suffix={suffix}
    span={span}
    filter={rateFilter(max)(String(valueAt(f.values, name) ?? ""))}
  />
);

type ComboFieldProps = CellProps &
  FieldTag & {
    f: FormApi;
    name: FieldName;
    label: string;
    title: string;
    options: Option[];
    optionGroups?: { label?: React.ReactNode; options: Option[] }[];
    required?: boolean;
    /** As TextField's: defaults to neither required nor locked. */
    optional?: boolean;
    disabled?: boolean;
    hasSearch?: boolean;
    hideClearButton?: boolean;
    /** Runs after the value is written — for fields that clear others. */
    onPicked?: (value: string) => void;
    wide?: boolean;
    hideLabel?: boolean;
  };

export const ComboField = ({
  f,
  name,
  label,
  title,
  options,
  optionGroups,
  required,
  optional,
  disabled,
  hasSearch,
  // The shared ComboBox draws its clear button inside the trigger button,
  // which React flags as nested buttons; every ledger field opts out.
  hideClearButton = true,
  onPicked,
  wide,
  span,
  start,
  tag,
  tagTitle,
  hideLabel,
}: ComboFieldProps) => {
  const message = f.error(name);
  return (
    <FieldCell
      label={label}
      optional={optional ?? (!required && !disabled)}
      htmlFor={idOf(name)}
      error={message}
      span={wide ? 12 : span}
      start={start}
      tag={tag}
      tagTitle={tagTitle}
      hideLabel={hideLabel}
    >
      <ComboBox
        id={idOf(name)}
        title={title}
        options={options}
        optionGroups={optionGroups}
        selectedValue={String(valueAt(f.values, name) ?? "")}
        onChange={(value) => {
          const next = String(Array.isArray(value) ? (value[0] ?? "") : value);
          f.set(name, next);
          onPicked?.(next);
        }}
        isMultiSelect={false}
        disabled={disabled}
        hasSearch={hasSearch ?? options.length > 8}
        hideClearButton={hideClearButton}
        invalid={!!message}
        // The ComboBox trigger carries no combobox role, so .modern-field's
        // sizing misses it; it takes the form box here.
        triggerClassName="h-[38px] w-full rounded-[6px] text-[14px] shadow-none [&_small]:text-[14px]"
      />
    </FieldCell>
  );
};

/**
 * Yes/no settings, the review form's way (7 Oct 2026): a run of switches is
 * one bordered list — label left, switch right, a hairline between rows —
 * spanning the section's width. Production draws these in its Additional
 * Fields.
 */
export const SwitchList = ({
  label,
  children,
}: {
  /** Names the group for assistive tech. */
  label?: string;
  children: React.ReactNode;
}) => (
  <div
    role="group"
    aria-label={label}
    className="col-span-full overflow-hidden rounded-lg border border-pi-line bg-background"
  >
    {children}
  </div>
);

/** One row of a SwitchList. A tag beside the label says why it is locked. */
export const SwitchRow = ({
  label,
  checked,
  onChange,
  disabled,
  error,
  tag,
  tagTitle,
}: FieldTag & {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}) => {
  const id = React.useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-t border-pi-line px-4 py-2.5 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <LabelPrimitive
            htmlFor={id}
            title={label}
            className={cn(
              "shrink-0 truncate text-[13px] font-normal leading-5",
              disabled ? "text-pi-faint" : "text-pi-ink"
            )}
          >
            {label}
          </LabelPrimitive>
          {tag ? (
            <span
              title={tagTitle}
              className="min-w-0 truncate text-[12px] leading-4 text-pi-faint"
            >
              {tag}
            </span>
          ) : null}
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-invalid={!!error}
      />
    </div>
  );
};

/** "Set/Alter HSN Code" and its kin: a row like any other. */
export const InlineSwitch = SwitchRow;

/**
 * The fields a switch reveals, in a tinted panel under its list, on the
 * section's grid (7 Oct 2026).
 */
export const SwitchPanel = ({
  cols = 3,
  label,
  children,
}: {
  cols?: Cols;
  label?: string;
  children: React.ReactNode;
}) => (
  <div
    role="group"
    aria-label={label}
    className="col-span-full rounded-lg border border-pi-line bg-pi-head-bg p-4"
  >
    <FieldGrid cols={cols}>{children}</FieldGrid>
  </div>
);

export const DateInputField = ({
  f,
  name,
  label,
}: {
  f: FormApi;
  name: FieldName;
  label: string;
}) => (
  <FieldCell label={label} optional htmlFor={idOf(name)} error={f.error(name)}>
    <DateField
      id={idOf(name)}
      value={String(valueAt(f.values, name) ?? "").slice(0, 10)}
      onChange={(iso) => f.set(name, iso)}
    />
  </FieldCell>
);

/**
 * Opening Balance: one box, the rupee figure with its Dr/Cr side as a small
 * toggle at the box's end (8 Oct 2026) — the side belongs to the figure, so
 * it is not a field of its own.
 */
export const OpeningBalanceFields = ({
  f,
  required,
}: {
  f: FormApi;
  required?: boolean;
}) => (
  <FieldCell
    label="Opening Balance"
    optional={!required}
    error={f.error("openingBalanceAmount")}
  >
    <div className="relative">
      <RupeeInput
        aria-label="Opening Balance"
        value={Number(f.values.openingBalanceAmount || 0)}
        onChange={(value) => f.set("openingBalanceAmount", String(value))}
        hasError={!!f.error("openingBalanceAmount")}
        className="pr-[92px]"
      />
      <div
        role="radiogroup"
        aria-label="Dr/Cr"
        className="absolute inset-y-[5px] right-[5px] flex rounded-[5px] bg-pi-head-bg p-0.5"
      >
        {DR_CR_OPTIONS.map((option) => {
          const on = f.values.drCr === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => f.set("drCr", option.value)}
              className={cn(
                "w-10 rounded-[4px] text-[12px] font-medium leading-4 transition-colors",
                on
                  ? "bg-background text-pi-ink shadow-[0_0_0_1px_var(--pi-line-2)]"
                  : "text-pi-faint hover:text-pi-ink"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  </FieldCell>
);

/** Digits only, cut to a length — production's filterNumberOnly. */
export const digits = (max: number) => (raw: string) =>
  raw.replace(/\D/g, "").slice(0, max);

/** production's filterGst / filterPan: upper-case alphanumerics. */
export const upperAlnum = (max: number) => (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, max);
