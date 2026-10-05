import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import ConvertButton from "@/components/inbox/common/convert-button";
import HintBanner from "@/components/inbox/common/hint-banner";
import NativeShell from "@/components/inbox/common/native-shell";
import { useBillReview } from "@/hooks/pages/inbox/use-bill-review";
import { apDocumentFor } from "@/config/pages/inbox/ap-document";
import { formatInr } from "@/utils/pages/inbox";
import type { InboxItem } from "@/types/pages/inbox";
import type { ConversionTarget } from "@/types/pages/inbox/conversion";

/**
 * The AP module's bill sheet, hosted inside the inbox shell.
 *
 * This is not a re-creation of the AP screen — it is the AP prototype itself,
 * served from `public/ap/index.html` and framed here. A bill arriving by email
 * and a bill keyed in by hand produce the same voucher, so they get the same
 * sheet: every prediction, HSN call, master proposal and threshold test is the
 * one the AP prototype makes, because it is the same file making it.
 *
 * The inbox keeps what the AP prototype has no notion of — the low-confidence
 * flags, the duplicate blocks, the cohort pager and Approve & Next — and drives
 * the sheet across a postMessage bridge. `?embed=1` is what tells the sheet to
 * drop its own topbar and document pane, since the inbox already draws those.
 *
 * DEV: in production this is a route, not an iframe. The bridge is the seam —
 * whatever replaces it hands the sheet the same document and takes back the
 * same four messages.
 */

type Props = {
  item: InboxItem;
  isLastInCohort: boolean;
  onApprove: () => void;
  onConvert: (target: ConversionTarget) => void;
  onDelete: () => void;
  onSaveDraft: () => void;
};

type SheetTotals = {
  subTotal: number;
  gstTotal: number;
  dedTotal: number;
  adjTotal: number;
  grand: number;
  voucherNo: string;
  supplierInvoiceNo: string;
  vendor: string;
};

const NativeAP = ({
  item,
  isLastInCohort,
  onApprove,
  onConvert,
  onDelete,
  onSaveDraft,
}: Props) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const seeded = useRef(false);
  const [totals, setTotals] = useState<SheetTotals | null>(null);

  const {
    flagged,

    touchField,
    allFlaggedTouched,
    isDuplicateBlocked,
    approveDisabled,
  } = useBillReview(item);

  const send = useCallback((type: string, payload?: unknown) => {
    frame.current?.contentWindow?.postMessage(
      { source: "aia-inbox", type, payload },
      "*"
    );
  }, []);

  /*
    The sheet announces itself rather than being seeded on a timer — it posts
    `ready` once it is listening, and the document goes over then. A timeout
    would race the iframe's own boot on a cold load.
  */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || message.source !== "aia-ap") return;

      /* Seeded once per item. A second seed re-runs the extraction over work
         the accountant may already have done to the sheet. */
      if (message.type === "ready" && !seeded.current) {
        seeded.current = true;
        send("seed", apDocumentFor(item));
      }
      if (message.type === "totals") setTotals(message.payload as SheetTotals);
      /*
        The sheet's own Create Bill and the inbox's Approve & Next are the same
        act, so whichever was pressed, the inbox advances the cohort.
      */
      if (message.type === "approved") onApprove();
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [item, onApprove, send]);

  /* Moving to the next bill in the cohort is a different document, so the
     guard resets and the reloaded frame is seeded again. */
  useEffect(() => {
    seeded.current = false;
    setTotals(null);
  }, [item.id]);

  if (!item.bill) return null;

  const bill = item.bill;
  const shown = totals?.grand ?? bill.grandTotal;

  return (
    <NativeShell
      title={`Review bill — ${item.vendor}`}
      subtitle={`${bill.supplierInvoiceNo} · ${bill.billDate} · ${formatInr(shown)}`}
      footer={
        <>
          {/* Secondary actions live away from Approve, on purpose. */}
          <ConvertButton source="bill" size="sm" onPick={onConvert} />
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => {
              send("saveDraft");
              onSaveDraft();
            }}
          >
            Save draft
          </Button>
          {/*
            Approve presses the sheet's own Create Bill rather than posting
            behind its back: the sheet validates, raises its own summary of the
            masters this bill would add, and only then reports back. The inbox
            advancing before that would approve a bill the sheet had refused.
          */}
          <Button disabled={approveDisabled} onClick={() => send("approve")}>
            <Check className="h-3.5 w-3.5" />
            {isLastInCohort ? "Approve" : "Approve & Next"}
          </Button>
        </>
      }
      bodyClassName="gap-0 p-0"
    >
      {/* The inbox's own findings sit above the sheet, not inside it. */}
      {isDuplicateBlocked ||
      item.status === "duplicate-soft" ||
      flagged.length ? (
        <div className="flex flex-col gap-3 p-5 pb-0">
          {isDuplicateBlocked ? (
            <HintBanner
              kind="danger"
              title={`Duplicate of ${item.duplicateOf}`}
              body="Approve is disabled until you change a key field (Voucher No, Supplier Invoice No or Amount). Live re-check runs as you type."
            />
          ) : null}

          {item.status === "duplicate-soft" ? (
            <HintBanner
              kind="warn"
              title="Possible duplicate"
              body="An earlier bill has a matching amount and vendor. You can still approve."
            />
          ) : null}

          {flagged.length > 0 && !allFlaggedTouched ? (
            <HintBanner
              kind="warn"
              title="Verify low-confidence fields"
              body={
                <>
                  We&apos;re less sure about {flagged.join(", ")}. Check{" "}
                  {flagged.length === 1 ? "it" : "them"} on the sheet below,
                  then confirm.
                  {/*
                    The AP sheet owns its own fields, so the inbox cannot outline
                    one and watch for a touch the way it did when it drew them.
                    It asks for the confirmation instead — which is the same
                    bargain, stated once rather than field by field.
                  */}
                  <button
                    type="button"
                    onClick={() => flagged.forEach(touchField)}
                    className="mt-2 block font-semibold underline underline-offset-2"
                  >
                    I&apos;ve checked these
                  </button>
                </>
              }
            />
          ) : null}
        </div>
      ) : null}

      <iframe
        ref={frame}
        src={`/ap/index.html?embed=1&item=${encodeURIComponent(item.id)}`}
        title="Bill sheet"
        className="min-h-0 w-full flex-1 border-0"
      />
    </NativeShell>
  );
};

export default NativeAP;
