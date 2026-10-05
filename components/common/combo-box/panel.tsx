import React, { ReactNode, useState } from "react";
import { Loader2, Plus, Search } from "@/components/icons";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../ui/command";
import { Input } from "../../ui/input";
import { cn } from "@/lib/utils";
import ComboBoxOptionList from "./option-list";
import type { ComboBoxOption, ComboBoxOptionGroup } from "@/types/components";

/**
 * PROTOTYPE ADDITION — not in aiaccountant-app's combo-box.
 *
 * The popover body of ComboBox (search, option list, empty state, footer),
 * lifted out so a picker with its own trigger — a table cell, a toolbar
 * button — shows exactly the same list. ComboBox renders it too, so there is
 * one list in the app. Styled to the Bloocks Combobox:
 * https://ajaymon12.github.io/Bloocks-Design-system/?path=/docs/components-combobox--docs
 */
/**
 * `md` is the Bloocks Combobox (16/24 options), for form fields. `sm` uses the
 * Bloocks menu row (14/20 in 36px) for pickers opened from a table cell, where
 * the md list comes out a size larger than the cell that opened it.
 */
export type ComboBoxSize = "md" | "sm";

/** The popover around the panel: a Precision Indigo menu — 8px corners, the
    line hairline and the shadow-2 overlay lift. */
export const COMBO_BOX_POPOVER_CLASS =
  "overflow-hidden rounded-md border-pi-line p-0 shadow-pi-2";

export type ComboBoxPanelProps<TValue extends string | number> = {
  title: string;
  options: ComboBoxOption<TValue>[];
  optionGroups?: ComboBoxOptionGroup<TValue>[];
  selectedValues: TValue[];
  onSelect: (option: ComboBoxOption<TValue>) => void;
  isMultiSelect?: boolean;
  hasSearch?: boolean;
  /** Server-side search. Without it the panel filters the options itself. */
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  emptyDataText?: string;
  /** Receives the search text, so "Create" can be seeded with it. */
  actionLabel?: string | ((query: string) => ReactNode);
  onAction?: (query: string) => void;
  actionIcon?: React.ComponentType<{ className?: string }>;
  onClearAll?: () => void;
  optionActions?: (option: ComboBoxOption<TValue>) => ReactNode;
  dataTestId?: string;
  size?: ComboBoxSize;
};

const labelText = <TValue,>(option: ComboBoxOption<TValue>) =>
  typeof option.label === "string" ? option.label : String(option.value);

const ComboBoxPanel = <TValue extends string | number>({
  title,
  options,
  optionGroups,
  selectedValues,
  onSelect,
  isMultiSelect = false,
  hasSearch = true,
  onSearch,
  searchPlaceholder,
  loading = false,
  emptyDataText,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  onClearAll,
  optionActions,
  dataTestId,
  size = "md",
}: ComboBoxPanelProps<TValue>) => {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();

  // The panel filters by label itself (cmdk's own filter is off): it has to
  // know when nothing matched, to show the empty state beside an action row
  // that is always there.
  const matches = (option: ComboBoxOption<TValue>) =>
    onSearch || !needle || labelText(option).toLowerCase().includes(needle);
  const visibleGroups = optionGroups
    ?.map((group) => ({ ...group, options: group.options.filter(matches) }))
    .filter((group) => group.options.length);
  const visibleOptions = options.filter(matches);
  const nothingVisible = optionGroups?.length
    ? !visibleGroups?.length
    : !visibleOptions.length;

  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const action = actionLabel && onAction;

  return (
    <Command shouldFilter={false} className="bg-background">
      {hasSearch ? (
        onSearch ? (
          <div className="flex items-center border-b border-pi-line px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-pi-faint" />
            <Input
              placeholder={searchPlaceholder ?? title}
              className="h-10 border-none p-0 font-normal shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:shadow-none"
              onChange={(event) => {
                setQuery(event.target.value);
                onSearch(event.target.value);
              }}
            />
          </div>
        ) : (
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder ?? title}
            aria-label={searchPlaceholder ?? title}
            className="font-normal"
            wrapperClassName="!border-pi-line"
          />
        )
      ) : null}

      <CommandList className="max-h-[260px] p-1">
        {loading ? (
          <div
            className="flex items-center gap-2 px-3 py-3 text-[13px] text-pi-faint"
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
            Loading…
          </div>
        ) : nothingVisible ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <Search className="h-5 w-5 text-pi-faint" aria-hidden />
            <p className="text-[13px] text-pi-faint">
              {emptyDataText ??
                (trimmed ? `No matches for “${trimmed}”` : "No options")}
            </p>
          </div>
        ) : (
          <ComboBoxOptionList
            isMultiSelect={isMultiSelect}
            onClick={stop}
            onSelect={onSelect}
            optionActions={optionActions}
            optionGroups={visibleGroups}
            options={visibleOptions}
            selectedValues={selectedValues}
            size={size}
            title={title}
          />
        )}
      </CommandList>

      {action || (isMultiSelect && onClearAll && selectedValues.length) ? (
        <div className="bg-background">
          <CommandSeparator className="bg-pi-line" />
          {action ? (
            <CommandGroup className="p-1">
              <CommandItem
                value="__combo-box-action"
                data-testid={dataTestId ? `${dataTestId}-action` : undefined}
                onSelect={() => onAction(trimmed)}
                onClick={stop}
                className="cursor-pointer gap-2 rounded-sm px-3 py-2 font-medium text-pi-brand data-[selected=true]:bg-pi-brand-tint data-[selected=true]:text-pi-brand"
              >
                <ActionIcon className="h-4 w-4 flex-none" />
                <span className="truncate">
                  {typeof actionLabel === "function"
                    ? actionLabel(trimmed)
                    : actionLabel}
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
          {isMultiSelect && onClearAll && selectedValues.length ? (
            <CommandGroup className="p-1">
              <CommandItem
                value="__combo-box-clear"
                onSelect={onClearAll}
                onClick={stop}
                className="cursor-pointer justify-center rounded-sm py-2 text-pi-body data-[selected=true]:bg-pi-fill data-[selected=true]:text-pi-ink"
              >
                Clear Selection
              </CommandItem>
            </CommandGroup>
          ) : null}
        </div>
      ) : null}
    </Command>
  );
};

export default ComboBoxPanel;
