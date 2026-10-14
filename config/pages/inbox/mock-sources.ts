import type {
  SourceCandidate,
  SourceProvider,
} from "@/types/pages/inbox/sources";

export const SOURCE_PROVIDERS: SourceProvider[] = [
  "Gmail",
  "Google Drive",
  "WhatsApp Business",
];
export const MOCK_SOURCE_CONTACT = "transport-supplier@example.test";
export const mockClearerSourceCopy = (
  candidate: SourceCandidate
): SourceCandidate => {
  const next = structuredClone(candidate);
  next.problem = undefined;
  next.hash += "-clearer-copy";
  next.document.amount = 24000;
  next.document.bill!.items[0].amount = 24000;
  next.document.bill!.items[0].rate = 24000;
  next.document.bill!.subTotal = 24000;
  next.document.bill!.grandTotal = 24000;
  next.document.bill!.flagged = [];
  next.location += " · clearer replacement received (simulated)";
  return next;
};
export const SOURCE_SCOPES: Record<SourceProvider, string[]> = {
  Gmail: ["Accounts / Invoices", "Accounts / Freight"],
  "Google Drive": ["Finance / September invoices", "Finance / Freight"],
  "WhatsApp Business": ["Registered vendor conversations"],
};
export const mockSourceCandidates = (company: string): SourceCandidate[] => {
  const make = (
    key: string,
    provider: SourceProvider,
    vendor: string,
    net: number,
    problem?: SourceCandidate["problem"]
  ): SourceCandidate => ({
    key: `${provider}-${key}`,
    hash: `demo-content-${company}-${key}`,
    provider,
    location:
      provider === "Gmail"
        ? `Accounts / Invoices · ${vendor} · attachment ${key}.pdf`
        : provider === "Google Drive"
          ? `Finance / September invoices / ${key}.pdf`
          : `Registered vendor conversation · ${vendor} · ${key}.pdf`,
    received: "2026-09-25",
    problem,
    document: {
      id: `COLLECT-${company}-${key}`,
      vendor,
      route: "AP",
      voucherType: "Purchase",
      file: { name: `${key}.pdf`, size: "96 KB", ext: "pdf" },
      source: {
        channel:
          provider === "Gmail"
            ? "email"
            : provider === "Google Drive"
              ? "drive"
              : "whatsapp",
        sender: `${vendor} (demo)`,
        subject: "September supplier invoice",
      },
      ai: {
        confidence: 1,
        rationale:
          "Supplier invoice in the delegated collection scope; prepare only, never approve.",
      },
      amount: net,
      receivedAt: "2026-09-25T09:00:00Z",
      status: "needs-review",
      bill: {
        voucherNo: `PUR/COLLECT/${key}`,
        supplierInvoiceNo: problem === "missing-reference" ? "" : key,
        billDate: "25 Sep 2026",
        dueDate: "25 Oct 2026",
        gstReg: company === "shakun" ? "Karnataka HQ" : "Pune HQ",
        costCentre: null,
        flagged: problem
          ? [
              problem === "unreadable"
                ? "Source attachment cannot be read"
                : "Supplier invoice number is missing",
            ]
          : [],
        items: [
          {
            desc: "Inward freight — September",
            ledger: "Freight Inward",
            amount: net,
            hsn: "996511",
            qty: 1,
            unit: "Nos",
            rate: net,
          },
        ],
        taxes: {},
        subTotal: net,
        grandTotal: net,
      },
    },
  });
  return [
    make("ML-0925", "Gmail", "Mahindra Logistics Ltd", 35000),
    make("BD-0926", "Gmail", "Blue Dart Express Ltd", 12500),
    make(
      "HT-0927",
      "Gmail",
      "Harihar Transport Co",
      18000,
      "missing-reference"
    ),
    make("SCAN-0928", "Gmail", "Local transport supplier", 0, "unreadable"),
    make("ML-0925", "Google Drive", "Mahindra Logistics Ltd", 35000),
    make("DT-0929", "Google Drive", "Delhivery Ltd", 9400),
    make("VR-0930", "WhatsApp Business", "VRL Logistics Ltd", 15600),
  ];
};
