/**
 * The demo source documents, as HTML pages one A4 sheet each (794 × 1123 CSS
 * px). Four families, modelled on what actually lands in an Indian accounts
 * inbox:
 *
 *   tally      the boxed "Tax Invoice" most mid-size suppliers print from
 *              TallyPrime — also what we print for our own sales
 *   corporate  a large company's ERP invoice (Dell, Zoho, Blue Dart …)
 *   utility    the electricity board's HT bill
 *   fuel       a filling station's monthly credit bill (a bill of supply)
 *   memo       an internal journal note — depreciation run, re-bill
 *
 * Every value the extraction reads is wrapped in `data-src="<key>"`. The
 * generator measures those boxes after layout and writes them out as the
 * document's source regions, so a highlight can never drift from the print.
 *
 * Keys: seller.* / buyer.* (name, gstin, address), doc.* (number, date,
 * dueDate, placeOfSupply, poNo, narration), totals.* (taxable, cgst, sgst,
 * igst, grand), line.N and line.N.* (desc, hsn, qty, rate, amount; ledger, dr,
 * cr on a journal).
 */
const {
  inr,
  qty,
  words,
  esc,
  qr,
  tallyDate,
  longDate,
  slashDate,
} = require("./print.cjs");

/** Wrap a printed value so its box is measured. `tag` may carry attributes. */
const src = (key, html, tag = "span") =>
  `<${tag} data-src="${key}">${html}</${tag.split(" ")[0]}>`;

