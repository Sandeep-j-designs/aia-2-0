import React from "react";
import { BookOpen, Landmark, Receipt, Wallet } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";
import { ROUTES } from "@/config/pages/inbox";
import { cn } from "@/lib/utils";
import type { InboxRoute } from "@/types/pages/inbox";

/**
 * Where the classifier wants to post this. Ported from RoutePill in
 * js/icons.jsx.
 *
 * A null route is the disambiguation fork — the classifier could not choose,
 * and the detail view asks the accountant to. It reads as neutral rather than
 * as an error, because nothing has gone wrong.
 */

const ROUTE_ICONS: Record<InboxRoute, LucideIcon> = {
  AP: Wallet,
  AR: Receipt,
  Banking: Landmark,
  JV: BookOpen,
};

type Props = {
  route: InboxRoute | null;
};

const RoutePill = ({ route }: Props) => {
  if (!route) {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-secondary-foreground" />
        Unclassified
      </span>
    );
  }

  const Icon = ROUTE_ICONS[route];

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs",
        "bg-accent text-accent-foreground"
      )}
    >
      <Icon className="h-3 w-3 flex-none" />
      {ROUTES[route].short}
    </span>
  );
};

export default RoutePill;
