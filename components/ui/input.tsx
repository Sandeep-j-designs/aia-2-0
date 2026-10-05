import * as React from "react";
import { cn } from "@/lib/utils";
import Typography from "../common/typography";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const autoComplete = props.autoComplete ?? "off";

    return (
      <div className="flex flex-col w-full">
        <input
          autoComplete={autoComplete}
          data-slot="input"
          type={type}
          className={cn(
            "flex h-9 w-full rounded-sm border border-pi-line-2 bg-background p-[var(--pad-control)] text-[13px] text-foreground transition-colors file:border-0 file:bg-transparent file:text-body-3 file:font-medium placeholder:text-pi-faint focus-visible:outline-none focus-visible:border-pi-brand focus-visible:shadow-[0_0_0_3px_rgba(67,88,191,0.2)] disabled:cursor-not-allowed disabled:opacity-60",
            "data-[invalid=true]:border-destructive-foreground data-[invalid=true]:focus:border-destructive-foreground data-[invalid=true]:hover:border-destructive-foreground",
            error
              ? "border-destructive-foreground focus:border-destructive-foreground hover:border-destructive-foreground"
              : "",
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? (
          <Typography
            variant="sm"
            className="text-destructive-foreground mt-0.5 leading-0"
          >
            {error}
          </Typography>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
