import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

/**
 * The bill form's review layer, after the Finops review form (Oct 2026).
 *
 * review-layout.ts (composeBillForm) builds the shape: section cards of
 * label rows (Voucher, Vendor/Customer, Accounting, Shipping & delivery), the
 * items table and the totals card. This reads the live form and states where
 * it stands:
 *
 *   - each row's status mark (data-tone), each card's pending count and the
 *     one-line summary it shows while folded
 *   - folding is the reviewer's; a folded card reopens when it has more to
 *     resolve or turns wrong
 *   - the Needs you sheet: every open check, with the way to it
 *   - Expand on the items table, the Tax & deductions sheet, and the totals
 *     card (from the engine's "totals" message)
 *
 * A check is a required field (its label carries a *) or the lines: a check is
 * open while it has no value, wears an error, or still holds an unanswered
 * suggestion.
 */
type Tone = "ok" | "warn" | "err" | "muted";
type Item = {
  key: string;
  label: string;
  where: string;
  sheet: string;
  /** The section card the check sits in, opened before jumping to it. */
  card?: HTMLElement | null;
  tone: Tone;
  target: HTMLElement;
};

const SHEETS: Record<string, string> = {
  gst: "Tax & deductions",
};
const inr = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (n: number) =>
  `₹ ${inr.format(Math.round((n || 0) * 100) / 100)}`;

function valueOf(field: HTMLElement): boolean {
  const control = field.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("select, input:not([type=checkbox]), textarea");
  if (!control) return true;
  if (control instanceof HTMLSelectElement)
    return !!control.value && !control.value.startsWith("__");
  if (control.value.trim()) return true;
  // the voucher number is generated: its placeholder is the number to come.
  // A prompt ("Enter GSTIN") is not a value, locked or not.
  return (
    control.readOnly &&
    !!control.placeholder &&
    !/^(enter|select|auto generated)/i.test(control.placeholder)
  );
}

function toneOf(field: HTMLElement, required: boolean): Tone {
  if (
    field.classList.contains("is-invalid") ||
    field.querySelector(".is-invalid")
  )
    return "err";
  if (field.querySelector(".control--offer, .cell--new, .is-suggested"))
    return "warn";
  if (valueOf(field)) return "ok";
  return required ? "warn" : "muted";
}

/** What a row shows, as text — for a folded card's summary line. */
function displayOf(row: HTMLElement): string {
  const summary = row.querySelector(".cr-summary-text:not(.is-empty)");
  if (summary) return summary.textContent?.trim() || "";
  if (row.querySelector(".cr-summary-text")) return "";
  const value = row.querySelector<HTMLElement>(".cr-row-value");
  return value ? valueText(value) : "";
}

/** What a field (or a row's value) holds, as text. */
function valueText(value: HTMLElement): string {
  const date = value.querySelector<HTMLInputElement>('input[type="date"]');
  if (date)
    return date.value
      ? value.querySelector("[data-display]")?.textContent?.trim() || ""
      : "";
  const select = value.querySelector<HTMLSelectElement>("select");
  if (select)
    return select.value && !select.value.startsWith("__")
      ? (select.selectedOptions[0]?.textContent || "").trim()
      : "";
  const input = value.querySelector<HTMLInputElement>("input, textarea");
  if (input)
    return (
      input.value.trim() ||
      // a generated voucher number shows as its placeholder; a prompt
      // ("Enter GSTIN") is not a value
      (input.readOnly &&
      input.placeholder &&
      !/^(enter|select|auto generated)/i.test(input.placeholder)
        ? input.placeholder
        : "")
    );
  return "";
}

