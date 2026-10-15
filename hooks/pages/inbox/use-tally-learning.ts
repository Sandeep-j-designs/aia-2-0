import { useMemo, useSyncExternalStore } from "react";
import {
  LEARNING_STEPS,
  MOCK_ACME_CONFLICTS,
  MOCK_ACME_PATTERNS,
  MOCK_LEARNING_RUNS,
  MOCK_SHAKUN_PATTERNS,
} from "@/config/pages/inbox/mock-tally-history";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import type {
  CodingConflict,
  LearnedPattern,
  LearningRun,
} from "@/types/pages/inbox/tally-learning";

/**
 * Learn from Tally history: one run per organisation that reads its past
 * vouchers from Tally (read-only), the vendor → ledger patterns it learned,
 * and the vendors whose coding was split that a person settles.
 *
 * Module-level, so a run keeps going if the sheet is closed, and the tab's
 * count, the sheet and any later citation (`learnedEvidence`) read one
 * store. In memory, reseeded on load.
 *
 * DEV: production runs the read on the connector and the server:
 *   start          → POST  /api/automation/tally-history/runs { companyUuid }
 *                    then poll GET …/runs/:id for step and vouchers read
 *   patterns       → GET   /api/automation/tally-history/patterns?companyUuid=…
 *   choose/confirm → PATCH /api/automation/tally-history/patterns/:id { ledger }
 */

type Book = {
  run: LearningRun;
  patterns: LearnedPattern[];
  conflicts: CodingConflict[];
};

type State = Record<string, Book>;

const seed = (): State => {
  // DEV: replace with GET …/runs/latest and GET …/patterns per company.
  const state: State = {};
  MOCK_LEARNING_RUNS.forEach((run) => {
    state[run.company] = {
      run: { ...run },
      patterns: run.company === "shakun" ? [...MOCK_SHAKUN_PATTERNS] : [],
      conflicts: [],
    };
  });
  return state;
};

let state: State = {};
let seeded = false;
const listeners = new Set<() => void>();

const ensureSeeded = () => {
  if (seeded || typeof window === "undefined") return;
  seeded = true;
  state = seed();
};
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  ensureSeeded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => {
  ensureSeeded();
  return state;
};

const patchBook = (company: string, change: (book: Book) => Partial<Book>) => {
  const book = state[company];
  if (!book) return;
  state = { ...state, [company]: { ...book, ...change(book) } };
  emit();
};
const patchRun = (company: string, change: Partial<LearningRun>) =>
  patchBook(company, (b) => ({ run: { ...b.run, ...change } }));

/** A company the prototype created later: connected, never read. */
const blankRun = (company: string): LearningRun => ({
  company,
  status: "never",
  tallyCompany: "",
  machine: "",
  period: "Apr 2025 – Sep 2026",
  vouchers: 0,
  vendors: 0,
  items: 0,
  narrations: 0,
});

const fmt = (n: number) => n.toLocaleString("en-IN");

