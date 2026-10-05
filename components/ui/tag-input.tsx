import { cn } from "@/lib/utils";
import { XIcon } from "@/components/icons";
import { forwardRef, useEffect, useState } from "react";
import { type z } from "zod";
import { Badge } from "./badge";
import { Button } from "./button";
import Typography from "../common/typography";

const parseTagOpt = (params: { tag: string; tagValidator: z.ZodString }) => {
  const { tag, tagValidator } = params;
  const parsedTag = tagValidator.safeParse(tag);

  if (parsedTag.success) {
    return parsedTag.data;
  }

  return null;
};

// Define the InputProps type
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

type TagInputProps = Omit<InputProps, "value" | "onChange"> & {
  value?: readonly string[];
  onChange: (value: readonly string[]) => void;
  tagValidator?: z.ZodString;
  isError?: boolean;
};

const TagInput = forwardRef<HTMLInputElement, TagInputProps>((props, ref) => {
  const {
    className,
    value = [],
    onChange,
    tagValidator,
    isError,
    ...domProps
  } = props;

  const [pendingDataPoint, setPendingDataPoint] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    if (pendingDataPoint.includes(",")) {
      // Split by comma and filter/map in one pass
      const newTags = pendingDataPoint
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((trimmedX) => {
          if (tagValidator) {
            const validatedTag = parseTagOpt({ tag: trimmedX, tagValidator });
            // return validatedTag;
            if (validatedTag) {
              return validatedTag;
            }
          }
          return trimmedX;
        })
        .filter(Boolean) as string[]; // Type assertion to resolve the string | null issue

      // Create a Set to remove duplicates and combine with existing values
      const newDataPoints = new Set([...value, ...newTags]);
      onChange([...newDataPoints]);
      setPendingDataPoint("");
    }
  }, [pendingDataPoint, onChange, value, tagValidator]);

  const addPendingDataPoint = () => {
    if (pendingDataPoint) {
      if (tagValidator) {
        const validatedTag = parseTagOpt({
          tag: pendingDataPoint,
          tagValidator,
        });
        if (validatedTag) {
          const newDataPoints = new Set([...value, validatedTag]);
          onChange([...newDataPoints]);
          setPendingDataPoint("");
        } else {
          setValidationError("Please enter correct email address");
        }
      } else {
        const newDataPoints = new Set([...value, pendingDataPoint]);
        onChange([...newDataPoints]);
        setPendingDataPoint("");
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          // caveat: :has() variant requires tailwind v3.4 or above: https://tailwindcss.com/blog/tailwindcss-v3-4#new-has-variant
          "flex min-h-10 w-full flex-wrap gap-2 rounded-md border hover:border-primary border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 has-[:focus-visible]:border-primary has-[:focus-visible]:outline-none",
          className
        )}
      >
        {value.map((item) => (
          <Badge
            key={item}
            variant={isError ? "destructive" : "secondary"}
            className={cn(
              isError
                ? "bg-destructive text-destructive-foreground"
                : "bg-neutral-gray hover:bg-neutral-gray text-secondary-foreground"
            )}
          >
            {item}
            <Button
              type="button"
              variant={isError ? "destructive" : "ghost"}
              size={"icon"}
              className={"ml-2 h-3 w-3"}
              onClick={() => {
                onChange(value.filter((i) => i !== item));
              }}
            >
              <XIcon className={"w-3"} />
            </Button>
          </Badge>
        ))}
        <input
          className={
            "flex-1 outline-none placeholder:text-secondary-foreground min-w-60"
          }
          value={pendingDataPoint}
          onChange={(e) => {
            if (tagValidator) setValidationError("");
            setPendingDataPoint(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addPendingDataPoint();
            } else if (
              e.key === "Backspace" &&
              pendingDataPoint.length === 0 &&
              value.length > 0
            ) {
              e.preventDefault();
              onChange(value.slice(0, -1));
            }
          }}
          {...domProps}
          ref={ref}
        />
      </div>
      <Typography variant="sm" className="text-destructive-foreground">
        {validationError}
      </Typography>
    </div>
  );
});

TagInput.displayName = "TagInput";

export { TagInput };
