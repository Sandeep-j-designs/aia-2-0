#!/usr/bin/env node
/**
 * Prints the inbox's demo source documents and measures where every extracted
 * value sits on them.
 *
 *   node scripts/source-docs/generate.cjs             every document
 *   node scripts/source-docs/generate.cjs --missing   only the ones not yet
 *                                                     printed; the rest are
 *                                                     kept byte for byte
 *
 * For each seeded inbox item that has an extraction (a bill, a sales invoice
 * or a journal), it builds the document from the mock data — so the paper and
 * the review form can never disagree — and has headless Chrome:
 *
 *   1. print it to public/docs/<id>.pdf   (the "original" file)
 *   2. screenshot it to public/docs/<id>.png at 2x   (what the viewer shows)
 *   3. measure every [data-src] box   → config/pages/inbox/mock-source-documents.ts
 *
 * The regions are fractions of the page (0–1), the shape an extraction API
 * (Textract, Document AI, Azure DI) returns for a field's bounding box.
 *
 * Needs Google Chrome at the usual macOS path, or CHROME=/path/to/chrome.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const jiti = require(path.join(ROOT, "node_modules/jiti"))(__filename, {
  alias: { "@": ROOT },
  interopDefault: true,
});
const { MOCK_INBOX_ITEMS, SAHYADRI_FIRST_BILL } = jiti(
  path.join(ROOT, "config/pages/inbox/mock-inbox.ts")
);
// The rest of what the store seeds: Neo's AI documents (both companies), the
// auto-approval bills and the customer PO. See seed() in store.ts.
const { AI_DOCUMENTS } = jiti(
  path.join(ROOT, "config/pages/inbox/mock-ai-documents.ts")
);
const { mockAutoApprovalBills } = jiti(
  path.join(ROOT, "config/pages/inbox/mock-trust.ts")
);
const { MOCK_CUSTOMER_PO } = jiti(
  path.join(ROOT, "config/pages/inbox/mock-purchase-order.ts")
);
// Neo voucher entry's sample batch: uploads, not seeded Inbox items.
const { MOCK_BATCH_DOCUMENTS } = jiti(
  path.join(ROOT, "config/pages/neo/mock-batch-documents.ts")
);
const { printedSupplier } = jiti(
  path.join(ROOT, "config/pages/inbox/ap-document.ts")
);
const { partyNamed, MOCK_OWN_REGISTRATION } = jiti(
  path.join(ROOT, "config/pages/inbox/mock-parties.ts")
);
const templates = require("./templates.cjs");
const { bankFor, stateOf, digits, hex } = require("./print.cjs");

const CHROME =
  process.env.CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = path.join(ROOT, "public/docs");
const TS_OUT = path.join(ROOT, "config/pages/inbox/mock-source-documents.ts");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "aia-source-docs-"));
const PAGE = { width: 794, height: 1123 };

/* ------------------------------------------------------------ the parties */

const CITIES =
  /(Bengaluru|Davanagere|Harihar|Hyderabad|Pune|Ahmedabad|Kutch|Chengalpattu|Mumbai)/;
/** A supplier banks where it trades: the branch is its own town's main one. */
const branchOf = (address) =>
  `${(address.match(CITIES) || [, "Bengaluru"])[1]} Main`;

const own = MOCK_OWN_REGISTRATION.shakun;
const US = {
  name: own.legalName,
  address: own.address,
  gstin: own.gstin,
  pan: own.gstin.slice(2, 12),
  state: "Karnataka",
  stateCode: "29",
  cin: "U15144KA2004PTC034871",
  email: "accounts@shakunthalam.co.in",
  bank: { ...bankFor(own.legalName), branch: "Davanagere Main" },
};
/** Sahyadri Precision Works, the second company: its own bills and sales. */
const acme = MOCK_OWN_REGISTRATION.acme;
const SAHYADRI = {
  name: acme.legalName,
  address: acme.address,
  gstin: acme.gstin,
  pan: acme.gstin.slice(2, 12),
  state: acme.state,
  stateCode: acme.gstin.slice(0, 2),
  cin: "",
  email: "accounts@sahyadriprecision.in",
  bank: { ...bankFor(acme.legalName), branch: "Pune Main" },
};
const usFor = (company) => (company === "acme" ? SAHYADRI : US);
const PLANT = {
  name: `${own.legalName} (Harihar Plant)`,
  address: "Sy. No. 118/2, Harihar–Davanagere Road, Harihar 577601",
  state: "Karnataka",
  stateCode: "29",
};

