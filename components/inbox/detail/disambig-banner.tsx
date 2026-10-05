import React from "react";
import { AlertTriangle, Check } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/pages/inbox";
import type { InboxItem, InboxRoute } from "@/types/pages/inbox";

/**
 * Shown above the review surface when the classifier is not confident enough to
 * pre-populate anything. Ported from DisambigBanner in js/inbox-detail.jsx.
 *
 * Two cases, and the difference matters:
 *
 *  - Genuinely ambiguous — the document could be either thing. The banner shows
 *    the evidence for each candidate and asks the accountant to pick. No route
 *    is pre-selected, because a wrong default here is worse than no default.
 *  - Routed but below the confidence threshold — a guess exists, so the banner
 *    states it, shows the rationale and the numbers, and asks for confirmation.
 *
 * In both cases nothing is pre-filled until the route is settled. Populating
 * fields from a guess the accountant then has to un-pick is the failure this
 * design is avoiding.
 */

type Props = {
  item: InboxItem;
  threshold: number;
  onPick: (route: InboxRoute) => void;
  onConfirm: () => void;
};

const DisambigBanner = ({ item, threshold, onPick, onConfirm }: Props) => {
  if (item.ambiguous && item.candidates) {
    return (
      <div className="flex items-start gap-3 border-b border-warning-border bg-warning px-5 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning-foreground" />

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-warning-foreground">
            We weren&apos;t sure how to classify this. Pick a route to continue.
          </div>
          <div className="mt-1 text-xs text-warning-foreground/90">
            {item.candidates.map((candidate) => (
              <span key={candidate.route} className="mr-4">
                <strong className="font-semibold">
                  {ROUTES[candidate.route]?.short ?? candidate.route}:
                </strong>{" "}
                {candidate.evidence}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-none gap-2">
          {item.candidates.map((candidate) => (
            <Button
              key={candidate.route}
              variant="outline"
              size="sm"
              className="h-8 bg-background"
              onClick={() => onPick(candidate.route)}
            >
              Use {ROUTES[candidate.route]?.short ?? candidate.route}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (item.ai.confidence == null || !item.route) return null;

  return (
    <div className="flex items-start gap-3 border-b border-warning-border bg-warning px-5 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning-foreground" />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-warning-foreground">
          Confidence below threshold ({Math.round(item.ai.confidence * 100)}%
          &lt; {Math.round(threshold * 100)}%)
        </div>
        <div className="mt-1 text-xs text-warning-foreground/90">
          We classified this as{" "}
          <strong className="font-semibold">{ROUTES[item.route].label}</strong>.{" "}
          {item.ai.rationale} — confirm before we load the review surface.
        </div>
      </div>

      <div className="flex flex-none gap-2">
        <Button variant="outline" size="sm" className="h-8 bg-background">
          Pick a different route
        </Button>
        <Button size="sm" className="h-8" onClick={onConfirm}>
          <Check className="h-3.5 w-3.5" />
          Confirm {ROUTES[item.route].short}
        </Button>
      </div>
    </div>
  );
};

export default DisambigBanner;
