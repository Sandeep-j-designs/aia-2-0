import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import Typography from "@/components/common/typography";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props<TValue> {
  isMultiSelect: boolean;
  title: string;
  selectedValues: TValue[];
  options: {
    label: string | ReactNode;
    value: TValue;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  selectedValue: TValue | TValue[];
  icon?: ReactNode;
  className?: string;
  showSelectedValuesInTrigger?: boolean; // New prop to toggle display mode
}

const RenderTriggerContent = <TValue extends string | number>({
  isMultiSelect,
  title,
  selectedValues,
  options,
  selectedValue,
  icon,
  className,
  showSelectedValuesInTrigger = false, // Default to false (current behavior)
}: Props<TValue>) => {
  if (isMultiSelect) {
    if (showSelectedValuesInTrigger) {
      // New behavior: Show selected values as a comma-separated list
      const displayText =
        selectedValues.length > 0
          ? selectedValues
              .map((val) => {
                const option = options.find((opt) => opt.value === val);
                return typeof option?.label === "string"
                  ? option?.label
                  : String(option?.label);
              })
              .join(", ")
          : title;

      return (
        <>
          <Typography
            variant={"sm"}
            className={cn("text-secondary-foreground truncate", className)}
          >
            {displayText}
          </Typography>
          <div className="flex items-center">{icon}</div>
        </>
      );
    } else {
      // Current behavior: Show title with badge
      return (
        <>
          <Typography
            variant={"sm"}
            className="text-secondary-foreground flex items-center"
          >
            {title}
          </Typography>
          <div className="flex items-center">{icon}</div>
          {selectedValues.length > 0 ? (
            <div className="flex items-center">
              <Separator
                orientation="vertical"
                className="mx-2 h-4 bg-secondary-foreground"
              />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal text-primary border !w-8 flex justify-center items-center"
              >
                {selectedValues.length}
              </Badge>
            </div>
          ) : null}
        </>
      );
    }
  } else {
    // Single-select mode: Show the selected label
    const selectedOption = options.find(
      (option) => option.value === selectedValue
    );
    return (
      <>
        <Typography
          variant={"sm"}
          className={cn("text-secondary-foreground truncate", className)}
        >
          {selectedOption ? selectedOption.label : title}
        </Typography>
        <div className="flex items-center">{icon}</div>
      </>
    );
  }
};

export default RenderTriggerContent;
