import { ReactNode } from "react";
import SingleSelectTrigger from "./single-select-trigger";
import MultiSelectValuesTrigger from "./multi-select-values-trigger";
import MultiSelectBadgeTrigger from "./multi-select-badge-trigger";

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
  formatTriggerLabel?: (label: string | ReactNode) => ReactNode;
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
  formatTriggerLabel,
}: Props<TValue>) => {
  //   if (isMultiSelect) {
  //     if (showSelectedValuesInTrigger) {
  //       // New behavior: Show selected values as a comma-separated list
  //       const displayText =
  //         selectedValues.length > 0
  //           ? selectedValues
  //               .map((val) => {
  //                 const option = options.find((opt) => opt.value === val);
  //                 return typeof option?.label === "string"
  //                   ? option?.label
  //                   : String(option?.label);
  //               })
  //               .join(", ")
  //           : title;

  //       return (
  //         <>
  //           <Typography
  //             variant={"sm"}
  //             className={cn("text-secondary-foreground truncate", className)}
  //           >
  //             {displayText}
  //           </Typography>
  //           <div className="flex items-center">{icon}</div>
  //         </>
  //       );
  //     } else {
  //       // Current behavior: Show title with badge
  //       return (
  //         <>
  //           <Typography
  //             variant={"sm"}
  //             className="text-secondary-foreground flex items-center"
  //           >
  //             {title}
  //           </Typography>
  //           <div className="flex items-center">{icon}</div>
  //           {selectedValues.length > 0 ? (
  //             <div className="flex items-center">
  //               <Separator
  //                 orientation="vertical"
  //                 className="mx-2 h-4 bg-secondary-foreground"
  //               />
  //               <Badge
  //                 variant="secondary"
  //                 className="rounded-sm px-1 font-normal text-primary border !w-8 flex justify-center items-center"
  //               >
  //                 {selectedValues.length}
  //               </Badge>
  //             </div>
  //           ) : null}
  //         </>
  //       );
  //     }
  //   } else {
  //     // Single-select mode: Show the selected label
  //     const selectedOption = options.find(
  //       (option) => option.value === selectedValue
  //     );
  //     return (
  //       <>
  //         <Typography
  //           variant={"sm"}
  //           className={cn("text-secondary-foreground truncate", className)}
  //         >
  //           {selectedOption ? selectedOption.label : title}
  //         </Typography>
  //         <div className="flex items-center">{icon}</div>
  //       </>
  //     );
  //   }

  if (!isMultiSelect) {
    return (
      <SingleSelectTrigger
        title={title}
        selectedValue={selectedValue as TValue}
        options={options}
        icon={icon}
        className={className}
        formatTriggerLabel={formatTriggerLabel}
      />
    );
  }

  if (showSelectedValuesInTrigger) {
    return (
      <MultiSelectValuesTrigger
        title={title}
        selectedValues={selectedValues}
        options={options}
        icon={icon}
        className={className}
      />
    );
  }

  return (
    <MultiSelectBadgeTrigger
      title={title}
      selectedValues={selectedValues}
      icon={icon}
    />
  );
};

export default RenderTriggerContent;
