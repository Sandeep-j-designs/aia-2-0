import * as React from "react";
import { cn } from "@/lib/utils";
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
              ? "border-pi-danger focus:border-pi-danger hover:border-pi-danger"
              : "",
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? (
          // One 12px line under the box, on its left edge (the forms' error
          // rule, 7 Oct 2026); it used to collapse to a zero line-height.
          <p role="alert" className="mt-1.5 text-left text-[12px] leading-4 text-pi-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
