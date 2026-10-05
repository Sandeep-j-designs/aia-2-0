import * as React from "react";
import { DropdownProps } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type CalendarCaptionDropdownProps = DropdownProps & {
  rangeType?: "from" | "to";
};

const CalendarCaptionDropdown = ({
  value,
  onChange,
  children,
  rangeType,
}: CalendarCaptionDropdownProps): React.ReactElement | null => {
  const options = React.Children.toArray(children) as React.ReactElement<
    React.HTMLProps<HTMLOptionElement>
  >[];
  const selected = options.find((child) => child.props.value === value);
  const suffix = rangeType ? `-${rangeType}` : "";
  let dropdownId = `calendar-month-dropdown${suffix}`;
  if (Number(selected?.props.value) >= 13) {
    dropdownId = `calendar-year-dropdown${suffix}`;
  }
  const handleChange = (value: string) => {
    const changeEvent = {
      target: { value },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(changeEvent);
  };

  return (
    <Select
      value={value?.toString()}
      onValueChange={(value) => {
        handleChange(value);
      }}
    >
      <SelectTrigger className="pr-2 focus:ring-0" data-testid={dropdownId}>
        <SelectValue>{selected?.props?.children}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper">
        <ScrollArea className="h-64">
          {options.map((option, id: number) => (
            <SelectItem
              key={`${option.props.value}-${id}`}
              value={option.props.value?.toString() ?? ""}
            >
              {option.props.children}
            </SelectItem>
          ))}
          <ScrollBar orientation="vertical" className="mt-0" />
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};

export default CalendarCaptionDropdown;
