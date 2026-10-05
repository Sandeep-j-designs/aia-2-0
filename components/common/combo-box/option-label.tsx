import React from "react";
import Typography from "@/components/common/typography";
import { cn } from "@/lib/utils";
import type { ComboBoxSize } from "./panel";

type Props = {
  label: string | React.ReactNode;
  isSelected: boolean;
  size?: ComboBoxSize;
};

const OptionLabel = ({ label, isSelected, size = "md" }: Props) => {
  const className = cn(
    "min-w-0 truncate",
    isSelected ? "font-medium text-pi-brand" : "text-pi-ink"
  );

  if (typeof label !== "string") {
    return <div className={className}>{label}</div>;
  }

  return (
    <Typography
      variant={size === "sm" ? "body-3" : "body-2"}
      className={className}
    >
      {label}
    </Typography>
  );
};

export default OptionLabel;
