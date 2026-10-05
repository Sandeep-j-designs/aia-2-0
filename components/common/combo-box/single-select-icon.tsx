import { cn } from "@/lib/utils";
import { CircleCheck } from "@/components/icons";
import React from "react";

type Props = {
  isMultiSelect: boolean;
  isSelected: boolean;
};

const SingleSelectIcon = ({ isMultiSelect, isSelected }: Props) =>
  !isMultiSelect && isSelected ? (
    <div className="ml-auto flex-none">
      <CircleCheck className={cn("h-4 w-4 text-pi-brand")} />
    </div>
  ) : null;

export default SingleSelectIcon;
