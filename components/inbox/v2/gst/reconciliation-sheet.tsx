import React, { useEffect, useRef, useState } from "react";
import { Play, Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { GST_TIMINGS, PrFileStatusEnums } from "@/config/pages/inbox/gst";
import { gst, statusFor, useGstState } from "@/hooks/pages/inbox/use-gst";
import type { GstinOption, GstPeriod } from "@/types/pages/inbox/gst";
import { T } from "@/components/inbox/v2/ui";
import Gstr2bSection from "./gstr2b-section";
import PeriodPicker from "./period-picker";
import PurchaseRegisterSection from "./purchase-register-section";

/**
 * GSTR-2B Reconciliation — production's gstr-2b-reconciliation-sheet, 500px
 * from the right: the organisation and GSTIN, then one card with the return
 * period, the 2B and the Purchase Register, and Run Reconciliation pinned
 * at the foot.
 *
 * Run Reconciliation is production's rule: a GSTIN and a period, some 2B
 * data, and every PR file extracted. Production shows only the button's
 * spinner while it runs; the prototype adds a bar under it so the wait reads.
 */

type Props = {
  open: boolean;
  company: string;
  gstinOptions: GstinOption[];
  gstin: string;
  period: GstPeriod;
  /** Closing hands the sheet's GSTIN and period back to the page. */
  onClose: (gstin: string, period: GstPeriod) => void;
  onReconciled: (gstin: string, period: GstPeriod) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
  onUnbuilt: (what: string) => void;
  /** The active organisation's name, for the Organisation line. */
  companyName: string;
};

const ReconciliationSheet = ({
  open,
  company,
  companyName,
  gstinOptions,
  gstin: initialGstin,
  period: initialPeriod,
  onClose,
  onReconciled,
  notify,
  onUnbuilt,
}: Props) => {
  const state = useGstState(company);
  const [gstin, setGstin] = useState(initialGstin);
  const [period, setPeriod] = useState(initialPeriod);
  const [gstinLocked, setGstinLocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const { twoB, pr } = statusFor(state, period);
  const canRun =
    !!gstin &&
    !!period.from &&
    !!period.to &&
    twoB.length > 0 &&
    pr.length > 0 &&
    pr.every((f) => f.status === PrFileStatusEnums.EXTRACTION_SUCCESSFUL);

  const run = async () => {
    setRunning(true);
    setProgress(4);
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const t = (Date.now() - started) / GST_TIMINGS.reconcile;
      setProgress(Math.min(96, 4 + t * 92));
    }, 120);
    await gst.runReconcile(company, period);
    window.clearInterval(timer.current);
    setProgress(100);
    setRunning(false);
    notify(
      "Reconciliation Completed\nThe report has been generated successfully.",
      "success"
    );
    onReconciled(gstin, period);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && !running && onClose(gstin, period)}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-pi-line bg-background p-0 focus:outline-none focus-visible:outline-none sm:max-w-[500px] sm:rounded-l-xl"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-pi-line px-6 py-5 text-left">
          <div className="min-w-0">
            <span className="workspace-eyebrow mb-1">Compliance</span>
            <SheetTitle className="text-[22px] font-medium leading-tight tracking-[-0.02em] text-foreground">
              GSTR-2B Reconciliation
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Choose the GSTIN and period, bring in GSTR-2B and the Purchase
            Register, then run the reconciliation.
          </SheetDescription>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            disabled={running}
            onClick={() => onClose(gstin, period)}
          >
            <X className="h-5 w-5 text-pi-faint" />
          </Button>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-pi-line bg-pi-page px-4 py-3">
            <span className={T.label}>Organisation</span>
            <span className="truncate text-[13px] font-medium text-pi-ink">
              {companyName}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className={T.label}>GSTIN</span>
            <ComboBox<string>
              title="Select GSTIN"
              options={gstinOptions}
              selectedValue={gstin}
              onChange={(value) =>
                setGstin(Array.isArray(value) ? value[0] : value)
              }
              isMultiSelect={false}
              hideClearButton
              disabled={gstinLocked || running}
              actionLabel="Add New GSTIN"
              actionIcon={Plus}
              onAction={() => onUnbuilt("Adding a GSTIN")}
              wrapperClassName="w-[--radix-popover-trigger-width] p-1"
            />
          </div>

          {gstin ? (
            <div className="flex flex-col gap-6 rounded-lg border border-pi-line bg-background p-4 shadow-contact">
              <div className="flex flex-col gap-2">
                <span className={T.label}>Return Period</span>
                <PeriodPicker
                  block
                  value={period}
                  onChange={setPeriod}
                  disabled={running}
                />
              </div>
              <Gstr2bSection
                key={`${gstin}-${period.from.getTime()}-${period.to.getTime()}`}
                company={company}
                gstin={gstin}
                period={period}
                items={twoB}
                savedAuth={state.savedAuth}
                onAuthOpenChange={setGstinLocked}
                notify={notify}
              />
              <PurchaseRegisterSection
                company={company}
                gstin={gstin}
                period={period}
                files={pr}
                mappings={state.mappings}
                notify={notify}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-pi-line px-6 py-3">
          {running && (
            <div className="flex w-full flex-col gap-1">
              <Progress
                value={progress}
                className="h-1.5 rounded-full bg-pi-fill"
                indicatorClassName="rounded-full bg-pi-brand motion-reduce:transition-none"
                aria-label="Reconciliation progress"
              />
              <span className={cn(T.sub, "text-center")}>
                Matching {twoB.reduce((n, i) => n + i.gstr2bLineCount, 0)} 2B
                invoices against your Purchase Register…
              </span>
            </div>
          )}
          <Button
            disabled={!canRun || running}
            loading={running}
            onClick={() => void run()}
          >
            <Play aria-hidden />
            Run Reconciliation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReconciliationSheet;
