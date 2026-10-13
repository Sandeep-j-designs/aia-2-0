import { useEffect } from "react";
import type React from "react";

/** Preserve native dialog semantics and the accounting engine's IDs/handlers. */
export function refineDialogMarkup(doc: Document) {
  const descriptions: Record<string, string> = {
    "st-dialog": "Set the tax rates and when they take effect.",
    "rcm-dialog":
      "Choose the ledger that will receive the reverse-charge posting.",
    "itc-dialog":
      "Choose where the GST that cannot be claimed should be expensed.",
  };
  doc.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
    dialog.classList.add("refined-native-dialog");
    const form = dialog.querySelector<HTMLElement>(":scope > .pickdlg");
    if (!form) return;
    const head = form.querySelector<HTMLElement>(":scope > .pickdlg__head");
    if (!head) return;
    const title = head.querySelector("h2");
    if (title && descriptions[dialog.id]) {
      const group = doc.createElement("div");
      group.className = "dialog-heading";
      title.before(group);
      group.append(title);
      const description = doc.createElement("p");
      description.className = "dialog-description";
      description.id = `${dialog.id}-description`;
      description.textContent = descriptions[dialog.id];
      group.append(description);
      dialog.setAttribute("aria-describedby", description.id);
    }
    let footer = form.querySelector<HTMLElement>(":scope > .nmd__foot");
    const submit = form.querySelector<HTMLElement>(":scope > .pickdlg__save");
    if (!footer && submit) {
      footer = doc.createElement("div");
      footer.className = "dialog-actions";
      const cancel = doc.createElement("button");
      cancel.type = "button";
      cancel.className = "btn btn--outline dialog-dismiss";
      cancel.textContent = "Cancel";
      footer.append(cancel, submit);
      form.append(footer);
    }
    if (!footer) return;
    footer.classList.add("dialog-actions");
    const scroll = doc.createElement("div");
    scroll.className = "dialog-scroll";
    [...form.children]
      .filter((node) => node !== head && node !== footer)
      .forEach((node) => scroll.append(node));
    head.after(scroll);
    if (dialog.id === "nm-dialog") {
      // The bill form's own header line (7 Oct 2026): required is the norm,
      // optional fields say so. Replaces the "* marks required" sentence.
      const note = doc.createElement("p");
      note.className = "dialog-req-note";
      note.textContent = "Required unless marked optional";
      head.querySelector(".pickdlg__x")?.before(note);
      // No section tabs (8 Oct 2026): a dozen fields in short sections read
      // in one scroll, and the tabs only added navigation to them.
    }
  });
  const labels: Record<string, string> = {
    "fc-save": "Save configuration",
    "af-save": "Save details",
    "cc-save": "Save allocation",
    "st-save": "Apply tax details",
  };
  Object.entries(labels).forEach(([id, label]) => {
    const node = doc.getElementById(id);
    if (node) node.textContent = label;
  });
}

/** Dynamic master fields are rebuilt by the sheet engine when the group changes.
 * Reconnect labels and navigation each time without taking over its form state. */
export function useDialogRefinements(
  host: React.RefObject<HTMLDivElement>,
  markup: string | null
) {
  useEffect(() => {
    const root = host.current;
    if (!root || !markup) return;
    let frame = 0;
    const update = () => {
      root
        .querySelectorAll<HTMLDialogElement>("dialog[open]")
        .forEach((dialog) => {
          dialog
            .querySelectorAll<HTMLElement>(".nmd__f, .field")
            .forEach((field, index) => {
              const label = field.querySelector<HTMLLabelElement>(
                ".nmd__lbl, .t-label"
              );
              if (!label) return;
              const name =
                label.textContent?.replace(/\*/g, "").trim() || "Field";
              const controls = field.querySelectorAll<HTMLElement>(
                "input, select, textarea, button[role='switch']"
              );
              controls.forEach((control, controlIndex) => {
                if (!control.id)
                  control.id = `${dialog.id}-field-${index}-${controlIndex}`;
                if (controls.length === 1 && label.tagName === "LABEL")
                  label.htmlFor = control.id;
                if (!control.hasAttribute("aria-label"))
                  control.setAttribute("aria-label", name);
                if (field.dataset.req === "1" || label.querySelector(".req"))
                  control.setAttribute("aria-required", "true");
                control.setAttribute(
                  "aria-invalid",
                  String(field.classList.contains("is-invalid"))
                );
              });
            });
          if (dialog.id !== "nm-dialog") return;
          const sections = [
            ...dialog.querySelectorAll<HTMLElement>(".nmd__sec:not(button)"),
          ];
          sections.forEach((section, index) => {
            section.id = `master-section-${index}`;
            section.setAttribute("role", "heading");
            section.setAttribute("aria-level", "3");
          });
          const save = dialog.querySelector("#nm-save");
          const title =
            dialog.querySelector("#nm-title")?.textContent?.toLowerCase() || "";
          const action = title.includes("vendor")
            ? "Create vendor"
            : title.includes("customer")
              ? "Create customer"
              : title.includes("item")
                ? "Create item"
                : "Create ledger";
          if (save && save.textContent !== action) save.textContent = action;
        });
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open", "class"],
    });
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const cancel = target?.closest(".dialog-dismiss");
      if (cancel)
        cancel
          .closest("dialog")
          ?.querySelector<HTMLButtonElement>(".pickdlg__x")
          ?.click();
    };
    root.addEventListener("click", click);
    update();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      root.removeEventListener("click", click);
    };
  }, [host, markup]);
}
