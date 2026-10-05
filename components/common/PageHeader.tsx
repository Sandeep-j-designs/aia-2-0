import React from "react";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import { cn } from "@/lib/utils";

export type PageCrumb = { label: string; href?: string };
type Props = {
  className?: string;
  title: string;
  crumbs?: PageCrumb[];
  onBack?: () => void;
};

/** Bloocks Breadcrumb: h6 for a single page, body-2 for a nested trail. */
const PageHeader = ({ className, title, crumbs, onBack }: Props) => {
  const trail = crumbs?.length ? crumbs : [{ label: title }];
  if (trail.length === 1) {
    return (
      <h1
        className={cn(
          "m-0 min-w-0 break-words text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground",
          className
        )}
      >
        {trail[0].label}
      </h1>
    );
  }
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 p-0 text-body-2 font-normal">
        {onBack && (
          <li className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label="Back to inbox"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded p-1 bg-accent text-secondary-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
          </li>
        )}
        {trail.map((crumb, index) => (
          <li
            key={`${index}-${crumb.label}`}
            className="flex min-w-0 items-center gap-2"
          >
            {index > 0 && (
              <span aria-hidden="true" className="text-secondary-foreground">
                /
              </span>
            )}
            {index === trail.length - 1 ? (
              <h1
                aria-current="page"
                title={crumb.label}
                className="m-0 min-w-0 break-words text-body-2 font-normal text-foreground [overflow-wrap:anywhere]"
              >
                {crumb.label}
              </h1>
            ) : crumb.href ? (
              <Link
                href={crumb.href}
                className="rounded text-secondary-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-secondary-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default PageHeader;
