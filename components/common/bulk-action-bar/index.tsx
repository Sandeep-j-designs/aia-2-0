import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ComboBoxPanel, {
  COMBO_BOX_POPOVER_CLASS,
} from "@/components/common/combo-box/panel";
import { cn } from "@/lib/utils";
import type { ComboBoxOption, ComboBoxOptionGroup } from "@/types/components";

/**
 * PROTOTYPE ADDITION — not in aiaccountant-app, whose bulk bars are
 * feature-local (transactions/common/table/floating-bar, the AR bulk-edit bar).
 *
 * The bar that comes up over a table while rows are selected, after the
 * Bloocks BulkActionBar:
 * https://ajaymon12.github.io/Bloocks-Design-system/?path=/docs/components-bulkactionbar--docs
 *
 * Count · Select all · fields that set a value on every selected row · the
 * module's actions · Delete · ×. Fields past `maxVisibleFields` scroll
 * sideways, one field per chevron press. Everything on the bar is the compact
 * 28px size, so the bar stays one short line over the rows it acts on.
 *
 * Placement is the caller's: the Bloocks table centres it, sticky, 16px off
 * the bottom of the scroll area.
 */
export type BulkEditField = {
  key: string;
  /** The field's placeholder and accessible name, e.g. "Vendor". */
  label: string;
  options: ComboBoxOption<string>[];
  /** Lay the options out under headings. */
  optionGroups?: ComboBoxOptionGroup<string>[];
  /** The value picked for every selected row. Empty until picked. */
  value?: string;
  isDisabled?: boolean;
  /**
   * PROTOTYPE: "+ Create …" at the foot of the list, seeded with the search
   * text. Not in Bloocks, whose fields only pick.
   */
  onCreate?: (query: string) => void;
  /** What the create row makes, e.g. "vendor". */
  createNoun?: string;
};

export type BulkAction = {
  label: React.ReactNode;
  onClick: () => void;
  /** "primary" for the main action; defaults to "secondary". */
  variant?: "primary" | "secondary";
  isDisabled?: boolean;
  isLoading?: boolean;
  leadingIcon?: React.ReactNode;
};

type Props = {
  selectedCount: number;
  /** Rows that could be selected. With onSelectAll, offers "Select all N". */
  totalCount?: number;
  onSelectAll?: () => void;
  fields?: BulkEditField[];
  onFieldChange?: (key: string, value: string) => void;
  /** Fields visible before the strip scrolls. */
  maxVisibleFields?: number;
  /** In order after the fields, e.g. a secondary and a primary action. */
  actions?: BulkAction[];
  /** Shows the delete button. Confirming is the caller's job. */
  onDelete?: () => void;
  deleteLabel?: string;
  /** The × — deselects everything, which dismisses the bar. */
  onClearSelection: () => void;
  className?: string;
};

const FIELD_WIDTH = 130;
const FIELD_GAP = 8;
/** Bloocks' compact bar button: the md label with 4px vertical padding. */
const COMPACT = "h-7 py-1";

/** Whether the field strip overflows, and whether it sits at either end. */
const useScrollEdges = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({
    overflows: false,
    atStart: true,
    atEnd: true,
  });
  const update = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const next = {
      overflows: node.scrollWidth > node.clientWidth + 1,
      atStart: node.scrollLeft <= 1,
      atEnd: node.scrollLeft + node.clientWidth >= node.scrollWidth - 1,
    };
    setEdges((prev) =>
      prev.overflows === next.overflows &&
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd
        ? prev
        : next
    );
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [update]);
  return { ref, edges, update };
};

const Divider = () => (
  <span aria-hidden className="h-5 w-px flex-none bg-pi-line" />
);

const ScrollButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="inline-flex size-6 flex-none items-center justify-center rounded-xs bg-pi-brand-tint text-pi-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
  >
    {children}
  </button>
);

