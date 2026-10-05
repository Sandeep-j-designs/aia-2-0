import React from "react";
import { Plus } from "@/components/icons";
import Typography from "@/components/common/typography";
import RupeeInput from "@/components/common/rupee-input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The sales invoice's three tables. Figma node 12759:94644.
 *
 * All three share one grid, taken from the frames: a 40px head on the
 * secondary ground in 14/500 muted, 74px body rows, every column ruled on its
 * left, and a 30px action column at each end — a checkbox at the head of the
 * row and a kebab at its tail.
 *
 * Item Details is 1577px of columns. That is wider than the frame that holds
 * it, so it scrolls sideways in the design too; it is not something to design
 * around here.
 */

export const HEAD_ROW = "bg-accent";
export const HEAD_CELL = cn(
  "h-10 border-b border-l border-neutral-gray px-3 align-middle",
  "text-sm font-medium leading-5 text-muted-foreground whitespace-nowrap"
);
export const BODY_CELL =
  "h-[74px] border-b border-l border-neutral-gray px-3 py-3 align-middle";
/** The leading checkbox and trailing kebab columns. */
export const GUTTER_CELL = "w-[30px] min-w-[30px] px-0 text-center";

export const Th = ({
  className,
  children,
  align,
}: {
  className?: string;
  children?: React.ReactNode;
  align?: "right";
}) => (
  <th
    scope="col"
    className={cn(HEAD_CELL, align === "right" && "text-right", className)}
  >
    {children}
  </th>
);

export const Td = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => <td className={cn(BODY_CELL, className)}>{children}</td>;

/** The row kebab. The design draws the glyph; these are its actions. */
export const RowMenu = ({
  onDuplicate,
  onRemove,
}: {
  onDuplicate: () => void;
  onRemove: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Row actions"
        className="mx-auto h-7 w-7 text-secondary-foreground"
      >
        ⋮
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onDuplicate}>Duplicate row</DropdownMenuItem>
      <DropdownMenuItem
        className="text-danger-action focus:text-danger-action"
        onClick={onRemove}
      >
        Remove row
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

/** A picker sized for a table cell — 28px, 12px type, as the frames draw it. */
export const CellSelect = ({
  value,
  options,
  placeholder,
  disabled,
  invalid,
  label,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
  onChange: (v: string) => void;
}) => (
  <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
    <SelectTrigger
      aria-label={label}
      className={cn("h-8 text-xs", invalid && "border-destructive-foreground")}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {[...new Set([value, ...options].filter(Boolean))].map((o) => (
        <SelectItem key={o} value={o} className="text-xs">
          {o}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const CellInput = ({
  value,
  placeholder,
  disabled,
  label,
  onChange,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  label: string;
  onChange: (v: string) => void;
}) => (
  <Input
    aria-label={label}
    className="h-8 text-xs"
    placeholder={placeholder}
    readOnly={disabled}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

/** A plain number cell — quantity, and the discount percentage. */
export const CellNumber = ({
  value,
  disabled,
  label,
  suffix,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  label: string;
  suffix?: string;
  onChange: (v: number) => void;
}) => (
  <div className="relative">
    <Input
      aria-label={label}
      type="number"
      min="0"
      step="any"
      className={cn("h-8 text-right text-xs tabular-nums", suffix && "pr-6")}
      readOnly={disabled}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
    {suffix ? (
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-secondary-foreground">
        {suffix}
      </span>
    ) : null}
  </div>
);

export const CellMoney = ({
  value,
  disabled,
  label,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  label: string;
  onChange: (v: number) => void;
}) => (
  <RupeeInput
    aria-label={label}
    value={value}
    disabled={disabled}
    className="h-8 text-xs"
    onChange={onChange}
  />
);

/** The section heading the frames put over each table, at 20/24 600 muted. */
export const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="h6"
    weight="semibold"
    className="text-secondary-foreground"
  >
    {children}
  </Typography>
);

export const AddRowButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  // `self-start`: these sit in a flex column, which stretches its children —
  // so a tertiary action 159px wide in the frame was spanning the whole table
  // and reading as a band rather than a link.
  <Button
    variant="ghost"
    size="sm"
    className="w-fit self-start text-primary"
    onClick={onClick}
  >
    <Plus className="h-4 w-4" />
    {children}
  </Button>
);

/** The head checkbox and the per-row one, in the 30px gutter columns. */
export const GutterCheckbox = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) => (
  <Checkbox
    aria-label={label}
    className="mx-auto"
    checked={checked}
    onCheckedChange={(v) => onChange(!!v)}
  />
);
