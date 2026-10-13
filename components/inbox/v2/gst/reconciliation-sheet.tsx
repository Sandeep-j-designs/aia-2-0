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
import {
  GST_TIMINGS,
  Gstr2BStatusEnums,
  PrFileStatusEnums,
} from "@/config/pages/inbox/gst";
import { gst, statusFor, useGstState } from "@/hooks/pages/inbox/use-gst";
import type { GstinOption, GstPeriod } from "@/types/pages/inbox/gst";
import { T, type PillTone } from "@/components/inbox/v2/ui";
import { DotChip } from "@/components/inbox/v2/banking/page-parts";
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
      "Reconciliation ready\nEvery GSTR-2B invoice is matched against your purchase register.",
      "success"
    );
    onReconciled(gstin, period);
  };

  /*
    Where each part stands, in the section's own head, so the sheet can be
    read top to bottom as a checklist before Run.
  */
  const twoBLines = twoB.reduce((n, i) => n + i.gstr2bLineCount, 0);
  const twoBState: SectionState = !twoB.length
    ? { label: "Not added", tone: "neutral" }
    : twoB.some((i) => i.status === Gstr2BStatusEnums.IN_PROGRESS)
      ? { label: "Reading…", tone: "info", live: true }
      : twoB.every((i) => i.status === Gstr2BStatusEnums.EXTRACTION_FAILED)
        ? { label: "Couldn’t read", tone: "error" }
        : { label: `${twoBLines} invoices`, tone: "ok" };
  const prState: SectionState = !pr.length
    ? { label: "Not added", tone: "neutral" }
    : pr.some((f) => f.status === PrFileStatusEnums.EXTRACTION_FAILED)
      ? { label: "Import failed", tone: "error" }
      : pr.some((f) => f.status === PrFileStatusEnums.MAPPING_REQUIRED)
        ? { label: "Map the columns", tone: "warn" }
        : pr.some((f) => f.status === PrFileStatusEnums.IN_PROGRESS)
          ? { label: "Importing…", tone: "info", live: true }
          : {
              label: `${pr.length} ${pr.length === 1 ? "file" : "files"} ready`,
              tone: "ok",
            };
  // What stands between the user and Run, said beside the button.
  const blocked = !gstin
    ? "Choose a GSTIN to start."
    : !twoB.length
      ? "Add GSTR-2B for the period to run."
      : !pr.length
        ? "Add a purchase register to run."
        : !canRun
          ? "Finish importing the purchase register to run."
          : "";

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && !running && onClose(gstin, period)}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-pi-line bg-background p-0 focus:outline-none focus-visible:outline-none sm:max-w-[560px] sm:rounded-l-xl [&>button]:hidden"
      >
        <SheetHeader className="flex-row items-start justify-between space-y-0 border-b border-pi-line px-6 py-5 text-left">
          <div className="min-w-0">
            <SheetTitle className="text-[22px] font-medium leading-7 tracking-[-0.02em] text-pi-ink">
              New Reconciliation
            </SheetTitle>
            {/* The organisation, as a line: the top bar already shows it,
                but a sheet that covers the page should say whose books. */}
            <SheetDescription className="mt-1 truncate text-[13px] text-pi-body">
              GSTR-2B against the purchase register for {companyName}
            </SheetDescription>
          </div>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
          <Section title="GSTIN and Period">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={T.label}>GSTIN</span>
                <span className="[&_button]:font-mono [&_button]:text-[13px]">
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
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className={T.label}>Return Period</span>
                <PeriodPicker
                  block
                  value={period}
                  onChange={setPeriod}
                  disabled={running}
                />
              </div>
            </div>
          </Section>

          {gstin ? (
            <>
              <Section title="GSTR-2B" state={twoBState}>
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
              </Section>
              <Section title="Purchase Register" state={prState}>
                <PurchaseRegisterSection
                  company={company}
                  gstin={gstin}
                  period={period}
                  files={pr}
                  mappings={state.mappings}
                  notify={notify}
                />
              </Section>
            </>
          ) : null}
        </div>

        {/* The form's footer band: what is missing on the left while Run is
            off, Cancel then the action on the right. */}
        <div className="flex flex-col gap-3 border-t border-pi-line bg-background px-6 py-4">
          {running && (
            <div className="flex w-full flex-col gap-1">
              <Progress
                value={progress}
                className="h-1.5 rounded-full bg-pi-fill"
                indicatorClassName="rounded-full bg-pi-brand motion-reduce:transition-none"
                aria-label="Reconciliation progress"
              />
              <span className={T.sub}>
                Matching {twoBLines} GSTR-2B invoices against your purchase
                register…
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-[12px] leading-4 text-pi-faint">
              {running ? "" : blocked}
            </span>
            <Button
              variant="outline"
              disabled={running}
              onClick={() => onClose(gstin, period)}
            >
              Cancel
            </Button>
            <Button
              disabled={!canRun || running}
              loading={running}
              onClick={() => void run()}
            >
              <Play aria-hidden />
              Run Reconciliation
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

type SectionState = {
  label: string;
  tone: PillTone;
  /** Work in progress: the dot breathes. */
  live?: boolean;
};

/**
 * One part of the sheet: a title on a hairline, its state on the right.
 */
const Section = ({
  title,
  state,
  children,
}: {
  title: string;
  state?: SectionState;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3 border-t border-pi-line py-5 first:border-t-0">
    <div className="flex min-h-6 items-center justify-between gap-3">
      {/* ink, not brand (13 Oct 2026): the title names the part; blue is
          for what can be pressed */}
      <h3 className="text-[14px] font-semibold leading-5 text-pi-ink">
        {title}
      </h3>
      {state ? (
        <DotChip tone={state.tone} live={state.live} className="-mr-2">
          {state.label}
        </DotChip>
      ) : null}
    </div>
    {children}
  </section>
);

export default ReconciliationSheet;
