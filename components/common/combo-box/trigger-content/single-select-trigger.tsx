import { ReactNode } from "react";
import Typography from "../../typography";
import { cn } from "@/lib/utils";

interface OptionType<TValue> {
  label: string | ReactNode;
  value: TValue;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BaseProps {
  title: string;
  icon?: ReactNode;
  className?: string;
}

interface SingleSelectProps<TValue> extends BaseProps {
  selectedValue: TValue;
  options: OptionType<TValue>[];
  formatTriggerLabel?: (label: string | ReactNode) => ReactNode;
}
const SingleSelectTrigger = <TValue extends string | number>({
  title,
  selectedValue,
  options,
  icon,
  className,
  formatTriggerLabel,
}: SingleSelectProps<TValue>) => {
  const selectedOption = options.find(
    (option) => option.value === selectedValue
  );
  const label = selectedOption
    ? formatTriggerLabel
      ? formatTriggerLabel(selectedOption.label)
      : selectedOption.label
    : title;

  return (
    <div className="flex items-center justify-between gap-1 w-full">
      {typeof label === "string" ? (
        <Typography
          variant="sm"
          className={cn(
            "font-normal truncate",
            // PROTOTYPE: the title stands in as a placeholder, so it reads as one.
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          {label}
        </Typography>
      ) : (
        <div className={cn("min-w-0 flex-1 font-normal", className)}>
          {label}
        </div>
      )}
      <div className="flex items-center">{icon}</div>
    </div>
  );
};

export default SingleSelectTrigger;