/** A compact Combobox: the field's label until a value is picked. */
const FieldPicker = ({
  field,
  onChange,
}: {
  field: BulkEditField;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const noun = field.createNoun ?? field.label.toLowerCase();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={field.label}
          disabled={field.isDisabled}
          title={field.value ? `${field.label}: ${field.value}` : undefined}
          style={{ width: FIELD_WIDTH }}
          className={cn(
            "flex h-7 flex-none items-center gap-1 rounded-sm border bg-background px-2 text-left text-[13px] shadow-contact transition-colors motion-reduce:transition-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "data-[state=open]:border-pi-brand",
            field.value
              ? "border-pi-brand-border text-pi-ink"
              : "border-pi-line-2 text-pi-faint hover:border-pi-line-strong",
            field.isDisabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {field.value || field.label}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 flex-none text-pi-faint transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className={cn("w-[260px]", COMBO_BOX_POPOVER_CLASS)}
      >
        <ComboBoxPanel
          title={field.label}
          searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
          options={field.options}
          optionGroups={field.optionGroups}
          selectedValues={field.value ? [field.value] : []}
          onSelect={(option) => {
            setOpen(false);
            onChange(String(option.value));
          }}
          actionLabel={
            field.onCreate
              ? (query) =>
                  query ? `Create ${noun} “${query}”` : `Create ${noun}`
              : undefined
          }
          onAction={
            field.onCreate
              ? (query) => {
                  setOpen(false);
                  field.onCreate?.(query);
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
};

const BulkActionBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  fields = [],
  onFieldChange,
  maxVisibleFields = 3,
  actions = [],
  onDelete,
  deleteLabel = "Delete selected",
  onClearSelection,
  className,
}: Props) => {
  const { ref, edges, update } = useScrollEdges();
  const canSelectAll =
    !!onSelectAll && totalCount !== undefined && selectedCount < totalCount;
  const hasActions = actions.length > 0 || !!onDelete;
  const step = (direction: 1 | -1) =>
    ref.current?.scrollBy({
      left: direction * (FIELD_WIDTH + FIELD_GAP),
      behavior: "smooth",
    });

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className={cn(
        // A Precision Indigo overlay: card corners, the line hairline and the
        // shadow-2 lift, so it reads as floating over the rows.
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-pi-line bg-background p-3 shadow-pi-2",
        className
      )}
    >
      <span
        aria-live="polite"
        className="flex-none whitespace-nowrap px-1 text-[13px] font-medium tabular-nums text-pi-ink"
      >
        {selectedCount} selected
      </span>
      {canSelectAll ? (
        <Button
          variant="secondary"
          leadingIcon={<CheckCheck className="!size-3.5" aria-hidden />}
          onClick={onSelectAll}
          className={cn(COMPACT, "flex-none")}
        >
          Select all {totalCount}
        </Button>
      ) : null}

      {fields.length ? (
        <>
          <Divider />
          {edges.overflows ? (
            <ScrollButton
              label="Scroll fields left"
              disabled={edges.atStart}
              onClick={() => step(-1)}
            >
              <ChevronLeft className="h-3 w-3" aria-hidden />
            </ScrollButton>
          ) : null}
          <div
            ref={ref}
            onScroll={update}
            style={{
              maxWidth:
                maxVisibleFields * FIELD_WIDTH +
                (maxVisibleFields - 1) * FIELD_GAP,
            }}
            className="min-w-0 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max items-center gap-2">
              {fields.map((field) => (
                <FieldPicker
                  key={field.key}
                  field={field}
                  onChange={(value) => onFieldChange?.(field.key, value)}
                />
              ))}
            </div>
          </div>
          {edges.overflows ? (
            <ScrollButton
              label="Scroll fields right"
              disabled={edges.atEnd}
              onClick={() => step(1)}
            >
              <ChevronRight className="h-3 w-3" aria-hidden />
            </ScrollButton>
          ) : null}
        </>
      ) : null}

      {hasActions ? (
        <>
          <Divider />
          <div className="flex flex-none items-center gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant === "primary" ? "primary" : "secondary"}
                disabled={action.isDisabled}
                loading={action.isLoading}
                leadingIcon={action.leadingIcon}
                onClick={action.onClick}
                className={COMPACT}
              >
                {action.label}
              </Button>
            ))}
            {onDelete ? (
              <Button
                variant="outline"
                size="icon"
                isDestructive
                aria-label={deleteLabel}
                title={deleteLabel}
                onClick={onDelete}
                className="h-7 w-7"
              >
                <Trash2 aria-hidden />
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Clear selection"
        title="Clear selection"
        onClick={onClearSelection}
        className="h-7 w-7 flex-none text-pi-faint hover:bg-pi-fill hover:text-pi-ink"
      >
        <X className="!size-3.5" aria-hidden />
      </Button>
    </div>
  );
};

export default BulkActionBar;
