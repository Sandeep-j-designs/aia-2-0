import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Typography from "@/components/common/typography";
import { cn } from "@/lib/utils";

export function Tooltip({
  message,
  children,
  align = "center",
  side = "top",
  "data-testid": dataTestId,
  className = "",
  contentStyle,
}: {
  message: React.ReactNode | string;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  "data-testid"?: string;
  className?: string;
  contentStyle?: React.CSSProperties; // Add this line
}) {
  return (
    <TooltipProvider>
      <UITooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span>{children}</span>
        </TooltipTrigger>
        {message && (
          <TooltipContent
            className="max-w-[320px]"
            data-testid={dataTestId}
            align={align}
            side={side}
          >
            <Typography
              variant={"p"}
              className={cn("text-foreground", className)}
              style={{
                ...contentStyle,
              }}
            >
              {message}
            </Typography>
          </TooltipContent>
        )}
      </UITooltip>
    </TooltipProvider>
  );
}
