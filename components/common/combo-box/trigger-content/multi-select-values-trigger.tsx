import { ReactNode, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Typography from "../../typography";

interface OptionType<TValue> {
  value: TValue;
  label: string | ReactNode;
}

interface MultiSelectValuesProps<TValue> {
  title: string;
  selectedValues: TValue[];
  options: OptionType<TValue>[];
  icon?: ReactNode;
  className?: string;
}

const MultiSelectValuesTrigger = <TValue extends string | number>({
  title,
  selectedValues,
  options,
  icon,
  className,
}: MultiSelectValuesProps<TValue>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState<string>(title);

  useEffect(() => {
    if (selectedValues.length === 0) {
      setDisplayText(title);
      return;
    }

    const selectedLabels = selectedValues.map((val) => {
      const option = options.find((opt) => opt.value === val);
      return typeof option?.label === "string"
        ? option?.label
        : String(option?.label);
    });

    // If we have a container and selected values
    if (containerRef.current && selectedLabels.length > 0) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;

      // Create a temporary span to measure text width
      const tempSpan = document.createElement("span");
      tempSpan.style.visibility = "hidden";
      tempSpan.style.position = "absolute";
      tempSpan.style.whiteSpace = "nowrap";
      // Copy the font styles from the container
      const styles = window.getComputedStyle(container);
      tempSpan.style.font = styles.font;
      document.body.appendChild(tempSpan);

      // Start with all labels and check if they fit
      let text = selectedLabels.join(", ");
      tempSpan.textContent = text;

      // If all labels don't fit, reduce until they do (with +X suffix)
      if (tempSpan.offsetWidth > containerWidth - 20) {
        // 20px buffer for safety
        let visibleCount = selectedLabels.length;

        while (visibleCount > 0) {
          visibleCount--;
          const visibleLabels = selectedLabels.slice(0, visibleCount);
          const remainingCount = selectedLabels.length - visibleCount;
          const newText = `${visibleLabels.join(", ")}${
            visibleCount > 0 ? " " : ""
          }+${remainingCount}`;

          tempSpan.textContent = newText;
          if (
            tempSpan.offsetWidth <= containerWidth - 20 ||
            visibleCount === 0
          ) {
            text = newText;
            break;
          }
        }
      }

      document.body.removeChild(tempSpan);
      setDisplayText(text);
    } else {
      setDisplayText(selectedLabels.join(", "));
    }
  }, [selectedValues, options, title, containerRef.current?.clientWidth]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-between w-full"
    >
      <Typography variant="sm" className={cn("truncate", className)}>
        {displayText}
      </Typography>
      <div className="flex items-center ml-2">{icon}</div>
    </div>
  );
};

export default MultiSelectValuesTrigger;
