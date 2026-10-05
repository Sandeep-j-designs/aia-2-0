import React, { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AR_AI_PROCESSING_STEPS_LABEL } from "@/config/pages/inbox/sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  type ResponseARVoucherImportBatch,
} from "@/types/pages/inbox/sales-upload";
import s from "../bill-splitter/split-dialogs.module.css";

/**
 * The AI pass between mapping and preview — production's
 * PredictionProcessModal, in the shell Split Purchases uses (same scrim,
 * head band and bar) so the two long waits in the app look alike.
 *
 * Progress is the batch's own row count (aiProcessedRowCount / totalRows),
 * eased toward rather than jumped to, as production's rAF does. Production
 * shows only the current step under the bar; the full list is drawn here so
 * the wait reads as moving through stages.
 */

type Props = {
  batch: ResponseARVoucherImportBatch;
  open: boolean;
  /** Omit to make the modal non-dismissible (production's default). */
  onClose?: () => void;
  onGoToUploads: () => void;
  /** Called once the bar reaches 100%. */
  onComplete?: () => void;
};

const cx = (...names: (string | false | undefined)[]) =>
  names
    .filter(Boolean)
    .map((name) => s[name as string])
    .join(" ");

const ProcessingModal = ({
  batch,
  open,
  onClose,
  onGoToUploads,
  onComplete,
}: Props) => {
  const done = batch.status !== ARVoucherImportBatchStatus.PROCESSING;
  const total = batch.totalRows;
  const completed = done ? total : batch.aiProcessedRowCount;
  const target = total ? Math.min(100, (completed / total) * 100) : 0;
  const [percentage, setPercentage] = useState(0);
  const current = useRef(0);
  const completedOnce = useRef(false);

  useEffect(() => {
    if (!open) return;
    const from = current.current;
    const started = performance.now();
    const duration = target >= 100 ? 600 : 400;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      current.current = from + (target - from) * t;
      setPercentage(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
      else if (target >= 100 && done && !completedOnce.current) {
        completedOnce.current = true;
        onComplete?.();
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, done, open]);

  // Production's estimate: five rows a second.
  const remainingMinutes = Math.ceil(Math.max(total - completed, 0) / 5 / 60);
  const estimatedTimeLabel =
    total > 0
      ? remainingMinutes <= 1
        ? "Less than 1 min"
        : `${remainingMinutes} mins`
      : "--";
  const currentIndex = AR_AI_PROCESSING_STEPS_LABEL.findIndex(
    (step) => percentage < step.threshold
  );
  const active =
    currentIndex < 0 ? AR_AI_PROCESSING_STEPS_LABEL.length : currentIndex;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => !next && onClose?.()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cx("scope", "scrim")}>
          <DialogPrimitive.Content
            className={cn(cx("modal"), "!max-w-[520px]")}
            aria-describedby={undefined}
            onEscapeKeyDown={(e) => !onClose && e.preventDefault()}
            onPointerDownOutside={(e) => !onClose && e.preventDefault()}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
            }}
          >
            <div className={cx("modal__head")}>
              <DialogPrimitive.Title className={cx("modal__title")}>
                Preparing preview
              </DialogPrimitive.Title>
              {onClose && (
                <DialogPrimitive.Close
                  className={cx("modal__x")}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              )}
            </div>
            <div className={cn(cx("modal__body"), "gap-5")}>
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-4">
                  <span className="fig text-[28px] font-medium leading-none tracking-[-0.02em] text-pi-ink">
                    {Math.round(percentage)}
                    <span className="text-[16px] text-pi-faint">%</span>
                  </span>
                  <span className="text-[12px] leading-4 text-pi-faint">
                    {estimatedTimeLabel}
                  </span>
                </div>
                <span
                  className={cx("bar")}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(percentage)}
                  aria-label="Preview progress"
                >
                  <span
                    className={cx("bar__fill")}
                    style={{ transform: `scaleX(${percentage / 100})` }}
                  />
                </span>
                <span className="text-[12px] leading-4 tabular-nums text-pi-faint">
                  {completed} of {total} rows read
                </span>
              </div>
              {/* The reference .extraction-stages: one segment per stage. */}
              <ol className={cx("stages")} aria-label="Processing stages">
                {AR_AI_PROCESSING_STEPS_LABEL.map((step, i) => {
                  const state =
                    i < active ? "done" : i === active ? "current" : "next";
                  return (
                    <li
                      key={step.label}
                      aria-current={state === "current" ? "step" : undefined}
                      className={cx(
                        "stages__s",
                        state === "done" && "is-done",
                        state === "current" && "is-current"
                      )}
                    >
                      <i aria-hidden />
                      <span>
                        {state === "current" ? `${step.label}...` : step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="text-[12px] leading-[18px] text-pi-faint">
                In the meantime, you can review or manage your uploaded
                invoices.
              </p>
            </div>
            <div className={cn(cx("modal__foot"), "justify-end pt-1")}>
              <Button variant="secondary" onClick={onGoToUploads}>
                Go to Uploaded Invoices
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ProcessingModal;