function collect(root: HTMLElement): Item[] {
  const items: Item[] = [];
  // a field under More details names its group; the five up top, the card
  const cardTitle = (node: HTMLElement) =>
    node.closest<HTMLElement>("[data-where]")?.dataset.where ||
    node.closest(".cr-card")?.getAttribute("aria-label") ||
    "Voucher";
  root.querySelectorAll<HTMLElement>(".cr-card .cr-row").forEach((row) => {
    if (row.hidden) return;
    const required = !!row.querySelector(".cr-row-label i");
    const target =
      row.querySelector<HTMLElement>(
        ".cr-row-value .field, .cr-row-value .picker"
      ) ?? row;
    const tone = toneOf(target, required);
    row.dataset.tone = tone;
    if (!required) return;
    items.push({
      key: row.dataset.check || "",
      label:
        row
          .querySelector(".cr-row-label")
          ?.childNodes[0]?.textContent?.trim() || "",
      where: cardTitle(row),
      sheet: "",
      card: row.closest<HTMLElement>(".cr-card"),
      tone,
      target,
    });
  });
  // optional fields drawn into the cards: never required on their own, but a
  // date owed by a filled document number is an error worth listing
  root
    .querySelectorAll<HTMLElement>(".cr-card .xf-slot .field.is-invalid")
    .forEach((field) =>
      items.push({
        key: `xf-${field.dataset.xgroupRow}`,
        label: field.querySelector(".t-label")?.textContent?.trim() || "Field",
        where: cardTitle(field),
        sheet: "",
        card: field.closest<HTMLElement>(".cr-card"),
        tone: "err",
        target: field,
      })
    );
  Object.keys(SHEETS).forEach((sheet) => {
    const dialog = root.querySelector<HTMLElement>(`#cr-sheet-${sheet}`);
    dialog?.querySelectorAll<HTMLElement>(".field").forEach((field, i) => {
      const required = !!field.querySelector(".t-label .req");
      const tone = toneOf(field, required);
      if (!required && tone !== "err") return;
      items.push({
        key: `${sheet}-${i}`,
        label:
          field
            .querySelector(".t-label")
            ?.textContent?.replace(/\*/g, "")
            .trim() || "Field",
        where: SHEETS[sheet],
        sheet,
        // a sheet opened from a summary row belongs to that row's card
        card: root
          .querySelector(`.cr-card [data-open="${sheet}"]`)
          ?.closest<HTMLElement>(".cr-card"),
        tone,
        target: field,
      });
    });
    if (sheet === "gst" && dialog?.querySelector(".is-invalid"))
      items.push({
        key: "gst",
        label: "Tax lines",
        where: SHEETS.gst,
        sheet: "gst",
        tone: "err",
        target: dialog.querySelector<HTMLElement>(".is-invalid")!,
      });
  });
  const rows = root.querySelectorAll<HTMLElement>(
    ".cr-table tbody tr[data-id]"
  );
  const uncoded = root.querySelectorAll<HTMLElement>(
    '.cr-table [data-unresolved="true"]'
  );
  const badAmount = root.querySelector<HTMLElement>(
    ".cr-table .cr-amt.is-invalid"
  );
  // A godown split that no longer comes to its line's quantity.
  root
    .querySelectorAll<HTMLElement>(".cr-table .cr-godown.is-mismatch")
    .forEach((cell, i) => {
      const line = cell.closest("tr")?.querySelector(".cr-idx span");
      items.push({
        key: `godown-${i}`,
        label: `Line ${line?.textContent || i + 1}: godown split doesn't match the quantity`,
        where: "Items",
        sheet: "",
        tone: "err",
        target: cell,
      });
    });
  const table = root.querySelector<HTMLElement>("#block-lines") ?? root;
  items.push({
    key: "lines",
    label: !rows.length
      ? "Add at least one line"
      : uncoded.length
        ? `${uncoded.length} line${uncoded.length === 1 ? "" : "s"} to code`
        : "Lines",
    where: "Items",
    sheet: "",
    tone: badAmount ? "err" : !rows.length || uncoded.length ? "warn" : "ok",
    target: uncoded[0] ?? badAmount ?? table,
  });
  return items;
}

/** The engine's header cost centre mode: its Class/Centre switch, hidden. */
const ccMode = (root: HTMLElement): "class" | "centre" =>
  root.querySelector("#cc-toggle")?.getAttribute("aria-checked") === "true"
    ? "centre"
    : "class";

/**
 * The one cost centre picker → the engine: flip its switch when the answer is
 * the other kind (which empties the header, as the switch always has), then
 * set its select and let the engine's own change handler take it.
 */
function applyCostCentre(root: HTMLElement, value: string) {
  const [mode, id = ""] = value ? value.split(":") : [ccMode(root), ""];
  if (mode !== ccMode(root))
    root.querySelector<HTMLElement>("#cc-toggle")?.click();
  const pick = root.querySelector<HTMLSelectElement>("#cc-pick");
  if (!pick) return;
  pick.value = id;
  pick.dispatchEvent(new Event("change", { bubbles: true }));
}

