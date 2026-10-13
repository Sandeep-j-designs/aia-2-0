import React from "react";
import { format } from "date-fns";
import { Controller, useFormState } from "react-hook-form";
import { ComboBox } from "@/components/common/combo-box";
import {
  CESS_VALUATION_TYPE_OPTIONS,
  GST_APPLICABILITY_OPTIONS,
  TAXABILITY_TYPE_OPTIONS,
  TAX_TYPE_OPTIONS,
  TYPE_OF_SUPPLY_OPTIONS,
} from "@/config/pages/inbox/inventory";
import type { StockItemForm } from "@/hooks/pages/inbox/use-stock-item-form";
import type { StockItemFormValues } from "@/types/pages/inbox/inventory";
import { DateField, Field, FieldCard } from "@/components/inbox/v2/ui";
import { FieldLabel, SwitchList, SwitchRow, THIRDS } from "./form-parts";
import HsnSacAutocompleteField from "./hsn-sac-autocomplete-field";
import NumericInput from "./numeric-input";

type Props = {
  form: StockItemForm;
};

type RateKey = keyof Pick<
  StockItemFormValues,
  | "igstRate"
  | "cgstRate"
  | "sgstUgstRate"
  | "cessRatePercent"
  | "cessRatePerUnit"
>;

/** production's create-item/gst-details-section.tsx */
const GstDetailsSection = ({ form }: Props) => {
  const {
    control,
    errors,
    setValue,
    values,
    hsnSacOptions,
    isGstApplicable,
    isEditMode,
    shouldShowTaxability,
    shouldShowTaxType,
    showIgstRate,
    showCgstSgstRate,
    showCessValuation,
    showCessRatePercent,
    showCessRatePerUnit,
  } = form;
  const shouldShowSetAlterGstToggle = isGstApplicable || isEditMode;
  const { isSubmitted, dirtyFields } = useFormState({ control });

  const rateField = (name: RateKey, label: string, placeholder: string) => (
    <Field htmlFor={name} label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <NumericInput
            id={name}
            placeholder={placeholder}
            value={field.value ? Number(field.value) : null}
            onChange={(val) => field.onChange(val !== null ? String(val) : "")}
            error={errors[name]?.message}
          />
        )}
      />
    </Field>
  );

  const selectedHsn = hsnSacOptions.find((o) => o.value === values.hsnSac);
  const hsnDescription =
    selectedHsn && values.setAlterHsnSac
      ? selectedHsn.label.replace(/^\d+ - /, "")
      : undefined;
  const hsnError =
    errors.hsnSac?.message && (isSubmitted || dirtyFields.hsnSac)
      ? errors.hsnSac.message
      : undefined;

  const gstFields = (
    <>
      <Field label="Taxability Type" error={errors.taxabilityType?.message}>
        <Controller
          control={control}
          name="taxabilityType"
          render={({ field }) => (
            <ComboBox
              title="Select Taxability Type"
              options={TAXABILITY_TYPE_OPTIONS}
              selectedValue={field.value}
              onChange={field.onChange}
              isMultiSelect={false}
              hasSearch={false}
              hideClearButton
            />
          )}
        />
      </Field>

      {shouldShowTaxType ? (
        <Field label="Tax Type" error={errors.taxType?.message}>
          <Controller
            control={control}
            name="taxType"
            render={({ field }) => (
              <ComboBox
                title="Select Tax Type"
                options={TAX_TYPE_OPTIONS}
                selectedValue={field.value || ""}
                onChange={field.onChange}
                isMultiSelect={false}
                hasSearch={false}
                invalid={!!errors.taxType}
              />
            )}
          />
        </Field>
      ) : null}

      {showIgstRate
        ? rateField("igstRate", "IGST Rate", "Enter IGST rate")
        : null}

      {showCgstSgstRate ? (
        <>
          {rateField("cgstRate", "CGST Rate", "Enter CGST rate")}
          {rateField(
            "sgstUgstRate",
            "SGST/UTGST Rate",
            "Enter SGST/UTGST rate"
          )}
        </>
      ) : null}

      {showCessValuation ? (
        <>
          <Field
            label="Cess Valuation Type"
            error={errors.cessValuationType?.message}
          >
            <Controller
              control={control}
              name="cessValuationType"
              render={({ field }) => (
                <ComboBox
                  title="Select valuation type"
                  options={CESS_VALUATION_TYPE_OPTIONS}
                  selectedValue={field.value}
                  onChange={field.onChange}
                  isMultiSelect={false}
                  hasSearch={false}
                />
              )}
            />
          </Field>
          {showCessRatePercent
            ? rateField("cessRatePercent", "CESS Rate", "Enter CESS rate")
            : null}
          {showCessRatePerUnit
            ? rateField(
                "cessRatePerUnit",
                "CESS Rate / Unit",
                "Enter CESS rate per unit"
              )
            : null}
        </>
      ) : null}

      <Field
        htmlFor="applicableDate"
        label="Applicable Date"
        error={errors.applicableDate?.message}
      >
        <Controller
          control={control}
          name="applicableDate"
          render={({ field }) => (
            <DateField
              id="applicableDate"
              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
              onChange={(iso) =>
                field.onChange(iso ? new Date(`${iso}T00:00:00`) : null)
              }
            />
          )}
        />
      </Field>

      {/* The two flags the custom GST carries, a list of their own inside
          the panel. */}
      <SwitchList>
        <Controller
          control={control}
          name="applicableForReverseCharge"
          render={({ field }) => (
            <SwitchRow
              id="applicableForReverseCharge"
              label="Applicable for Reverse Charge"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="eligibleForInputTaxCredit"
          render={({ field }) => (
            <SwitchRow
              id="eligibleForInputTaxCredit"
              label="Eligible for ITC"
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </SwitchList>
    </>
  );

  return (
    // The two pickers in the grid, then the section's switches as one
    // bordered list; what a switch opens sits in a tinted panel under it
    // (7 Oct 2026). The switches used to be loose cells in the thirds.
    <FieldCard title="GST Details" className={THIRDS}>
      <Field label="GST Applicability" error={errors.gstApplicability?.message}>
        <Controller
          control={control}
          name="gstApplicability"
          render={({ field }) => (
            <ComboBox
              title="Select GST Applicability"
              options={GST_APPLICABILITY_OPTIONS}
              selectedValue={field.value}
              onChange={(value) => {
                field.onChange(value);
                if (value === "not_applicable")
                  setValue("setAlterGst", false, {
                    shouldDirty: true,
                    shouldValidate: isSubmitted,
                  });
              }}
              isMultiSelect={false}
              hasSearch={false}
              hideClearButton
            />
          )}
        />
      </Field>

      <Field label="Type of Supply" error={errors.typeOfSupply?.message}>
        <Controller
          control={control}
          name="typeOfSupply"
          render={({ field }) => (
            <ComboBox
              title="Select Type of Supply"
              options={TYPE_OF_SUPPLY_OPTIONS}
              selectedValue={field.value}
              onChange={field.onChange}
              isMultiSelect={false}
              hasSearch={false}
              hideClearButton
            />
          )}
        />
      </Field>

      <SwitchList>
        {shouldShowSetAlterGstToggle ? (
          <Controller
            control={control}
            name="setAlterGst"
            render={({ field }) => (
              <SwitchRow
                id="setAlterGst"
                label="Set/Alter GST"
                checked={Boolean(field.value)}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked && !isGstApplicable)
                    setValue("gstApplicability", "applicable", {
                      shouldDirty: true,
                    });
                }}
              >
                {shouldShowTaxability ? gstFields : null}
              </SwitchRow>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="setAlterHsnSac"
          render={({ field }) => (
            <SwitchRow
              id="setAlterHsnSac"
              label="Set/Alter HSN Code"
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                if (!checked)
                  setValue("hsnSac", "", {
                    shouldDirty: true,
                    shouldValidate: isSubmitted,
                  });
              }}
            >
              {/* Off, the code comes from the company or stock group and
                  there is nothing to fill, so the box opens with the switch
                  rather than sitting disabled (7 Oct 2026). */}
              {values.setAlterHsnSac ? (
                <Field
                  htmlFor="hsnSac"
                  className="sm:col-span-2"
                  error={hsnError}
                  label={
                    // The picked code's description rides beside the label,
                    // whole on hover (7 Oct 2026).
                    <FieldLabel
                      note={hsnDescription}
                      noteTitle={hsnDescription}
                    >
                      HSN/SAC
                    </FieldLabel>
                  }
                >
                  <Controller
                    control={control}
                    name="hsnSac"
                    render={({ field: hsn }) => (
                      <HsnSacAutocompleteField
                        id="hsnSac"
                        value={hsn.value || ""}
                        onChange={hsn.onChange}
                        options={hsnSacOptions}
                        invalid={!!hsnError}
                        placeholder="Select or type 2, 4, 6, or 8 digit HSN/SAC"
                      />
                    )}
                  />
                </Field>
              ) : null}
            </SwitchRow>
          )}
        />
      </SwitchList>
    </FieldCard>
  );
};

export default GstDetailsSection;
