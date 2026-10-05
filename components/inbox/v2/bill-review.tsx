import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";

/**
 * The bill form's review layer, after the Finops review form (Oct 2026).
 *
 * review-layout.ts (composeBillForm) builds the shape: a card of label rows,
 * the sheets behind their ›, the items table and the totals card. This reads
 * the live form and states where it stands:
 *
 *   - each row's status mark (data-tone), each › its pending count, each
 *     sheet its pill
 *   - the Needs you sheet: every open check, with the way to it
 *   - opening and closing the sheets, Expand on the items table, and the
 *     totals card (from the engine's "totals" message)
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
  tone: Tone;
  target: HTMLElement;
};

const SHEETS: Record<string, string> = {
  voucher: "Voucher details",
  party: "Party details",
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
  // the voucher number is generated: its placeholder is the number to come
  return (
    control.readOnly &&
    !!control.placeholder &&
    control.placeholder !== "Auto Generated"
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

function collect(root: HTMLElement): Item[] {
  const items: Item[] = [];
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
      where: "Voucher",
      sheet: "",
      tone,
      target,
    });
  });
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
        tone,
        target: field,
      });
    });
    const addl = dialog?.querySelector<HTMLElement>(".addl.is-invalid");
    if (addl)
      items.push({
        key: "addl",
        label: "Additional details",
        where: SHEETS[sheet],
        sheet,
        tone: "err",
        target: addl,
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
      const next = collect(root);
      setItems(next);
      root
        .querySelectorAll<HTMLElement>(".cr-card-foot [data-open]")
        .forEach((link) => {
          const sheet = link.dataset.open!;
          const pending = next.filter(
            (i) => i.sheet === sheet && i.tone !== "ok"
          ).length;
          const badge = link.querySelector<HTMLElement>(".cr-pending");
          if (badge && badge.textContent !== (pending ? String(pending) : ""))
            badge.textContent = pending ? String(pending) : "";
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

  // sheets, expand, totals card
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
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
    root.addEventListener("click", onClick);
    root.addEventListener("close", onClose, true);
    window.addEventListener("message", onMessage);
    return () => {
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
    if (item.sheet)
      root
        .querySelector<HTMLDialogElement>(`#cr-sheet-${item.sheet}`)
        ?.showModal();
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
                      : "On the voucher"}
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
