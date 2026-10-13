/**
 * Contracts for Learn from Tally history (Automation › Rules & learning ›
 * Learned from Tally). camelCase, shaped as the API returns them.
 */

/** How far the organisation's history read has got. */
export type LearningRunStatus = "never" | "running" | "review" | "learned";

/** One read of the books, and what it found. */
export type LearningRun = {
  company: string;
  status: LearningRunStatus;
  /** The Tally company file it read, as TallyPrime names it. */
  tallyCompany: string;
  /** The machine the connector runs on. */
  machine: string;
  /** The span read, as the accountant says it: "Apr 2025 – Sep 2026". */
  period: string;
  vouchers: number;
  vendors: number;
  items: number;
  narrations: number;
  startedAt?: string;
  finishedAt?: string;
  /** The person who confirmed what was learned. */
  confirmedBy?: string;
  /** While running: the step under way (an index into LEARNING_STEPS). */
  step?: number;
  /** While reading vouchers: how many have been read so far. */
  read?: number;
};

/** A vendor's usual ledger, and the bills that say so. */
export type LearnedPattern = {
  id: string;
  company: string;
  vendor: string;
  ledger: string;
  /** Bills from this vendor posted to `ledger`. */
  count: number;
  /** Every bill from this vendor in the period read. */
  total: number;
  /** The last bill's date, ISO. */
  lastSeen: string;
  /**
   * The vendor's bills were split across ledgers and a person chose which
   * one to follow. The minority ledger stays here so the choice can be
   * explained ("2 went to Transportation").
   */
  resolved?: { other: string; otherCount: number; by: string; at: string };
};

/** A vendor whose past bills went to more than one ledger. */
export type CodingConflict = {
  id: string;
  company: string;
  vendor: string;
  /** Each ledger used, most bills first. */
  options: { ledger: string; count: number }[];
  /** The ledger to follow from now on; the AI proposes the majority. */
  chosen: string;
  /** Changed from the AI's proposal by the person reviewing. */
  chosenByPerson?: boolean;
  /** One line on why the history split, when the AI can tell. */
  note?: string;
};
