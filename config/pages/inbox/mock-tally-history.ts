import type {
  CodingConflict,
  LearnedPattern,
  LearningRun,
} from "@/types/pages/inbox/tally-learning";

/**
 * Learn from Tally history, as the API returns it for the two demo books.
 *
 * - Shakunthalam was read at onboarding (28 Aug 2026), so its patterns are
 *   in and its two split vendors were settled by Priya.
 * - Sahyadri has connected Tally but never been read: the tab offers the run,
 *   and the run below is what it finds.
 *
 * Vendors are the ones the Inbox already shows bills from, so a pattern here
 * and a prediction there tell the same story.
 *
 * DEV: GET /api/automation/tally-history/runs/latest?companyUuid=…
 *      GET /api/automation/tally-history/patterns?companyUuid=…
 */

/** What a run reads, step by step. Durations are the prototype's pacing. */
export const LEARNING_STEPS = [
  { id: "connect", label: "Connecting to Tally", ms: 1400 },
  { id: "read", label: "Reading vouchers", ms: 3200 },
  { id: "vendors", label: "Building vendor → ledger patterns", ms: 1500 },
  { id: "items", label: "Building item → HSN patterns", ms: 1200 },
  { id: "narrations", label: "Finding narration patterns", ms: 1000 },
] as const;

export const MOCK_LEARNING_RUNS: LearningRun[] = [
  {
    company: "shakun",
    status: "learned",
    tallyCompany: "Shakunthalam Oil and Refineries Pvt Ltd",
    machine: "SORPL-ACCOUNTS",
    period: "Apr 2025 – Aug 2026",
    vouchers: 6240,
    vendors: 164,
    items: 420,
    narrations: 52,
    startedAt: "2026-08-28T05:42:00.000Z",
    finishedAt: "2026-08-28T05:44:10.000Z",
    confirmedBy: "Priya Raghavan",
  },
  {
    company: "acme",
    status: "never",
    tallyCompany: "Sahyadri Precision Works",
    machine: "SPW-TALLY-01",
    period: "Apr 2025 – Sep 2026",
    vouchers: 4812,
    vendors: 212,
    items: 1140,
    narrations: 38,
  },
];

