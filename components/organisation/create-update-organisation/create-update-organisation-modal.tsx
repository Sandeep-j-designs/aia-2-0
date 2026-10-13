import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PageDialog } from "@/components/inbox/v2/ui";
import OrganisationForm from "./organisation-form";
import { useOrganisationForm } from "@/hooks/organisation/useCreateOrganisationForm";
import type {
  CreateUpdateOrganisationProps,
  OrganisationSuccessResult,
} from "@/types/components/organisation";

type Props = CreateUpdateOrganisationProps & {
  /** Prototype-only: the other organisations' names, for the duplicate check. */
  existingNames: string[];
  /** Prototype-only: creates or renames, standing in for /api/companies. */
  onSave: (legalName: string) => string;
};

/**
 * Create / Update Organisation. Production:
 * components/organisation/create-update-organisation/
 * create-update-organisation-modal.tsx, built on common/modal — which this
 * prototype does not have, so the same layout sits on ui/dialog.
 *
 * Production sends a new organisation to Get Started / Configuration after
 * creating it. The prototype has neither, so the new organisation simply
 * becomes the active one and the page stays put.
 */
const CreateUpdateOrganisationModal = ({
  isOpen,
  setIsOpen,
  company,
  onSuccess,
  existingNames,
  onSave,
}: Props) => {
  const isEditMode = Boolean(company);

  const handleFormSuccess = useCallback(
    async (result: OrganisationSuccessResult) => {
      await onSuccess?.(result);
      setIsOpen(false);
    },
    [onSuccess, setIsOpen]
  );

  const form = useOrganisationForm({
    mode: isEditMode ? "edit" : "create",
    companyUuid: company?.companyUuid,
    initialValues: company ? { legalName: company.companyName } : undefined,
    existingNames,
    save: onSave,
    onSuccess: handleFormSuccess,
  });

  // The dialog standard (7 Oct 2026): PageDialog's 22px/500 title, the
  // field on the form's metrics, and a white footer with Cancel and a
  // specific primary, right-aligned. The footer sits outside the <form>, so
  // its submit button names the form by id.
  return (
    <PageDialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      title={isEditMode ? "Rename organisation" : "Create organisation"}
      description="Provide your official organisation information"
      className="max-w-[485px]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            id={isEditMode ? "update" : "create"}
            type="submit"
            form="organisation-form"
            loading={form.isLoading}
          >
            {isEditMode ? "Save name" : "Create organisation"}
          </Button>
        </>
      }
    >
      <OrganisationForm
        {...form}
        formId="organisation-form"
        onSubmit={form.handleSubmit}
        showLegalNameDescription
        ButtonComponent={<></>}
      />
    </PageDialog>
  );
};

export default CreateUpdateOrganisationModal;
