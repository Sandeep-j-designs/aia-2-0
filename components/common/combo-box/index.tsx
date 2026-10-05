import React, {
  ComponentType,
  ForwardedRef,
  forwardRef,
  ReactElement,
  ReactNode,
  useState,
} from "react";
import { ChevronDown, X } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Button } from "../../ui/button";
import { cn } from "@/lib/utils";
import ComboBoxPanel, {
  COMBO_BOX_POPOVER_CLASS,
  type ComboBoxSize,
} from "./panel";
import RenderTriggerContent from "./trigger-content";
import type { ComboBoxOption, ComboBoxOptionGroup } from "@/types/components";

interface ComboBoxProps<TValue> {
  title: string;
  options: ComboBoxOption<TValue>[];
  optionGroups?: ComboBoxOptionGroup<TValue>[];
  selectedValue: TValue | TValue[];
  onSearch?: (value: string) => void;
  onChange: (arg0: TValue | TValue[]) => void;
  hasSearch?: boolean;
  loading?: boolean;
  isMultiSelect?: boolean;
  wrapperClassName?: string;
  triggerClassName?: string;
  id?: string;
  disabled?: boolean;
  disableIcon?: boolean;
  singleTriggerContentClassName?: string;
  emptyDataText?: string;
  dataTestId?: string;
  /**
   * PROTOTYPE: may be a function of the search text ("Create ledger “x”"), and
   * onAction receives that text. Both stay compatible with production callers.
   */
  actionLabel?: string | ((query: string) => ReactNode);
  onAction?: (query: string) => void;
  /** PROTOTYPE: search box placeholder; production uses `title`. */
  searchPlaceholder?: string;
  /** PROTOTYPE: error border, for a required field left empty. */
  invalid?: boolean;
  actionIcon?: ComponentType<{ className?: string }>;
  hideClearButton?: boolean;
  showSelectedValuesInTrigger?: boolean;
  modal?: boolean;
  formatTriggerLabel?: (label: string | ReactNode) => ReactNode;
  optionActions?: (option: ComboBoxOption<TValue>) => ReactNode;
  /** PROTOTYPE: `sm` for a ComboBox inside a table cell. See ComboBoxSize. */
  size?: ComboBoxSize;
}

function ComboBoxInner<TValue extends string | number>(
  {
    title,
    options,
    optionGroups,
    selectedValue,
    onSearch,
    onChange,
    hasSearch = true,
    loading = false,
    isMultiSelect = true,
    showSelectedValuesInTrigger = false,
    wrapperClassName,
    triggerClassName,
    id,
    disabled,
    disableIcon,
    singleTriggerContentClassName,
    size,
    emptyDataText,
    dataTestId,
    actionLabel,
    onAction,
    actionIcon: ActionIcon,
    hideClearButton,
    modal = true,
    formatTriggerLabel,
    optionActions,
    searchPlaceholder,
    invalid,
  }: ComboBoxProps<TValue>,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const [open, setOpen] = useState<boolean>(false);

  const selectedValues = Array.isArray(selectedValue)
    ? selectedValue
    : [selectedValue];
  const singleSelectedValue =
    !isMultiSelect && !Array.isArray(selectedValue) ? selectedValue : undefined;
  const hasSingleSelectValue =
    !isMultiSelect &&
    singleSelectedValue !== undefined &&
    singleSelectedValue !== null &&
    options.some((option) => option.value === singleSelectedValue);

  const handleSelect = (option: ComboBoxOption<TValue>) => {
    if (option.disabled) {
      return;
    }

    const { value } = option;
    if (isMultiSelect) {
      const updatedValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onChange(updatedValues);
    } else {
      onChange(value);
      setOpen(false);
    }
  };

  const handleClearSingleSelect = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || !hasSingleSelectValue) {
      return;
    }

    onChange("" as TValue);
  };

  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          onClick={handleItemClick}
          variant="outline"
          // Bloocks Combobox trigger: a field, not a button — input border,
          // brand border and ring while open, red when invalid.
          className={cn(
            "h-9 w-full justify-between border-input bg-background px-3 font-normal text-foreground hover:border-input-hover hover:bg-background disabled:pointer-events-auto disabled:cursor-not-allowed",
            "data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-ring/30",
            invalid &&
              "border-destructive-foreground hover:border-destructive-foreground data-[state=open]:border-destructive-foreground data-[state=open]:ring-destructive-foreground/25",
            triggerClassName
          )}
          aria-invalid={invalid || undefined}
          {...(dataTestId
            ? { id: dataTestId }
            : {
                id:
                  id ||
                  `${title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .replace(/\s+/g, "-")}-button`,
              })}
          {...(dataTestId ? { "data-testid": dataTestId } : {})}
          disabled={disabled}
        >
          <div className="flex justify-between gap-2 w-full">
            <RenderTriggerContent
              isMultiSelect={isMultiSelect}
              title={title}
              options={options}
              selectedValue={selectedValue}
              selectedValues={selectedValues}
              className={singleTriggerContentClassName}
              showSelectedValuesInTrigger={showSelectedValuesInTrigger}
              formatTriggerLabel={formatTriggerLabel}
              icon={
                hasSingleSelectValue || !disableIcon ? (
                  <div className="flex items-center gap-1">
                    {hasSingleSelectValue && !hideClearButton ? (
                      <Button
                        type="button"
                        size={"icon"}
                        variant={"ghost"}
                        className="text-secondary-foreground hover:text-primary h-6 w-6"
                        onClick={(e) => {
                          handleClearSingleSelect(e);
                        }}
                        aria-label="Clear selection"
                      >
                        <X size={16} />
                      </Button>
                    ) : null}
                    {!disableIcon ? (
                      <div
                        className={`flex align-center transition-transform duration-150 ${
                          open ? "-rotate-180" : ""
                        }`}
                      >
                        <ChevronDown className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    ) : null}
                  </div>
                ) : undefined
              }
            />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[200px]",
          COMBO_BOX_POPOVER_CLASS,
          wrapperClassName
        )}
        align="start"
        onClick={handleItemClick}
      >
        <ComboBoxPanel
          title={title}
          options={options}
          optionGroups={optionGroups}
          selectedValues={selectedValues}
          onSelect={handleSelect}
          isMultiSelect={isMultiSelect}
          hasSearch={hasSearch}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
          loading={loading}
          emptyDataText={emptyDataText}
          actionLabel={actionLabel}
          onAction={
            onAction
              ? (query) => {
                  onAction(query);
                  setOpen(false);
                }
              : undefined
          }
          actionIcon={ActionIcon}
          onClearAll={() => onChange([])}
          optionActions={optionActions}
          dataTestId={dataTestId}
          size={size}
        />
      </PopoverContent>
    </Popover>
  );
}

ComboBoxInner.displayName = "ComboBox";

export const ComboBox = forwardRef(ComboBoxInner) as <
  TValue extends string | number,
>(
  props: ComboBoxProps<TValue> & {
    ref?: ForwardedRef<HTMLButtonElement>;
  }
) => ReactElement;
