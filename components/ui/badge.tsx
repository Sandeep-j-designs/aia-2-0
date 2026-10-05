import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center justify-center gap-1 rounded-xs border-0 px-2 py-0.5 whitespace-nowrap font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-badge-information text-badge-information-foreground",
        secondary:
          "border-transparent bg-badge-neutral text-badge-neutral-foreground",
        destructive:
          "border-transparent bg-badge-negative text-badge-negative-foreground",
        outline: "text-foreground",
        neutral: "bg-badge-neutral text-badge-neutral-foreground",
        primary: "bg-badge-information text-badge-information-foreground",
        positive: "bg-badge-positive text-badge-positive-foreground",
        negative: "bg-badge-negative text-badge-negative-foreground",
        notice: "bg-badge-notice text-badge-notice-foreground",
        information: "bg-badge-information text-badge-information-foreground",
        success: "bg-badge-positive text-badge-positive-foreground",
        error: "bg-badge-negative text-badge-negative-foreground",
      },
      size: {
        sm: "text-caption-1",
        md: "text-label-3",
        lg: "px-3 text-label-2",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  color?:
    "neutral" | "primary" | "positive" | "negative" | "notice" | "information";
  icon?: React.ReactNode;
  maxWidth?: React.CSSProperties["maxWidth"];
}

/** Full text remains in the DOM and in the native hover tooltip. */
function labelText(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      if (React.isValidElement<{ children?: React.ReactNode }>(child))
        return labelText(child.props.children);
      return "";
    })
    .join("");
}

function Badge({
  className,
  variant,
  color,
  size,
  icon,
  maxWidth,
  children,
  title,
  ...props
}: BadgeProps) {
  const label = labelText(children);
  return (
    <span
      className={cn(
        badgeVariants({ variant: color ?? variant, size }),
        className
      )}
      title={title ?? (maxWidth !== undefined ? label : undefined)}
      {...props}
    >
      {icon && (
        <span className="inline-flex shrink-0 leading-none" aria-hidden="true">
          {icon}
        </span>
      )}
      <span
        className="min-w-0 truncate"
        style={{ maxWidth }}
        title={title ?? (maxWidth !== undefined ? label : undefined)}
      >
        {children}
      </span>
    </span>
  );
}

export { Badge, badgeVariants };
