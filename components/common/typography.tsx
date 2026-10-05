import React from "react";
import { cn } from "@/lib/utils";
import { TypographyVariant, TypographyWeight } from "@/types/components";

export type TypographyProps = {
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  className?: string;
  children: React.ReactNode;
  id?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
};

const variantClasses = {
  h1: "scroll-m-20 text-h1",
  h2: "scroll-m-20 text-h2",
  h3: "scroll-m-20 text-h3",
  h4: "scroll-m-20 text-h4",
  h5: "scroll-m-20 text-h5",
  h6: "scroll-m-20 text-h6",
  p: "text-body-3",
  small: "text-body-4",
  xs: "text-caption-1",
  "title-1": "text-title-1",
  "title-2": "text-title-2",
  "title-3": "text-title-3",
  "label-1": "text-label-1",
  "label-2": "text-label-2",
  "label-3": "text-label-3",
  "body-1": "text-body-1",
  "body-2": "text-body-2",
  "body-3": "text-body-3",
  "body-4": "text-body-4",
  "caption-1": "text-caption-1",
  "caption-2": "text-caption-2",
  blockquote: "mt-6 border-l-2 pl-6 text-body-2 italic",
  code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-body-3",
};

const weightClasses = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const Typography: React.FC<TypographyProps> = ({
  variant = "p",
  weight = "normal",
  className,
  children,
  id,
  style,
  as,
  ...props
}) => {
  const internalVariant = variant === "sm" ? "small" : variant;
  const Component =
    as ??
    ((internalVariant === "xs" ||
    internalVariant.startsWith("label-") ||
    internalVariant.startsWith("caption-")
      ? "span"
      : internalVariant.startsWith("body-") ||
          internalVariant.startsWith("title-")
        ? "p"
        : internalVariant) as keyof JSX.IntrinsicElements);

  return (
    <Component
      id={id}
      className={cn(
        variantClasses[internalVariant],
        weightClasses[weight],
        "font-open-sans",
        className
      )}
      style={{
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Typography;