const shell = (css, body) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
@page { size: 794px 1123px; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: 794px; height: 1123px; overflow: hidden; background: #fff; color: #111; }
.demo { position: absolute; left: 0; right: 0; bottom: 10px; text-align: center; font: 8px/1 Arial, sans-serif; color: #9a9a9a; letter-spacing: .02em; }
table { border-collapse: collapse; }
.r { text-align: right; } .c { text-align: center; } .b { font-weight: 700; }
${css}
</style></head><body><div class="page">${body}<div class="demo">Demo document for the AI Accountant prototype · all identifiers are fictitious</div></div></body></html>`;

/* ------------------------------------------------------------------ tally */

const TALLY_CSS = `
.t { padding: 34px 36px 0; font: 10.5px/1.35 Arial, Helvetica, sans-serif; }
.t h1 { margin: 0; text-align: center; font-size: 15px; letter-spacing: .02em; }
.t .copy { position: absolute; right: 36px; top: 36px; font-size: 9px; font-style: italic; }
.t .irn { display: flex; justify-content: space-between; align-items: flex-start; margin: 6px 0 4px; font-size: 9.5px; }
.t .irn div { line-height: 1.5; }
.t .grid { width: 100%; border: 1px solid #222; }
.t .grid td { border: 1px solid #222; vertical-align: top; padding: 3px 5px; }
.t .lbl { font-size: 9px; color: #333; display: block; }
.t .party { line-height: 1.4; }
.t .party .nm { font-weight: 700; font-size: 11px; }
.t .items { width: 100%; border: 1px solid #222; border-top: none; }
.t .items th { border: 1px solid #222; font-weight: 400; font-size: 9.5px; padding: 3px 4px; }
.t .items td { border-left: 1px solid #222; border-right: 1px solid #222; padding: 3px 5px; vertical-align: top; }
.t .items tr.ln td { padding-top: 6px; }
.t .items tr.tx td { padding-top: 2px; padding-bottom: 2px; }
.t .items tr.gap td { height: 100%; }
.t .items tr.tot td { border: 1px solid #222; font-weight: 700; padding: 4px 5px; }
.t .words { border: 1px solid #222; border-top: none; padding: 4px 6px 6px; }
.t .words .e { float: right; font-style: italic; font-size: 9px; }
.t .hsn { width: 100%; border: 1px solid #222; border-top: none; font-size: 9.5px; }
.t .hsn th, .t .hsn td { border: 1px solid #222; padding: 2px 4px; font-weight: 400; }
.t .hsn tr.tot td { font-weight: 700; }
.t .foot { border: 1px solid #222; border-top: none; display: flex; font-size: 9.5px; }
.t .foot > div { flex: 1; padding: 5px 6px; }
.t .foot > div + div { border-left: 1px solid #222; }
.t .sign { text-align: right; display: flex; flex-direction: column; justify-content: space-between; min-height: 92px; }
.t .gen { text-align: center; font-size: 9px; margin-top: 6px; }
.t .stamp { position: absolute; width: 132px; height: 132px; border: 3px double rgba(38, 64, 160, .78); border-radius: 50%;
  color: rgba(38, 64, 160, .82); font: 700 10px/1.25 Arial, sans-serif; text-align: center; display: flex; flex-direction: column;
  align-items: center; justify-content: center; transform: rotate(-14deg); mix-blend-mode: multiply; padding: 10px; }
.t .stamp i { font-style: normal; font-size: 8.5px; font-weight: 400; display: block; margin-top: 4px; }
`;

const tallyMeta = (doc) => {
  const cell = (label, value) =>
    `<td><span class="lbl">${label}</span>${value || "&nbsp;"}</td>`;
  return `
<table style="width:100%;height:100%;border-collapse:collapse">
  <tr>${cell("Invoice No.", `<b>${src("doc.number", esc(doc.number))}</b>`)}${cell("Dated", `<b>${src("doc.date", tallyDate(doc.date))}</b>`)}</tr>
  <tr>${cell("Delivery Note", esc(doc.deliveryNote || ""))}${cell("Mode/Terms of Payment", src("doc.dueDate", esc(doc.terms)))}</tr>
  <tr>${cell("Reference No. &amp; Date.", esc(doc.reference || ""))}${cell("Other References", esc(doc.otherRef || ""))}</tr>
  <tr>${cell("Buyer's Order No.", doc.poNo ? src("doc.poNo", esc(doc.poNo)) : "")}${cell("Dated", doc.poDate ? tallyDate(doc.poDate) : "")}</tr>
  <tr>${cell("Dispatch Doc No.", esc(doc.dispatchNo || ""))}${cell("Delivery Note Date", doc.dispatchNo ? tallyDate(doc.date) : "")}</tr>
  <tr>${cell("Dispatched through", esc(doc.dispatchedThrough || ""))}${cell("Destination", esc(doc.destination || ""))}</tr>
  <tr><td colspan="2" style="height:46px"><span class="lbl">Terms of Delivery</span>${esc(doc.deliveryTerms || "")}${doc.eway ? `<br>e-Way Bill No. ${esc(doc.eway)}` : ""}</td></tr>
</table>`;
};

const partyBlock = (who, party, title) => `
<span class="lbl">${title}</span>
${src(`${who}.name`, esc(party.name), 'div class="nm"')}
${src(`${who}.address`, esc(party.address), "div")}
${party.gstin ? `<div>GSTIN/UIN : ${src(`${who}.gstin`, esc(party.gstin))}</div>` : ""}
${src(`${who}.state`, `State Name : ${esc(party.state)}, Code : ${esc(party.stateCode)}`, "div")}
${party.cin ? `<div>CIN : ${esc(party.cin)}</div>` : ""}
${party.email ? `<div>E-Mail : ${esc(party.email)}</div>` : ""}`;

const tally = (doc) => {
  const s = doc.seller;
  const intra = !doc.igst;
  const half = doc.rate / 2;
  const hsnRows = Object.values(
    doc.lines.reduce((acc, l) => {
      const key = l.hsn || "—";
      acc[key] = acc[key] || { hsn: key, taxable: 0 };
      acc[key].taxable += l.amount;
      return acc;
    }, {})
  );
  const taxRow = (key, label, amount, rate) =>
    `<tr class="tx"><td></td><td class="r b">${label}</td><td></td><td></td><td class="r">${rate}</td><td>%</td><td class="r b">${src(`totals.${key}`, inr(amount))}</td></tr>`;
  const qtyUnits = [...new Set(doc.lines.filter((l) => l.qty != null).map((l) => l.unit))];
  const qtyTotal =
    qtyUnits.length === 1
      ? `${qty(doc.lines.reduce((t, l) => t + (l.qty || 0), 0))} ${qtyUnits[0]}`
      : "";
  const taxTotal = (doc.cgst || 0) + (doc.sgst || 0) + (doc.igst || 0);

  const body = `
<div class="t">
  <h1>${esc(doc.title || "Tax Invoice")}</h1>
  <div class="copy">(ORIGINAL FOR RECIPIENT)</div>
  ${
    doc.irn
      ? `<div class="irn"><div>IRN : ${esc(doc.irn)}<br>Ack No. : ${esc(doc.ackNo)}<br>Ack Date : ${tallyDate(doc.date)}</div><div style="text-align:center;font-size:8.5px">e-Invoice<br>${qr(doc.irn, 74)}</div></div>`
      : `<div style="height:10px"></div>`
  }
  <table class="grid">
    <tr>
      <td style="width:52%" class="party">${partyBlock("seller", s, "")}</td>
      <td rowspan="3" style="padding:0">${tallyMeta(doc)}</td>
    </tr>
    <tr><td class="party">${
      doc.shipTo
        ? `<span class="lbl">Consignee (Ship to)</span><div class="nm">${esc(doc.shipTo.name)}</div><div>${esc(doc.shipTo.address)}</div><div>State Name : ${esc(doc.shipTo.state)}, Code : ${esc(doc.shipTo.stateCode)}</div>`
        : `<span class="lbl">Consignee (Ship to)</span><div>Same as buyer</div>`
    }</td></tr>
    <tr><td class="party">${partyBlock("buyer", doc.buyer, "Buyer (Bill to)")}<div>Place of Supply : ${src("doc.placeOfSupply", esc(doc.placeOfSupply))}</div></td></tr>
  </table>
  <table class="items">
    <thead><tr>
      <th style="width:28px">Sl<br>No.</th><th>Description of Goods / Services</th><th style="width:62px">HSN/SAC</th>
      <th style="width:74px">Quantity</th><th style="width:62px">Rate</th><th style="width:34px">per</th><th style="width:96px">Amount</th>
    </tr></thead>
    <tbody>
      ${doc.lines
        .map(
          (l, i) => `<tr class="ln" data-src="line.${i}">
        <td class="c">${i + 1}</td>
        <td class="b">${src(`line.${i}.desc`, esc(l.desc))}${l.note ? `<div style="font-weight:400;font-style:italic;font-size:9.5px">${esc(l.note)}</div>` : ""}</td>
        <td>${l.hsn ? src(`line.${i}.hsn`, esc(l.hsn)) : ""}</td>
        <td class="r b">${l.qty != null ? src(`line.${i}.qty`, `${qty(l.qty)} ${esc(l.unit || "")}`) : ""}</td>
        <td class="r">${l.rate != null ? src(`line.${i}.rate`, inr(l.rate)) : ""}</td>
        <td>${l.rate != null ? esc(l.unit || "") : ""}</td>
        <td class="r b">${src(`line.${i}.amount`, inr(l.amount))}</td>
      </tr>`
        )
        .join("")}
      <tr class="tx"><td></td><td></td><td></td><td></td><td></td><td></td><td class="r" style="border-top:1px solid #222">${src("totals.taxable", inr(doc.taxable))}</td></tr>
      ${
        intra
          ? (doc.cgst ? taxRow("cgst", "CGST", doc.cgst, half) : "") +
            (doc.sgst ? taxRow("sgst", "SGST", doc.sgst, half) : "")
          : doc.igst
            ? taxRow("igst", "IGST", doc.igst, doc.rate)
            : ""
      }
      ${doc.roundOff ? `<tr class="tx"><td></td><td class="r b">Round Off</td><td></td><td></td><td></td><td></td><td class="r b">${doc.roundOff > 0 ? "" : "(-)"}${inr(Math.abs(doc.roundOff))}</td></tr>` : ""}
      <tr class="gap"><td style="height:${Math.max(30, 250 - doc.lines.length * 34)}px"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr class="tot"><td></td><td class="r">Total</td><td></td><td class="r">${qtyTotal}</td><td></td><td></td><td class="r">₹ ${src("totals.grand", inr(doc.grand))}</td></tr>
    </tbody>
  </table>
  <div class="words"><span class="e">E. &amp; O.E</span>Amount Chargeable (in words)<div class="b" style="font-size:11px">${words(doc.grand)}</div></div>
  ${
    taxTotal
      ? `<table class="hsn">
    <tr><th rowspan="2">HSN/SAC</th><th rowspan="2">Taxable<br>Value</th>${
      intra
        ? `<th colspan="2">Central Tax</th><th colspan="2">State Tax</th>`
        : `<th colspan="2">Integrated Tax</th>`
    }<th rowspan="2">Total<br>Tax Amount</th></tr>
    <tr>${intra ? `<th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th>` : `<th>Rate</th><th>Amount</th>`}</tr>
    ${hsnRows
      .map((h) => {
        const t = (h.taxable * doc.rate) / 100;
        return `<tr><td>${esc(h.hsn)}</td><td class="r">${inr(h.taxable)}</td>${
          intra
            ? `<td class="r">${half}%</td><td class="r">${inr(t / 2)}</td><td class="r">${half}%</td><td class="r">${inr(t / 2)}</td>`
            : `<td class="r">${doc.rate}%</td><td class="r">${inr(t)}</td>`
        }<td class="r">${inr(t)}</td></tr>`;
      })
      .join("")}
    <tr class="tot"><td class="r">Total</td><td class="r">${inr(doc.taxable)}</td>${
      intra
        ? `<td></td><td class="r">${inr(doc.cgst)}</td><td></td><td class="r">${inr(doc.sgst)}</td>`
        : `<td></td><td class="r">${inr(doc.igst)}</td>`
    }<td class="r">${inr(taxTotal)}</td></tr>
  </table>
  <div class="words" style="font-size:9.5px">Tax Amount (in words) : <b>${words(taxTotal)}</b></div>`
      : `<div class="words" style="font-size:9.5px">${esc(doc.taxNote || "")}</div>`
  }
  <div class="foot">
    <div>
      <div>Company's PAN : <b>${esc(s.pan)}</b></div>
      <div style="margin-top:6px"><u>Declaration</u><br>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
    </div>
    <div>
      <div>Company's Bank Details</div>
      <div>Bank Name : <b>${esc(s.bank.bank)}</b></div>
      <div>A/c No. : <b>${esc(s.bank.account)}</b></div>
      <div>Branch &amp; IFS Code : <b>${esc(s.bank.branch)} &amp; ${esc(s.bank.ifsc)}</b></div>
      <div class="sign" style="min-height:56px;margin-top:6px"><b>for ${esc(s.name)}</b><span>Authorised Signatory</span></div>
    </div>
  </div>
  <div class="gen">SUBJECT TO ${esc((doc.jurisdiction || "Bengaluru").toUpperCase())} JURISDICTION<br>This is a Computer Generated Invoice</div>
  ${
    doc.stamp
      ? `<div class="stamp" style="left:${doc.stamp.x}px;top:${doc.stamp.y}px">${esc(doc.stamp.text)}<i>${esc(doc.stamp.sub)}</i></div>`
      : ""
  }
</div>`;
  return shell(TALLY_CSS, body);
};

/* -------------------------------------------------------------- corporate */

const CORP_CSS = `
.k { padding: 44px 48px 0; font: 10.5px/1.45 "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1d1d1f; }
.k .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--accent); padding-bottom: 14px; }
.k .mark { font-size: 22px; font-weight: 700; letter-spacing: -.01em; color: var(--accent); }
.k .mark small { display: block; font-size: 10px; font-weight: 400; color: #555; letter-spacing: 0; margin-top: 4px; line-height: 1.45; }
.k .ttl { text-align: right; }
.k .ttl h1 { margin: 0; font-size: 20px; font-weight: 300; letter-spacing: .08em; text-transform: uppercase; }
.k .ttl div { font-size: 9px; color: #666; }
.k .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 16px; border: 1px solid #d4d4d8; }
.k .meta > div { padding: 7px 10px; border-right: 1px solid #d4d4d8; }
.k .meta > div:last-child { border-right: none; }
.k .meta > div > span { display: block; font-size: 8.5px; text-transform: uppercase; letter-spacing: .06em; color: #6b6b70; margin-bottom: 2px; }
.k .meta b { font-size: 11px; }
.k .parties { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-top: 18px; }
.k .parties h4 { margin: 0 0 4px; font-size: 8.5px; text-transform: uppercase; letter-spacing: .06em; color: #6b6b70; font-weight: 500; }
.k .parties .nm { font-weight: 600; font-size: 11px; }
.k table.li { width: 100%; margin-top: 20px; }
.k table.li th { background: var(--accent); color: #fff; font-weight: 500; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; text-align: left; }
.k table.li th.r { text-align: right; }
.k table.li td { padding: 8px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
.k table.li td small { display: block; color: #666; font-size: 9px; }
.k .sum { display: flex; justify-content: space-between; margin-top: 16px; gap: 24px; }
.k .sum .notes { flex: 1; font-size: 9.5px; color: #444; }
.k .sum table { width: 260px; }
.k .sum td { padding: 4px 8px; }
.k .sum tr.g td { border-top: 2px solid var(--accent); font-weight: 700; font-size: 12.5px; padding-top: 7px; }
.k .words { margin-top: 10px; font-size: 9.5px; color: #333; }
.k .pay { margin-top: 18px; display: flex; gap: 18px; font-size: 9.5px; border-top: 1px solid #d4d4d8; padding-top: 12px; }
.k .pay > div { flex: 1; }
.k .pay h4 { margin: 0 0 4px; font-size: 8.5px; text-transform: uppercase; letter-spacing: .06em; color: #6b6b70; font-weight: 500; }
.k .einv { display: flex; gap: 14px; align-items: center; margin-top: 18px; padding: 10px 12px; background: #f6f6f7; font-size: 9px; color: #333; word-break: break-all; }
.k .legal { margin-top: 16px; font-size: 8.5px; color: #777; line-height: 1.5; }
`;

const corporate = (doc) => {
  const s = doc.seller;
  const intra = !doc.igst;
  const body = `
<div class="k" style="--accent:${doc.accent || "#1f3a5f"}">
  <div class="top">
    <div class="mark">${src("seller.name", esc(s.name))}<small>${src("seller.address", esc(s.address))}<br>GSTIN ${src("seller.gstin", esc(s.gstin))} · PAN ${esc(s.pan)}${s.cin ? `<br>CIN ${esc(s.cin)}` : ""}</small></div>
    <div class="ttl"><h1>${esc(doc.title || "Tax Invoice")}</h1><div>Original for recipient</div></div>
  </div>
  <div class="meta">
    <div><span>Invoice number</span><b>${src("doc.number", esc(doc.number))}</b></div>
    <div><span>Invoice date</span><b>${src("doc.date", longDate(doc.date))}</b></div>
    <div><span>Due date</span><b>${src("doc.dueDate", longDate(doc.dueDate))}</b></div>
    <div><span>${esc(doc.refLabel || "Customer PO")}</span><b>${esc(doc.reference || "—")}</b></div>
  </div>
  <div class="parties">
    <div><h4>Bill to</h4>${src("buyer.name", esc(doc.buyer.name), 'div class="nm"')}${src("buyer.address", esc(doc.buyer.address), "div")}<div>GSTIN ${src("buyer.gstin", esc(doc.buyer.gstin))}</div></div>
    <div><h4>Ship to</h4><div class="nm">${esc((doc.shipTo || doc.buyer).name)}</div><div>${esc((doc.shipTo || doc.buyer).address)}</div></div>
    <div><h4>Place of supply</h4><div>${src("doc.placeOfSupply", esc(doc.placeOfSupply))}</div><h4 style="margin-top:10px">Account</h4><div>${esc(doc.account || "")}</div></div>
  </div>
  <table class="li">
    <thead><tr><th style="width:24px">#</th><th>Description</th><th style="width:66px">HSN/SAC</th><th class="r" style="width:70px">Qty</th><th class="r" style="width:84px">Unit price</th><th class="r" style="width:100px">Taxable value</th></tr></thead>
    <tbody>
      ${doc.lines
        .map(
          (l, i) => `<tr data-src="line.${i}">
        <td>${i + 1}</td>
        <td>${src(`line.${i}.desc`, esc(l.desc))}${l.note ? `<small>${esc(l.note)}</small>` : ""}</td>
        <td>${l.hsn ? src(`line.${i}.hsn`, esc(l.hsn)) : "—"}</td>
        <td class="r">${l.qty != null ? src(`line.${i}.qty`, `${qty(l.qty)} ${esc(l.unit || "")}`) : "—"}</td>
        <td class="r">${l.rate != null ? src(`line.${i}.rate`, inr(l.rate)) : "—"}</td>
        <td class="r">${src(`line.${i}.amount`, inr(l.amount))}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>
  <div class="sum">
    <div class="notes">${doc.notes || ""}</div>
    <table>
      <tr><td>Taxable value</td><td class="r">${src("totals.taxable", inr(doc.taxable))}</td></tr>
      ${
        intra
          ? `<tr><td>CGST @ ${doc.rate / 2}%</td><td class="r">${src("totals.cgst", inr(doc.cgst))}</td></tr><tr><td>SGST @ ${doc.rate / 2}%</td><td class="r">${src("totals.sgst", inr(doc.sgst))}</td></tr>`
          : `<tr><td>IGST @ ${doc.rate}%</td><td class="r">${src("totals.igst", inr(doc.igst))}</td></tr>`
      }
      <tr class="g"><td>Total (INR)</td><td class="r">${src("totals.grand", inr(doc.grand))}</td></tr>
    </table>
  </div>
  <div class="words">Amount in words: <b>${words(doc.grand)}</b></div>
  <div class="pay">
    <div><h4>Remit to</h4>${esc(s.bank.bank)}, ${esc(s.bank.branch)}<br>A/c ${esc(s.bank.account)} · IFSC ${esc(s.bank.ifsc)}</div>
    <div><h4>Terms</h4>${esc(doc.terms)}. Interest at 18% p.a. on payments received after the due date.</div>
  </div>
  ${
    doc.irn
      ? `<div class="einv">${qr(doc.irn, 70)}<div><b>e-Invoice</b><br>IRN ${esc(doc.irn)}<br>Ack No. ${esc(doc.ackNo)} · Ack date ${slashDate(doc.date)}</div></div>`
      : ""
  }
  <div class="legal">Whether tax is payable under reverse charge: No. This is a system-generated invoice and does not require a signature. ${esc(doc.legal || "")}</div>
</div>`;
  return shell(CORP_CSS, body);
};

/* ---------------------------------------------------------------- utility */

const UTIL_CSS = `
.u { padding: 36px 40px 0; font: 10.5px/1.4 Arial, Helvetica, sans-serif; }
.u .hd { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; }
.u .hd h1 { margin: 0; font-size: 15px; letter-spacing: .03em; }
.u .hd div { font-size: 9.5px; }
.u .hd h2 { margin: 6px 0 0; font-size: 12.5px; letter-spacing: .1em; }
.u table.kv { width: 100%; margin-top: 10px; border: 1px solid #111; }
.u table.kv td { border: 1px solid #111; padding: 4px 6px; vertical-align: top; }
.u table.kv td.l { width: 18%; background: #f1f1f1; font-size: 9.5px; }
.u .mono { font-family: "Courier New", Courier, monospace; font-size: 11px; }
.u h3 { margin: 14px 0 4px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; }
.u table.grid { width: 100%; border: 1px solid #111; }
.u table.grid th { border: 1px solid #111; background: #f1f1f1; font-size: 9.5px; padding: 4px; font-weight: 700; }
.u table.grid td { border: 1px solid #111; padding: 5px 6px; }
.u .net { margin-top: 12px; border: 2px solid #111; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.u .note { margin-top: 12px; font-size: 9px; line-height: 1.5; }
.u .tear { margin-top: 18px; border-top: 1px dashed #111; padding-top: 10px; font-size: 9.5px; display: flex; justify-content: space-between; }
`;

const utility = (doc) => {
  const s = doc.seller;
  const u = doc.utility;
  const body = `
<div class="u">
  <div class="hd">
    <h1>${src("seller.name", esc(s.name.toUpperCase()))}</h1>
    <div>(A Government of Karnataka Undertaking) · CIN ${esc(s.cin)}</div>
    <div>${src("seller.address", esc(s.address))} · GSTIN ${src("seller.gstin", esc(s.gstin))}</div>
    <h2>HT ELECTRICITY BILL</h2>
  </div>
  <table class="kv">
    <tr><td class="l">Consumer</td><td colspan="3"><b>${src("buyer.name", esc(doc.buyer.name.toUpperCase()))}</b><br>${src("buyer.address", esc(u.premises), "span")}</td></tr>
    <tr><td class="l">RR No.</td><td class="mono">${esc(u.rrNo)}</td><td class="l">Bill No.</td><td class="mono">${src("doc.number", esc(doc.number))}</td></tr>
    <tr><td class="l">Tariff</td><td>${esc(u.tariff)}</td><td class="l">Bill Date</td><td class="mono">${src("doc.date", slashDate(doc.date))}</td></tr>
    <tr><td class="l">Sanctioned Demand</td><td>${esc(u.sanctioned)}</td><td class="l">Due Date</td><td class="mono"><b>${src("doc.dueDate", slashDate(doc.dueDate))}</b></td></tr>
    <tr><td class="l">Billing Period</td><td>${esc(u.period)}</td><td class="l">Sub-division</td><td>${esc(u.division)}</td></tr>
    <tr><td class="l">Consumer GSTIN</td><td class="mono">${src("buyer.gstin", esc(doc.buyer.gstin))}</td><td class="l">Multiplying Factor</td><td>${esc(u.mf)}</td></tr>
  </table>
  <h3>Meter readings</h3>
  <table class="grid">
    <tr><th>Meter</th><th>Parameter</th><th>Present</th><th>Previous</th><th>Difference</th><th>MF</th><th>Consumption</th></tr>
    ${u.readings
      .map(
        (r) =>
          `<tr><td class="mono">${esc(r.meter)}</td><td>${esc(r.param)}</td><td class="r mono">${esc(r.present)}</td><td class="r mono">${esc(r.previous)}</td><td class="r mono">${esc(r.diff)}</td><td class="r">${esc(u.mf)}</td><td class="r mono"><b>${esc(r.consumption)}</b></td></tr>`
      )
      .join("")}
  </table>
  <h3>Charges</h3>
  <table class="grid">
    <tr><th style="width:30px">#</th><th>Particulars</th><th style="width:96px">Units</th><th style="width:70px">Rate (₹)</th><th style="width:110px">Amount (₹)</th></tr>
    ${doc.lines
      .map(
        (l, i) => `<tr data-src="line.${i}"><td class="c">${i + 1}</td><td>${src(`line.${i}.desc`, esc(l.desc))}${l.hsn ? ` <span style="color:#555">(HSN ${src(`line.${i}.hsn`, esc(l.hsn))})</span>` : ""}</td>
      <td class="r mono">${l.qty != null ? src(`line.${i}.qty`, `${qty(l.qty)} ${esc(l.unit || "")}`) : ""}</td>
      <td class="r mono">${l.rate != null ? src(`line.${i}.rate`, inr(l.rate)) : ""}</td>
      <td class="r mono">${src(`line.${i}.amount`, inr(l.amount))}</td></tr>`
      )
      .join("")}
    <tr><td></td><td class="b">Total charges</td><td></td><td></td><td class="r mono b">${src("totals.taxable", inr(doc.taxable))}</td></tr>
  </table>
  <div class="net"><span>NET AMOUNT PAYABLE on or before <b>${slashDate(doc.dueDate)}</b></span><b class="mono" style="font-size:15px">₹ ${src("totals.grand", inr(doc.grand))}</b></div>
  <div style="margin-top:6px;font-size:9.5px">${words(doc.grand)}</div>
  <div class="note">Supply of electrical energy (HSN 2716) is exempt from GST under Notification 2/2017 — Central Tax (Rate); tax on electricity is levied under the Karnataka Electricity (Taxation on Consumption) Act, 1959. A delayed payment interest at 1.5% per month applies after the due date. Pay by NEFT/RTGS to the virtual account printed on the counterfoil, quoting the RR number.</div>
  <div class="tear"><span>COUNTERFOIL · RR No. <b class="mono">${esc(u.rrNo)}</b> · Bill No. <span class="mono">${esc(doc.number)}</span></span><span>Virtual A/c <span class="mono">${esc(u.virtualAc)}</span> · IFSC ${esc(s.bank.ifsc)}</span></div>
</div>`;
  return shell(UTIL_CSS, body);
};

/* ------------------------------------------------------------------- fuel */

const FUEL_CSS = `
.f { padding: 44px 60px 0; font: 11px/1.45 "Courier New", Courier, monospace; color: #1a1a1a; }
.f .hd { text-align: center; }
.f .hd h1 { margin: 0; font: 700 17px/1.2 Georgia, "Times New Roman", serif; letter-spacing: .02em; }
.f .hd div { font-size: 10.5px; }
.f .hd h2 { display: inline-block; margin: 10px 0 0; border: 1.5px solid #1a1a1a; padding: 3px 14px; font: 700 12px/1.3 Arial, sans-serif; letter-spacing: .12em; }
.f .row { display: flex; justify-content: space-between; margin-top: 14px; }
.f table { width: 100%; margin-top: 14px; }
.f th { border-top: 1.5px solid #1a1a1a; border-bottom: 1.5px solid #1a1a1a; padding: 5px 4px; text-align: left; font-weight: 700; }
.f th.r { text-align: right; }
.f td { padding: 4px; }
.f tr.sum td { border-top: 1px dashed #1a1a1a; font-weight: 700; padding-top: 7px; }
.f .tot { margin-top: 10px; border-top: 1.5px solid #1a1a1a; border-bottom: 1.5px solid #1a1a1a; padding: 8px 4px; display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; }
.f .sig { margin-top: 40px; display: flex; justify-content: space-between; }
`;

const fuel = (doc) => {
  const s = doc.seller;
  const l = doc.lines[0];
  const body = `
<div class="f">
  <div class="hd">
    <h1>${src("seller.name", esc(s.name.toUpperCase()))}</h1>
    <div>${src("seller.address", esc(s.address))}</div>
    <div>GSTIN ${src("seller.gstin", esc(s.gstin))} · Ph. ${esc(s.phone || "")}</div>
    <h2>BILL OF SUPPLY · CREDIT</h2>
  </div>
  <div class="row">
    <div>Bill No : <b>${src("doc.number", esc(doc.number))}</b><br>Date&nbsp;&nbsp;&nbsp;&nbsp;: ${src("doc.date", slashDate(doc.date))}<br>Due&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${src("doc.dueDate", slashDate(doc.dueDate))}</div>
    <div style="text-align:right">To : ${src("buyer.name", esc(doc.buyer.name), "b")}<br>${src("buyer.address", esc(doc.buyer.address))}<br>GSTIN ${src("buyer.gstin", esc(doc.buyer.gstin))}</div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Indent</th><th>Vehicle / Equipment</th><th class="r">Litres</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>
      ${doc.fills
        .map(
          (f) =>
            `<tr><td>${esc(f.date)}</td><td>${esc(f.indent)}</td><td>${esc(f.vehicle)}</td><td class="r">${qty(f.litres)}</td><td class="r">${inr(l.rate)}</td><td class="r">${inr(f.litres * l.rate)}</td></tr>`
        )
        .join("")}
      <tr class="sum" data-src="line.0"><td colspan="3">${src("line.0.desc", esc(l.desc))} · HSN ${src("line.0.hsn", esc(l.hsn))}</td><td class="r">${src("line.0.qty", `${qty(l.qty)} ${esc(l.unit)}`)}</td><td class="r">${src("line.0.rate", inr(l.rate))}</td><td class="r">${src("line.0.amount", inr(l.amount))}</td></tr>
    </tbody>
  </table>
  <div class="tot"><span>TOTAL PAYABLE</span><span>₹ ${src("totals.grand", inr(doc.grand))}</span></div>
  <div style="margin-top:8px">${words(doc.grand)}</div>
  <div style="margin-top:14px;font-size:10px">High-speed diesel is outside the scope of GST; prices include central excise and Karnataka sales tax as notified. Taxable value ${src("totals.taxable", inr(doc.taxable))}.</div>
  <div class="sig"><span>Received the above in good condition</span><span>For ${esc(s.name)}<br><br><br>Manager</span></div>
</div>`;
  return shell(FUEL_CSS, body);
};

/* ------------------------------------------------------------------- memo */

const MEMO_CSS = `
.m { padding: 48px 56px 0; font: 11px/1.5 Georgia, "Times New Roman", serif; color: #1a1a1a; }
.m .lh { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #1a1a1a; padding-bottom: 10px; }
.m .lh h1 { margin: 0; font-size: 18px; }
.m .lh div { font: 9.5px/1.45 Arial, sans-serif; color: #444; }
.m h2 { margin: 22px 0 4px; font: 700 13px/1.3 Arial, sans-serif; letter-spacing: .06em; text-transform: uppercase; }
.m .meta { display: grid; grid-template-columns: 120px 1fr; row-gap: 3px; font: 10.5px/1.5 Arial, sans-serif; margin-top: 12px; }
.m .meta span { color: #555; }
.m table { width: 100%; margin-top: 12px; font: 10.5px/1.4 Arial, sans-serif; }
.m th { text-align: left; border-bottom: 1.5px solid #1a1a1a; padding: 5px 6px; font-weight: 700; }
.m th.r { text-align: right; }
.m td { padding: 5px 6px; border-bottom: 1px solid #ccc; }
.m tr.t td { border-bottom: none; border-top: 1.5px solid #1a1a1a; font-weight: 700; }
.m p { margin: 12px 0 0; }
.m .sig { margin-top: 44px; display: flex; justify-content: space-between; font: 10.5px/1.5 Arial, sans-serif; }
.m .sig div { width: 180px; border-top: 1px solid #1a1a1a; padding-top: 4px; }
`;

const memo = (doc) => {
  const s = doc.seller;
  const dr = doc.jvLines.reduce((t, l) => t + (l.dr || 0), 0);
  const cr = doc.jvLines.reduce((t, l) => t + (l.cr || 0), 0);
  const body = `
<div class="m">
  <div class="lh"><h1>${esc(s.name)}</h1><div style="text-align:right">${esc(s.address)}<br>GSTIN ${esc(s.gstin)} · CIN ${esc(s.cin || "")}</div></div>
  <h2>${esc(doc.title)}</h2>
  <div class="meta">
    <span>Reference</span><b>${src("doc.number", esc(doc.number))}</b>
    <span>Date</span><b>${src("doc.date", longDate(doc.date))}</b>
    <span>Prepared by</span><span style="color:#1a1a1a">${esc(doc.preparedBy)}</span>
    <span>Department</span><span style="color:#1a1a1a">Finance &amp; Accounts</span>
  </div>
  ${doc.schedule || ""}
  <h2 style="font-size:11.5px">Entry to be passed</h2>
  <table>
    <thead><tr><th>Ledger</th><th class="r" style="width:120px">Debit (₹)</th><th class="r" style="width:120px">Credit (₹)</th></tr></thead>
    <tbody>
      ${doc.jvLines
        .map(
          (l, i) => `<tr data-src="line.${i}"><td>${src(`line.${i}.ledger`, `${esc(l.ledger)}${l.dr ? " Dr" : ""}`)}</td><td class="r">${l.dr ? src(`line.${i}.dr`, inr(l.dr)) : ""}</td><td class="r">${l.cr ? src(`line.${i}.cr`, inr(l.cr)) : ""}</td></tr>`
        )
        .join("")}
      <tr class="t"><td>Total</td><td class="r">${src("totals.grand", inr(dr))}</td><td class="r">${inr(cr)}</td></tr>
    </tbody>
  </table>
  <p><b style="font-family:Arial,sans-serif;font-size:10.5px">Narration:</b> ${src("doc.narration", esc(doc.narration))}</p>
  ${doc.remarks ? `<p>${doc.remarks}</p>` : ""}
  <div class="sig"><div>Prepared by<br>${esc(doc.preparedBy)}</div><div>Checked by<br>Accounts Manager</div><div>Approved by<br>Chief Financial Officer</div></div>
</div>`;
  return shell(MEMO_CSS, body);
};

module.exports = { tally, corporate, utility, fuel, memo };
