import React, { useEffect } from "react";
import { useOptionalNeo } from "@/hooks/pages/neo/use-neo";
import { cn } from "@/lib/utils";
import NeoMark from "./neo-mark";

type Props = { className?: string };

/**
 * Neo's button in the app top bar. Registering tells the panel a launcher is
 * on screen, so the edge tab it shows on bare screens (the full-screen
 * review) stays out of the way here.
 */
const NeoLauncher = ({ className }: Props) => {
  const neo = useOptionalNeo();
  const register = neo?.registerLauncher;
  useEffect(() => register?.(), [register]);
  if (!neo) return null;
  return (
    <button
      type="button"
      aria-label="Ask Neo"
      aria-pressed={neo.open}
      title="Ask Neo (Ctrl J)"
      onClick={() => neo.setOpen(!neo.open)}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-lg px-1.5 text-label-2 font-normal transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-topnav-text",
        className,
        neo.open && "bg-pi-brand-tint text-pi-brand"
      )}
    >
      <NeoMark
        className="h-5 w-5 rounded-md text-label-3"
        live={!!neo.busy && !neo.paused}
      />
      <span className="hidden sm:inline">Neo</span>
      {neo.busy && <span className="sr-only">Neo is working</span>}
    </button>
  );
};

export default NeoLauncher;
