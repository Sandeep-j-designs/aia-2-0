import React, { useEffect, useRef } from "react";
import { Control, Controller, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/inbox/v2/ui";
import { OrganizationFormData } from "@/schemas/organisations";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<OrganizationFormData>;
  errors: FieldErrors<OrganizationFormData>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isLoading: boolean;
  ButtonComponent?: React.ReactNode;
  inputClassName?: string;
  wrapperClass?: string;
  showLegalNameDescription?: boolean;
  /** So a footer button outside the form can submit it (`form=`). */
  formId?: string;
};

/**
 * The legal-name form. Production:
 * components/organisation/create-update-organisation/organisation-form.tsx.
 * Production's FormLabel / ErrorMessage are not in this prototype, so the
 * label and error are written out with the same tokens.
 */
const OrganisationForm = ({
  control,
  errors,
  onSubmit,
  isLoading,
  ButtonComponent,
  inputClassName,
  wrapperClass,
  showLegalNameDescription = false,
  formId,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      id={formId}
      role="presentation"
      onSubmit={onSubmit}
      noValidate
      className={cn("w-full", wrapperClass)}
    >
      {/* The form standard (7 Oct 2026): a 12px label over the 38px box, no
          star (required is the norm), and the error as one 12px line under
          the box. */}
      <Controller
        control={control}
        name="legalName"
        render={({ field }) => (
          <Field
            label="Legal name"
            htmlFor="organisation-legal-name"
            error={errors.legalName?.message}
            hint={
              showLegalNameDescription ? (
                <p className="text-[12px] leading-4 text-pi-faint">
                  As per your official registration.
                </p>
              ) : null
            }
          >
            <Input
              {...field}
              id="organisation-legal-name"
              placeholder="Enter legal name"
              className={inputClassName}
              ref={inputRef}
              aria-invalid={!!errors.legalName}
              onChange={(event) => {
                const sanitizedValue = event.target.value.replace(/^\s+/, "");
                field.onChange(sanitizedValue);
              }}
              onBlur={(event) => {
                field.onBlur();
                const trimmedValue = event.target.value.trim();
                if (trimmedValue !== field.value) {
                  field.onChange(trimmedValue);
                }
              }}
            />
          </Field>
        )}
      />

      {ButtonComponent ? (
        ButtonComponent
      ) : (
        <Button
          id="create"
          type="submit"
          loading={isLoading}
          className="mt-6 w-full"
        >
          Create
        </Button>
      )}
    </form>
  );
};

export default OrganisationForm;
