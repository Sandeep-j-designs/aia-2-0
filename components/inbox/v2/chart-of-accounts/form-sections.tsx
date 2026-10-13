import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Lock } from "@/components/icons";
import {
  COA_BANK_OPTIONS,
  COUNTRIES,
  DUTY_SECTION_TAX_TYPE_OPTIONS,
  DUTY_TAX_TYPES,
  GST_APPLICABILITY,
  GST_APPLICABILITY_OPTIONS,
  GST_TREATMENT_OPTIONS,
  INDIAN_STATES,
  LEDGER_TYPES,
  TAXABILITY_TYPES,
  TAXABILITY_TYPE_OPTIONS,
  TAX_TYPES,
  TAX_TYPE_OPTIONS,
  TCS_NATURE_OPTIONS,
  TDS_NATURE_OPTIONS,
  TAX_TYPE_VALUES,
  YES_NO,
  YES_NO_OPTIONS,
} from "@/config/pages/inbox/chart-of-accounts";
import type {
  Option,
  UnderOption,
} from "@/types/pages/inbox/chart-of-accounts";
import { RequiredNote } from "@/components/inbox/v2/ui";
import {
  ComboField,
  FieldCell,
  FormCard,
  colsFor,
  DateInputField,
  InlineSwitch,
  OpeningBalanceFields,
  SwitchList,
  SwitchPanel,
  RateField,
  TextField,
  digits,
  upperAlnum,
  type FormApi,
} from "./form-fields";

/**
 * Production's forms/shared-sections/*, each drawn as one of the review
 * form's sections (a brand heading over a hairline, no card — 7 Oct 2026). The props are
 * production's, so each form composes them the way its production file does.
 *
 * Symmetric grids: each card runs thirds, or halves when it holds two
 * fields, and every field takes one column (FormCard in form-fields.tsx).
 * Quarters went on 8 Oct 2026, to match the bill form.
 */

/** PAN is characters 3–12 of a GSTIN; true while a PAN still matches it. */
export const panFromGstin = (gstin: string, pan: string) =>
  gstin.length >= 12 && !!pan && gstin.slice(2, 12) === pan;

export const FROM_GSTIN_PAN =
  "Filled from characters 3–12 of the GSTIN. Change it if the PAN differs.";
export const FROM_GSTIN_STATE =
  "Filled from the GSTIN's state code. Change it if the supply is from elsewhere.";

/* ------------------------------------------------------------ Basic Details */
type BasicProps = {
  f: FormApi;
  underOptions: UnderOption[];
  onUnderChange: (value: string) => void;
  showCostCentre?: boolean;
  /** form-5's Type of Ledger, drawn right after Under. */
  afterUnder?: React.ReactNode;
};

/** Under, grouped by primary group so each option carries its path. */
const useUnderGroups = (underOptions: UnderOption[]) =>
  useMemo(() => {
    const groups = new Map<string, Option[]>();
    underOptions.forEach((option) => {
      const head = option.groupPath[0] ?? option.label;
      groups.set(head, [
        ...(groups.get(head) ?? []),
        { label: option.label, value: option.value },
      ]);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, options]) => ({
        label,
        // The primary group first, then its sub-groups.
        options: options.sort((a, b) =>
          a.label === label
            ? -1
            : b.label === label
              ? 1
              : a.label.localeCompare(b.label)
        ),
      }));
  }, [underOptions]);

export const BasicDetailsSection = ({
  f,
  underOptions,
  onUnderChange,
  showCostCentre,
  afterUnder,
}: BasicProps) => {
  const optionGroups = useUnderGroups(underOptions);
  // Name, group, currency, plus Type of Ledger and the cost-centre flag
  // where the form draws them, in thirds.
  const count = 3 + (afterUnder ? 1 : 0) + (showCostCentre ? 1 : 0);
  return (
    // Always the first section: no hairline, and the form's one note that
    // required is the norm (fields that are not say "Optional").
    <FormCard
      title="Basic Details"
      cols={colsFor(count)}
      first
      aside={<RequiredNote />}
    >
      <TextField
        f={f}
        name="name"
        label="Ledger Name"
        required
        placeholder="e.g. Reliance Ltd"
      />
      <ComboField
        f={f}
        name="under"
        label="Account group"
        title="Choose an account group"
        required
        options={underOptions.map((o) => ({ label: o.label, value: o.value }))}
        optionGroups={optionGroups}
        hasSearch
        hideClearButton
        onPicked={onUnderChange}
      />
      {afterUnder}
      {showCostCentre ? (
        <ComboField
          f={f}
          name="costCentreApplicable"
          label="Cost Centre Applicable"
          title="Select Cost Centre Applicable"
          options={YES_NO_OPTIONS}
          optional={false}
          hideClearButton
        />
      ) : null}
      {/* Locked, not disabled: a white box like the rest, the lock says why
          it cannot change (the bill form's rule for values off the master). */}
      <FieldCell label="Currency of Ledger" htmlFor="coa-currencyOfLedger">
        <div
          className="relative"
          title="Ledgers are kept in the company's base currency."
        >
          <Input
            id="coa-currencyOfLedger"
            value="INR"
            readOnly
            className="pr-9"
          />
          <Lock
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pi-faint"
          />
        </div>
      </FieldCell>
    </FormCard>
  );
};

