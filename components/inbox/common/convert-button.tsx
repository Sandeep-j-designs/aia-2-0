import React from "react";
import { ArrowLeftRight, ChevronDown } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONVERT_TARGETS } from "@/config/pages/inbox/convert-targets";
import type {
  ConversionSource,
  ConversionTarget,
} from "@/types/pages/inbox/conversion";

/**
 * Opens the "Convert to…" picker. Ported from ConvertButton and ConvertPicker
 * in js/conversion-extras.jsx.
 *
 * This deliberately sits away from Approve. Converting is a rarer, heavier act
 * than approving, and putting the two side by side invites the wrong one.
 *
 * Each option states its consequence before it is picked. The original built
 * this as a hand-positioned portal with its own outside-click and Escape
 * handling; shadcn's DropdownMenu gives all of that plus keyboard navigation.
 */

type Props = {
  source: ConversionSource;
  onPick: (target: ConversionTarget) => void;
  size?: "sm" | "default";
};

const ConvertButton = ({ source, onPick, size = "default" }: Props) => {
  const targets = CONVERT_TARGETS[source] ?? [];
  if (targets.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size === "sm" ? "sm" : "default"}>
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Convert
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[320px]">
        <DropdownMenuLabel className="text-xs font-normal text-secondary-foreground">
          Convert to…
        </DropdownMenuLabel>
        {targets.map((option) => (
          <DropdownMenuItem
            key={option.target}
            onSelect={() => onPick(option.target)}
            className="flex-col items-start gap-1 py-2"
          >
            <div className="flex w-full items-center gap-2">
              <strong className="text-sm">{option.label}</strong>
              {option.badge ? (
                <span className="ml-auto rounded bg-warning px-2 py-0.5 text-[12px] text-warning-foreground">
                  {option.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[12px] leading-snug text-secondary-foreground">
              {option.consequence}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ConvertButton;
