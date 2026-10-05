import React from "react";
import { AlertTriangle } from "@/components/icons";
import NativeAP from "./native-ap";
import NativeAR from "./native-ar";
import NativeBanking from "./native-banking";
import NativeJV from "./native-jv";
import type { BankingTxn, InboxItem, InboxRoute } from "@/types/pages/inbox";
import type {
  ConversionRequest,
  ConversionTarget,
} from "@/types/pages/inbox/conversion";

/**
 * Picks the review surface for the item's route. Ported from NativePane in
 * js/inbox-detail.jsx.
 *
 * Each route gets its own module surface rather than a shared generic form,
 * because what an accountant checks differs completely: a bill needs its
 * flagged fields verified, a journal needs to balance, a statement needs
 * reconciling, a sheet of invoices needs validating row by row.
 */

type Props = {
  item: InboxItem;
  route: InboxRoute | null;
  isLastInCohort: boolean;
  onApprove: () => void;
  onConvert: (request: ConversionRequest) => void;
  onDelete: () => void;
  onSaveDraft: () => void;
  onAction: (label: string) => void;
};

const NativePane = ({
  item,
  route,
  isLastInCohort,
  onApprove,
  onConvert,
  onDelete,
  onSaveDraft,
  onAction,
}: Props) => {
  if (route === "AP") {
    return (
      <NativeAP
        item={item}
        isLastInCohort={isLastInCohort}
        onApprove={onApprove}
        onConvert={(target: ConversionTarget) =>
          onConvert({ source: "bill", target })
        }
        onDelete={onDelete}
        onSaveDraft={onSaveDraft}
      />
    );
  }

  if (route === "JV") {
    return (
      <NativeJV
        item={item}
        onApprove={onApprove}
        onConvert={(target: ConversionTarget) =>
          onConvert({ source: "jv", target })
        }
        onDelete={onDelete}
        onSaveDraft={onSaveDraft}
      />
    );
  }

  if (route === "Banking") {
    return (
      <NativeBanking
        item={item}
        onApprove={onApprove}
        onConvertTxn={(txn: BankingTxn) =>
          onConvert({ source: "banking-row", target: "JV", txn })
        }
        onDelete={onDelete}
        onSaveDraft={onSaveDraft}
        onAction={onAction}
      />
    );
  }

  if (route === "AR") {
    return (
      <NativeAR
        item={item}
        onApprove={onApprove}
        onConvertRow={(rowIndex: number, target: ConversionTarget) =>
          onConvert({ source: "ar-row", target, rowIndex })
        }
        onDelete={onDelete}
        onSaveDraft={onSaveDraft}
        onAction={onAction}
      />
    );
  }

  // Reachable only if the route was cleared after disambiguation resolved,
  // which should not happen — but silently rendering nothing would be worse.
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
      <AlertTriangle className="h-8 w-8 text-warning-foreground" />
      <div className="text-sm font-semibold">No route</div>
      <div className="max-w-sm text-xs text-secondary-foreground">
        This item has no route. Pick one from the disambiguation banner above.
      </div>
    </div>
  );
};

export default NativePane;