/* ---------------------------------------------------------- Address Details */
export const AddressSection = ({
  f,
  title = "Address Details",
  disabled,
  includeMobileNo = true,
  includeEmailId = true,
  includeContactPerson = false,
}: {
  f: FormApi;
  title?: string;
  disabled?: boolean;
  includeMobileNo?: boolean;
  includeEmailId?: boolean;
  includeContactPerson?: boolean;
}) => {
  // Every box one line (7 Oct 2026); the address opens to its full text
  // while focused. Thirds: with contact fields the address takes two of
  // them with Pincode beside it, then Country, State and Mobile, then Email.
  // Without them, the address takes the row and Country, State and Pincode
  // share the next.
  const contact = includeMobileNo || includeEmailId || includeContactPerson;
  const pincode = (
    <TextField
      f={f}
      name="pincode"
      label="Pincode"
      placeholder="Enter Pincode"
      inputMode="numeric"
      maxLength={6}
      filter={digits(6)}
      disabled={disabled}
    />
  );
  return (
    <FormCard title={title} cols={3}>
      <TextField
        f={f}
        name="address"
        label="Address"
        placeholder="Enter Address"
        disabled={disabled}
        multiline
        span={contact ? 8 : 12}
      />
      {contact ? pincode : null}
      <ComboField
        f={f}
        name="country"
        label="Country"
        title="Select Country"
        options={COUNTRIES}
        disabled={disabled}
      />
      <ComboField
        f={f}
        name="state"
        label="State"
        title="Select State"
        options={INDIAN_STATES}
        disabled={disabled}
      />
      {contact ? null : pincode}
      {includeContactPerson ? (
        <TextField
          f={f}
          name="contactPerson"
          label="Contact Person"
          placeholder="Enter Contact Person"
          disabled={disabled}
        />
      ) : null}
      {includeMobileNo ? (
        <TextField
          f={f}
          name="mobileNo"
          label="Mobile Number"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          prefix="+91"
          filter={digits(10)}
          disabled={disabled}
        />
      ) : null}
      {includeEmailId ? (
        <TextField
          f={f}
          name="emailId"
          label="Email"
          type="email"
          placeholder="Enter Email"
          disabled={disabled}
        />
      ) : null}
    </FormCard>
  );
};

