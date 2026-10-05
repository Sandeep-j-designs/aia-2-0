import React from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  RotateCcw,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { InboxItem } from "@/types/pages/inbox";

/**
 * The three states where there is no review surface to show, plus the
 * cross-type duplicate screen. Ported from NativeFailed, NativeExtracting,
 * NativeApproved and the CrossTypeDupScreen branch in js/inbox-detail.jsx.
 */

/* ---------------------------------------------------------------- failed */

type FailedProps = {
  item: InboxItem;
  onRetry: () => void;
  onFillManually: () => void;
  onDelete: () => void;
};

export const NativeFailed = ({
  item,
  onRetry,
  onFillManually,
  onDelete,
}: FailedProps) => {
  const failure = item.failure;
  if (!failure) return null;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="border-b border-neutral-gray px-6 py-4">
        <h2 className="text-xl font-semibold">{failure.title}</h2>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-destructive px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-destructive-foreground" />
          <div>
            <div className="text-sm font-semibold text-destructive-foreground">
              {failure.title}
            </div>
            <div className="mt-1 text-sm text-destructive-foreground/90">
              {failure.body}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
          <Button variant="outline" onClick={onFillManually}>
            Fill manually
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="text-destructive-foreground hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

        {/*
          Saying what was attempted, not just that it failed. An accountant
          deciding whether to chase the vendor for a clean copy needs to know
          OCR already had two passes at it.
        */}
        <div className="rounded-lg border border-neutral-gray bg-section p-4 text-sm">
          <div className="mb-2 font-semibold">What we tried</div>
          <ul className="list-disc pl-5 leading-6 text-secondary-foreground">
            <li>OCR pass 1 — Tesseract — 0% structured fields</li>
            <li>OCR pass 2 — Layout-aware — partial header detect</li>
            <li>Vendor matching — no match against masters</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ extracting */

export const NativeExtracting = ({ item }: { item: InboxItem }) => (
  <div className="flex h-full flex-col items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <div className="mt-4 text-sm font-semibold">
      {item.status === "retrying"
        ? `Retrying — attempt ${item.retryAttempt} of ${item.retryMax}`
        : "Reading the document…"}
    </div>
    <div className="mt-1 text-xs text-secondary-foreground">
      We&apos;ll load the review surface as soon as extraction completes.
    </div>
  </div>
);

/* -------------------------------------------------------------- approved */

type ApprovedProps = {
  item: InboxItem;
  convertedToJv?: boolean;
  destination?: string;
  onNext: () => void;
  onViewRecord: () => void;
};

export const NativeApproved = ({
  item,
  convertedToJv,
  destination,
  onNext,
  onViewRecord,
}: ApprovedProps) => (
  <div className="flex h-full flex-col gap-4 overflow-auto p-6">
    <div className="flex items-center gap-3 rounded-lg border border-neutral-gray bg-success-green px-4 py-4">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-success-green-foreground text-background">
        <Check className="h-5 w-5" strokeWidth={3} />
      </span>
      <div className="flex-1">
        <div className="text-base font-semibold text-success-green-foreground">
          {convertedToJv ? "Converted to Journal Voucher" : "Approved"}
        </div>
        <div className="mt-0.5 text-sm text-secondary-foreground">
          By{" "}
          <strong className="text-foreground">
            {item.doneBy ?? "Sandeep Balaji"}
          </strong>{" "}
          · just now · destination{" "}
          <strong className="text-foreground">
            {destination ?? item.destination ?? "—"}
          </strong>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onViewRecord}>
        <ExternalLink className="h-3.5 w-3.5" />
        View {convertedToJv ? "JV" : "voucher"}
      </Button>
    </div>

    <div className="flex items-center gap-2 rounded-lg border border-neutral-gray bg-background px-4 py-4">
      <Info className="h-4 w-4 flex-none text-secondary-foreground" />
      <div className="flex-1 text-sm text-secondary-foreground">
        The next Needs-Review item in this route is queued. Use the pager or
        click below.
      </div>
      <Button size="sm" onClick={onNext}>
        Next item
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
);

/* ------------------------------------------------- cross-type duplicate */

type CrossDupProps = {
  item: InboxItem;
  onViewExisting: () => void;
  onConvertAnyway: () => void;
  onDelete: () => void;
};

export const CrossTypeDuplicate = ({
  item,
  onViewExisting,
  onConvertAnyway,
  onDelete,
}: CrossDupProps) => {
  const existing = item.crossDupOf;
  if (!existing) return null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning px-4 py-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning-foreground" />
        <div>
          <div className="text-sm font-semibold text-warning-foreground">
            This looks like a {item.voucherType.toLowerCase()}, but its content
            already exists as a {existing.type}.
          </div>
          <div className="mt-1 text-sm text-warning-foreground/90">
            {existing.id} was posted by {existing.postedBy} on{" "}
            {existing.postedOn} for ₹{existing.amount.toLocaleString("en-IN")}.
            Posting this as well would double-count it.
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-gray bg-section p-4">
        <div className="mb-2 text-sm font-semibold">What you can do</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onViewExisting}>
            <ExternalLink className="h-3.5 w-3.5" />
            View {existing.id}
          </Button>
          <Button variant="outline" size="sm" onClick={onConvertAnyway}>
            Convert anyway
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-destructive-foreground hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete this item
          </Button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------- route not yet confirmed */

export const AwaitingRoute = () => (
  <div className="flex h-full flex-col items-center justify-center p-12 text-center">
    <Info className="h-9 w-9 text-secondary-foreground" />
    <div className="mt-3 text-sm font-semibold text-foreground">
      Confirm the route to load the review surface
    </div>
    <div className="mt-1 text-xs text-secondary-foreground">
      We won&apos;t pre-populate any fields until you tell us where this
      document belongs.
    </div>
  </div>
);
