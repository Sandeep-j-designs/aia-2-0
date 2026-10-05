import React, { ReactNode } from "react";
import { CommandGroup, CommandItem } from "../../ui/command";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import MultiSelectIcon from "./multi-select-icon";
import OptionIcon from "./option-icon";
import OptionLabel from "./option-label";
import SingleSelectIcon from "./single-select-icon";
import type { ComboBoxOption, ComboBoxOptionGroup } from "@/types/components";
import type { ComboBoxSize } from "./panel";

type Props<TValue extends string | number> = {
  isMultiSelect: boolean;
  onClick: (event: React.MouseEvent) => void;
  onSelect: (option: ComboBoxOption<TValue>) => void;
  optionActions?: (option: ComboBoxOption<TValue>) => ReactNode;
  optionGroups?: ComboBoxOptionGroup<TValue>[];
  options: ComboBoxOption<TValue>[];
  selectedValues: TValue[];
  size?: ComboBoxSize;
  title: string;
};

const ComboBoxOptionItem = <TValue extends string | number>({
  index,
  isMultiSelect,
  isSelected,
  onClick,
  onSelect,
  option,
  optionActions,
  size = "md",
  title,
}: {
  index: number;
  isMultiSelect: boolean;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => void;
  onSelect: (option: ComboBoxOption<TValue>) => void;
  option: ComboBoxOption<TValue>;
  optionActions?: (option: ComboBoxOption<TValue>) => ReactNode;
  size?: ComboBoxSize;
  title: string;
}) => {
  const titleId = title.toLowerCase().replace(/\s+/g, "-");
  const item = (
    <CommandItem
      // Bloocks Combobox row: 16/24 in a 40px row (md), or the Bloocks menu
      // row, 14/20 in 36px (sm), for pickers opened from a table cell. A
      // neutral tint under the cursor, the selected row in the brand's subtle
      // fill with a ticked circle.
      value={String(option.value)}
      data-testid={`${titleId}-option-${index.toString().replace(/\s+/g, "-")}`}
      className={cn(
        "group cursor-pointer gap-2 rounded-sm px-3 py-2 text-pi-ink data-[selected=true]:bg-pi-fill data-[selected=true]:text-pi-ink",
        isSelected &&
          "bg-pi-brand-tint font-medium text-pi-brand data-[selected=true]:bg-pi-brand-tint data-[selected=true]:text-pi-brand",
        option.disabled &&
          "cursor-not-allowed opacity-50 data-[selected=true]:bg-transparent"
      )}
      disabled={option.disabled}
      onSelect={() => {
        onSelect(option);
      }}
      onClick={onClick}
    >
      <MultiSelectIcon isMultiSelect={isMultiSelect} isSelected={isSelected} />
      <OptionIcon icon={option.icon} isSelected={isSelected} />
      <OptionLabel label={option.label} isSelected={isSelected} size={size} />

      <SingleSelectIcon isMultiSelect={isMultiSelect} isSelected={isSelected} />
      {optionActions ? (
        <div className={isSelected ? "" : "ml-auto"}>
          {optionActions(option)}
        </div>
      ) : null}
    </CommandItem>
  );

  return (
    <div
      id={`${titleId}-option-${option.value.toString().replace(/\s+/g, "-")}`}
    >
      {option.tooltip ? (
        <Tooltip message={option.tooltip} side="right" align="start">
          <div className={cn(option.disabled && "cursor-not-allowed")}>
            {item}
          </div>
        </Tooltip>
      ) : (
        item
      )}
    </div>
  );
};

const ComboBoxOptionList = <TValue extends string | number>({
  isMultiSelect,
  onClick,
  onSelect,
  optionActions,
  optionGroups,
  options,
  selectedValues,
  size,
  title,
}: Props<TValue>) => {
  const renderOption = (option: ComboBoxOption<TValue>, index: number) => (
    <ComboBoxOptionItem
      key={option.value}
      index={index}
      isMultiSelect={isMultiSelect}
      isSelected={selectedValues.includes(option.value)}
      onClick={onClick}
      onSelect={onSelect}
      option={option}
      optionActions={optionActions}
      size={size}
      title={title}
    />
  );

  if (optionGroups?.length) {
    let optionIndex = 0;

    return (
      <>
        {optionGroups.map((group, groupIndex) => (
          <CommandGroup
            key={groupIndex}
            heading={group.label}
            // Headings at 12/16 so they read as labels, not footnotes; every
            // group after the first gets a hairline so the sets stay apart.
            className="p-0 [&:not(:first-child)]:mt-1 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-pi-line [&:not(:first-child)]:pt-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-pi-faint"
          >
            {group.options.map((option) => renderOption(option, optionIndex++))}
          </CommandGroup>
        ))}
      </>
    );
  }

  return (
    <CommandGroup className="p-0">
      {options.map((option, index) => renderOption(option, index))}
    </CommandGroup>
  );
};

export default ComboBoxOptionList;
