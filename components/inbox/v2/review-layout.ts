import { refineDialogMarkup } from "./dialog-refinement";

/** Reshape the bundled sheet without replacing its controls or event bindings.
 * The original IDs remain available to the accounting and validation engines. */
export function prepareReviewMarkup(markup: string, kind: "ap" | "ar") {
  const doc = new DOMParser().parseFromString(markup, "text/html");
  refineDialogMarkup(doc);
  const card = doc.querySelector<HTMLElement>(".form > .card");
  if (!card) return markup;
  composeBillForm(doc, card, kind);
  relabel(doc, doc.body);
  return doc.body.innerHTML;
}

/** Shorter visible labels that keep the familiar accounting vocabulary. */
function relabel(doc: Document, card: HTMLElement) {
  const labels: Record<string, string> = {
    voucherType: "Voucher type",
    voucherDate: "Voucher date",
    voucherNo: "Voucher no.",
    supplierInvoiceNo: "Supplier invoice no.",
    customerPoNo: "Customer PO no.",
    vendor: "Vendor",
    customer: "Customer",
    branch: "GST registration",
    billDate: "Bill date",
    invoiceDate: "Invoice date",
    dueDate: "Due date",
    gstTreatment: "GST treatment",
    sourceState: "Source of supply",
    destState: "Destination of supply",
    billingAddress: "Billing address",
    gstin: "GSTIN",
    vendorCostCentre: "Vendor cost centre",
  };
  card.querySelectorAll<HTMLElement>(".field").forEach((field) => {
    const bind = field.querySelector<HTMLElement>("[data-bind]")?.dataset.bind;
    const label = field.querySelector(".t-label");
    if (bind && labels[bind] && label) {
      const required = label.querySelector(".req");
      label.replaceChildren(doc.createTextNode(labels[bind]));
      if (required) label.append(" ", required);
    }
  });
  // The vendor cost centre select is drawn by the engine later, so its field
  // is found by its container rather than a binding.
  const vendorCc = card
    .querySelector("#vendor-cc")
    ?.closest(".field")
    ?.querySelector(".t-label");
  if (vendorCc) vendorCc.textContent = "Vendor cost centre";
  const ccClass = card.querySelector("#cc-label-class");
  if (ccClass) ccClass.textContent = "By class";
  const ccCentre = card.querySelector("#cc-label-centre");
  if (ccCentre) ccCentre.textContent = "By cost centre";
}

/**
 * The bill form, after the Finops review form (Oct 2026).
 *
 * The user asked for the review UI of the Finops prototype
 * (~/Documents/folio-workspace, components/coding-review.tsx) on this sheet.
 * Its shape, rebuilt from the engine's own nodes — ids, bindings and
 * listeners untouched:
 *
 *   header      total, draft label, "N of M resolved" (ReviewAssistant fills
 *               .cr-head)
 *   Voucher     a card of label rows: voucher type, voucher date, voucher no.,
 *   details     supplier invoice no., party, purchase ledger. Each row has a
 *               status mark and, where it has more behind it, a › that opens
 *               a sheet with a pending count
 *   sheets      Voucher details (dates, branch, cost centres, narration,
 *               optional fields) · Party details (address, GST treatment,
 *               GSTIN, supply states, vendor cost centre) · Tax & deductions
 *               (the engine's breakdown) · Needs you (ReviewAssistant)
 *   Items       one table (engine LINES block); a description opens the
 *               line's sheet, #cr-line, which the engine renders
 *   totals      taxable value · tax · bill total, opening Tax & deductions
 */
const ICON = {
  chevron:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  expand:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
};