const partyOf = (name, fallback = {}) => {
  const known = partyNamed(name) || {};
  const gstin = known.gstin || fallback.gstin || "";
  return {
    name: known.legalName || name,
    address: known.address || fallback.address || "",
    gstin,
    pan: gstin.slice(2, 12),
    cin: known.cin || "",
    state: stateOf(gstin),
    stateCode: gstin.slice(0, 2),
    bank: { ...bankFor(name), branch: branchOf(known.address || "") },
  };
};

/* ------------------------------------------------- per-document character */

/**
 * What each document looks like and what it prints beyond the extraction:
 * the template family, and the incidental detail a real one carries.
 */
const STYLE = {
  "INB-2041": {
    t: "corporate",
    accent: "#1d3f66",
    irn: true,
    reference: "4012876631",
    refLabel: "Order number",
    account: "Customer no. 79118842",
    notes:
      "Service tags: 7Q2XKH4, 7Q2XKH5<br>ProSupport Plus entitlement starts on delivery.",
  },
  "INB-2051": { same: "INB-2041" },
  "INB-2042": {
    t: "tally",
    irn: true,
    eway: true,
    stamp: { text: "RECEIVED", sub: "SORPL · Harihar Stores\n05 SEP 2026" },
    dispatchedThrough: "VRL Logistics (LR 7781204)",
    destination: "Harihar",
    deliveryTerms: "FOR Harihar",
    poNo: "SORPL/PO/26-27/0418",
    poDate: "21 Aug 2026",
    terms: "30 Days",
  },
  "INB-2052": {
    t: "tally",
    irn: true,
    poNo: "SORPL/PO/26-27/0391",
    poDate: "06 Aug 2026",
    terms: "30 Days",
    dispatchedThrough: "Own vehicle KA-17-C-4412",
    destination: "Harihar",
  },
  "INB-2053": {
    t: "corporate",
    accent: "#2b5a3a",
    irn: true,
    reference: "ZB-118204",
    refLabel: "Subscription",
    account: "Org ID 60031287",
    dueText: "Due on receipt",
    notes: "Auto-charged to the card on file on the invoice date.",
  },
  "BULK-001": {
    t: "corporate",
    accent: "#3b3f8f",
    irn: true,
    reference: "7342 1180",
    refLabel: "Serial no.",
    account: "Partner: Davanagere Infotech",
    dueText: "Due on receipt",
  },
  "BULK-002": {
    t: "corporate",
    accent: "#5a1f2b",
    irn: true,
    reference: "AC 300118",
    refLabel: "Account code",
    account: "Credit customer",
    dueText: "15 days from invoice",
    notes: "Shipment-wise annexure (298 AWBs) sent separately.",
  },
  "BULK-003": {
    t: "corporate",
    accent: "#7a3b12",
    irn: true,
    reference: "RO BLR/26/0918",
    refLabel: "Release order",
    account: "Client code SOR-KA-04",
    notes: "Telecast certificate for August attached with the release order.",
  },
  "BULK-004": {
    t: "tally",
    eway: true,
    poNo: "SORPL/PO/26-27/0402",
    poDate: "14 Aug 2026",
    terms: "30 Days",
    dispatchedThrough: "Tanker TS-08-UD-2271",
    destination: "Harihar",
    deliveryTerms: "Ex-works Jeedimetla",
  },
  "BULK-005": {
    t: "tally",
    terms: "30 Days",
    poNo: "SORPL/PO/26-27/0412",
    poDate: "22 Aug 2026",
    destination: "Harihar",
  },
  "BULK-006": { t: "tally", terms: "30 Days", destination: "Davanagere" },
  "BULK-007": {
    t: "tally",
    terms: "10 Days",
    otherRef: "Canteen contract 2026-27",
  },
  "BULK-009": {
    t: "corporate",
    accent: "#24434f",
    irn: true,
    reference: "WO/SOR/2026/07",
    refLabel: "Work order",
    account: "Site: Harihar plant",
  },
  "BULK-010": { t: "fuel", phone: "08192 242 118" },
  "CONV-001": {
    t: "tally",
    terms: "30 Days",
    otherRef: "Agreement OSL/WH/2026/14",
  },
  "CONV-005": {
    t: "corporate",
    accent: "#123a6b",
    irn: true,
    reference: "Card 29-118-55210",
    refLabel: "Customer card",
    account: "Store 29-118 Yeshwanthpur",
    dueText: "Paid at counter",
    notes: "Annexure of 41 articles printed overleaf.",
  },
  "INB-2048": { t: "utility" },
  "INB-2044": {
    t: "tally",
    irn: true,
    eway: true,
    terms: "15 Days",
    dispatchedThrough: "Own vehicle KA-17-D-0921",
    destination: "Davanagere",
  },
  "INB-2045": {
    t: "tally",
    irn: true,
    eway: true,
    terms: "15 Days",
    dispatchedThrough: "Om Sai Logistics",
    destination: "Bengaluru",
  },
  "INB-2031": {
    t: "tally",
    irn: true,
    eway: true,
    terms: "30 Days",
    poNo: "4100388127",
    poDate: "18 Aug 2026",
    dispatchedThrough: "Om Sai Logistics",
    destination: "Navi Mumbai",
  },
  "CONV-004": { same: "INB-2031" },
  "INB-2046": { t: "memo" },
  "CONV-002": { t: "memo" },
  // Neo voucher entry — the Harihar batch (config/pages/neo/mock-batch-documents.ts)
  "HRH-01": {
    t: "corporate",
    accent: "#b3121f",
    irn: true,
    reference: "LR MLL/JNPT/88412",
    refLabel: "Consignment",
    account: "Customer code SORPL-KA",
    notes:
      "2 trips · 2 × 20 KL ISO tank. Freight under GTA, tax charged at 12% (forward charge).",
  },
  "HRH-02": {
    t: "corporate",
    accent: "#b3121f",
    irn: true,
    reference: "LR MLL/JNPT/88577",
    refLabel: "Consignment",
    account: "Customer code SORPL-KA",
    notes:
      "2 trips · 2 × 20 KL ISO tank. Freight under GTA, tax charged at 12% (forward charge).",
  },
  "HRH-03": {
    t: "corporate",
    accent: "#b3121f",
    irn: true,
    reference: "LR MLL/HRH/90103",
    refLabel: "Consignment",
    account: "Customer code SORPL-KA",
    notes:
      "1 trip · 32 ft multi-axle. Freight under GTA, tax charged at 12% (forward charge).",
  },
  "HRH-09": { same: "HRH-02" },
  "HRH-04": {
    t: "corporate",
    accent: "#5a1f2b",
    irn: true,
    reference: "AC 300118",
    refLabel: "Account code",
    account: "Credit customer",
    notes: "Shipment-wise annexure (64 AWBs) sent separately.",
  },
  "HRH-05": {
    t: "tally",
    terms: "30 Days",
    dispatchedThrough: "Lorry KA-17-B-3381",
    destination: "Harihar",
    otherRef: "LR OSL/2026/0093",
    taxNote:
      "GST on GTA services is payable by the recipient under reverse charge (5%). Tax payable on reverse charge: Yes.",
  },
  "HRH-06": {
    t: "tally",
    terms: "30 Days",
    dispatchedThrough: "VRL parcel service",
    destination: "Harihar",
    otherRef: "Way bill HBL/55120",
  },
  "HRH-07": {
    t: "tally",
    irn: true,
    eway: true,
    poNo: "SORPL/PO/26-27/0455",
    poDate: "29 Aug 2026",
    terms: "30 Days",
    dispatchedThrough: "Own vehicle KA-17-A-2210",
    destination: "Harihar",
  },
  "HRH-08": {
    t: "tally",
    irn: true,
    poNo: "SORPL/PO/26-27/0455",
    poDate: "29 Aug 2026",
    terms: "30 Days",
    dispatchedThrough: "Own vehicle KA-17-A-2210",
    destination: "Harihar",
  },
  "HRH-10": {
    t: "tally",
    terms: "30 Days",
    destination: "Davanagere",
    otherRef: "Trip sheet KPR/T/0911",
  },
};

