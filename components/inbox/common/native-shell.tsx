import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The frame every route's review surface sits in — header, scrolling body,
 * pinned footer. Ported from the `.native` / `.native__header` / `.native__body`
 * / `.native__footer` rules in css/tokens.css.
 *
 * The footer is pinned rather than scrolled with the content, because Approve
 * must be reachable without scrolling to the bottom of a 1,000-row grid.
 */

type Props = {
  title: string;
  subtitle?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
};

const NativeShell = ({
  title,
  subtitle,
  headerActions,
  footer,
  children,
  bodyClassName,
}: Props) => (
  <div className="flex h-full min-h-0 flex-col">
    <div className="flex flex-none items-start gap-3 border-b border-neutral-gray px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <div className="mt-0.5 truncate text-xs text-secondary-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
      {headerActions ? (
        <div className="flex flex-none items-center gap-2">{headerActions}</div>
      ) : null}
    </div>

    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5",
        bodyClassName
      )}
    >
      {children}
    </div>

    {footer ? (
      <div className="flex flex-none items-center gap-2 border-t border-neutral-gray px-5 py-3">
        {footer}
      </div>
    ) : null}
  </div>
);

export default NativeShell;

/** A bordered white panel — the grouping unit inside a review surface. */
export const NativePanel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-md border border-neutral-gray bg-background px-5 py-4",
      className
    )}
  >
    {children}
  </div>
);
