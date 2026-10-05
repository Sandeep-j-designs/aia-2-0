import { ReactNode } from "react";
import Typography from "../../typography";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface BaseProps<_TValue> {
  title: string;
  icon?: ReactNode;
  className?: string;
}

interface MultiSelectBadgeProps<TValue> extends BaseProps<TValue> {
  selectedValues: TValue[];
}

const MultiSelectBadgeTrigger = <TValue extends string | number>({
  title,
  selectedValues,
  icon,
}: MultiSelectBadgeProps<TValue>) => {
  return (
    <>
      <Typography
        variant="sm"
        className="text-secondary-foreground flex items-center"
      >
        {title}
      </Typography>
      <div className="flex items-center">{icon}</div>
      {selectedValues.length > 0 && (
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
      )}
    </>
  );
};

export default MultiSelectBadgeTrigger;