const JOURNALS = {
  "INB-2046": {
    title: "Provisional depreciation — H1 FY 2026-27",
    preparedBy: "R. Kulkarni, Fixed Assets",
    schedule: `<table><thead><tr><th>Asset class</th><th class="r">WDV 1 Apr 2026</th><th class="r">Rate</th><th class="r">H1 charge (₹)</th></tr></thead><tbody>
      <tr><td>Plant &amp; machinery — refinery</td><td class="r">51,20,000.00</td><td class="r">15%</td><td class="r">3,84,000.00</td></tr>
      <tr><td>Vehicles</td><td class="r">2,56,000.00</td><td class="r">30%</td><td class="r">38,400.00</td></tr>
      <tr><td>Computers</td><td class="r">1,08,000.00</td><td class="r">40%</td><td class="r">21,600.00</td></tr>
      <tr class="t"><td>Total</td><td class="r">55,84,000.00</td><td></td><td class="r">4,44,000.00</td></tr></tbody></table>`,
    remarks:
      "Half-year charge at written-down-value rates under Schedule II; additions after 30 Sep are not included and will be charged in the H2 run.",
  },
  "CONV-002": {
    title: "Re-bill — Peenya godown rent, August 2026",
    preparedBy: "S. Hegde, Accounts",
    schedule: `<p style="font-family:Arial,sans-serif;font-size:10.5px">Rent for bay 3 of the Peenya godown, paid by us to the landlord on 03 Aug 2026 (UTR HDFCR52026080312214), is occupied by Annapoorna Wholesale under the sub-licence of 01 Apr 2026. The amount is recoverable in full.</p>`,
    remarks:
      "Accounts to confirm whether this is raised as a sales invoice (with GST) rather than a journal.",
  },
};

