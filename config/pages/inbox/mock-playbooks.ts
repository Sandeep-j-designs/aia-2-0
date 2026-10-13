import type { Playbook, AgentSchedule } from "@/types/pages/inbox/ai-features";
export const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: "gst-close",
    name: "GST period close",
    createdBy: "Rajesh",
    steps: [
      "Check September bills approved and synced",
      "Fetch GSTR-2B",
      "Run reconciliation",
      "List missing invoices and ITC",
      "Draft vendor follow-ups",
      "Write partner summary",
    ],
  },
  {
    id: "bank-tidy",
    name: "Month-end bank tidy-up",
    createdBy: "Priya Raghavan",
    steps: [
      "Review applicable bank rules",
      "List unmatched lines over ₹50,000",
      "Suggest matches",
      "Write partner summary",
    ],
  },
  {
    id: "tds",
    name: "TDS check before payment run",
    createdBy: "Rajesh",
    steps: [
      "Check vendor thresholds",
      "List missing deductions",
      "Draft payment-run note",
    ],
  },
  {
    id: "overdue",
    name: "Overdue receivables",
    createdBy: "Rajesh",
    steps: [
      "Read unpaid sales invoices",
      "Group by overdue days",
      "Draft partner summary",
    ],
  },
];
export const MOCK_SCHEDULES: AgentSchedule[] = [
  {
    id: "gst-monthly",
    playbookId: "gst-close",
    when: "Every month on the 14th at 09:00",
    companies: ["shakun", "acme"],
    channel: "WhatsApp",
    recipient: "Priya Raghavan",
    nextRun: "Tomorrow, 14 Oct 2026, 09:00",
    enabled: true,
  },
  {
    id: "ar-weekly",
    playbookId: "overdue",
    when: "Every Monday at 08:00",
    companies: ["shakun", "acme"],
    channel: "Email",
    recipient: "Rajesh",
    nextRun: "19 Oct 2026, 08:00",
    enabled: true,
  },
];
