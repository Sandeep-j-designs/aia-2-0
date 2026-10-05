import React from "react";
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Props = {
  isSelected: boolean;
  isMultiSelect: boolean;
};

const MultiSelectIcon = ({ isSelected, isMultiSelect }: Props) =>
  isMultiSelect ? (
    <div
      className={cn(
        "mr-2 flex h-[18px] w-[18px] items-center justify-center rounded-xs border",
        isSelected
          ? "border-pi-brand bg-pi-brand text-primary-foreground"
          : "border-pi-line-strong bg-background [&_svg]:invisible"
      )}
    >
      <CheckIcon className={cn("h-3 w-3")} />
    </div>
  ) : null;

export default MultiSelectIcon;
