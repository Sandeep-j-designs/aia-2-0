import type {
  ConversionSource,
  ConversionTarget,
} from "@/types/pages/inbox/conversion";

/**
 * Which conversions each surface offers, and what each one costs.
 *
 * Ported from `pickerTargetsFor` in js/conversion-extras.jsx. The `badge` marks
 * the edges that flip a party from one side of the ledger to the other — those
 * are rare and consequential, and the picker says so before the accountant
 * commits rather than after.
 */

export type ConvertTargetOption = {
  target: ConversionTarget;
  label: string;
  badge?: string;
  consequence: string;
};

export const CONVERT_TARGETS: Record<ConversionSource, ConvertTargetOption[]> =
  {
    bill: [
      {
        target: "JV",
        label: "Journal Voucher",
        consequence: "Voucher class → Journal.",
      },
      {
        target: "Invoice",
        label: "Sales Invoice",
        badge: "uncommon · party flip",
        consequence:
          "Vendor → Customer · Input GST → Output GST · Expense → Income.",
      },
    ],
    "ar-row": [
      {
        target: "JV",
        label: "Journal Voucher",
        consequence: "Voucher class → Journal.",
      },
      {
        target: "Bill",
        label: "Bill (Purchase)",
        badge: "uncommon · party flip",
        consequence:
          "Customer → Vendor · Output GST → Input GST · Income → Expense.",
      },
    ],
    "banking-row": [
      {
        target: "JV",
        label: "Journal Voucher",
        consequence: "Bank transaction → General Ledger entry.",
      },
    ],
    jv: [
      {
        target: "Bill",
        label: "Bill (Purchase)",
        consequence: "Receivable → Vendor · Journal lines → Bill structure.",
      },
      {
        target: "Invoice",
        label: "Sales Invoice",
        consequence:
          "Narration party → Customer · Journal lines → Invoice lines.",
      },
    ],
  };
