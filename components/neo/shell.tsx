import React, { ReactNode, useEffect } from "react";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { cn } from "@/lib/utils";

type Props = { children: ReactNode };

/**
 * Makes room for the panel on wide screens. At 1440px and up the page moves
 * over and nothing is covered; below that the panel overlays, because at the
 * 1280 operator target the queue cannot give up 384px and still show the
 * columns an approval is decided on.
 */
const NeoShell = ({ children }: Props) => {
  const { open } = useNeo();
  // Tells page-level chrome (the toaster) that the right edge is taken.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.neoOpen = "";
    else delete root.dataset.neoOpen;
  }, [open]);
  return (
    <div
      className={cn(
        "transition-[padding] duration-200 motion-reduce:transition-none",
        open && "min-[1440px]:pr-96"
      )}
    >
      {children}
    </div>
  );
};

export default NeoShell;
