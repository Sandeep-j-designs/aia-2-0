import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader } from "@/components/icons";

import { cn } from "@/lib/utils/index";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 box-border whitespace-nowrap rounded-sm border border-transparent text-[13px] font-medium tracking-[0.002em] shadow-none transition-[background-color,color,opacity,border-color,box-shadow] duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Precision Indigo "lit edge" primary: a solid brand fill wrapped in
        // a 1px border of the same hue one step lighter. Only the fill moves
        // per state; the edge holds.
        default:
          "border-pi-btn-primary-edge bg-pi-btn-fill text-white hover:bg-pi-btn-fill-hover active:bg-pi-btn-fill-active",
        primary:
          "border-pi-btn-primary-edge bg-pi-btn-fill text-white hover:bg-pi-btn-fill-hover active:bg-pi-btn-fill-active",
        destructive:
          "bg-danger-action text-white hover:opacity-90",
        // Secondaries stay neutral: surface, interactive border, contact shadow.
        outline:
          "border-pi-line-2 bg-background text-foreground shadow-contact hover:border-pi-line-strong",
        secondary:
          "border-pi-line-2 bg-background text-foreground shadow-contact hover:border-pi-line-strong",
        ghost: "bg-transparent text-pi-body hover:bg-pi-fill hover:text-foreground",
        link: "rounded-none border-0 bg-transparent text-primary underline-offset-[3px] hover:underline",
        "link-secondary":
          "rounded-none border-0 bg-transparent text-muted-foreground underline-offset-[3px] hover:underline",
      },
      isDestructive: { true: "", false: "" },
      size: {
        default: "h-9 px-4",
        sm: "h-7 px-3 text-[13px]",
        lg: "h-9 px-5",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0 text-label-3",
        "icon-xs": "h-6 w-6 p-0",
        "icon-xss": "h-5 w-5 p-0",
      },
    },
    compoundVariants: [
      {
        isDestructive: true,
        variant: ["default", "primary"],
        className:
          "bg-danger-action text-white hover:opacity-90",
      },
      {
        isDestructive: true,
        variant: "secondary",
        className:
          "border-pi-danger-line bg-destructive text-destructive-foreground hover:border-pi-danger",
      },
      {
        isDestructive: true,
        variant: "outline",
        className:
          "border-pi-danger-line text-destructive-foreground hover:bg-destructive",
      },
      {
        isDestructive: true,
        variant: "ghost",
        className: "text-destructive-foreground hover:bg-destructive",
      },
      {
        isDestructive: true,
        variant: ["link", "link-secondary"],
        className: "text-destructive-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loadingIndicator?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      isDestructive,
      leadingIcon,
      trailingIcon,
      size,
      children,
      loadingIndicator,
      loading = false,
      asChild = false,
      disabled = false,
      onClickCapture,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, isDestructive, className })
        )}
        ref={ref}
        disabled={loading || disabled}
        aria-busy={loading}
        {...props}
        aria-disabled={loading || disabled || undefined}
        onClickCapture={(event) => {
          if (loading || disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClickCapture?.(event);
        }}
      >
        {loading
          ? loadingIndicator || (
              <Loader aria-hidden="true" className="animate-spin" />
            )
          : leadingIcon}
        <Slottable>{children}</Slottable>
        {trailingIcon}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