/**
 * The seeds the STYLE table does not name — Neo's AI documents, the
 * auto-approval bills, the customer PO, Sahyadri's first bill — styled by
 * who sent them, since the freight bills alone are forty. Anything else with
 * an extraction falls back to a plain corporate invoice, so no document in
 * the prototype goes without its regions.
 */
const seedStyle = (item, company) => {
  // Nothing was read off a failed or unrouted document: no regions to print.
  if (!item.bill && !item.invoice) return null;
  const id = item.id;
  const ref = (n) => digits(`ref:${id}`, n);
  const customerCode =
    company === "acme" ? "Customer code SPW-MH" : "Customer code SORPL-KA";
  if (id === MOCK_CUSTOMER_PO.id)
    return {
      t: "po",
      accent: "#123a6b",
      reference: "Staples — Edible oils",
      refLabel: "Category",
      account: "V-29-118204",
      terms: "30 Days",
      notes:
        "Deliver to the Yeshwanthpur DC, receiving bay 4, between 7 am and 2 pm. Quote the PO number on the invoice and the delivery challan.",
    };
  if (/^AR-SPW-/.test(id))
    return {
      t: "tally",
      irn: true,
      terms: "45 Days",
      dispatchedThrough: `Own vehicle MH-14-KQ-${ref(4)}`,
      destination: "Pune",
    };
  switch (item.vendor) {
    case "Mahindra Logistics Ltd":
      return {
        t: "corporate",
        accent: "#b3121f",
        irn: true,
        reference: `LR MLL/${company === "acme" ? "PNQ" : "HRH"}/${ref(5)}`,
        refLabel: "Consignment",
        account: customerCode,
        notes: "Consignment note and proof of delivery attached.",
      };
    case "Blue Dart Express Ltd":
      return {
        t: "corporate",
        accent: "#5a1f2b",
        irn: true,
        reference: `AC ${ref(6)}`,
        refLabel: "Account code",
        account: "Credit customer",
        dueText: "15 days from invoice",
      };
    case "Bharti Airtel Ltd":
      return {
        t: "corporate",
        accent: "#9b1b30",
        irn: true,
        reference: item.file.name.split("_")[2] || ref(9),
        refLabel: "Account no.",
        account: `Relationship no. ${ref(10)}`,
        dueText: "Auto-debit on the due date",
      };
    case "Zoho Corporation Pvt Ltd":
      return { ...STYLE["INB-2053"], reference: `ZB-${ref(6)}` };
    case "Annapurna Caterers":
      return STYLE["BULK-007"];
    case "Adani Wilmar Ltd":
      return {
        t: "corporate",
        accent: "#1c4e80",
        irn: true,
        reference: `SO ${ref(8)}`,
        refLabel: "Sales order",
        account: customerCode,
      };
    case "Kirloskar Brothers Ltd":
      return {
        t: "corporate",
        accent: "#0b4a8b",
        irn: true,
        reference: `SO KBL/${ref(6)}`,
        refLabel: "Sales order",
        account: customerCode,
      };
    case "Tata Steel Ltd":
      return {
        t: "corporate",
        accent: "#1f3f7a",
        irn: true,
        reference: `SO ${ref(9)}`,
        refLabel: "Sales order",
        account: "Customer code SPW-PUNE",
        notes: "Mill test certificate sent with the consignment.",
      };
    case "Sri Balaji Packaging":
    case "Harihar Transport Co":
      return { t: "tally", terms: "30 Days", destination: "Davanagere" };
  }
  return { t: "corporate", irn: true };
};
const styleFor = (item, company) =>
  STYLE[item.id] || seedStyle(item, company);

