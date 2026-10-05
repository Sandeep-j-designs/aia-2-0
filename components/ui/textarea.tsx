import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-sm border border-pi-line-2 bg-background p-[var(--pad-control)] text-[13px] placeholder:text-pi-faint focus-visible:outline-none focus-visible:border-pi-brand focus-visible:shadow-[0_0_0_3px_rgba(67,88,191,0.2)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
