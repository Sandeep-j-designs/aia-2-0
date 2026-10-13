#!/usr/bin/env node
/**
 * Prints the inbox's demo source documents and measures where every extracted
 * value sits on them.
 *
 *   node scripts/source-docs/generate.cjs
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
const { MOCK_INBOX_ITEMS } = jiti(path.join(ROOT, "config/pages/inbox/mock-inbox.ts"));
const { printedSupplier } = jiti(path.join(ROOT, "config/pages/inbox/ap-document.ts"));
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

const CITIES = /(Bengaluru|Davanagere|Harihar|Hyderabad|Pune|Ahmedabad|Kutch|Chengalpattu|Mumbai)/;
/** A supplier banks where it trades: the branch is its own town's main one. */
const branchOf = (address) => `${(address.match(CITIES) || [, "Bengaluru"])[1]} Main`;

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
  "INB-2041": { t: "corporate", accent: "#1d3f66", irn: true, reference: "4012876631", refLabel: "Order number", account: "Customer no. 79118842", notes: "Service tags: 7Q2XKH4, 7Q2XKH5<br>ProSupport Plus entitlement starts on delivery." },
  "INB-2051": { same: "INB-2041" },
  "INB-2042": { t: "tally", irn: true, eway: true, stamp: { text: "RECEIVED", sub: "SORPL · Harihar Stores\n05 SEP 2026" }, dispatchedThrough: "VRL Logistics (LR 7781204)", destination: "Harihar", deliveryTerms: "FOR Harihar", poNo: "SORPL/PO/26-27/0418", poDate: "21 Aug 2026", terms: "30 Days" },
  "INB-2052": { t: "tally", irn: true, poNo: "SORPL/PO/26-27/0391", poDate: "06 Aug 2026", terms: "30 Days", dispatchedThrough: "Own vehicle KA-17-C-4412", destination: "Harihar" },
  "INB-2053": { t: "corporate", accent: "#2b5a3a", irn: true, reference: "ZB-118204", refLabel: "Subscription", account: "Org ID 60031287", dueText: "Due on receipt", notes: "Auto-charged to the card on file on the invoice date." },
  "BULK-001": { t: "corporate", accent: "#3b3f8f", irn: true, reference: "7342 1180", refLabel: "Serial no.", account: "Partner: Davanagere Infotech", dueText: "Due on receipt" },
  "BULK-002": { t: "corporate", accent: "#5a1f2b", irn: true, reference: "AC 300118", refLabel: "Account code", account: "Credit customer", dueText: "15 days from invoice", notes: "Shipment-wise annexure (298 AWBs) sent separately." },
  "BULK-003": { t: "corporate", accent: "#7a3b12", irn: true, reference: "RO BLR/26/0918", refLabel: "Release order", account: "Client code SOR-KA-04", notes: "Telecast certificate for August attached with the release order." },
  "BULK-004": { t: "tally", eway: true, poNo: "SORPL/PO/26-27/0402", poDate: "14 Aug 2026", terms: "30 Days", dispatchedThrough: "Tanker TS-08-UD-2271", destination: "Harihar", deliveryTerms: "Ex-works Jeedimetla" },
  "BULK-005": { t: "tally", terms: "30 Days", poNo: "SORPL/PO/26-27/0412", poDate: "22 Aug 2026", destination: "Harihar" },
  "BULK-006": { t: "tally", terms: "30 Days", destination: "Davanagere" },
  "BULK-007": { t: "tally", terms: "10 Days", otherRef: "Canteen contract 2026-27" },
  "BULK-009": { t: "corporate", accent: "#24434f", irn: true, reference: "WO/SOR/2026/07", refLabel: "Work order", account: "Site: Harihar plant" },
  "BULK-010": { t: "fuel", phone: "08192 242 118" },
  "CONV-001": { t: "tally", terms: "30 Days", otherRef: "Agreement OSL/WH/2026/14" },
  "CONV-005": { t: "corporate", accent: "#123a6b", irn: true, reference: "Card 29-118-55210", refLabel: "Customer card", account: "Store 29-118 Yeshwanthpur", dueText: "Paid at counter", notes: "Annexure of 41 articles printed overleaf." },
  "INB-2048": { t: "utility" },
  "INB-2044": { t: "tally", irn: true, eway: true, terms: "15 Days", dispatchedThrough: "Own vehicle KA-17-D-0921", destination: "Davanagere" },
  "INB-2045": { t: "tally", irn: true, eway: true, terms: "15 Days", dispatchedThrough: "Om Sai Logistics", destination: "Bengaluru" },
  "INB-2031": { t: "tally", irn: true, eway: true, terms: "30 Days", poNo: "4100388127", poDate: "18 Aug 2026", dispatchedThrough: "Om Sai Logistics", destination: "Navi Mumbai" },
  "CONV-004": { same: "INB-2031" },
  "INB-2046": { t: "memo" },
  "CONV-002": { t: "memo" },
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
    remarks: "Half-year charge at written-down-value rates under Schedule II; additions after 30 Sep are not included and will be charged in the H2 run.",
  },
  "CONV-002": {
    title: "Re-bill — Peenya godown rent, August 2026",
    preparedBy: "S. Hegde, Accounts",
    schedule: `<p style="font-family:Arial,sans-serif;font-size:10.5px">Rent for bay 3 of the Peenya godown, paid by us to the landlord on 03 Aug 2026 (UTR HDFCR52026080312214), is occupied by Annapoorna Wholesale under the sub-licence of 01 Apr 2026. The amount is recoverable in full.</p>`,
    remarks: "Accounts to confirm whether this is raised as a sales invoice (with GST) rather than a journal.",
  },
};

