import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Slash,
  X,
} from "@/components/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SheetClose, SheetTitle } from "@/components/ui/sheet";
import {
  SHORTCUTS,
  SHORTCUTS_NOTE,
  detectPlatform,
  type ShortcutPlatform,
  type ShortcutRow,
} from "@/config/pages/inbox/keyboard-shortcuts";
import { cn } from "@/lib/utils";

/**
 * The keyboard shortcuts panel — Figma 24496:57272.
 *
 * The body of a right-hand drawer, not a dropdown: at twelve rows it is a
 * reference you read down while working, and a popover that closes on the next
 * click is the wrong container for that. Sizing lives on the sheet; this is
 * everything inside it.
 *
 * 16 padding, 45px rows split down the middle: the action on the left, its keys
 * right-aligned on the right. Key caps are 28px boxes so a one-letter cap and a
 * "Shift" cap sit on the same baseline grid.
 *
 * The platform tab defaults to the one you are on rather than to Windows —
 * reading the wrong column and then reaching for the wrong modifier is the
 * only real failure mode this panel has.
 */

const ARROW_ICONS = {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} as const;

const KeyCap = ({ token }: { token: string }) => {
  const Arrow = ARROW_ICONS[token as keyof typeof ARROW_ICONS];

  return (
    <span
      className={cn(
        // 28px tall, min 28 wide so a single glyph still reads as a key.
        "flex h-6 min-w-6 items-center justify-center rounded-xs border border-pi-line-2 bg-pi-fill px-2",
        "font-mono text-[12px] leading-4 text-pi-ink-3"
      )}
    >
      {Arrow ? (
        <Arrow className="h-3 w-3" />
      ) : token === "/" ? (
        <Slash className="h-3 w-3" />
      ) : (
        token
      )}
    </span>
  );
};

const Row = ({ row }: { row: ShortcutRow }) => (
  <div className="flex h-10 items-center border-b border-pi-line last:border-b-0">
    <span className="flex-1 pr-3 text-[12px] leading-4 text-pi-body">
      {row.label}
    </span>
    <span className="flex flex-none items-center gap-2">
      {row.keys.map((group, index) => (
        <React.Fragment key={index}>
          {index > 0 ? (
            <span className="px-0.5 text-[12px] text-pi-faint">/</span>
          ) : null}
          {group.map((token) => (
            <KeyCap key={token} token={token} />
          ))}
        </React.Fragment>
      ))}
    </span>
  </div>
);

const KeyboardShortcuts = () => {
  // Read the platform after mount: navigator does not exist on the server, and
  // guessing during render would mismatch on hydration.
  const [platform, setPlatform] = useState<ShortcutPlatform>("windows");
  useEffect(() => setPlatform(detectPlatform()), []);

  return (
    <div className="flex h-full flex-col bg-pi-surface-panel">
      <div className="relative flex-none border-b border-pi-line bg-pi-head-bg px-6 pb-5 pr-14 pt-6">
        {/* SheetTitle rather than a bare h2 — Radix names the dialog from it,
            so without it the drawer is unlabelled to a screen reader. */}
        <SheetTitle className="text-[22px] font-medium leading-7 tracking-[-0.02em] text-pi-ink">
          Keyboard shortcuts
        </SheetTitle>
        {/* This repo's SheetContent has its close button commented out, so the
            drawer has to bring its own — Esc alone is not an affordance. */}
        <SheetClose
          aria-label="Close"
          className="absolute right-5 top-5 grid h-7 w-7 place-items-center rounded-sm text-pi-faint hover:bg-pi-fill hover:text-pi-ink"
        >
          <X className="h-4 w-4" />
        </SheetClose>
        <p className="mt-1 text-[13px] leading-5 text-pi-body">
          Navigate and act without leaving the keyboard.
        </p>
      </div>

      <Tabs
        value={platform}
        onValueChange={(value) => setPlatform(value as ShortcutPlatform)}
        className="flex-none border-b border-pi-line px-6"
      >
        <TabsList className="h-auto gap-5 rounded-none bg-transparent p-0">
          {(
            [
              ["windows", "Windows"],
              ["mac", "Mac"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="-mb-px rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 text-[13px] font-medium text-pi-body shadow-none hover:text-pi-ink data-[state=active]:border-pi-brand data-[state=active]:bg-transparent data-[state=active]:text-pi-ink data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2">
        {SHORTCUTS[platform].map((row) => (
          <Row key={row.id} row={row} />
        ))}

        <p className="py-4 text-[12px] leading-[18px] text-pi-faint">
          {SHORTCUTS_NOTE}
        </p>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