function composeBillForm(doc: Document, card: HTMLElement, kind: "ap" | "ar") {
  // a bill (AP) and a sales invoice (AR) differ by these names only
  const ar = kind === "ar";
  const K = ar
    ? {
        heading: "#sec-invoice",
        party: "#sec-customer",
        partyBind: "customer",
        ref: "customerPoNo",
        refLabel: "Customer PO no.",
        docDate: "invoiceDate",
        ledger: "salesLedger",
        ledgerLabel: "Sales ledger",
        partyCc: "#customer-cc",
        partyBlurb: "Customer registration and address",
      }
    : {
        heading: "#sec-bill",
        party: "#sec-vendor",
        partyBind: "vendor",
        ref: "supplierInvoiceNo",
        refLabel: "Supplier invoice no.",
        docDate: "billDate",
        ledger: "purchaseLedger",
        ledgerLabel: "Purchase ledger",
        partyCc: "#vendor-cc",
        partyBlurb: "Supplier registration and address",
      };
  card.classList.add("review-record", "bill-form", "cr-form");
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string,
    text?: string
  ) => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const html = (markup: string) => {
    const t = doc.createElement("template");
    t.innerHTML = markup;
    return t.content;
  };
  const field = (binding: string) =>
    card
      .querySelector(`[data-bind="${binding}"]`)
      ?.closest<HTMLElement>(".field") ?? null;

  // a row: label | value | status dot. The sheets open from the card's
  // footer, not from per-row chevrons.
  const row = (
    key: string,
    label: string,
    value: Element | null,
    opts: { required?: boolean } = {}
  ) => {
    const r = el("div", "cr-row");
    r.dataset.check = key;
    const l = el("span", "cr-row-label", label);
    if (opts.required) l.append(html('<i aria-hidden="true"> *</i>'));
    const v = el("div", "cr-row-value");
    if (value) v.append(value);
    r.append(l, v, html('<span class="cr-status" aria-hidden="true"></span>'));
    return r;
  };
  const sheet = (
    id: string,
    title: string,
    blurb: string,
    nodes: (Element | null)[]
  ) => {
    const d = el("dialog", "cr-sheet");
    d.id = `cr-sheet-${id}`;
    d.setAttribute("aria-labelledby", `cr-sheet-${id}-title`);
    d.append(
      html(
        `<header class="cr-sheet-head"><div class="cr-sheet-title"><h2 id="cr-sheet-${id}-title">${title}</h2><span class="cr-pill" data-pill></span></div><p>${blurb}</p><button type="button" class="cr-x" data-close aria-label="Close">${ICON.close}</button></header>`
      )
    );
    const body = el("div", "cr-sheet-body");
    nodes.forEach((n) => n && body.append(n));
    d.append(
      body,
      html(
        '<footer class="cr-sheet-foot"><button type="button" class="cr-done" data-close>Done</button></footer>'
      )
    );
    return d;
  };
  const sub = (text: string) => el("p", "cr-sub", text);

  const billHeading = card.querySelector<HTMLElement>(K.heading);
  const vendorHeading = card.querySelector<HTMLElement>(K.party);
  const ccGroup = card.querySelector<HTMLElement>(".card__group");
  const vendorCc = card.querySelector(K.partyCc)?.closest(".field") ?? null;
  const picker = doc.querySelector<HTMLElement>("#block-items .picker");

  // header slot (ReviewAssistant)
  const head = el("div", "cr-head");
  // section label
  const label = el("div", "cr-section-label");
  if (billHeading) {
    billHeading.className = "cr-section-title";
    billHeading.textContent = "Voucher details";
    label.append(billHeading);
  }
  label.append(html("<small>Required fields marked <i>*</i></small>"));

  const voucherCard = el("div", "cr-card");
  voucherCard.append(
    row("voucherType", "Voucher type", field("voucherType"), {
      required: true,
    }),
    row("voucherDate", "Voucher date", field("voucherDate"), {
      required: true,
    }),
    row("voucherNo", "Voucher no.", field("voucherNo"), {
      required: true,
    }),
    row(K.ref, K.refLabel, field(K.ref), { required: true }),
    row(K.partyBind, "Party A/c name", field(K.partyBind), {
      required: true,
    }),
    row(K.ledger, K.ledgerLabel, picker, {
      required: true,
    })
  );

  // sheets
  const narration = doc.querySelector<HTMLElement>(".closing .narration");
  narration?.classList.add("field");
  const narrationLabel = narration?.querySelector(".t-label");
  if (narrationLabel) narrationLabel.textContent = "Narration";
  const addl = doc.querySelector<HTMLElement>("#addl");
  addl?.classList.remove("form__narrow");
  const config = doc.querySelector<HTMLElement>("#btn-field-config");
  if (config) {
    config.className = "cr-text";
    config.lastChild!.textContent = "Configure fields";
  }
  if (ccGroup) ccGroup.prepend(el("p", "t-label", "Cost centre"));
  const voucherSheet = sheet(
    "voucher",
    "Voucher details",
    "Dates, branch and cost centres",
    [
      field(K.docDate),
      field("dueDate"),
      field("branch"),
      ccGroup,
      narration,
      sub("Optional fields"),
      addl,
      config,
    ]
  );
  if (vendorHeading) vendorHeading.className = "sr-only";
  const partySheet = sheet("party", "Party details", K.partyBlurb, [
    vendorHeading,
    field("gstTreatment"),
    field("gstin"),
    field("sourceState"),
    field("destState"),
    field("billingAddress"),
    vendorCc,
  ]);
  const breakdown = doc.querySelector<HTMLElement>("#breakdown");
  const gstSheet = sheet(
    "gst",
    "Tax & deductions",
    "GST, withholding and adjustments",
    [breakdown]
  );
  const needsSheet = sheet("needs", "Needs you", "What is left to resolve", [
    el("div", "cr-needs"),
  ]);
  const lineSheet = sheet("line", "Line", "", [el("div", "cr-line-body")]);
  lineSheet.id = "cr-line";
  lineSheet.setAttribute("aria-labelledby", "cr-line-title");
  lineSheet.querySelector("h2")!.id = "cr-line-title";
  lineSheet.querySelector(".cr-sheet-head p")!.id = "cr-line-blurb";
  lineSheet.querySelector(".cr-line-body")!.id = "cr-line-body";
  lineSheet.querySelector("[data-pill]")?.remove();

  voucherCard.append(
    html(`<div class="cr-card-foot">
      <button type="button" class="cr-foot-link" data-open="voucher"><span>Dates, branch &amp; cost centres</span><span class="cr-pending"></span>${ICON.chevron}</button>
      <button type="button" class="cr-foot-link" data-open="party"><span>${ar ? "Customer" : "Supplier"} GST &amp; address</span><span class="cr-pending"></span>${ICON.chevron}</button>
    </div>`)
  );
  card.replaceChildren(head, label, voucherCard);

  // the summaries this form does not show
  doc.querySelector("#sug-bar")?.classList.add("bill-hidden");
  doc.querySelector("#err-banner")?.classList.add("bill-hidden");
  doc.querySelector(".modebar")?.remove();
  doc.querySelector(".closing")?.remove();

  // items
  const items = doc.querySelector<HTMLElement>("#block-items");
  const ledgers = doc.querySelector<HTMLElement>("#block-ledgers");
  if (items && ledgers) {
    const section = el("section", "cr-items form__narrow");
    section.id = "block-lines";
    section.setAttribute("aria-labelledby", "cr-items-title");
    section.append(
      html(
        `<div class="cr-items-head"><h3 id="cr-items-title">Items <span id="cr-items-count">0</span></h3><div><span id="cr-items-coded" class="cr-items-coded"></span><span class="cr-items-cur">INR</span><button type="button" class="cr-expand" data-expand aria-label="Expand items table">${ICON.expand}<span>Expand</span></button></div></div>`
      )
    );
    const grid = el("div", "cr-grid-wrap");
    const tableItems = doc.getElementById("items-table");
    const tableLedgers = doc.getElementById("ledgers-table");
    if (tableItems) {
      tableItems.className = "table cr-grid";
      grid.append(tableItems);
    }
    if (tableLedgers) {
      tableLedgers.className = "table";
      tableLedgers.hidden = true;
      grid.append(tableLedgers);
    }
    const bar = el("div", "cr-grid-bar");
    // One way to add a line. A line becomes a stock item line by picking an
    // item in its Item column, so "Add item" lives in that dropdown.
    // The engine binds #btn-add-item by id, so it stays in the DOM, hidden.
    const addItem = items.querySelector<HTMLElement>("#btn-add-item");
    if (addItem) {
      addItem.hidden = true;
      bar.append(addItem);
    }
    const addLedger = ledgers.querySelector<HTMLElement>("#btn-add-ledger");
    for (const [btn, text] of [[addLedger, " Add line"]] as const) {
      if (!btn) continue;
      btn.className = "cr-add";
      btn.lastChild!.textContent = text;
      bar.append(btn);
    }
    bar.append(
      html(
        '<span class="cr-items-total">Items total <strong id="cr-items-total"></strong></span>'
      )
    );
    grid.append(bar);
    items.className = "lines__anchor";
    ledgers.className = "lines__anchor";
    items.replaceChildren();
    ledgers.replaceChildren();
    items.before(section);
    section.append(items, ledgers, grid);
    section.after(
      html(
        `<button type="button" class="cr-totals form__narrow" data-open="gst" aria-label="Tax and deductions"><span><small>Taxable value</small><b data-total="sub">—</b></span><span><small data-total="tax-label">Tax</small><b data-total="tax">—</b></span><span><small>${ar ? "Invoice total" : "Bill total"}</small><b data-total="grand">—</b></span></button>`
      )
    );
  }
  // Expand: the table in a dialog of its own (BillReview moves it in and back)
  const itemsSheet = sheet(
    "items",
    "Invoice items",
    "Changes stay in your draft",
    []
  );
  itemsSheet.classList.add("cr-sheet--wide");
  itemsSheet.querySelector("[data-pill]")?.remove();
  const done = itemsSheet.querySelector(".cr-done");
  if (done) done.textContent = "Back to review";
  doc.body.append(
    voucherSheet,
    partySheet,
    gstSheet,
    needsSheet,
    lineSheet,
    itemsSheet
  );
}
