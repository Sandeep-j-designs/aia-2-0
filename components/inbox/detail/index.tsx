import React from "react";
import { useRouter } from "next/router";
import { withSession } from "@/hooks/withSession";
import SidebarLayout from "@/components/sidebar-layout";
import ConversionPanel from "@/components/inbox/conversion";
import { useInboxDetail } from "@/hooks/pages/inbox/use-inbox-detail";
import DisambigBanner from "./disambig-banner";
import FilePreview from "./file-preview";
import NativePane from "./native-pane";
import OrientationStrip from "./orientation-strip";
import {
  AwaitingRoute,
  CrossTypeDuplicate,
  NativeApproved,
  NativeExtracting,
  NativeFailed,
} from "./native-states";

/**
 * Unified Inbox — the detail screen. Ported from DetailShell in
 * js/inbox-detail.jsx.
 *
 * Three pieces stacked: a 40px orientation strip, an optional disambiguation
 * banner, then either a two-pane split (file preview beside the review surface)
 * or a single full-width pane.
 *
 * There is deliberately no phase rail and no Classify → Prepare → Confirm
 * stepper. The accountant is reviewing one document, not walking a wizard, and
 * the surface never reframes itself underneath them.
 */
const InboxDetailPage = () => {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : undefined;

  const {
    item,
    cohort,
    effectiveRoute,
    needsDisambiguation,
    threshold,
    isTwoPane,
    pickRoute,
    confirmRoute,
    conversion,
    conflict,
    openConversion,
    closeConversion,
    confirmConversion,
    refreshConflict,
    approvedAs,
    goPrev,
    goNext,
    runAction,
    approve,
    saveDraft,
    isLastInCohort,
  } = useInboxDetail(id);

  if (!item) {
    return (
      <SidebarLayout crumbs={["Inbox", id ?? "—"]}>
        <div className="flex h-full items-center justify-center text-sm text-secondary-foreground">
          {router.isReady ? "This item no longer exists." : "Loading…"}
        </div>
      </SidebarLayout>
    );
  }

  const isApproved = Boolean(approvedAs) || item.status === "done";
  const isFailed = item.status === "failed";
  const isExtracting =
    item.status === "extracting" || item.status === "retrying";
  const isCrossDup = item.status === "duplicate-cross-type";

  const surface = needsDisambiguation ? (
    <AwaitingRoute />
  ) : isCrossDup ? (
    <CrossTypeDuplicate
      item={item}
      onViewExisting={() => runAction("View the existing voucher")}
      onConvertAnyway={() => openConversion({ source: "bill", target: "JV" })}
      onDelete={() => runAction("Delete this item")}
    />
  ) : isApproved ? (
    <NativeApproved
      item={item}
      convertedToJv={approvedAs?.convertedToJv}
      destination={approvedAs?.destination}
      onNext={goNext}
      onViewRecord={() => runAction("Open the posted record")}
    />
  ) : isFailed ? (
    <NativeFailed
      item={item}
      onRetry={() => runAction("Retry extraction")}
      onFillManually={() => runAction("Open the manual entry form")}
      onDelete={() => runAction("Delete this item")}
    />
  ) : isExtracting ? (
    <NativeExtracting item={item} />
  ) : (
    <NativePane
      item={item}
      route={effectiveRoute}
      isLastInCohort={isLastInCohort}
      onApprove={approve}
      onConvert={openConversion}
      onDelete={() => runAction("Delete this item")}
      onSaveDraft={saveDraft}
      onAction={runAction}
    />
  );

  return (
    <SidebarLayout contentClassName="p-0" crumbs={["Inbox", item.file.name]}>
      <div className="flex h-full flex-col overflow-hidden">
        <OrientationStrip
          item={item}
          cohort={cohort}
          onPrev={goPrev}
          onNext={goNext}
          onConvert={(target) =>
            openConversion({
              source: item.route === "JV" ? "jv" : "bill",
              target,
            })
          }
          onAction={runAction}
        />

        {needsDisambiguation ? (
          <DisambigBanner
            item={item}
            threshold={threshold}
            onPick={pickRoute}
            onConfirm={confirmRoute}
          />
        ) : null}

        {isTwoPane ? (
          <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-neutral-gray overflow-hidden">
            <FilePreview item={item} />
            <div className="min-h-0 overflow-auto">{surface}</div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">{surface}</div>
        )}
      </div>

      {conversion ? (
        <ConversionPanel
          item={item}
          request={conversion}
          conflict={conflict}
          onClose={closeConversion}
          onConfirm={confirmConversion}
          onRefreshConflict={refreshConflict}
        />
      ) : null}
    </SidebarLayout>
  );
};

export default withSession(InboxDetailPage);
