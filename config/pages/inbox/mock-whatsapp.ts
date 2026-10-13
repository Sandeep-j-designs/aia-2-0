import type { WhatsAppNumber } from "@/types/pages/inbox/ai-features";
export const MOCK_WHATSAPP_NUMBERS: WhatsAppNumber[] = [
  {
    number: "+91 98450 12342",
    name: "Priya Raghavan",
    role: "Accountant · read-only on WhatsApp",
    company: "shakun",
    enabled: true,
  },
  {
    number: "+91 98220 12345",
    name: "Mehul",
    role: "Owner · read-only",
    company: "acme",
    enabled: true,
  },
];
export const WHATSAPP_QUESTIONS = [
  "How much GST do I pay this month?",
  "Who owes me more than 60 days?",
  "What did we spend on freight last month?",
  "Approve the Mahindra bills",
];
export const MOCK_OUTPUT_TAX: Record<string, number> = {
  shakun: 942300,
  acme: 482300,
};
