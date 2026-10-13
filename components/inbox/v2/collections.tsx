import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/pages/inbox/use-collections";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { rupees } from "@/utils/pages/inbox/ai-calculations";
import type { Item } from "@/components/inbox/v2/store";
type Props = {
  company: string;
  search: string;
  pageIds: string[];
  onOpen: (item: Item) => void;
};
const Collections = ({ company, search, pageIds, onOpen }: Props) => {
  const rows = useCollections(company).filter(
    (x) =>
      pageIds.includes(x.item.id) &&
      `${x.item.form.party} ${x.item.form.invoiceNo}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );
  const [selected, setSelected] = useState<string[]>([]);
  const neo = useNeo();
  const draft = (ids: string[]) => {
    neo.setOpen(true);
    void neo.startRun(`Draft collection reminder for ${ids.join(" ")}`);
  };
  return (
    <div className="p-[var(--inset-page)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pi-body">
          {rows.length} overdue invoices ·{" "}
          {rupees(rows.reduce((n, x) => n + x.outstanding, 0))} outstanding
        </p>
        <Button
          disabled={!selected.length || !!neo.busy}
          onClick={() => draft(selected)}
        >
          Draft reminders · {selected.length}
        </Button>
      </div>
      {!rows.length ? (
        <p className="p-8 text-sm text-pi-faint">
          No overdue approved invoices match this view.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-pi-head-bg">
              <tr>
                <th className="p-4">
                  <input
                    aria-label="Select all overdue invoices"
                    type="checkbox"
                    checked={selected.length === rows.length}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? rows.map((x) => x.item.id) : []
                      )
                    }
                  />
                </th>
                {[
                  "Invoice",
                  "Customer",
                  "Days overdue",
                  "Outstanding",
                  "Reminder",
                  "Actions",
                ].map((t) => (
                  <th key={t} className="whitespace-nowrap p-4 font-medium">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr
                  key={x.item.id}
                  className="border-b border-pi-line hover:bg-pi-row-hover"
                >
                  <td className="p-4">
                    <input
                      aria-label={`Select ${x.item.form.invoiceNo}`}
                      type="checkbox"
                      checked={selected.includes(x.item.id)}
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, x.item.id]
                            : ids.filter((id) => id !== x.item.id)
                        )
                      }
                    />
                  </td>
                  <td className="p-4">
                    <button
                      className="text-pi-brand"
                      onClick={() => onOpen(x.item)}
                    >
                      {x.item.form.invoiceNo}
                    </button>
                  </td>
                  <td className="p-4">{x.item.form.party}</td>
                  <td className="p-4 tabular-nums">{x.days}</td>
                  <td className="p-4 tabular-nums">{rupees(x.outstanding)}</td>
                  <td className="p-4 text-pi-faint">
                    {x.reminder ? `Reminded ${x.reminder.at}` : "Not reminded"}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="outline"
                      disabled={!!neo.busy}
                      onClick={() => draft([x.item.id])}
                    >
                      Draft reminder
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Collections;
