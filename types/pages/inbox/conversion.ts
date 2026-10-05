import type { BankingTxn } from "@/types/pages/inbox";

/**
 * Unified Inbox — conversion contracts.
 *
 * A conversion turns a document that was routed one way into a voucher of
 * another type: a Bill that should have been a Sales Invoice, a Journal that
 * should have been a Bill, a single AR row that belongs in the general ledger.
 *
 * Seven edges are supported. They all share one surface, because the thing the
 * accountant needs to see is the same every time — what maps to what, what they
 * still have to decide, and what posting it will actually do.
 */

export type ConversionTarget = "JV" | "Bill" | "Invoice";

export type ConversionSource = "bill" | "jv" | "ar-row" | "banking-row";

/** What the user asked to convert. Resolved into a ConversionSpec. */
export type ConversionRequest = {
  source: ConversionSource;
  target: ConversionTarget;
  /** Index into item.ar.rows — required when source is "ar-row". */
  rowIndex?: number;
  /** The statement line — required when source is "banking-row". */
  txn?: BankingTxn;
};

/**
 * - `mapped`  the classifier carried the value across; nothing to decide
 * - `locked`  the system derives it; the user cannot change it
 * - `needs`   the user must resolve it before the CTA unlocks
 * - `new`     free text creating something that does not exist yet
 */
export type MappingStatus = "mapped" | "locked" | "needs" | "new";

export type MappingControlKind = "party-flip" | "ledger-flip" | "text";

export type MappingRow = {
  key: string;
  sourceLabel: string;
  sourceValue?: string;
  targetLabel: string;
  status: MappingStatus;
  /** Rendered for `mapped` and `locked`. */
  value?: string;
  placeholder?: string;
  helper?: string;

  control?: MappingControlKind;

  /** party-flip */
  partyType?: "Customer" | "Vendor";
  partyName?: string;
  partyGstin?: string;
  suggestedLedger?: string;

  /** ledger-flip */
  ledgerSide?: string;
  ledgerOptions?: string[];
};

export type PreflightCheck = {
  ok: boolean;
  message: string;
  /** An offered remedy, e.g. posting as a GSTR-1A amendment instead. */
  action?: string;
  /** A failed duplicate check hard-blocks the CTA; a GST-period one warns. */
  blocking?: boolean;
};

export type LineBuilderSpec = {
  target: string;
  suggestedLedger: string;
  suggestedRate: string;
};

export type BuiltLine = {
  desc: string;
  ledger: string;
  hsn: string;
  qty: string;
  rate: string;
};

export type ConversionSpec = {
  title: string;
  subtitle: string;
  /** The irreversible effects, stated before the user commits. */
  consequenceChips: string[];
  /** Shown when the source is freeform and the target is structured. */
  freeformBanner: string | null;
  mapping: MappingRow[];
  lineBuilder?: LineBuilderSpec;
  preflight: {
    duplicate: PreflightCheck;
    gstPeriod: PreflightCheck;
    /** What posting this will touch, in plain words. */
    blastRadius: string;
  };
  ctaLabel: string;
};

/** Values the user resolved in the mapping table, keyed by MappingRow.key. */
export type ResolvedValues = Record<string, string | BuiltLine[] | undefined>;

/** The reserved key the line builder writes under. */
export const LINES_KEY = "__lines";