const pattern = (
  company: string,
  vendor: string,
  ledger: string,
  count: number,
  total: number,
  lastSeen: string,
  resolved?: LearnedPattern["resolved"]
): LearnedPattern => ({
  id: `${company}-${vendor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  company,
  vendor,
  ledger,
  count,
  total,
  lastSeen,
  resolved,
});

/** Shakunthalam's vendors with the most bills, as learned on 28 Aug. */
export const MOCK_SHAKUN_PATTERNS: LearnedPattern[] = [
  pattern(
    "shakun",
    "Vardhman Packaging Pvt Ltd",
    "Packing Material",
    19,
    19,
    "2026-10-06"
  ),
  pattern(
    "shakun",
    "Sri Durga Filling Station",
    "Vehicle Fuel",
    24,
    24,
    "2026-10-08"
  ),
  pattern(
    "shakun",
    "Blue Dart Express Ltd",
    "Courier Charges",
    15,
    15,
    "2026-10-09"
  ),
  pattern(
    "shakun",
    "Bangalore Electricity Supply Company Ltd",
    "Electricity Charges",
    17,
    17,
    "2026-09-30"
  ),
  pattern(
    "shakun",
    "Sri Manjunatha Hardware & Tools",
    "Repairs & Maintenance",
    13,
    16,
    "2026-10-03",
    {
      other: "Stores & Spares",
      otherCount: 3,
      by: "Priya Raghavan",
      at: "2026-08-28T05:51:00.000Z",
    }
  ),
  pattern(
    "shakun",
    "BVG India Ltd",
    "Housekeeping Charges",
    12,
    12,
    "2026-10-01"
  ),
  pattern(
    "shakun",
    "Hyderabad Hexane Traders",
    "Purchase — Solvent",
    11,
    11,
    "2026-10-10"
  ),
  pattern(
    "shakun",
    "Annapurna Caterers",
    "Staff Welfare",
    10,
    10,
    "2026-10-04"
  ),
  pattern(
    "shakun",
    "Ashapura Perfoclay Ltd",
    "Purchase — Bleaching Earth",
    9,
    9,
    "2026-10-07"
  ),
  pattern(
    "shakun",
    "Bengaluru Industrial Gases",
    "Stores & Spares",
    7,
    8,
    "2026-10-11",
    {
      other: "Consumables",
      otherCount: 1,
      by: "Priya Raghavan",
      at: "2026-08-28T05:50:00.000Z",
    }
  ),
  pattern(
    "shakun",
    "Krishna Computers & Peripherals",
    "Computer Maintenance",
    7,
    7,
    "2026-09-22"
  ),
  pattern(
    "shakun",
    "Bharti Airtel Ltd",
    "Internet Charges",
    6,
    6,
    "2026-10-02"
  ),
  pattern(
    "shakun",
    "Zoho Corporation Pvt Ltd",
    "Software Subscription",
    5,
    5,
    "2026-10-01"
  ),
  pattern(
    "shakun",
    "Entertainment Network (India) Ltd",
    "Advertisement",
    4,
    4,
    "2026-09-18"
  ),
  pattern(
    "shakun",
    "Tally Solutions Pvt Ltd",
    "Software Subscription",
    3,
    3,
    "2026-09-05"
  ),
  pattern(
    "shakun",
    "Dell India Pvt Ltd",
    "Purchase — Capital Goods",
    2,
    2,
    "2026-07-14"
  ),
];

/** Sahyadri's vendors with the most bills, as the run finds them. */
export const MOCK_ACME_PATTERNS: LearnedPattern[] = [
  pattern(
    "acme",
    "Mahindra Logistics Ltd",
    "Freight Inward",
    38,
    40,
    "2026-10-09"
  ),
  pattern(
    "acme",
    "Jindal Steel & Power Ltd",
    "Purchase — Raw Material",
    34,
    34,
    "2026-10-06"
  ),
  pattern(
    "acme",
    "Sandvik Coromant India",
    "Tools & Dies",
    26,
    32,
    "2026-10-08"
  ),
  pattern(
    "acme",
    "Castrol India Ltd",
    "Lubricants & Coolants",
    22,
    27,
    "2026-10-02"
  ),
  pattern(
    "acme",
    "SKF India Ltd",
    "Purchase — Bought-out Parts",
    21,
    21,
    "2026-10-07"
  ),
  pattern(
    "acme",
    "Blue Dart Express Ltd",
    "Courier Charges",
    31,
    35,
    "2026-10-10"
  ),
  pattern(
    "acme",
    "Maharashtra State Electricity Distribution Co Ltd",
    "Power & Fuel",
    18,
    18,
    "2026-09-30"
  ),
  pattern(
    "acme",
    "Kirloskar Pneumatic Co Ltd",
    "Repairs — Plant & Machinery",
    9,
    12,
    "2026-09-26"
  ),
  pattern(
    "acme",
    "Bharti Airtel Ltd",
    "Telephone & Internet",
    18,
    18,
    "2026-10-01"
  ),
  pattern(
    "acme",
    "Chakan Industrial Services",
    "Security Charges",
    18,
    18,
    "2026-10-01"
  ),
  pattern(
    "acme",
    "Pune Galvanizers Pvt Ltd",
    "Job Work Charges",
    16,
    16,
    "2026-10-05"
  ),
  pattern(
    "acme",
    "Tally Solutions Pvt Ltd",
    "Software Subscription",
    2,
    2,
    "2026-06-11"
  ),
];

/**
 * The vendors whose history split across ledgers. The AI proposes the
 * majority; the note says what it could tell about the minority.
 */
export const MOCK_ACME_CONFLICTS: CodingConflict[] = [
  {
    id: "acme-c-mahindra",
    company: "acme",
    vendor: "Mahindra Logistics Ltd",
    options: [
      { ledger: "Freight Inward", count: 38 },
      { ledger: "Transportation", count: 2 },
    ],
    chosen: "Freight Inward",
    note: "Both Transportation bills are from April 2025, before Freight Inward was created.",
  },
  {
    id: "acme-c-blue-dart",
    company: "acme",
    vendor: "Blue Dart Express Ltd",
    options: [
      { ledger: "Courier Charges", count: 31 },
      { ledger: "Freight Outward", count: 4 },
    ],
    chosen: "Courier Charges",
    note: "The 4 Freight Outward bills carried finished parts to customers, not documents.",
  },
  {
    id: "acme-c-sandvik",
    company: "acme",
    vendor: "Sandvik Coromant India",
    options: [
      { ledger: "Tools & Dies", count: 26 },
      { ledger: "Consumables", count: 6 },
    ],
    chosen: "Tools & Dies",
  },
  {
    id: "acme-c-castrol",
    company: "acme",
    vendor: "Castrol India Ltd",
    options: [
      { ledger: "Lubricants & Coolants", count: 22 },
      { ledger: "Consumables", count: 5 },
    ],
    chosen: "Lubricants & Coolants",
  },
  {
    id: "acme-c-kirloskar",
    company: "acme",
    vendor: "Kirloskar Pneumatic Co Ltd",
    options: [
      { ledger: "Repairs — Plant & Machinery", count: 9 },
      { ledger: "Purchase — Capital Goods", count: 3 },
    ],
    chosen: "Repairs — Plant & Machinery",
    note: "The 3 capital bills are each over ₹2 lakh: a new compressor and two dryers.",
  },
];