/* --------------------------------------------------------------- the model */

const rateOf = (sub, taxes) => {
  const t = (taxes.cgst || 0) + (taxes.sgst || 0) + (taxes.igst || 0);
  return sub && t ? Math.round(((t / sub) * 100) / 0.5) * 0.5 : 0;
};

const irnFor = (id) => hex(`irn:${id}`, 64);

const modelFor = (item, company = "shakun") => {
  const style = styleFor(item, company);
  if (!style) return null;
  if (style.same) {
    const base = [...MOCK_INBOX_ITEMS, ...MOCK_BATCH_DOCUMENTS].find(
      (x) => x.id === style.same
    );
    return { ...modelFor(base, company), id: item.id };
  }
  const us = usFor(company);

  if (item.jv) {
    const j = JOURNALS[item.id];
    return {
      id: item.id,
      template: style.t,
      seller: us,
      ...j,
      number: item.jv.referenceNo,
      date: item.jv.date,
      narration: item.jv.narration,
      jvLines: item.jv.lines,
    };
  }

  const sale = !!item.invoice;
  const doc = item.bill || item.invoice;
  const vendor = sale ? null : printedSupplier(item);
  const seller = {
    ...(sale ? us : partyOf(item.vendor, vendor)),
    ...(style.phone && { phone: style.phone }),
  };
  const buyer = sale ? partyOf(item.customer || doc.customer) : us;
  const rate = rateOf(doc.subTotal, doc.taxes);
  const number = sale ? doc.invoiceNo : doc.supplierInvoiceNo;
  const date = sale ? doc.invoiceDate : doc.billDate;
  const goods = doc.items.some(
    (l) => l.qty != null && !/^99/.test(l.hsn || "")
  );

  return {
    id: item.id,
    template: style.t,
    accent: style.accent,
    title: style.t === "utility" ? "Bill" : "Tax Invoice",
    seller,
    buyer,
    shipTo: sale ? { ...buyer } : goods && us === US ? PLANT : null,
    number,
    date,
    dueDate: doc.dueDate,
    terms: style.terms || "30 Days",
    poNo: style.poNo || doc.customerPoNo,
    poDate: style.poDate,
    reference: style.reference,
    refLabel: style.refLabel,
    account: style.account,
    notes: style.notes,
    otherRef: style.otherRef,
    dispatchedThrough: style.dispatchedThrough,
    destination: style.destination,
    deliveryTerms: style.deliveryTerms,
    dispatchNo: style.dispatchedThrough ? `DN/${number.split("/").pop()}` : "",
    placeOfSupply: `${buyer.state} (${buyer.stateCode})`,
    irn: style.irn ? irnFor(item.id) : "",
    ackNo: style.irn ? `1126${digits(`ack:${item.id}`, 11)}` : "",
    eway: style.eway ? digits(`eway:${item.id}`, 12).replace(/^0/, "3") : "",
    stamp: style.stamp,
    jurisdiction: seller.address.match(CITIES)?.[1],
    lines: doc.items.map((l) => ({ ...l })),
    taxable: doc.subTotal,
    cgst: doc.taxes.cgst,
    sgst: doc.taxes.sgst,
    igst: doc.taxes.igst,
    rate,
    grand: doc.grandTotal,
    dueText: style.dueText,
    taxNote: style.taxNote,
    utility: style.t === "utility" ? UTILITY : null,
    fills: style.t === "fuel" ? FILLS : null,
  };
};

