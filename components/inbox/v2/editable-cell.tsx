import React from "react";
import { ChevronDown } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ComboBoxPanel, {
  COMBO_BOX_POPOVER_CLASS,
} from "@/components/common/combo-box/panel";
import { cn } from "@/lib/utils";

/**
 * Inline single-select. The trigger is the cell's own compact one — a full
 * field does not fit a table row — but the list is the shared ComboBox panel,
 * so it marks the current value, searches, and offers "+ Create" the same way
 * every other picker in the app does.
 */
export default function EditableCell({
  label,
  value,
  options,
  groups,
  editable,
  onChange,
  open,
  onOpenChange,
  onClosed,
  onCreate,
  createNoun = "option",
  className,
}: {
  label: string;
  value: string;
  options: readonly string[];
  /**
   * Show the options under headings instead of as one list. `options` is
   * still what the cell accepts; the groups only lay the list out.
   */
  groups?: { heading: string; options: readonly string[] }[];
  editable: boolean;
  onChange: (value: string) => boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Where focus should go when this closes. Given one, the trigger does not
   * take focus back: this cell sits inside a grid that owns the arrow keys and
   * stops key events reaching it from within, so focus parked on the trigger
   * is focus the grid cannot navigate from.
   */
  onClosed?: () => void;
  /** "+ Create …" at the foot of the list, seeded with the search text. */
  onCreate?: (query: string) => void;
  /** What the create row makes, e.g. "vendor". */
  createNoun?: string;
  /** Extra classes for the trigger, e.g. to align it with its column. */
  className?: string;
}) {
  if (!editable)
    return (
      <div className="truncate" title={value}>
        {value || "—"}
      </div>
    );
  const choices = [...new Set([value, ...options].filter(Boolean))];
  const toOption = (choice: string) => ({ label: choice, value: choice });
  const pick = (choice: string) => {
    if (choice === value || onChange(choice)) onOpenChange(false);
  };
  return (
    <div
      className="min-w-0"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Edit ${label}`}
            aria-expanded={open}
            className={cn(
              // The ring is inset because the cell that holds this button
              // clips: the td and the 49px box inside it are both
              // overflow-hidden, and the button is w-full, so an outset ring
              // has nowhere to go sideways. It came out as a box missing its
              // left and right edges — top and bottom strokes with four corner
              // arcs and two gaps where the sides should be. Inset also
              // matches the grid cursor, which rings the cell the same way.
              "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md px-1 text-left text-xs font-normal hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              open && "bg-accent/60 ring-1 ring-inset ring-ring",
              className
            )}
            title={value || `Select ${label}`}
          >
            <span
              className={cn(
                "min-w-0 truncate",
                !value && "text-secondary-foreground"
              )}
            >
              {value || "Select…"}
            </span>
            <ChevronDown
              aria-hidden
              className="h-3 w-3 shrink-0 text-secondary-foreground"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className={cn(
            "w-[240px] max-w-[calc(100vw-24px)]",
            COMBO_BOX_POPOVER_CLASS
          )}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onCloseAutoFocus={(event) => {
            if (!onClosed) return;
            // Radix's own restore would put focus on the trigger. Taking the
            // default lets the caller decide where the cursor carries on from.
            event.preventDefault();
            onClosed();
          }}
        >
          <ComboBoxPanel
            title={label}
            size="sm"
            searchPlaceholder={`Search ${label.toLowerCase()}…`}
            options={choices.map(toOption)}
            optionGroups={groups?.map((group) => ({
              label: group.heading,
              options: group.options.map(toOption),
            }))}
            selectedValues={value ? [value] : []}
            onSelect={(option) => pick(String(option.value))}
            actionLabel={
              onCreate
                ? (query) =>
                    query
                      ? `Create ${createNoun} “${query}”`
                      : `Create ${createNoun}`
                : undefined
            }
            onAction={
              onCreate
                ? (query) => {
                    onOpenChange(false);
                    onCreate(query);
                  }
                : undefined
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