/* ------------------------------------------------- Tax Registration Details */
export const TaxRegistrationSection = ({
  f,
  disabled,
  includeGstTreatment,
  includeGstin = true,
  includePanItNo = true,
  disableGstTreatment,
  disableGstin,
  gstTreatmentLabel = "GST Treatment",
}: {
  f: FormApi;
  disabled?: boolean;
  includeGstTreatment?: boolean;
  includeGstin?: boolean;
  includePanItNo?: boolean;
  disableGstTreatment?: boolean;
  disableGstin?: boolean;
  gstTreatmentLabel?: string;
}) => {
  // form-4: an applicable GST ledger carries no registration of its own, so
  // treatment and GSTIN are locked; the tag says why while it applies.
  const lockedByGst = !disabled && (disableGstTreatment || disableGstin);
  const lockTag = lockedByGst
    ? {
        tag: "GST ledger",
        tagTitle:
          "A ledger with GST Applicable carries no registration of its own. Set GST Applicability to Not Applicable to enter one.",
      }
    : {};
  const count =
    Number(!!includeGstTreatment) +
    Number(includeGstin) +
    Number(includePanItNo);
  return (
    // GST Treatment, GSTIN, then PAN: one registration, read left to right.
    <FormCard title="Tax Registration Details" cols={colsFor(count)}>
      {includeGstTreatment ? (
        <ComboField
          f={f}
          name="gstTreatmentUuid"
          label={gstTreatmentLabel}
          title={`Select ${gstTreatmentLabel}`}
          options={GST_TREATMENT_OPTIONS}
          disabled={disabled || disableGstTreatment}
          {...(disableGstTreatment ? lockTag : {})}
          onPicked={(value) =>
            f.set(
              "gstTreatment",
              GST_TREATMENT_OPTIONS.find((o) => o.value === value)
                ?.korefiGstTreatment ?? ""
            )
          }
        />
      ) : null}
      {includeGstin ? (
        <TextField
          f={f}
          name="gstinUin"
          label="GSTIN/UIN"
          placeholder="Enter GSTIN/UIN"
          maxLength={15}
          disabled={disabled || disableGstin}
          {...(disableGstin ? lockTag : {})}
          filter={(raw) => {
            const next = upperAlnum(15)(raw);
            // PAN is characters 3–12 of a GSTIN; production fills it as you type.
            if (includePanItNo)
              f.set("panItNo", next.length >= 12 ? next.slice(2, 12) : "");
            return next;
          }}
        />
      ) : null}
      {includePanItNo ? (
        <TextField
          f={f}
          name="panItNo"
          label="PAN/IT No."
          placeholder="Enter PAN/IT No."
          maxLength={10}
          disabled={disabled}
          filter={upperAlnum(10)}
          {...(includeGstin && panFromGstin(f.values.gstinUin, f.values.panItNo)
            ? { tag: "From GSTIN", tagTitle: FROM_GSTIN_PAN }
            : {})}
        />
      ) : null}
    </FormCard>
  );
};

/* ---------------------------------------------- Bank Account Details (form-1) */
export const BankAccountSection = ({ f }: { f: FormApi }) => (
  <FormCard title="Bank Account Details" cols={3}>
    <TextField
      f={f}
      name="acHolderName"
      label="A/C Holder Name"
      placeholder="Account holder"
      filter={(raw) => raw.replace(/[^a-zA-Z\s]/g, "")}
    />
    <ComboField
      f={f}
      name="bankName"
      label="Bank Name"
      title="Select Bank"
      options={COA_BANK_OPTIONS}
      hasSearch
    />
    <TextField
      f={f}
      name="acNumber"
      label="A/C Number"
      placeholder="Enter A/C Number"
      inputMode="numeric"
      maxLength={18}
      filter={digits(18)}
    />
    <TextField
      f={f}
      name="ifscCode"
      label="IFSC Code"
      placeholder="Enter IFSC Code"
      maxLength={11}
    />
    <TextField
      f={f}
      name="swiftCode"
      label="SWIFT Code"
      placeholder="Enter SWIFT Code"
    />
    <TextField f={f} name="branch" label="Branch" placeholder="Enter Branch" />
    <TextField
      f={f}
      name="bsrCode"
      label="BSR Code"
      placeholder="Enter BSR Code"
      inputMode="numeric"
      maxLength={7}
      filter={digits(7)}
    />
  </FormCard>
);

/* ---------------------------------------------------------- Opening Balance */
export const OpeningBalanceSection = ({ f }: { f: FormApi }) => (
  <FormCard title="Opening Balance" cols={3}>
    <OpeningBalanceFields f={f} />
  </FormCard>
);

