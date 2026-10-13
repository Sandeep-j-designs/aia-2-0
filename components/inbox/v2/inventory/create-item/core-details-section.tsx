import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { ComboBox } from "@/components/common/combo-box";
import type { StockItemForm } from "@/hooks/pages/inbox/use-stock-item-form";
import { Field, FieldCard, RequiredNote } from "@/components/inbox/v2/ui";
import { THIRDS } from "./form-parts";

type Props = {
  form: StockItemForm;
};

/**
 * production's create-item/core-details-section.tsx. Name, Under and
 * Category sit in thirds, one row (7 Oct 2026). The first section carries
 * the form's "required unless optional" note on its heading line.
 */
const CoreDetailsSection = ({ form }: Props) => {
  const { register, control, errors, stockGroupOptions, stockCategoryOptions } =
    form;
  return (
    <FieldCard title="Core Details" aside={<RequiredNote />} className={THIRDS}>
      <Field htmlFor="name" label="Name">
        <Input
          id="name"
          placeholder="Enter item name"
          aria-invalid={!!errors.name}
          error={errors.name?.message}
          {...register("name")}
        />
      </Field>

      <Field label="Under" error={errors.underUuid?.message}>
        <Controller
          control={control}
          name="underUuid"
          render={({ field }) => (
            <ComboBox
              title="Select Under"
              options={stockGroupOptions}
              selectedValue={field.value}
              onChange={(value) => field.onChange(String(value))}
              isMultiSelect={false}
              invalid={!!errors.underUuid}
            />
          )}
        />
      </Field>

      <Field label="Category" error={errors.categoryUuid?.message}>
        <Controller
          control={control}
          name="categoryUuid"
          render={({ field }) => (
            <ComboBox
              title="Select Category"
              options={stockCategoryOptions}
              selectedValue={field.value}
              onChange={(value) => field.onChange(String(value))}
              isMultiSelect={false}
              invalid={!!errors.categoryUuid}
            />
          )}
        />
      </Field>
    </FieldCard>
  );
};

export default CoreDetailsSection;