export const tallyLearning = {
  /**
   * Read the books. Steps advance on timers; the voucher count climbs while
   * reading. Ends in review when vendors were split, learned otherwise.
   */
  start(company: string) {
    ensureSeeded();
    if (!state[company])
      state = {
        ...state,
        [company]: { run: blankRun(company), patterns: [], conflicts: [] },
      };
    const book = state[company];
    if (book.run.status === "running") return;
    patchRun(company, {
      status: "running",
      step: 0,
      read: 0,
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
    });
    let elapsed = 0;
    LEARNING_STEPS.forEach((step, index) => {
      window.setTimeout(() => patchRun(company, { step: index }), elapsed);
      if (step.id === "read") {
        const ticks = 16;
        for (let t = 1; t <= ticks; t++)
          window.setTimeout(
            () =>
              patchRun(company, {
                read: Math.round((state[company].run.vouchers * t) / ticks),
              }),
            elapsed + (step.ms * t) / ticks
          );
      }
      elapsed += step.ms;
    });
    window.setTimeout(() => {
      const learned =
        company === "acme" ? MOCK_ACME_PATTERNS : state[company].patterns;
      const conflicts =
        company === "acme" ? MOCK_ACME_CONFLICTS.map((c) => ({ ...c })) : [];
      patchBook(company, (b) => ({
        patterns: learned,
        conflicts,
        run: {
          ...b.run,
          status: conflicts.length ? "review" : "learned",
          step: LEARNING_STEPS.length,
          finishedAt: new Date().toISOString(),
        },
      }));
      const run = state[company].run;
      logActivity({
        company,
        actor: { kind: "ai", name: "Neo · Tally history" },
        kind: "learned",
        module: "Automation",
        action: "Learned from Tally history",
        subject: `${fmt(run.vouchers)} vouchers · ${run.period}`,
        reason: `Coding for ${fmt(run.vendors)} vendors, ${fmt(run.items)} items and ${run.narrations} narration patterns${
          conflicts.length
            ? `; ${conflicts.length} vendors were coded more than one way`
            : ""
        }`,
      });
    }, elapsed);
  },

  /** Pick the ledger to follow for a split vendor. */
  choose(company: string, conflictId: string, ledger: string) {
    patchBook(company, (b) => ({
      conflicts: b.conflicts.map((c) =>
        c.id === conflictId
          ? {
              ...c,
              chosen: ledger,
              chosenByPerson: ledger !== c.options[0].ledger,
            }
          : c
      ),
    }));
  },

  /**
   * Keep what was learned, with the person's choices for the split vendors.
   * Each choice is logged against the person who made it.
   */
  confirm(company: string, by: string) {
    const book = state[company];
    if (!book || book.run.status !== "review") return;
    const at = new Date().toISOString();
    const patterns = book.patterns.map((p) => {
      const conflict = book.conflicts.find((c) => c.vendor === p.vendor);
      if (!conflict) return p;
      const chosen = conflict.options.find((o) => o.ledger === conflict.chosen);
      const other = conflict.options.find((o) => o.ledger !== conflict.chosen);
      return {
        ...p,
        ledger: conflict.chosen,
        count: chosen?.count ?? p.count,
        resolved: other
          ? { other: other.ledger, otherCount: other.count, by, at }
          : undefined,
      };
    });
    book.conflicts.forEach((c) => {
      logActivity({
        company,
        actor: { kind: "person", name: by },
        kind: "learned",
        module: "Automation",
        action: `Chose a ledger for ${c.vendor}`,
        subject: `${c.vendor} · ${c.options
          .map((o) => `${o.ledger} ${o.count}`)
          .join(" · ")}`,
        change: {
          from: c.options.map((o) => `${o.ledger} (${o.count})`).join(" + "),
          to: c.chosen,
        },
        reason: c.chosenByPerson
          ? `Went against the majority (${c.options[0].ledger})`
          : undefined,
      });
    });
    patchBook(company, (b) => ({
      patterns,
      conflicts: [],
      run: { ...b.run, status: "learned", confirmedBy: by },
    }));
  },
};

/** One organisation's run, patterns and open conflicts. */
export const useTallyLearning = (company: string) => {
  const current = useSyncExternalStore(subscribe, snapshot, () => state);
  return useMemo(
    () =>
      current[company] ?? {
        run: blankRun(company),
        patterns: [],
        conflicts: [],
      },
    [current, company]
  );
};

/**
 * What the books say about a vendor's coding, for a prediction to cite:
 * "Freight Inward · 38 of 40 past bills". Null until the books are read.
 */
export const learnedEvidence = (company: string, vendor: string) => {
  ensureSeeded();
  const book = state[company];
  if (!book || book.run.status !== "learned") return null;
  const p = book.patterns.find(
    (x) => x.vendor.toLowerCase() === vendor.trim().toLowerCase()
  );
  return p ? `${p.ledger} · ${p.count} of ${p.total} past bills` : null;
};
