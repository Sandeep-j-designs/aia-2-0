import React, { useEffect, useRef, useState } from "react";

/** Section navigation is derived from the actual form, so conditional tax and
 * party sections never leave stale steps in the guide. */
export function FormJourney({
  children,
  title,
  description,
  starter,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  starter?: React.ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<
    { label: string; element: HTMLElement }[]
  >([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const root = content.current;
    if (!root) return;
    const scan = () => {
      const next = [
        ...root.querySelectorAll<HTMLElement>(".modern-field-card > h2"),
      ].map((element) => ({
        label: element.textContent || "Details",
        element,
      }));
      setSections((previous) =>
        previous.length === next.length &&
        previous.every(
          (s, i) => s.element === next[i].element && s.label === next[i].label
        )
          ? previous
          : next
      );
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  /*
    The step follows the reading position. It used to change only on click, so
    scrolling down the form left "01" lit beside the GST section — and a last
    section too short to reach the top of the pane could never be lit at all.
    The active step is the last heading at or above a line just under the
    pane's top; at the end of the scroll it is the last step.
  */
  useEffect(() => {
    const root = content.current;
    if (!root || !sections.length) return;
    let pane: HTMLElement | null = root.parentElement;
    while (pane && !/(auto|scroll)/.test(getComputedStyle(pane).overflowY))
      pane = pane.parentElement;
    const target: HTMLElement | Window = pane ?? window;
    let frame = 0;
    const spy = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = pane ? pane.getBoundingClientRect().top : 0;
        const atEnd = pane
          ? pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2
          : window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 2;
        let next = 0;
        sections.forEach((section, i) => {
          if (section.element.getBoundingClientRect().top - top <= 120)
            next = i;
        });
        if (atEnd) next = sections.length - 1;
        setActive(next);
      });
    };
    spy();
    target.addEventListener("scroll", spy, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("scroll", spy);
    };
  }, [sections]);
  return (
    <div className="form-journey">
      <aside className="form-journey__rail">
        <p className="form-journey__eyebrow">IN THIS FORM</p>
        <nav aria-label="Form sections">
          {sections.map((section, i) => (
            <button
              type="button"
              key={`${section.label}-${i}`}
              aria-current={active === i ? "location" : undefined}
              onClick={() => {
                setActive(i);
                section.element.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                  ).matches
                    ? "auto"
                    : "smooth",
                  block: "start",
                });
                section.element.tabIndex = -1;
                section.element.focus({ preventScroll: true });
              }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {section.label}
            </button>
          ))}
        </nav>
        <p className="form-journey__note">
          Fields marked <span className="text-pi-danger">*</span> are required.
          <br />
          Review your details before saving.
        </p>
      </aside>
      <div className="form-journey__content" ref={content}>
        <div className="form-journey__intro">
          <h2>{title}</h2>
          <p>{description}</p>
          {starter}
        </div>
        {children}
      </div>
    </div>
  );
}