/* ------------------------------------------------ Statutory Details (4 / 5) */
export const StatutorySection = ({
  f,
  hsnLabel = "HSN/SAC",
  typeOfSupplyOptions,
  typeOfSupplyRequired,
}: {
  f: FormApi;
  hsnLabel?: string;
  typeOfSupplyOptions: Option[];
  typeOfSupplyRequired?: boolean;
}) => {
  const v = f.values;
  const hsnOn = v.setAlterHsnSac;
  const rateOn = v.setAlterTaxabilityRate;
  const applicable = v.gstApplicability === GST_APPLICABILITY.APPLICABLE;
  const setByType =
    !!v.typeOfLedger && v.typeOfLedger !== LEDGER_TYPES.NOT_APPLICABLE;
  // Applicability and Type of Supply side by side; the two overrides are one
  // switch list, and what each switch opens sits in the tinted panel under
  // it (7 Oct 2026). While a switch is off its row says the value comes from
  // the company or item master — the old disabled box's placeholder.
  const inherited = { tag: "As per company/master" };
  return (
    <FormCard title="Statutory Details" cols={2}>
      <ComboField
        f={f}
        name="gstApplicability"
        label="GST Applicability"
        title="Select GST Applicability"
        options={GST_APPLICABILITY_OPTIONS}
        optional={false}
        hideClearButton
        disabled={setByType}
        {...(setByType
          ? {
              tag: "Set by Type of Ledger",
              tagTitle:
                "GST Applicability must be Not Applicable when Type of Ledger is selected.",
            }
          : {})}
      />
      {applicable ? (
        <>
          <ComboField
            f={f}
            name="typeOfSupply"
            label="Type of Supply"
            required={typeOfSupplyRequired}
            title="Select Type of Supply"
            options={typeOfSupplyOptions}
          />
          <SwitchList label="GST overrides">
            <InlineSwitch
              label="Set/Alter HSN Code"
              checked={hsnOn}
              {...(hsnOn ? {} : inherited)}
              onChange={(checked) => {
                f.set("setAlterHsnSac", checked);
                f.set("hsnSac", "");
              }}
            />
            <InlineSwitch
              label="Set/Alter Taxability & GST Rate"
              checked={rateOn}
              {...(rateOn ? {} : inherited)}
              onChange={(checked) => f.set("setAlterTaxabilityRate", checked)}
            />
          </SwitchList>
          {hsnOn || rateOn ? (
            <SwitchPanel cols={3} label="GST overrides">
              {hsnOn ? (
                // DEV: production's HsnSacAutoCompleteField — GET
                // /api/inventory/hsn-sac?companyUuid=…, cursor-paginated.
                <TextField
                  f={f}
                  name="hsnSac"
                  label={hsnLabel}
                  placeholder="Select or type 2, 4, 6, or 8 digit HSN/SAC"
                  inputMode="numeric"
                  maxLength={8}
                  filter={digits(8)}
                />
              ) : null}
              {rateOn ? (
                <ComboField
                  f={f}
                  name="taxabilityType"
                  label="Taxability Type"
                  required
                  title="Select Taxability Type"
                  options={TAXABILITY_TYPE_OPTIONS}
                />
              ) : null}
              {rateOn && v.taxabilityType === TAXABILITY_TYPES.TAXABLE ? (
                <RateField
                  f={f}
                  name="igstRate"
                  label="GST Rate"
                  required
                  placeholder="Enter GST rate"
                />
              ) : null}
            </SwitchPanel>
          ) : null}
        </>
      ) : null}
    </FormCard>
  );
};

/* ---------------------------------------------- Duties & Taxes (form-4 / 5) */

/** Clearing what a new Type of Duty/Tax or Tax Type no longer shows. */
export const clearDutyRates = (f: FormApi, keep?: string) =>
  (["igstRate", "cgstRate", "sgstUgstRate", "cessRatePercent"] as const)
    .filter((name) => name !== keep)
    .forEach((name) => f.set(name, ""));

const RATE_FIELD_BY_TAX_TYPE: Record<string, string> = {
  [TAX_TYPES.IGST]: "igstRate",
  [TAX_TYPES.CGST]: "cgstRate",
  [TAX_TYPES.SGST]: "sgstUgstRate",
  [TAX_TYPES.CESS]: "cessRatePercent",
};

/** The GST rate fields under a chosen Tax Type, then Application Date. */
const GstDutyRateFields = ({ f }: { f: FormApi }) => {
  const taxType = f.values.taxType;
  return (
    <>
      {taxType === TAX_TYPES.IGST ? (
        <RateField
          f={f}
          name="igstRate"
          label="IGST Rate"
          required
          placeholder="Enter IGST rate"
        />
      ) : null}
      {taxType === TAX_TYPES.CGST ? (
        <RateField
          f={f}
          name="cgstRate"
          label="CGST Rate"
          required
          placeholder="Enter CGST rate"
        />
      ) : null}
      {taxType === TAX_TYPES.SGST ? (
        <RateField
          f={f}
          name="sgstUgstRate"
          label="SGST/UTGST Rate"
          required
          placeholder="Enter SGST/UTGST rate"
        />
      ) : null}
      {taxType === TAX_TYPES.CESS ? (
        <RateField
          f={f}
          name="cessRatePercent"
          label="CESS Rate"
          required
          placeholder="Enter CESS rate"
        />
      ) : null}
      {TAX_TYPE_VALUES.includes(taxType) ? (
        <DateInputField f={f} name="applicationDate" label="Application Date" />
      ) : null}
    </>
  );
};

