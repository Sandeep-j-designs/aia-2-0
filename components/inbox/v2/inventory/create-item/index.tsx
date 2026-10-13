import React from "react";
import { ChevronLeft } from "@/components/icons";
import { FormJourney, MoreDetails } from "../../form-journey";
import { Button } from "@/components/ui/button";
import { useStockItemForm } from "@/hooks/pages/inbox/use-stock-item-form";
import { PageButton } from "@/components/inbox/v2/ui";
import {
  FORM_BODY,
  FormHeader,
} from "@/components/inbox/v2/chart-of-accounts/master-parts";
import CoreDetailsSection from "./core-details-section";
import GstDetailsSection from "./gst-details-section";
import OpeningBalanceSection from "./opening-balance-section";

type Props = {
  company: string;
  /** Absent: Create Stock Item. */
  itemUuid?: string;
  onBack: () => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const FORM_ID = "stock-item-form";

/**
 * Create / Edit Stock Item: production's create-item/index.tsx, top-bar.tsx
 * and form.tsx on one page. The sections sit in the bill sheet's field cards
 * rather than production's bare headings.
 */
const CreateItem = ({ company, itemUuid, onBack, notify }: Props) => {
  const form = useStockItemForm({
    company,
    itemUuid,
    notify,
    onDone: onBack,
  });
  const { isEditMode, isSubmitting, isEditDisabled, onSubmit } = form;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <FormHeader
        title={isEditMode ? "Edit Stock Item" : "Create Stock Item"}
        back={
          <PageButton
            label="Back to Inventory Masters"
            disabled={false}
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </PageButton>
        }
        actions={
          <>
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={isSubmitting || isEditDisabled}
            >
              {isEditMode ? "Update Item" : "Save Item"}
            </Button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <form id={FORM_ID} onSubmit={onSubmit} noValidate className={FORM_BODY}>
          {/* The bill form's order (8 Oct 2026): what the item is and how
              it is taxed on the form, opening stock under More details. */}
          <FormJourney>
            <CoreDetailsSection form={form} />
            <GstDetailsSection form={form} />
            <MoreDetails groups={["Opening balance"]}>
              <OpeningBalanceSection form={form} />
            </MoreDetails>
          </FormJourney>
        </form>
      </div>
    </div>
  );
};

export default CreateItem;
