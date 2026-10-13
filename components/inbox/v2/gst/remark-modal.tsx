import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceViewPrData } from "@/types/pages/inbox/gst";
import { Field, PageDialog } from "@/components/inbox/v2/ui";

/**
 * Add Remark — production's remark-modal: a note on a PR line. Commas are
 * normalised to ", " on save, as production does.
 */

type Props = {
  pr: InvoiceViewPrData | null;
  onClose: () => void;
  onSave: (prLineUuid: string, remarks: string) => void;
};

const RemarkModal = ({ pr, onClose, onSave }: Props) => {
  const [value, setValue] = useState("");
  useEffect(() => setValue(pr?.remarks ?? ""), [pr]);

  return (
    <PageDialog
      open={!!pr}
      onClose={onClose}
      title="Add Remark"
      description={`For Invoice #${pr?.invoiceNo || "-"}`}
      className="max-w-[480px]"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => pr && onSave(pr.prLineUuid, value)}>
            {pr?.remarks ? "Update remark" : "Add remark"}
          </Button>
        </>
      }
    >
      <Field label="Remarks" htmlFor="gst-remark">
        <Textarea
          id="gst-remark"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter your remarks here"
          className="min-h-24"
        />
      </Field>
    </PageDialog>
  );
};

export default RemarkModal;
