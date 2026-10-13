import React, { useState } from "react";
import { Check, Minus, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  COST_CATEGORIES,
  type CostAllocation,
  allocationCategoryTotal,
  allocationComplete,
  centresInCategory,
  costCentreByName,
  costCentreTree,
} from "@/config/pages/inbox/mock-cost-centres";

/**
 * Allocate Cost Centre — one line's amount divided across cost centres.
 *
 * Opens in place, in a row under the ledger line it splits (7 Oct 2026),
 * instead of the dialog it was: the tinted, notched panel every other
 * sub-form on the review forms now uses. What it does is unchanged from the
 * AP/AR sheets' dialog (and production's split-cost-centre dialog): each
 * category is its own 100% working, because
 * in Tally every category allocates the whole line independently — ₹35,000
 * can be Engineering 50 / Sales 50 by Department and Project Atlas 100 by
 * Project at once. % and ₹ are one number seen twice; whichever is typed in
 * leads. Apply waits until every category reaches exactly 100% and every
 * row names a centre — a half-made split never lands on the line, which is
 * why this panel, unlike the others, keeps a Cancel and an Apply.
 */

type Props = {
  /** The line's amount — what the percentages divide. */
  amount: number;
  /** The split already on the line, or the single centre to start from. */
  initial: CostAllocation | null;
  seedCentre?: string;
  /** Where the notch sits, from the panel's right edge (the cell's centre). */
  notchRight?: number;
  onClose: () => void;
  onSave: (allocation: CostAllocation) => void;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const inr = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const blankRow = () => ({ centre: "", pct: 0 });

function startingDraft(
  initial: CostAllocation | null,
  seedCentre?: string
): CostAllocation {
  if (initial?.length)
    return initial.map((c) => ({ ...c, rows: c.rows.map((r) => ({ ...r })) }));
  const seed = seedCentre ? costCentreByName(seedCentre) : undefined;
  // a centre already chosen is the obvious first row of its own category
  return seed
    ? [{ category: seed.category, rows: [{ centre: seed.name, pct: 100 }] }]
    : [{ category: COST_CATEGORIES[0].name, rows: [blankRow()] }];
}

const CostAllocationPanel = ({
  amount,
  initial,
  seedCentre,
  notchRight = 96,
  onClose,
  onSave,
}: Props) => {
  // seeded when it opens (it mounts on open), so Cancel really cancels
  const [draft, setDraft] = useState<CostAllocation>(() =>
    startingDraft(initial, seedCentre)
  );

  const editCat = (ci: number, patch: Partial<CostAllocation[number]>) =>
    setDraft((d) => d.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  const editRow = (
    ci: number,
    ri: number,
    patch: Partial<CostAllocation[number]["rows"][number]>
  ) =>
    setDraft((d) =>
      d.map((c, i) =>
        i === ci
          ? {
              ...c,
              rows: c.rows.map((r, j) => (j === ri ? { ...r, ...patch } : r)),
            }
          : c
      )
    );

  const taken = draft.map((c) => c.category);
  const free = COST_CATEGORIES.filter((c) => !taken.includes(c.name));
  const ok = allocationComplete(draft);

  return (
    <div
      role="group"
      aria-label="Split this line across cost centres"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className="relative flex flex-col gap-4 rounded-lg border border-pi-line bg-pi-head-bg px-4 pb-4 pt-3"
    >
      {/* the notch, up to the line's Cost centre cell */}
      <span
        aria-hidden="true"
        style={{ right: notchRight }}
        className="absolute -top-[6px] h-2.5 w-2.5 rotate-45 border-l border-t border-pi-line bg-pi-head-bg"
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[14px] font-medium text-pi-ink">
          Split across cost centres
        </span>
        <span className="text-[13px] tabular-nums text-pi-body">
          ₹{inr.format(amount)}
        </span>
        <span className="text-[12px] text-pi-faint">
          Each category allocates the whole amount on its own.
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {draft.map((cat, ci) => {
          const total = allocationCategoryTotal(cat);
          const done = Math.abs(total - 100) < 0.005;
          const list = costCentreTree(centresInCategory(cat.category));
          return (
            <section
              key={cat.category + ci}
              className="rounded-md border border-pi-line bg-pi-surface-panel p-3"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[13px] font-medium text-pi-body">
                  Category
                </span>
                <Select
                  value={cat.category}
                  onValueChange={(category) =>
                    // a new category is a new working; its rows start over
                    editCat(ci, { category, rows: [blankRow()] })
                  }
                >
                  <SelectTrigger
                    className="h-8 w-44 rounded-sm px-3 text-[13px]"
                    aria-label="Cost category"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CATEGORIES.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.name}
                        disabled={
                          taken.includes(c.name) && c.name !== cat.category
                        }
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* The running total as status text, no chip fill (7 Oct
                    2026): red only when it runs past 100%. */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[12px] font-medium tabular-nums",
                    done
                      ? "text-pi-success"
                      : total > 100
                        ? "text-pi-danger"
                        : "text-pi-warning"
                  )}
                >
                  {total}%{done ? <Check className="h-3 w-3" /> : null}
                </span>
                {draft.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto"
                    aria-label="Remove this category"
                    onClick={() =>
                      setDraft((d) => d.filter((_, i) => i !== ci))
                    }
                  >
                    <Minus />
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-[1fr_72px_112px_24px] items-center gap-2 text-[12px] font-medium text-pi-faint">
                <span>Cost Centre</span>
                <span className="text-right">%</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {cat.rows.map((row, ri) => (
                <div
                  key={ri}
                  className="mt-2 grid grid-cols-[1fr_72px_112px_24px] items-center gap-2"
                >
                  <Select
                    value={row.centre || undefined}
                    onValueChange={(centre) => editRow(ci, ri, { centre })}
                  >
                    <SelectTrigger
                      className="h-8 rounded-sm px-3 text-[13px]"
                      aria-label="Cost centre"
                    >
                      <SelectValue placeholder="Select Cost Centre" />
                    </SelectTrigger>
                    <SelectContent>
                      {list.map(({ centre, depth }) => (
                        <SelectItem
                          key={centre.id}
                          value={centre.name}
                          style={{ paddingLeft: 32 + depth * 16 }}
                        >
                          {centre.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    className="h-8 min-w-0 rounded-sm border border-pi-line-2 bg-background px-3 text-right text-[13px] tabular-nums placeholder:text-pi-faint hover:border-pi-line-strong focus:border-pi-brand focus:shadow-[0_0_0_3px_var(--pi-brand-tint)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    inputMode="decimal"
                    aria-label="Share in percent"
                    value={row.pct || ""}
                    placeholder="0"
                    onChange={(e) =>
                      editRow(ci, ri, {
                        pct: r2(Number(e.target.value) || 0),
                      })
                    }
                  />
                  <input
                    className="h-8 min-w-0 rounded-sm border border-pi-line-2 bg-background px-3 text-right text-[13px] tabular-nums placeholder:text-pi-faint hover:border-pi-line-strong focus:border-pi-brand focus:shadow-[0_0_0_3px_var(--pi-brand-tint)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    inputMode="decimal"
                    aria-label="Share in rupees"
                    disabled={!amount}
                    value={row.pct ? r2((amount * row.pct) / 100) : ""}
                    placeholder="0.00"
                    onChange={(e) =>
                      editRow(ci, ri, {
                        pct: amount
                          ? r2(((Number(e.target.value) || 0) / amount) * 100)
                          : 0,
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove this cost centre"
                    disabled={cat.rows.length <= 1}
                    onClick={() =>
                      editCat(ci, {
                        rows: cat.rows.filter((_, j) => j !== ri),
                      })
                    }
                  >
                    <Minus />
                  </Button>
                </div>
              ))}
              <Button
                variant="link"
                size="sm"
                className="mt-2 h-7 px-0"
                onClick={() => editCat(ci, { rows: [...cat.rows, blankRow()] })}
              >
                <Plus /> Add cost centre
              </Button>
            </section>
          );
        })}
      </div>
      {free.length ? (
        <Button
          variant="link"
          size="sm"
          className="h-7 self-start px-0"
          onClick={() =>
            setDraft((d) => [
              ...d,
              { category: free[0].name, rows: [blankRow()] },
            ])
          }
        >
          <Plus /> Add another category
        </Button>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-pi-faint">
          {ok
            ? ""
            : "Every category has to allocate exactly 100%, and every row needs a cost centre."}
        </p>
        <div className="flex flex-none gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!ok}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Apply split
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CostAllocationPanel;
