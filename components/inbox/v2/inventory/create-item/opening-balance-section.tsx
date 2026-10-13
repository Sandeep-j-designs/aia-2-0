import React, { useEffect, useRef } from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { ComboBox } from "@/components/common/combo-box";
import {
  setPrecisionToTwoDecimals,
  type StockItemForm,
} from "@/hooks/pages/inbox/use-stock-item-form";
import { Field, FieldCard } from "@/components/inbox/v2/ui";
import { FieldLabel, THIRDS } from "./form-parts";
import GodownAllocationField from "./godown-allocation-field";
import GodownSplitPanel from "./godown-split-modal";
import NumericInput from "./numeric-input";

type Props = {
  form: StockItemForm;
};

const toNumber = (value: string) => (value ? Number(value) : null);
const toText = (value: number | null) => (value !== null ? String(value) : "");

const SPLIT_PANEL_ID = "godown-split-panel";

/** production's create-item/opening-balance-section.tsx */
const OpeningBalanceSection = ({ form }: Props) => {
  const {
    control,
    errors,
    values,
    stockUnitOptions,
    godownOptions,
    isUnitNotApplicable,
    isUnitEditable,
    isUnitLocked,
    shouldEnableGodownAllocation,
    hideSplitButton,
    isGodownModalOpen,
    setIsGodownModalOpen,
    setSingleGodownAllocation,
    setGodownAllocations,
    quantityForAllocation,
    unitRateForAllocation,
    openingBalanceAmount,
  } = form;
  const godownError =
    errors.godownAllocations?.message ||
    errors.godownAllocations?.root?.message;
  // The hook's "modal open" flag now drives the split panel under the field.
  const isSplitOpen = isGodownModalOpen;
  const openerRef = useRef<HTMLButtonElement>(null);

  // A saved split that stops adding up (the quantity changed under it, say)
  // opens its panel on its own, so the fix is in view (7 Oct 2026).
  const isSplit = values.godownAllocations.length > 1;
  useEffect(() => {
    if (godownError && isSplit && !hideSplitButton) setIsGodownModalOpen(true);
  }, [godownError, isSplit, hideSplitButton]);
  // With no opening balance there is nothing to split.
  useEffect(() => {
    if (!shouldEnableGodownAllocation) setIsGodownModalOpen(false);
  }, [shouldEnableGodownAllocation]);

  return (
    <FieldCard title="Opening Balance" className={THIRDS}>
      <Field
        error={errors.unitUuid?.message}
        label={
          <FieldLabel
            note={isUnitLocked ? "Locked" : undefined}
            noteTitle="Unit cannot be changed because this stock item is used in a voucher."
          >
            Unit
          </FieldLabel>
        }
      >
        <Controller
          control={control}
          name="unitUuid"
          render={({ field }) => (
            <ComboBox
              title="Select Unit"
              options={stockUnitOptions}
              selectedValue={field.value}
              onChange={(value) => field.onChange(String(value))}
              isMultiSelect={false}
              disabled={!isUnitEditable}
              hideClearButton={!isUnitEditable}
              invalid={!!errors.unitUuid}
            />
          )}
        />
      </Field>

      {isUnitNotApplicable ? (
        <Field htmlFor="openingBalanceValue" label="Value" optional>
          <Controller
            control={control}
            name="openingBalanceValue"
            render={({ field }) => (
              <NumericInput
                id="openingBalanceValue"
                placeholder="Enter value"
                value={toNumber(field.value)}
                allowNegative
                onChange={(val) => field.onChange(toText(val))}
                error={errors.openingBalanceValue?.message}
              />
            )}
          />
        </Field>
      ) : (
        <>
          {/* Thirds, filled edge to edge: Unit · Quantity · Rate, then
              Per · Value · Godown (7 Oct 2026). Production gave Unit a row
              of its own, which left a hole in the grid. */}
          <Field htmlFor="quantity" label="Quantity" optional>
            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <NumericInput
                  id="quantity"
                  placeholder="Enter quantity"
                  value={toNumber(field.value)}
                  allowNegative
                  onChange={(val) => field.onChange(toText(val))}
                  error={errors.quantity?.message}
                />
              )}
            />
          </Field>
          <Field htmlFor="rate" label="Rate" optional>
            <Controller
              control={control}
              name="rate"
              render={({ field }) => (
                <NumericInput
                  id="rate"
                  placeholder="Enter rate"
                  value={toNumber(field.value)}
                  onChange={(val) => field.onChange(toText(val))}
                  error={errors.rate?.message}
                />
              )}
            />
          </Field>
          <Field htmlFor="perUnitLabel" label="Per">
            <Input
              id="perUnitLabel"
              readOnly
              value={values.perUnitLabel}
              className="bg-muted"
            />
          </Field>
          <Field htmlFor="openingBalanceValueComputed" label="Value">
            <NumericInput
              id="openingBalanceValueComputed"
              value={toNumber(values.openingBalanceValue)}
              disabled
              className="bg-muted"
            />
          </Field>
        </>
      )}

      <Field
        error={godownError}
        label={
          <FieldLabel
            note={!shouldEnableGodownAllocation ? "Needs a value" : undefined}
            noteTitle="Enter opening balance to enable godown allocation."
          >
            Godown Allocation
          </FieldLabel>
        }
      >
        <GodownAllocationField
          allocations={values.godownAllocations}
          godownOptions={godownOptions}
          hideSplitButton={hideSplitButton}
          disabled={!shouldEnableGodownAllocation}
          invalid={!!godownError}
          splitOpen={isSplitOpen}
          splitPanelId={SPLIT_PANEL_ID}
          openerRef={openerRef}
          onSelectSingleGodown={setSingleGodownAllocation}
          onToggleSplit={() => setIsGodownModalOpen(!isSplitOpen)}
          onClear={() => {
            setGodownAllocations([]);
            setIsGodownModalOpen(false);
          }}
        />
      </Field>

      {isSplitOpen && shouldEnableGodownAllocation && (
        <GodownSplitPanel
          id={SPLIT_PANEL_ID}
          anchorRef={openerRef}
          onClose={() => setIsGodownModalOpen(false)}
          quantity={quantityForAllocation}
          rate={unitRateForAllocation}
          amount={
            isUnitNotApplicable
              ? openingBalanceAmount
              : setPrecisionToTwoDecimals(
                  quantityForAllocation * unitRateForAllocation
                )
          }
          allocations={values.godownAllocations}
          godownOptions={godownOptions}
          forceAmountEditableMode={isUnitNotApplicable}
          onSave={setGodownAllocations}
        />
      )}
    </FieldCard>
  );
};

export default OpeningBalanceSection;
