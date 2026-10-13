import React, { useRef, useState } from "react";
import { ChevronDown, X } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  COST_CATEGORIES,
  COST_CENTRE_CLASSES,
  allocationDetail,
  centresInCategory,
  costCentreTree,
} from "@/config/pages/inbox/mock-cost-centres";

/**
 * The voucher's cost centre: one answer for every line (7 Oct 2026).
 *
 * The bill and invoice forms' picker, in React: a field that opens a panel
 * with two tabs — Cost centres (by category, nested) and Cost centre classes
 * (each with its split) — because the two are different kinds of answer and
 * one long list could not tell them apart. There is no "Set per line" any
 * more: empty IS per line, each line picking its own in the table's Cost
 * centre column; a choice here applies to every line and locks those cells,
 * and the × clears it back.
 *
 * Values are "centre:<name>" / "class:<name>", the voucher's own fields.
 */

type Kind = "centre" | "class";

type Props = {
  mode: Kind;
  /** The class or centre name the header holds, or "" for per line. */
  value: string;
  disabled?: boolean;
  onChange: (mode: Kind, name: string) => void;
};

const CENTRE_GROUPS = COST_CATEGORIES.map((cat) => ({
  name: cat.name,
  centres: costCentreTree(centresInCategory(cat.name)),
})).filter((g) => g.centres.length);

const CostCentrePicker = ({ mode, value, disabled, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Kind>(mode);
  const list = useRef<HTMLDivElement>(null);

  // it opens on the tab that holds the answer
  const openOn = (next: boolean) => {
    if (next) setTab(value ? mode : "centre");
    setOpen(next);
  };
  const pick = (kind: Kind, name: string) => {
    onChange(kind, name);
    setOpen(false);
  };
  const options = () => [
    ...(list.current?.querySelectorAll<HTMLElement>("[role=option]") ?? []),
  ];
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setTab((t) => (t === "class" ? "centre" : "class"));
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = options();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next =
      at < 0
        ? all[step > 0 ? 0 : all.length - 1]
        : all[Math.max(0, Math.min(all.length - 1, at + step))];
    next?.focus();
    next?.scrollIntoView({ block: "nearest" });
  };

  const option = (kind: Kind, name: string, detail?: string, depth = 0) => {
    const selected = value === name && mode === kind;
    return (
      <button
        key={`${kind}:${name}`}
        type="button"
        role="option"
        aria-selected={selected}
        tabIndex={-1}
        onClick={() => pick(kind, name)}
        style={depth ? { paddingLeft: 12 + depth * 16 } : undefined}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-[14px] leading-5 text-pi-ink outline-none hover:bg-pi-fill focus-visible:bg-pi-fill",
          selected && "bg-pi-brand-tint text-pi-brand hover:bg-pi-brand-tint"
        )}
      >
        <span>{name}</span>
        {detail ? (
          <span className="text-[12px] leading-4 text-pi-body">{detail}</span>
        ) : null}
      </button>
    );
  };

  const tabButton = (kind: Kind, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === kind}
      onClick={() => setTab(kind)}
      className={cn(
        "-mb-px h-10 border-b-2 px-0.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-pi-brand",
        tab === kind
          ? "border-pi-brand text-pi-brand"
          : "border-transparent text-pi-body hover:text-pi-ink"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="relative w-full min-w-0">
      <Popover open={open} onOpenChange={openOn}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id="jv-cost-header"
            disabled={disabled}
            aria-label="Cost centre for every line of the voucher"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-sm border border-pi-line-2 bg-background px-3 text-left text-[14px] hover:border-pi-line-strong focus-visible:border-pi-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-pi-brand"
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                value ? "text-pi-ink" : "text-pi-faint",
                value && !disabled && "pr-7"
              )}
            >
              {value || "Select to apply to all lines"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 flex-none text-pi-faint transition-transform motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[max(var(--radix-popover-trigger-width),360px)] max-w-[min(480px,90vw)] overflow-hidden p-0"
        >
          <div
            role="tablist"
            aria-label="Cost centre kind"
            className="flex gap-4 border-b border-pi-line px-3"
          >
            {tabButton("centre", "Cost centres")}
            {tabButton("class", "Cost centre classes")}
          </div>
          <div
            ref={list}
            role="listbox"
            aria-label="Cost centre for every line of the voucher"
            onKeyDown={onListKey}
            className="max-h-80 overflow-y-auto overscroll-contain p-1"
          >
            {tab === "centre" ? (
              CENTRE_GROUPS.map((group) => (
                <div key={group.name} role="group" aria-label={group.name}>
                  <p
                    aria-hidden="true"
                    className="px-3 pb-1 pt-2 text-[12px] font-medium text-pi-faint"
                  >
                    {group.name}
                  </p>
                  {group.centres.map(({ centre, depth }) =>
                    option("centre", centre.name, undefined, depth)
                  )}
                </div>
              ))
            ) : (
              <>
                <p
                  aria-hidden="true"
                  className="px-3 pb-1 pt-2 text-[12px] font-medium text-pi-faint"
                >
                  Split across centres
                </p>
                {COST_CENTRE_CLASSES.map((klass) =>
                  option(
                    "class",
                    klass.name,
                    allocationDetail(klass.allocation)
                  )
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {/* × goes back to a cost centre per line */}
      {value && !disabled ? (
        <button
          type="button"
          aria-label="Clear, and set cost centres line by line"
          title="Clear, and set cost centres line by line"
          onClick={() => onChange(mode, "")}
          className="absolute right-8 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-pi-faint hover:bg-pi-fill hover:text-pi-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-pi-brand"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};

export default CostCentrePicker;