const UTILITY = {
  rrNo: "DVGHT-112",
  tariff: "HT-2(a) Industrial",
  sanctioned: "350 kVA",
  period: "01 Aug 2026 – 31 Aug 2026",
  division: "Harihar O&M Sub-division",
  mf: "200",
  premises: "Sy. No. 118/2, Harihar–Davanagere Road, Harihar 577601",
  virtualAc: "BESCOM00DVGHT112",
  readings: [
    {
      meter: "KA-HT-55120",
      param: "kWh",
      present: "1,84,766.20",
      previous: "1,84,523.10",
      diff: "243.10",
      consumption: "48,620",
    },
    {
      meter: "KA-HT-55120",
      param: "kVAh",
      present: "1,93,102.40",
      previous: "1,92,846.70",
      diff: "255.70",
      consumption: "51,140",
    },
    {
      meter: "KA-HT-55120",
      param: "MD (kVA)",
      present: "1.62",
      previous: "—",
      diff: "—",
      consumption: "324",
    },
  ],
};

const FILLS = [
  {
    date: "04/08/26",
    indent: "2201",
    vehicle: "KA-17-C-4412 (tanker)",
    litres: 180,
  },
  { date: "09/08/26", indent: "2214", vehicle: "DG set 250 kVA", litres: 120 },
  {
    date: "14/08/26",
    indent: "2236",
    vehicle: "KA-17-C-4412 (tanker)",
    litres: 160,
  },
  { date: "19/08/26", indent: "2251", vehicle: "KA-17-D-0921", litres: 140 },
  { date: "24/08/26", indent: "2270", vehicle: "DG set 250 kVA", litres: 100 },
  {
    date: "29/08/26",
    indent: "2288",
    vehicle: "KA-17-C-4412 (tanker)",
    litres: 120,
  },
];

/* ---------------------------------------------------------------- render */

const render = (model) => {
  const html = templates[model.template]({
    ...model,
    dueDate: model.dueDate,
  });
  // A corporate invoice that does not print a date prints its terms there.
  return model.dueText
    ? html.replace(
        /(<span data-src="doc.dueDate">)[^<]*(<\/span>)/,
        `$1${model.dueText}$2`
      )
    : html;
};

/** Measures every [data-src] box and positions any stamp over its target. */
const MEASURE = `<script>
(() => {
  const page = document.querySelector(".page").getBoundingClientRect();
  const boxes = {};
  for (const el of document.querySelectorAll("[data-src]")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const key = el.dataset.src;
    const b = boxes[key];
    const x0 = r.left - page.left, y0 = r.top - page.top;
    const x1 = x0 + r.width, y1 = y0 + r.height;
    boxes[key] = b
      ? { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) }
      : { x0, y0, x1, y1 };
  }
  const pre = document.createElement("pre");
  pre.id = "regions";
  pre.textContent = JSON.stringify(boxes);
  document.body.append(pre);
})();
</script>`;

/** Lays the RECEIVED stamp half over the invoice number, as a real one lands. */
const STAMP = `<script>
(() => {
  const stamp = document.querySelector(".stamp");
  const target = document.querySelector('[data-src="doc.number"]');
  if (!stamp || !target) return;
  const page = document.querySelector(".page").getBoundingClientRect();
  const r = target.getBoundingClientRect();
  stamp.style.left = (r.left - page.left + r.width * 0.55 - 66) + "px";
  stamp.style.top = (r.top - page.top - 58) + "px";
  stamp.innerHTML = stamp.innerHTML.replace(/\\n/g, "<br>");
})();
</script>`;