/* --------------------------------------------------------------- the model */

const rateOf = (sub, taxes) => {
  const t = (taxes.cgst || 0) + (taxes.sgst || 0) + (taxes.igst || 0);
  return sub && t ? Math.round(((t / sub) * 100) / 0.5) * 0.5 : 0;
};

const irnFor = (id) => hex(`irn:${id}`, 64);

const modelFor = (item) => {
  const style = STYLE[item.id];
  if (!style) return null;
  if (style.same) {
    const base = MOCK_INBOX_ITEMS.find((x) => x.id === style.same);
    return { ...modelFor(base), id: item.id };
  }

  if (item.jv) {
    const j = JOURNALS[item.id];
    return {
      id: item.id,
      template: style.t,
      seller: US,
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
    ...(sale ? US : partyOf(item.vendor, vendor)),
    ...(style.phone && { phone: style.phone }),
  };
  const buyer = sale ? partyOf(item.customer || doc.customer) : US;
  const rate = rateOf(doc.subTotal, doc.taxes);
  const number = sale ? doc.invoiceNo : doc.supplierInvoiceNo;
  const date = sale ? doc.invoiceDate : doc.billDate;
  const goods = doc.items.some((l) => l.qty != null && !/^99/.test(l.hsn || ""));

  return {
    id: item.id,
    template: style.t,
    accent: style.accent,
    title: style.t === "utility" ? "Bill" : "Tax Invoice",
    seller,
    buyer,
    shipTo: sale ? { ...buyer } : goods ? PLANT : null,
    number,
    date,
    dueDate: doc.dueDate,
    terms: style.terms || "30 Days",
    poNo: style.poNo,
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
    { meter: "KA-HT-55120", param: "kWh", present: "1,84,766.20", previous: "1,84,523.10", diff: "243.10", consumption: "48,620" },
    { meter: "KA-HT-55120", param: "kVAh", present: "1,93,102.40", previous: "1,92,846.70", diff: "255.70", consumption: "51,140" },
    { meter: "KA-HT-55120", param: "MD (kVA)", present: "1.62", previous: "—", diff: "—", consumption: "324" },
  ],
};

const FILLS = [
  { date: "04/08/26", indent: "2201", vehicle: "KA-17-C-4412 (tanker)", litres: 180 },
  { date: "09/08/26", indent: "2214", vehicle: "DG set 250 kVA", litres: 120 },
  { date: "14/08/26", indent: "2236", vehicle: "KA-17-C-4412 (tanker)", litres: 160 },
  { date: "19/08/26", indent: "2251", vehicle: "KA-17-D-0921", litres: 140 },
  { date: "24/08/26", indent: "2270", vehicle: "DG set 250 kVA", litres: 100 },
  { date: "29/08/26", indent: "2288", vehicle: "KA-17-C-4412 (tanker)", litres: 120 },
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
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", ...args],
    { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }
  ).toString();

const round = (n) => Math.round(n * 10000) / 10000;

const regionsOf = (dom) => {
  const m = dom.match(/<pre id="regions">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error("no regions in the measured DOM");
  const raw = JSON.parse(
    m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
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
const out = {};
for (const item of MOCK_INBOX_ITEMS) {
  const model = modelFor(item);
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
  console.log(`${item.id.padEnd(9)} ${model.template.padEnd(9)} ${Object.keys(regions).length} regions`);
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
console.log(`\n${Object.keys(out).length} documents → public/docs, regions → ${path.relative(ROOT, TS_OUT)}`);
