import React from "react";
import { History } from "@/components/icons";
import EmptyState from "@/components/inbox/v2/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { undoActivity, useActivity } from "@/hooks/pages/inbox/use-activity";
import type { ActivityEntry } from "@/types/pages/inbox/automation";
import { dayLabel } from "@/utils/pages/notifications";
import ActivityRow from "./activity-row";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: string;
  /** The document whose history this is. */
  itemId: string;
  /** How the record is named in the head: "Bharti Airtel Ltd · BLR/2610/44871". */
  subject: string;
  /** The person using the prototype, who an Undo is attributed to. */
  user: string;
  notify: (message: string, kind?: "success" | "info") => void;
};

/**
 * One document's history, from the review screen: what the AI decided when
 * it read it and why, who changed what, who approved it, and anything
 * reversed. Newest first, by day — the same rows as Automation › Activity
 * log, narrowed to this record.
 *
 * It is what a partner opens before signing and what answers an auditor's
 * "why is this in Rent?" without leaving the voucher.
 */
const HistoryPanel = ({
  open,
  onOpenChange,
  company,
  itemId,
  subject,
  user,
  notify,
}: Props) => {
  const entries = useActivity(company, itemId);
  const days: { label: string; items: ActivityEntry[] }[] = [];
  entries.forEach((e) => {
    const label = dayLabel(e.at);
    const last = days.at(-1);
    if (last?.label === label) last.items.push(e);
    else days.push({ label, items: [e] });
  });
  const byAi = entries.filter((e) => e.actor.kind === "ai").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="space-y-1 border-b border-pi-line px-6 py-5 text-left">
          <SheetTitle className="text-[18px] font-semibold leading-7 text-pi-ink">
            History
          </SheetTitle>
          <SheetDescription className="truncate text-[13px] text-pi-body">
            {subject}
            {entries.length ? (
              <span className="text-pi-faint">
                {" · "}
                {byAi} by AI, {entries.length - byAi} by people
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {days.length ? (
            days.map((day) => (
              <section key={day.label} aria-label={day.label}>
                <h3 className="sticky top-0 z-[1] border-b border-pi-line bg-pi-head-bg px-4 py-2 text-[12px] font-medium text-pi-body">
                  {day.label}
                </h3>
                <ul className="divide-y divide-pi-line">
                  {day.items.map((e) => (
                    <li key={e.id}>
                      <ActivityRow
                        entry={e}
                        compact
                        onUndo={(x) => {
                          if (undoActivity(x.id, user))
                            notify(
                              `Undone: ${x.action.toLowerCase()}`,
                              "success"
                            );
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <EmptyState
              icon={History}
              title="Nothing recorded yet"
              body="What the AI decides on this document, and every change and approval after it, is recorded here."
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HistoryPanel;
