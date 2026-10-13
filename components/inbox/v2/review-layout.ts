import { refineDialogMarkup } from "./dialog-refinement";
import {
  COST_CATEGORIES,
  COST_CENTRE_CLASSES,
  allocationDetail,
  centresInCategory,
  costCentreTree,
} from "@/config/pages/inbox/mock-cost-centres";

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
const LABELS: Record<string, string> = {
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
function relabel(doc: Document, card: HTMLElement) {
  const labels = LABELS;
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
  if (ccClass) ccClass.textContent = "Class";
  const ccCentre = card.querySelector("#cc-label-centre");
  if (ccCentre) ccCentre.textContent = "Centre";
}

/**
 * The bill form, after the Finops review form (Oct 2026).
 *
 * The user asked for the review UI of the Finops prototype
 * (~/Documents/folio-workspace, components/coding-review.tsx) on this sheet.
 * Its shape, rebuilt from the engine's own nodes — ids, bindings and
 * listeners untouched:
 *
 *   header      title and the required-field key
 *   cards       Voucher · Vendor/Customer · Accounting, every field in full;
 *               then Additional details — the optional groups as one row each
 *               (engine-drawn into [data-xf-slot]), with Customise fields
 *   sheets      Tax & deductions (the engine's breakdown) · Needs you
 *               (BillReview) · the line sheet · Expand
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
  // section label: the title and the required-field key
  const label = el("div", "cr-section-label");
  /*
    The voucher type heads the form (6 Oct 2026): it is a choice about the
    whole voucher, not one field among the rest, so it replaces the "Bill
    details" title and is set as one — a title-sized picker under a small
    "Voucher type" label. The engine's own select moves here, bindings intact.
  */
  const typeField = field("voucherType");
  if (typeField) {
    const type = el("div", "cr-type");
    // the engine scrolls to its section by this id
    if (billHeading?.id) type.id = billHeading.id;
    type.append(el("span", "cr-type-label", "Voucher type"), typeField);
    // the title the select shows: a select sizes itself to its options' text,
    // not to a title, so the chosen type is drawn here and the select lies
    // over it, invisible but still the thing clicked and focused
    typeField
      .querySelector(".control")
      ?.prepend(el("span", "cr-type-value"));
    label.append(type);
  }
  billHeading?.remove();
  const tools = el("div", "cr-section-tools");
  tools.append(html("<small>All fields required unless marked optional</small>"));
  label.append(tools);

  /*
    Section cards (Oct 2026). Every required or tax-deciding field sits, in
    full, in the card it belongs to: Voucher, Vendor/Customer, Accounting. The
    optional groups Customise fields switches on (order references, ship to,
    receipt & dispatch, import & customs) are one block, Additional details,
    one row each — what the group holds and Edit, which opens it in a dialog.
    The user found both extremes wrong: footer links that hid half the voucher,
    then every field laid out, then everything behind a dialog. The line is
    drawn at whether the field decides the posting.

    Laid out as a compact grid (Oct 2026, "the form feels lengthy"): one
    bordered block of sections, labels above values, three to a row, so the
    width does the work a column of 48px rows did. Additional details are
    chips. Nothing folds.
  */
  const rowOf = (binding: string, text?: string) => {
    const f = field(binding);
    if (!f) return null;
    return row(binding, text ?? LABELS[binding] ?? binding, f, {
      required: !!f.querySelector(".t-label .req"),
    });
  };
  const slot = (where: string) =>
    doc.querySelector<HTMLElement>(`[data-xf-slot="${where}"]`);
  const sectionCard = (
    key: string,
    title: string,
    nodes: (Node | null)[],
    summary: string[]
  ) => {
    const c = el("section", "cr-card");
    c.dataset.card = key;
    c.dataset.summary = summary.join(",");
    c.setAttribute("aria-label", title);
    c.append(
      html(
        `<div class="cr-card-headrow"><div class="cr-card-head"><span class="cr-card-title">${title}</span><span class="cr-pending"></span></div></div>`
      )
    );
    const body = el("div", "cr-card-body");
    nodes.forEach((n) => n && body.append(n));
    c.append(body);
    return c;
  };

  /*
    Priority form (6 Oct 2026). The user found the form carried too many
    fields, then placed the line: the voucher's own fields and the party with
    all of its details stay on the form, each in its own section (Voucher,
    then Vendor/Customer). Accounting and the optional groups sit under "More
    details", which expands in place: not a footer sheet nor a dialog, the two
    hiding places rejected before.

    A hidden field never hides a problem. BillReview marks one that turns open
    or wrong as surfaced, and CSS orders it up above the toggle, where it
    stays for the rest of the bill. It is one grid with `order`, so no engine
    node moves.
  */
  // a section the form always shows: its heading, then its rows as they are
  const section = (title: string, nodes: (HTMLElement | null)[]) => {
    const head = el("div", "cr-subhead cr-subhead--main");
    head.append(el("span", "cr-card-title", title));
    nodes.forEach((n) => n && (n.dataset.where = title));
    return [head, ...nodes];
  };
  const group = (
    key: string,
    title: string,
    nodes: (HTMLElement | null)[],
    tool?: HTMLElement | null
  ) => {
    const head = el("div", "cr-subhead");
    head.dataset.group = key;
    head.append(el("span", "cr-card-title", title));
    if (tool) head.append(tool);
    const out: HTMLElement[] = [head];
    nodes.forEach((n) => {
      if (!n) return;
      n.classList.add("cr-more-row");
      n.dataset.group = key;
      n.dataset.where = title;
      out.push(n);
    });
    return out;
  };

  const partyCcRow = vendorCc
    ? row(
        "partyCostCentre",
        ar ? "Customer cost centre" : "Vendor cost centre",
        vendorCc
      )
    : null;
  if (partyCcRow && (vendorCc as HTMLElement).hidden) partyCcRow.hidden = true;

  const narration = doc.querySelector<HTMLElement>(".closing .narration");
  narration?.classList.add("field");
  /*
    Cost centre: one picker, not a switch and a picker (6 Oct 2026). The
    header holds a class (a saved split) OR one centre; the engine models that
    as a Class/Centre switch over one select whose meaning flips. Here the
    two answers are groups of one list — Classes, then the centres by
    category — so choosing is the whole decision. BillReview drives the
    engine's switch and #cc-pick behind it; both stay in the DOM, hidden.
    Option values are "class:<id>" / "centre:<id>", the engine's own ids.
  */
  let ccWrap: HTMLElement | null = null;
  if (ccGroup) {
    const esc = (t: string) =>
      t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const classes = COST_CENTRE_CLASSES.map(
      (c) =>
        `<option value="class:${c.id}">${esc(c.name)} — ${esc(allocationDetail(c.allocation))}</option>`
    ).join("");
    const centres = COST_CATEGORIES.map((cat) => {
      const opts = costCentreTree(centresInCategory(cat.name))
        .map(
          ({ centre, depth }) =>
            `<option value="centre:${centre.id}">${"\u00a0\u00a0\u00a0".repeat(depth)}${esc(centre.name)}</option>`
        )
        .join("");
      return opts ? `<optgroup label="${esc(cat.name)}">${opts}</optgroup>` : "";
    }).join("");
    /*
      7 Oct 2026: the native list could not tell its two kinds of answer
      apart and drew as wide as its longest class, over Narration. The
      picker is now a button and a panel with two tabs — Cost centres, Cost
      centre classes. Empty, each line takes its own in the table's Cost
      centre column; a choice here applies to every line and locks those
      cells (the engine's rule), and the × clears it back to line by line.
      The select stays, hidden, as the value BillReview hands the engine.
    */
    const opt = (value: string, label: string, extra = "", cls = "") =>
      `<button type="button" role="option" class="cr-ccx-opt${cls}" data-value="${value}" data-label="${esc(label)}" aria-selected="false" tabindex="-1"><span class="cr-ccx-name">${esc(label)}</span>${extra}</button>`;
    const centreList = COST_CATEGORIES.map((cat) => {
      const opts = costCentreTree(centresInCategory(cat.name))
        .map(({ centre, depth }) =>
          opt(
            `centre:${centre.id}`,
            centre.name,
            "",
            depth ? ` cr-ccx-opt--d${Math.min(depth, 3)}` : ""
          )
        )
        .join("");
      return opts
        ? `<div role="group" aria-label="${esc(cat.name)}" class="cr-ccx-group"><p class="cr-ccx-head" aria-hidden="true">${esc(cat.name)}</p>${opts}</div>`
        : "";
    }).join("");
    const classList = COST_CENTRE_CLASSES.map((c) =>
      opt(
        `class:${c.id}`,
        c.name,
        `<span class="cr-ccx-detail">${esc(allocationDetail(c.allocation))}</span>`
      )
    ).join("");
    const what = ar ? "invoice" : "bill";
    ccGroup.classList.add("cr-cc-engine");
    ccWrap = el("div", "cr-cc-wrap");
    ccWrap.append(
      html(
        `<select class="cr-cc-pick" hidden aria-hidden="true" tabindex="-1"><option value="">Set per line</option><optgroup label="Classes · split across centres">${classes}</optgroup>${centres}</select>` +
          `<div class="cr-ccx"><button type="button" class="control cr-ccx-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="cr-ccx-pop" aria-label="Cost centre for every line of the ${what}"><span class="t-value cr-ccx-value is-empty">Select to apply to all lines</span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>` +
          `<button type="button" class="cr-ccx-clear" hidden aria-label="Clear, and set cost centres line by line" title="Clear, and set cost centres line by line"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>` +
          `<div class="cr-ccx-pop" id="cr-ccx-pop" hidden>` +
          `<div class="cr-ccx-tabs" role="tablist" aria-label="Cost centre kind"><button type="button" role="tab" class="cr-ccx-tab" data-cc-tab="centre" aria-selected="true">Cost centres</button><button type="button" role="tab" class="cr-ccx-tab" data-cc-tab="class" aria-selected="false">Cost centre classes</button></div>` +
          `<div class="cr-ccx-list" role="listbox" aria-label="Cost centre for the whole ${what}">` +
          `<div class="cr-ccx-panel" data-cc-panel="centre">${centreList}</div>` +
          `<div class="cr-ccx-panel" data-cc-panel="class" hidden><p class="cr-ccx-head" aria-hidden="true">Split across centres</p>${classList}</div>` +
          `</div></div></div>`
      ),
      ccGroup
    );
  }
  const ccRow = ccWrap ? row("costCentre", "Cost centre", ccWrap) : null;
  ccRow?.classList.add("cr-row--cc");

  const config = doc.querySelector<HTMLElement>("#btn-field-config");
  if (config) config.className = "cr-customise";
  const additional = slot("additional");
  if (additional) {
    additional.dataset.group = "additional";
    additional.dataset.where = "Additional details";
  }
  doc.querySelector("#sec-additional")?.remove();

  /*
    The party's details nest under the party field (6 Oct 2026): the section
    shows only the party and its billing address; GST treatment, GSTIN and
    the supply states sit in a panel beneath the party box, opened from a
    one-line summary inside the party box. The panel opens on its own
    while any of its fields is open or wrong (CSS), and Needs you opens it.
  */
  const partyTitle = ar ? "Customer" : "Vendor";
  const partyRow = rowOf(K.partyBind, partyTitle);
  /* 7 Oct: the summary rides in the GSTIN box, after its pencil — GSTIN,
     treatment and the supply states read as one registration */
  const partyToggle = html(
    `<button type="button" class="cr-party-toggle" data-party-details aria-expanded="false" aria-controls="cr-party-details" aria-label="GST treatment and supply states"><span class="cr-party-summary">${partyTitle} details</span><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
  ).firstElementChild as HTMLElement;

  const partyDetails = el("div", "cr-party-details");
  partyDetails.id = "cr-party-details";
  partyDetails.setAttribute("role", "group");
  partyDetails.setAttribute("aria-label", `${partyTitle} details`);
  /* 7 Oct: GSTIN left the panel to sit beside the party as a field of its
     own — it is what identifies the party, not a detail of it */
  const gstinRow = rowOf("gstin");
  if (gstinRow) gstinRow.dataset.where = partyTitle;
  const gstinControl = gstinRow?.querySelector<HTMLElement>(".control");
  if (gstinControl) gstinControl.append(partyToggle);
  else partyRow?.append(partyToggle);
  [
    rowOf("gstTreatment"),
    rowOf("sourceState"),
    rowOf("destState"),
    partyCcRow,
  ].forEach((r) => {
    if (!r) return;
    r.dataset.where = partyTitle;
    partyDetails.append(r);
  });

  const toggle = html(
    `<button type="button" class="cr-more-toggle" data-more-toggle aria-expanded="false"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg><span class="cr-more-label">More details</span><span class="cr-more-summary"></span></button>`
  ).firstElementChild as HTMLElement;

  const mainCard = sectionCard(
    "main",
    ar ? "Invoice" : "Bill",
    [
      ...section("Voucher", [
        rowOf("voucherDate"),
        rowOf("voucherNo"),
        rowOf(K.ref, K.refLabel),
        rowOf(K.docDate),
        rowOf("dueDate"),
        rowOf("branch"),
      ]),
      ...section(partyTitle, [
        partyRow,
        gstinRow,
        partyDetails,
        rowOf("billingAddress"),
      ]),
      toggle,
      ...group("accounting", "Accounting", [
        row(K.ledger, K.ledgerLabel, picker, { required: true }),
        ccRow,
        narration ? row("narration", "Narration", narration) : null,
      ]),
      ...group("additional", "Additional details", [], config),
      additional,
    ],
    []
  );

  const cards = el("div", "cr-cards");
  cards.append(mainCard);

  if (vendorHeading) vendorHeading.remove();
  /*
    Tax & deductions opens in place (7 Oct 2026), not in a dialog, and by
    context: the strip's GST figure opens the GST lines and reverse charge,
    its Bill total opens what is withheld (TDS/TCS/Others) and the
    adjustments, ending on the total. Taxable value is the items' sum and
    opens nothing. The panel sits above the strip, notched down to the figure
    that opened it; [data-ctx] picks which parts of the engine's breakdown
    (tagged data-bd) it shows. It keeps the old dialog's id, #cr-sheet-gst,
    so Needs you still finds its fields, and opens itself while a tax line
    is wrong.
  */
  const breakdown = doc.querySelector<HTMLElement>("#breakdown");
  const taxPanel = el("div", "cr-tax-panel form__narrow");
  taxPanel.id = "cr-sheet-gst";
  taxPanel.setAttribute("role", "group");
  taxPanel.setAttribute("aria-label", "Tax & deductions");
  const taxBody = el("div", "cr-sheet-body");
  if (breakdown) taxBody.append(breakdown);
  taxPanel.append(taxBody);
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

  card.replaceChildren(head, label, cards);

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
        `<div class="cr-totals form__narrow" role="group" aria-label="Totals"><span class="cr-totals-cell"><small>Taxable value</small><b data-total="sub">—</b></span><button type="button" class="cr-totals-cell" data-tax-ctx="gst" aria-expanded="false" aria-controls="cr-sheet-gst" aria-label="GST lines and reverse charge"><small><span data-total="tax-label">Tax</span><svg class="cr-totals-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></small><b data-total="tax">—</b></button><button type="button" class="cr-totals-cell" data-tax-ctx="total" aria-expanded="false" aria-controls="cr-sheet-gst" aria-label="Withholding and adjustments"><small>${ar ? "Invoice total" : "Bill total"}<svg class="cr-totals-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></small><b data-total="grand">—</b></button></div>`
      )
    );
    section.after(taxPanel);
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
  if (!taxPanel.isConnected) doc.body.append(taxPanel);
  doc.body.append(needsSheet, lineSheet, itemsSheet);
}