const chrome = (args) =>
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      ...args,
    ],
    { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }
  ).toString();

const round = (n) => Math.round(n * 10000) / 10000;

const regionsOf = (dom) => {
  const m = dom.match(/<pre id="regions">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error("no regions in the measured DOM");
  const raw = JSON.parse(
    m[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
  const pad = 2; // breathing room so the outline never sits on the glyphs
  return Object.fromEntries(
    Object.entries(raw)
      .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
      .map(([key, b]) => [
        key,
        {
          page: 1,
          x: round(Math.max(0, b.x0 - pad) / PAGE.width),
          y: round(Math.max(0, b.y0 - pad) / PAGE.height),
          w: round((b.x1 - b.x0 + pad * 2) / PAGE.width),
          h: round((b.y1 - b.y0 + pad * 2) / PAGE.height),
        },
      ])
  );
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const MISSING = process.argv.includes("--missing");
const { MOCK_SOURCE_DOCUMENTS: printed } = MISSING
  ? jiti(TS_OUT)
  : { MOCK_SOURCE_DOCUMENTS: {} };
const out = { ...printed };
const seeds = [
  ...MOCK_INBOX_ITEMS.map((item) => ({ item, company: "shakun" })),
  ...MOCK_BATCH_DOCUMENTS.map((item) => ({ item, company: "shakun" })),
  { item: SAHYADRI_FIRST_BILL, company: "acme" },
  ...mockAutoApprovalBills().map(({ bill }) => ({
    item: bill,
    company: "shakun",
  })),
  ...AI_DOCUMENTS.map(({ item, company }) => ({ item, company })),
  { item: MOCK_CUSTOMER_PO, company: "shakun" },
];
for (const { item, company } of seeds) {
  if (out[item.id]) continue;
  const model = modelFor(item, company);
  if (!model) continue;
  const html = render(model).replace("</body>", `${STAMP}</body>`);
  const page = path.join(WORK, `${item.id}.html`);
  const probe = path.join(WORK, `${item.id}.measure.html`);
  fs.writeFileSync(page, html);
  fs.writeFileSync(probe, html.replace("</body>", `${MEASURE}</body>`));

  const pdf = path.join(OUT_DIR, `${item.id}.pdf`);
  const png = path.join(OUT_DIR, `${item.id}.png`);
  chrome(["--no-pdf-header-footer", `--print-to-pdf=${pdf}`, `file://${page}`]);
  chrome([
    "--force-device-scale-factor=2",
    `--window-size=${PAGE.width},${PAGE.height}`,
    `--screenshot=${png}`,
    `file://${page}`,
  ]);
  const regions = regionsOf(chrome(["--dump-dom", `file://${probe}`]));
  out[item.id] = {
    pdf: `/docs/${item.id}.pdf`,
    pages: [
      { image: `/docs/${item.id}.png`, width: PAGE.width, height: PAGE.height },
    ],
    regions,
  };
  console.log(
    `${item.id.padEnd(9)} ${model.template.padEnd(9)} ${Object.keys(regions).length} regions`
  );
}

const ts = `import type { SourceDocument } from "@/types/pages/inbox";

/**
 * The seeded documents' source files and where every extracted value sits on
 * them. GENERATED by scripts/source-docs/generate.cjs from mock-inbox.ts — edit
 * the mock data or the templates and re-run it; do not edit this by hand.
 *
 * Regions are fractions of the page (0–1), top-left origin, one box per field:
 * the shape an extraction service returns for a field's bounding box.
 *
 * DEV: replaced by GET /api/inbox/:id/document → SourceDocument, served from
 * the extraction result stored with the upload.
 */
export const MOCK_SOURCE_DOCUMENTS: Record<string, SourceDocument> = ${JSON.stringify(out, null, 2)};
`;
fs.writeFileSync(TS_OUT, ts);
fs.rmSync(WORK, { recursive: true, force: true });
console.log(
  `\n${Object.keys(out).length} documents → public/docs, regions → ${path.relative(ROOT, TS_OUT)}`
);