/** More details open or closed; the reviewer's choice carries to the next bill. */
const MORE_KEY = "aia.review.more-details";
function setMore(card: HTMLElement, open: boolean, remember = false) {
  card.toggleAttribute("data-more-open", open);
  card
    .querySelector("[data-more-toggle]")
    ?.setAttribute("aria-expanded", String(open));
  const label = card.querySelector(".cr-more-label");
  const text = open ? "Fewer details" : "More details";
  if (label && label.textContent !== text) label.textContent = text;
  if (!remember) return;
  try {
    localStorage.setItem(MORE_KEY, open ? "1" : "0");
  } catch {}
}
function rememberedMore(): boolean {
  try {
    return localStorage.getItem(MORE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Registered Business · GJ → KA" — what fits inside the party box; the
 * states in full are in the panel it opens. GSTIN is a field of its own.
 */
function partySummary(details: HTMLElement): string {
  const text = (key: string) => {
    const r = details.querySelector<HTMLElement>(
      `.cr-row[data-check="${key}"]`
    );
    return r && !r.hidden ? displayOf(r) : "";
  };
  // "(GJ) Gujarat" → "GJ"
  const code = (key: string) =>
    text(key).match(/^\(([A-Z0-9]+)\)/)?.[1] || text(key);
  const from = code("sourceState");
  const to = code("destState");
  const treatment = text("gstTreatment");
  return (
    [
      treatment && !/^select/i.test(treatment) ? treatment : "No GST treatment",
      from && to ? `${from} → ${to}` : from || to,
    ]
      .filter(Boolean)
      .join(" · ") || "GST details"
  );
}

/*
 * The create button is an icon that names what it makes (7 Oct 2026): a
 * person-plus for a vendor or customer, a book-plus for a ledger (Lucide's
 * user-plus and book-plus). The engine draws a bare plus; this swaps it, and
 * moves the engine's terse title into a tooltip that says what a press does.
 */
const ICON_ATTRS =
  'viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const CREATE_ICON = {
  party: `<svg ${ICON_ATTRS}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>`,
  ledger: `<svg ${ICON_ATTRS}><path d="M12 7v6"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M9 10h6"/></svg>`,
  // Lucide package-plus: a stock item
  item: `<svg ${ICON_ATTRS}><path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>`,
};

/**
 * A line's "New" item or ledger is created from its own cell (7 Oct 2026),
 * the way a new vendor is from the vendor field. The engine's button is a
 * bare plus titled "Create <name>"; this gives it the record's icon and a
 * tooltip that says what a press does. The engine's handler is unchanged: it
 * opens the master form filled in from the line.
 */
function dressLineCreate(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>(".cr-table .cell--new > .predbtn")
    .forEach((btn) => {
      const isItem = btn.closest("tr")?.getAttribute("data-kind") === "items";
      const want = isItem ? "item" : "ledger";
      if (btn.dataset.icon !== want) {
        btn.innerHTML = CREATE_ICON[want];
        btn.dataset.icon = want;
      }
      if (btn.title) {
        btn.dataset.engineTitle = btn.title;
        btn.removeAttribute("title");
      }
      const name = (btn.getAttribute("aria-label") || "").replace(
        /^Create\s+/,
        ""
      );
      const noun = isItem ? "stock item" : "ledger";
      const tip = btn.hasAttribute("data-barred")
        ? btn.dataset.engineTitle || ""
        : `Add “${name}” as a new ${noun}. Opens the ${isItem ? "item" : "ledger"} form, filled in from this line.`;
      if (btn.dataset.tip !== tip) btn.dataset.tip = tip;
    });
}
function createTip(btn: HTMLElement): string {
  const engine = btn.dataset.engineTitle || "";
  if (btn.hasAttribute("data-barred")) return engine;
  const act = btn.dataset.act || "";
  const party =
    act === "new-vendor" ? "vendor" : act === "new-customer" ? "customer" : "";
  if (party) {
    const doc = party === "vendor" ? "bill" : "invoice";
    const select =
      btn.parentElement?.querySelector<HTMLSelectElement>("select");
    const proposed = select?.value.startsWith("__")
      ? select.selectedOptions[0]?.textContent?.trim()
      : "";
    return proposed
      ? `Add “${proposed}” as a new ${party}. Opens the ${party} form, filled in from this ${doc}.`
      : `Add a new ${party}. Opens the ${party} form, filled in from this ${doc}.`;
  }
  // "Create a new expense ledger" → "expense ledger"
  const kind =
    (btn.getAttribute("aria-label") || "").match(/new (.+)$/)?.[1] || "ledger";
  return `Add a new ${kind} for this line. Opens the ledger form, filled in from the line.`;
}
function dressCreate(btn: HTMLElement) {
  const want = /new-(vendor|customer)/.test(btn.dataset.act || "")
    ? "party"
    : "ledger";
  if (btn.dataset.icon !== want) {
    btn.innerHTML = CREATE_ICON[want];
    btn.dataset.icon = want;
  }
  // the engine re-sets its title on every render; keep it, but as the tip's
  // source, so the browser's own tooltip does not double ours
  if (btn.title) {
    btn.dataset.engineTitle = btn.title;
    btn.removeAttribute("title");
  }
  const tip = createTip(btn);
  if (btn.dataset.tip !== tip) btn.dataset.tip = tip;
}

/**
 * Create sits right after the name it would create (7 Oct 2026), not in the
 * field's far corner. The select stays the whole field — any press on it
 * still opens the list, and its caret stays at the edge — so the button is
 * laid over it, just past the end of the chosen text. The select keeps room
 * on its right so a long name ellipses before it reaches the button.
 */
let measure: CanvasRenderingContext2D | null = null;
function seatCreate(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>(
      ":is(.cr-cards .control, .cr-table .cell) > .fieldplus"
    )
    .forEach((btn) => {
      dressCreate(btn);
      const select =
        btn.parentElement?.querySelector<HTMLSelectElement>("select");
      if (!select || btn.hidden || !select.offsetWidth) return;
      measure ??= document.createElement("canvas").getContext("2d");
      if (!measure) return;
      const cs = getComputedStyle(select);
      measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const text = (select.selectedOptions[0]?.textContent || "")
        .replace(/\u00a0/g, " ")
        .trim();
      const room = btn.offsetWidth + 8;
      // a field box keeps its caret clear; a table cell shows none at rest
      const caret = btn.closest(".cr-table") ? 0 : 22;
      const pad = `${room + caret}px`;
      if (select.style.paddingRight !== pad) select.style.paddingRight = pad;
      const start = select.offsetLeft + parseFloat(cs.paddingLeft || "0");
      const end = select.offsetLeft + select.offsetWidth - room - caret;
      const left = `${Math.round(
        Math.min(start + measure.measureText(text).width, end) + 8
      )}px`;
      if (btn.style.left !== left) btn.style.left = left;
    });
}

/**
 * Tax & deductions above the totals strip: a wrong tax line opens its own
 * context, the figure that is open says so, and the notch points at it.
 */
function syncTaxPanel(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>("#cr-sheet-gst");
  if (!panel) return;
  const bad = panel.querySelector<HTMLElement>(".is-invalid");
  if (bad && !panel.hasAttribute("data-open")) {
    panel.dataset.ctx =
      bad.closest<HTMLElement>("[data-bd]")?.dataset.bd === "gst"
        ? "gst"
        : "total";
    panel.setAttribute("data-open", "");
  }
  const open = panel.hasAttribute("data-open");
  let active: HTMLElement | null = null;
  root.querySelectorAll<HTMLElement>("[data-tax-ctx]").forEach((c) => {
    const on = open && c.dataset.taxCtx === panel.dataset.ctx;
    if (on) active = c;
    if (c.getAttribute("aria-expanded") !== String(on))
      c.setAttribute("aria-expanded", String(on));
  });
  if (!active) return;
  const a = (active as HTMLElement).getBoundingClientRect();
  const b = panel.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const at = `${Math.round(a.left - b.left + a.width / 2 - 5)}px`;
  if (panel.style.getPropertyValue("--cr-notch") !== at)
    panel.style.setProperty("--cr-notch", at);
}

/** Points the party panel's notch at the summary inside the party box. */
function aimPartyNotch(details: HTMLElement, toggle: HTMLElement | null) {
  if (!toggle) return;
  const a = toggle.getBoundingClientRect();
  const b = details.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const at = `${Math.round(a.left - b.left + a.width / 2 - 5)}px`;
  if (details.style.getPropertyValue("--cr-notch") !== at)
    details.style.setProperty("--cr-notch", at);
}

/** The collapsed More details line: the sections it holds. */
function moreSummary(card: HTMLElement): string {
  return [
    ...card.querySelectorAll<HTMLElement>(
      ".cr-subhead[data-group] > .cr-card-title"
    ),
  ]
    .map((h) => h.textContent?.trim() || "")
    .filter(Boolean)
    .join(" · ");
}

/** Fold a section card to its summary line, or open it. */
function fold(card: HTMLElement, folded: boolean) {
  card.toggleAttribute("data-collapsed", folded);
  card
    .querySelector(".cr-card-head")
    ?.setAttribute("aria-expanded", String(!folded));
}

export function BillReview({
  root,
  kind = "ap",
}: {
  root: HTMLElement;
  kind?: "ap" | "ar";
}) {
  const [items, setItems] = useState<Item[]>([]);

  // the live form → checks, marks, counts and pills
  useEffect(() => {
    const form = root.querySelector<HTMLElement>(".form") ?? root;
    let frame = 0;
    const update = () => {
      seatCreate(root);
      dressLineCreate(root);
      const next = collect(root);
      setItems(next);
      // the engine has filled the form once its lines are drawn — fold then,
      // not on the first, half-rendered pass
      const linesIn = !!root.querySelector(".cr-table tbody tr[data-id]");
      // summary rows: the values behind them, and the worst mark among them
      root
        .querySelectorAll<HTMLElement>(".cr-card .cr-summary[data-open]")
        .forEach((btn) => {
          const id = btn.dataset.open!;
          const fields = [
            ...root.querySelectorAll<HTMLElement>(`#cr-sheet-${id} .field`),
          ];
          const text = fields.map(valueText).filter(Boolean).join(" · ");
          const span = btn.querySelector<HTMLElement>(".cr-summary-text");
          if (span && span.textContent !== (text || "Add details")) {
            span.textContent = text || "Add details";
            span.classList.toggle("is-empty", !text);
          }
          const mine = next.filter((i) => i.sheet === id);
          const tone: Tone = mine.some((i) => i.tone === "err")
            ? "err"
            : mine.some((i) => i.tone === "warn")
              ? "warn"
              : "ok";
          const r = btn.closest<HTMLElement>(".cr-row");
          if (r && r.dataset.tone !== tone) r.dataset.tone = tone;
        });
      // a hidden field that turns open or wrong comes up beside the five and
      // stays there for this bill — only once the engine has filled the form,
      // or its half-rendered first pass would surface everything
      if (linesIn)
        root
          .querySelectorAll<HTMLElement>(
            '.cr-more-row:is([data-tone="warn"], [data-tone="err"]):not([data-surfaced])'
          )
          .forEach((r) => {
            if (!r.hidden) r.setAttribute("data-surfaced", "");
          });
      // the cost centre picker shows what the engine holds
      const ccPick = root.querySelector<HTMLSelectElement>(".cr-cc-pick");
      if (ccPick && document.activeElement !== ccPick) {
        const value = root.querySelector<HTMLSelectElement>("#cc-pick")?.value;
        const want = value ? `${ccMode(root)}:${value}` : "";
        const known = [...ccPick.options].some((o) => o.value === want);
        const next = known ? want : "";
        if (ccPick.value !== next) ccPick.value = next;
      }
      // …and its button names it
      const ccValue = root.querySelector<HTMLElement>(".cr-ccx-value");
      if (ccPick && ccValue) {
        const label =
          root.querySelector<HTMLElement>(
            `.cr-ccx-opt[data-value="${ccPick.value}"]`
          )?.dataset.label || "Select to apply to all lines";
        if (ccValue.textContent !== label) ccValue.textContent = label;
        ccValue.classList.toggle("is-empty", !ccPick.value);
        const clear = root.querySelector<HTMLElement>(".cr-ccx-clear");
        if (clear && clear.hidden !== !ccPick.value)
          clear.hidden = !ccPick.value;
      }
      // the voucher type's title
      const typeSelect =
        root.querySelector<HTMLSelectElement>(".cr-type select");
      const typeValue = root.querySelector<HTMLElement>(".cr-type-value");
      if (typeSelect && typeValue) {
        const text = typeSelect.selectedOptions[0]?.textContent?.trim() || "";
        if (typeValue.textContent !== text) typeValue.textContent = text;
      }
      // the party's details, summed up under its box
      const summary = root.querySelector<HTMLElement>(".cr-party-summary");
      const details = root.querySelector<HTMLElement>("#cr-party-details");
      if (summary && details) {
        const line = partySummary(details);
        if (summary.textContent !== line) summary.textContent = line;
        const open =
          details.hasAttribute("data-open") ||
          !!details.querySelector(
            '.cr-row:is([data-tone="warn"], [data-tone="err"])'
          );
        const toggle = root.querySelector<HTMLElement>("[data-party-details]");
        toggle?.setAttribute("aria-expanded", String(open));
        if (open) aimPartyNotch(details, toggle);
      }
      syncTaxPanel(root);
      root
        .querySelectorAll<HTMLElement>(".cr-card[data-card='main']")
        .forEach((c) => {
          const span = c.querySelector<HTMLElement>(".cr-more-summary");
          const line = moreSummary(c);
          if (span && span.textContent !== line) span.textContent = line;
        });
      root.querySelectorAll<HTMLElement>(".cr-card[data-card]").forEach((c) => {
        const mine = next.filter((i) => i.card === c && i.tone !== "ok");
        const badge = c.querySelector<HTMLElement>(".cr-card-head .cr-pending");
        const count = mine.length ? String(mine.length) : "";
        if (badge && badge.textContent !== count) badge.textContent = count;
        // the line a folded card shows: its key values, in order
        const keys = (c.dataset.summary || "").split(",").filter(Boolean);
        const parts = keys
          .map((k) =>
            c.querySelector<HTMLElement>(`.cr-row[data-check="${k}"]`)
          )
          .filter((r): r is HTMLElement => !!r && !r.hidden)
          .map(displayOf)
          .filter(Boolean);
        // optional groups: what the filled ones hold, or that none is
        const groups = [
          ...c.querySelectorAll<HTMLElement>(".xf-slot .xf-summary__text"),
        ];
        const held = groups
          .filter((t) => !t.classList.contains("is-empty"))
          .map((t) => t.textContent?.trim() || "");
        if (!keys.length && groups.length)
          parts.push(held.length ? held.join(" · ") : "Nothing added");
        const line = parts.join(" · ");
        const summary = c.querySelector<HTMLElement>(".cr-card-summary");
        if (summary && summary.textContent !== line) summary.textContent = line;
        // cards stay open — folding is the reviewer's, never automatic — but
        // one folded by hand opens again when it has more to resolve
        // a card opens itself when it has more to resolve than before
        const before = Number(c.dataset.pending || 0);
        c.dataset.pending = String(mine.length);
        if (linesIn && mine.length > before) fold(c, false);
        if (mine.some((i) => i.tone === "err")) fold(c, false);
      });
      Object.keys(SHEETS).forEach((sheet) => {
        const pill = root.querySelector<HTMLElement>(
          `#cr-sheet-${sheet} [data-pill]`
        );
        if (!pill) return;
        const pending = next.filter(
          (i) => i.sheet === sheet && i.tone !== "ok"
        ).length;
        const text = pending
          ? `${pending} need${pending === 1 ? "s" : ""} you`
          : "Complete";
        if (pill.textContent !== text) pill.textContent = text;
        pill.dataset.tone = pending ? "warn" : "ok";
      });
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "value"],
    });
    // selects and dates change value without a mutation
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    form.addEventListener("change", onChange, true);
    form.addEventListener("input", onChange, true);
    update();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      form.removeEventListener("change", onChange, true);
      form.removeEventListener("input", onChange, true);
    };
  }, [root]);

  // More details starts the way the reviewer last left it
  useEffect(() => {
    const card = root.querySelector<HTMLElement>(".cr-card[data-card='main']");
    if (card) setMore(card, rememberedMore());
  }, [root]);

  // Create follows its name when the form changes width
  useEffect(() => {
    const ro = new ResizeObserver(() => seatCreate(root));
    ro.observe(root);
    // …and when its field's inset changes: the record panel slides the
    // insets open and shut between reading and editing.
    let frame = 0;
    const settle = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => seatCreate(root));
    };
    root.addEventListener("transitionend", settle);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      root.removeEventListener("transitionend", settle);
    };
  }, [root]);

  // the create button's tooltip: what a press does, above the button
  useEffect(() => {
    const tip = document.createElement("div");
    tip.className = "cr-tip";
    tip.setAttribute("role", "tooltip");
    tip.id = "cr-create-tip";
    tip.hidden = true;
    root.append(tip);
    let at: HTMLElement | null = null;
    const show = (btn: HTMLElement) => {
      const text = btn.dataset.tip;
      if (!text) return;
      at = btn;
      tip.textContent = text;
      tip.hidden = false;
      btn.setAttribute("aria-describedby", tip.id);
      const b = btn.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(b.left + b.width / 2 - t.width / 2, innerWidth - t.width - 8)
      );
      const above = b.top - t.height - 8;
      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(above < 8 ? b.bottom + 8 : above)}px`;
    };
    const hide = () => {
      at?.removeAttribute("aria-describedby");
      at = null;
      tip.hidden = true;
    };
    const target = (e: Event) =>
      (e.target as HTMLElement).closest?.<HTMLElement>(
        ".fieldplus, .cr-table .cell--new > .predbtn"
      ) ?? null;
    const onOver = (e: Event) => {
      const btn = target(e);
      if (btn && btn !== at) show(btn);
      else if (!btn && at) hide();
    };
    const onFocus = (e: Event) => {
      const btn = target(e);
      if (btn && btn.matches(":focus-visible")) show(btn);
    };
    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerleave", hide);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", hide);
    root.addEventListener("pointerdown", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerleave", hide);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", hide);
      root.removeEventListener("pointerdown", hide);
      window.removeEventListener("scroll", hide, true);
      tip.remove();
    };
  }, [root]);

  // the cost centre picker: a button, two tabs, one list
  useEffect(() => {
    const pop = () => root.querySelector<HTMLElement>(".cr-ccx-pop");
    const trigger = () => root.querySelector<HTMLElement>(".cr-ccx-trigger");
    const visible = () => [
      ...root.querySelectorAll<HTMLElement>(
        ".cr-ccx-panel:not([hidden]) .cr-ccx-opt"
      ),
    ];
    const showTab = (kind: string) => {
      root
        .querySelectorAll<HTMLElement>(".cr-ccx-tab")
        .forEach((t) =>
          t.setAttribute("aria-selected", String(t.dataset.ccTab === kind))
        );
      root
        .querySelectorAll<HTMLElement>(".cr-ccx-panel")
        .forEach((p) => (p.hidden = p.dataset.ccPanel !== kind));
    };
    const close = (refocus = false) => {
      const p = pop();
      if (!p || p.hidden) return;
      p.hidden = true;
      trigger()?.setAttribute("aria-expanded", "false");
      if (refocus) trigger()?.focus();
    };
    const openPicker = () => {
      const p = pop();
      const value =
        root.querySelector<HTMLSelectElement>(".cr-cc-pick")?.value || "";
      if (!p) return;
      // it opens on the tab that holds the answer
      showTab(value.startsWith("class:") ? "class" : "centre");
      root
        .querySelectorAll<HTMLElement>(".cr-ccx-opt")
        .forEach((o) =>
          o.setAttribute("aria-selected", String(o.dataset.value === value))
        );
      p.hidden = false;
      trigger()?.setAttribute("aria-expanded", "true");
      const current =
        visible().find((o) => o.dataset.value === value) || visible()[0];
      current?.focus();
      current?.scrollIntoView({ block: "nearest" });
    };
    const choose = (value: string) => {
      const pick = root.querySelector<HTMLSelectElement>(".cr-cc-pick");
      close(true);
      if (!pick || pick.value === value) return;
      pick.value = value;
      pick.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // × goes back to a cost centre per line
      if (t.closest(".cr-ccx-clear")) {
        choose("");
        return;
      }
      if (t.closest(".cr-ccx-trigger")) {
        if (pop()?.hidden) openPicker();
        else close();
        return;
      }
      const tab = t.closest<HTMLElement>(".cr-ccx-tab");
      if (tab) {
        showTab(tab.dataset.ccTab || "centre");
        tab.focus();
        return;
      }
      const o = t.closest<HTMLElement>(".cr-ccx-opt");
      if (o) choose(o.dataset.value || "");
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".cr-ccx")) return;
      const p = pop();
      if (!p) return;
      if (p.hidden) {
        if (
          t.closest(".cr-ccx-trigger") &&
          (e.key === "ArrowDown" || e.key === "ArrowUp")
        ) {
          e.preventDefault();
          openPicker();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const kind = root.querySelector<HTMLElement>(
          '.cr-ccx-tab[aria-selected="true"]'
        )?.dataset.ccTab;
        const next = kind === "class" ? "centre" : "class";
        e.preventDefault();
        showTab(next);
        root
          .querySelector<HTMLElement>(`.cr-ccx-tab[data-cc-tab="${next}"]`)
          ?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = visible();
        const at = list.indexOf(t);
        const step = e.key === "ArrowDown" ? 1 : -1;
        const next =
          at < 0
            ? list[step > 0 ? 0 : list.length - 1]
            : list[Math.max(0, Math.min(list.length - 1, at + step))];
        next?.focus();
        next?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Tab") close();
    };
    // a press anywhere else puts it away
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest?.(".cr-ccx")) close();
    };
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [root]);

  // sheets, expand, totals card
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // the summary under the party box opens its details
      const party = t.closest<HTMLElement>("[data-party-details]");
      if (party && root.contains(party)) {
        const details = root.querySelector<HTMLElement>("#cr-party-details");
        if (!details) return;
        details.toggleAttribute("data-open");
        aimPartyNotch(details, party);
        party.setAttribute(
          "aria-expanded",
          String(
            details.hasAttribute("data-open") ||
              !!details.querySelector(
                '.cr-row:is([data-tone="warn"], [data-tone="err"])'
              )
          )
        );
        return;
      }
      const more = t.closest<HTMLElement>("[data-more-toggle]");
      if (more && root.contains(more)) {
        const c = more.closest<HTMLElement>(".cr-card");
        if (c) setMore(c, !c.hasAttribute("data-more-open"), true);
        return;
      }
      const toggle = t.closest<HTMLElement>("[data-toggle-card]");
      if (toggle && root.contains(toggle)) {
        const c = toggle.closest<HTMLElement>(".cr-card");
        if (c) fold(c, !c.hasAttribute("data-collapsed"));
        return;
      }
      // GST or Bill total opens its part of Tax & deductions above the strip
      const cell = t.closest<HTMLElement>("[data-tax-ctx]");
      if (cell && root.contains(cell)) {
        const panel = root.querySelector<HTMLElement>("#cr-sheet-gst");
        if (!panel) return;
        const ctx = cell.dataset.taxCtx || "gst";
        const same =
          panel.hasAttribute("data-open") && panel.dataset.ctx === ctx;
        if (same) panel.removeAttribute("data-open");
        else {
          panel.dataset.ctx = ctx;
          panel.setAttribute("data-open", "");
        }
        syncTaxPanel(root);
        return;
      }
      const open = t.closest<HTMLElement>("[data-open]");
      if (open && root.contains(open)) {
        root
          .querySelector<HTMLDialogElement>(`#cr-sheet-${open.dataset.open}`)
          ?.showModal();
        return;
      }
      const close = t.closest<HTMLElement>("[data-close]");
      if (close) {
        close.closest("dialog")?.close();
        return;
      }
      // a press on the backdrop closes the sheet
      if (t instanceof HTMLDialogElement && t.classList.contains("cr-sheet")) {
        const r = t.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          t.close();
        return;
      }
      const expand = t.closest<HTMLElement>("[data-expand]");
      if (expand) {
        const dialog = root.querySelector<HTMLDialogElement>("#cr-sheet-items");
        const grid = root.querySelector<HTMLElement>(".cr-grid-wrap");
        if (!dialog || !grid) return;
        dialog.querySelector(".cr-sheet-body")?.append(grid);
        dialog.showModal();
      }
    };
    // closing the items dialog puts the table back on the form
    const onClose = (e: Event) => {
      if ((e.target as HTMLElement).id !== "cr-sheet-items") return;
      const grid = root.querySelector<HTMLElement>(
        "#cr-sheet-items .cr-grid-wrap"
      );
      if (grid) root.querySelector("#block-lines")?.append(grid);
    };
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      if (m?.source !== `aia-${kind}` || m.type !== "totals" || !m.payload)
        return;
      const p = m.payload as {
        subTotal: number;
        gstTotal: number;
        dedTotal: number;
        adjTotal: number;
        grand: number;
      };
      const set = (k: string, v: string) => {
        const node = root.querySelector<HTMLElement>(`[data-total="${k}"]`);
        if (node && node.textContent !== v) node.textContent = v;
      };
      set("sub", money(p.subTotal));
      set(
        "tax-label",
        p.dedTotal ? `GST · less TDS ${money(p.dedTotal)}` : "GST"
      );
      set("tax", money(p.gstTotal));
      set("grand", money(p.grand));
    };
    const onChange = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLSelectElement && t.classList.contains("cr-cc-pick"))
        applyCostCentre(root, t.value);
    };
    root.addEventListener("change", onChange);
    root.addEventListener("click", onClick);
    root.addEventListener("close", onClose, true);
    window.addEventListener("message", onMessage);
    return () => {
      root.removeEventListener("change", onChange);
      root.removeEventListener("click", onClick);
      root.removeEventListener("close", onClose, true);
      window.removeEventListener("message", onMessage);
    };
  }, [root, kind]);

  // Needs you, rendered into its sheet
  const open = items.filter((i) => i.tone !== "ok");
  const needsHost = root.querySelector<HTMLElement>(
    "#cr-sheet-needs .cr-needs"
  );

  const go = (item: Item) => {
    root.querySelector<HTMLDialogElement>("#cr-sheet-needs")?.close();
    if (item.card) fold(item.card, false);
    // a field still tucked under More details: open it to get there
    const hidden = item.target.closest<HTMLElement>(
      ".cr-more-row:not([data-surfaced]), .xf-slot"
    );
    const main = hidden?.closest<HTMLElement>(".cr-card");
    if (main && !main.hasAttribute("data-more-open")) setMore(main, true);
    // a party detail: open the panel it sits in
    item.target
      .closest<HTMLElement>("#cr-party-details")
      ?.setAttribute("data-open", "");
    if (item.sheet) {
      const sheet = root.querySelector<HTMLElement>(`#cr-sheet-${item.sheet}`);
      // Tax & deductions is a panel on the form now, not a dialog
      if (sheet instanceof HTMLDialogElement) sheet.showModal();
      else if (sheet) {
        sheet.dataset.ctx =
          item.target.closest<HTMLElement>("[data-bd]")?.dataset.bd === "gst"
            ? "gst"
            : "total";
        sheet.setAttribute("data-open", "");
        syncTaxPanel(root);
      }
    }
    requestAnimationFrame(() => {
      item.target.scrollIntoView({ block: "center", behavior: "smooth" });
      item.target
        .querySelector<HTMLElement>(
          "select, input:not([readonly]), textarea, button"
        )
        ?.focus({ preventScroll: true });
    });
  };

  // No header of its own: the total, draft state and review progress all
  // repeat what the form already shows further down. What is left is the
  // Needs-you list, rendered into its sheet.
  return (
    <>
      {needsHost &&
        createPortal(
          open.length ? (
            open.map((item) => (
              <div className="cr-need" key={item.key}>
                <span
                  className="cr-dot"
                  data-tone={item.tone}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                <small>{item.where}</small>
                <button
                  type="button"
                  className="cr-propose"
                  onClick={() => go(item)}
                >
                  {item.sheet
                    ? "Resolve"
                    : item.where === "Items"
                      ? "To the lines"
                      : "Go to field"}
                  <ChevronRight size={12} aria-hidden="true" />
                </button>
              </div>
            ))
          ) : (
            <p className="cr-empty-needs">Nothing left to resolve.</p>
          ),
          needsHost
        )}
    </>
  );
}