const TaxTypeField = ({ f, options }: { f: FormApi; options: Option[] }) => (
  <ComboField
    f={f}
    name="taxType"
    label="Tax Type"
    required
    title="Select Tax Type"
    options={options}
    onPicked={(value) => clearDutyRates(f, RATE_FIELD_BY_TAX_TYPE[value])}
  />
);

const NatureFields = ({ f }: { f: FormApi }) => (
  <>
    {f.values.typeOfDutyTax === DUTY_TAX_TYPES.TDS ? (
      <ComboField
        f={f}
        name="tdsNatureOfPayments"
        label="Nature of Payments"
        required
        title="Select Nature of Payments"
        options={TDS_NATURE_OPTIONS}
      />
    ) : null}
    {f.values.typeOfDutyTax === DUTY_TAX_TYPES.TCS ? (
      <ComboField
        f={f}
        name="tcsNatureOfGoods"
        label="Nature of Goods"
        required
        title="Select Nature of Goods"
        options={TCS_NATURE_OPTIONS}
      />
    ) : null}
  </>
);

const TypeOfDutyField = ({ f, options }: { f: FormApi; options: Option[] }) => (
  <ComboField
    f={f}
    name="typeOfDutyTax"
    label="Type of Duty/Tax"
    required
    title="Select Type of Duty/Tax"
    options={options}
    onPicked={(value) => {
      if (value !== DUTY_TAX_TYPES.GST) {
        f.set("taxType", "");
        clearDutyRates(f);
      }
      if (value !== DUTY_TAX_TYPES.TDS) f.set("tdsNatureOfPayments", "");
      if (value !== DUTY_TAX_TYPES.TCS) f.set("tcsNatureOfGoods", "");
    }}
  />
);

/**
 * production's SharedDutyTaxesSection (form-4 and form-5). "Behave as Duties
 * & Taxes Ledger" reveals it, so it is that switch's tinted panel, drawn
 * under the Additional Fields list (7 Oct 2026).
 */
export const DutyTaxesSection = ({
  f,
  typeOfDutyTaxOptions,
  showOthersPercentage,
}: {
  f: FormApi;
  typeOfDutyTaxOptions: Option[];
  showOthersPercentage?: boolean;
}) => (
  <SwitchPanel cols={3} label="Duties & Taxes Details">
    <TypeOfDutyField f={f} options={typeOfDutyTaxOptions} />
    {f.values.typeOfDutyTax === DUTY_TAX_TYPES.GST ? (
      <>
        <TaxTypeField f={f} options={DUTY_SECTION_TAX_TYPE_OPTIONS} />
        <GstDutyRateFields f={f} />
      </>
    ) : null}
    <NatureFields f={f} />
    {showOthersPercentage &&
    f.values.typeOfDutyTax === DUTY_TAX_TYPES.OTHERS ? (
      <RateField
        f={f}
        name="othersPercentageOfCalculation"
        label="If Others: Percentage of Calculation"
        required
        placeholder="Enter rate"
        suffix=""
      />
    ) : null}
  </SwitchPanel>
);

/** form-6's own duty fields: Taxability Type comes before Tax Type. */
export const Form6DutySection = ({
  f,
  typeOfDutyTaxOptions,
}: {
  f: FormApi;
  typeOfDutyTaxOptions: Option[];
}) => {
  const gst = f.values.typeOfDutyTax === DUTY_TAX_TYPES.GST;
  const taxable = f.values.taxabilityType === TAXABILITY_TYPES.TAXABLE;
  return (
    <FormCard title="Duties & Taxes Details" cols={3}>
      <TypeOfDutyField f={f} options={typeOfDutyTaxOptions} />
      {gst ? (
        <>
          <ComboField
            f={f}
            name="taxabilityType"
            label="Taxability Type"
            required
            title="Select Taxability Type"
            options={TAXABILITY_TYPE_OPTIONS}
            onPicked={(value) => {
              if (value !== TAXABILITY_TYPES.TAXABLE) {
                f.set("taxType", "");
                clearDutyRates(f);
              }
            }}
          />
          {taxable ? (
            <>
              <TaxTypeField f={f} options={TAX_TYPE_OPTIONS} />
              <GstDutyRateFields f={f} />
            </>
          ) : null}
        </>
      ) : null}
      <NatureFields f={f} />
    </FormCard>
  );
};

/* -------------------------------------------- Additional Fields (2/4/5/6) */
export const isYes = (value: string) => value === YES_NO.YES;
export const yesNo = (checked: boolean) => (checked ? YES_NO.YES : YES_NO.NO);
