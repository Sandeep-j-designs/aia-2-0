import type { NeoChat } from "@/types/pages/neo";

const chat = (
  id: string,
  title: string,
  updatedAt: string,
  turns: [string, string][]
): NeoChat => ({
  id,
  title,
  updatedAt,
  messages: turns.flatMap(([user, neo], i) => [
    { id: `${id}-u${i}`, role: "user" as const, text: user },
    { id: `${id}-n${i}`, role: "neo" as const, text: neo },
  ]),
});

/**
 * Recent chats when the session opens: earlier conversations, kept as text.
 * Opening one shows it and carries on from there; the books they mention are
 * the seed's, so the answers still hold.
 *
 * DEV: GET /api/neo/chats
 */
export const MOCK_NEO_CHATS: NeoChat[] = [
  chat("chat-seed-validator", "Bill validator", "2026-10-19T12:02:00+05:30", [
    [
      "Create an agent that validates vendor bills",
      'Saved "Bill validator" as a draft. It runs when a bill is uploaded and only flags what it finds; nothing changes in your books until you approve it.',
    ],
  ]),
  chat(
    "chat-seed-unpaid",
    "Find unpaid invoices",
    "2026-10-18T17:40:00+05:30",
    [
      [
        "Find unpaid invoices",
        "Three customer invoices are past due. Bharat Forge's SPW/26-27/091 for ₹4,10,000 is the oldest, at 74 days; they have replied that payment is scheduled for 20 Oct.",
      ],
    ]
  ),
  chat(
    "chat-seed-upload",
    "Upload purchase bills",
    "2026-10-17T10:15:00+05:30",
    [
      [
        "Upload purchase bills",
        "I read 10 Harihar plant bills and prepared 9 drafts; the tenth I left out for you to look at. The drafts are waiting in Need review.",
      ],
    ]
  ),
  chat(
    "chat-seed-invoice",
    "Create an invoice for Reliance",
    "2026-10-16T15:28:00+05:30",
    [
      [
        "Create an invoice for Reliance against their PO",
        "The draft for Reliance Retail is ready: 100 × 15 L sunflower oil at ₹2,150, ₹2,25,750 with GST. It is in Sales › Needs Review for you to approve.",
      ],
    ]
  ),
  chat("chat-seed-freight", "Why is freight up?", "2026-10-14T09:50:00+05:30", [
    [
      "Why is freight up in September?",
      "Freight is up mainly on Mahindra Logistics bills. Ask again for the breakdown by vendor and the bills behind it.",
    ],
  ]),
];
