import React from "react";
import { Building2, Check, MoreVertical, UserCog } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Typography from "@/components/common/typography";
import { SmartTooltip } from "@/components/common/smart-tooltip";
import type { UserCompany } from "@/types/pages/organisation";
import { getCompanyBadgeLabel } from "@/utils/components/organization";
import { cn } from "@/lib/utils";

type Props = {
  company: UserCompany;
  isSelected: boolean;
  onSelect?: (company: UserCompany) => void;
  onEdit: (company: UserCompany) => void;
};

/**
 * One organisation in the drawer. Production:
 * components/top-bar-layout/organization-list-item.tsx.
 *
 * Prototype tweak: production's subtitle repeats the name when no tool is
 * connected (getCompanyBadgeLabel). Here it says so instead, because a new
 * organisation starts with nothing connected and the repeat read as a bug.
 */
export const OrganizationListItem = ({
  company,
  isSelected,
  onSelect,
  onEdit,
}: Props) => {
  const subtitle = company.thirdPartyTool?.trim()
    ? getCompanyBadgeLabel(company)
    : "Not connected to Tally";

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-md border px-3 py-3 transition-colors motion-reduce:transition-none",
        isSelected
          ? "border-pi-brand-border bg-pi-brand-tint"
          : "border-transparent bg-pi-surface-panel hover:bg-pi-row-hover"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSelect?.(company)}
        disabled={!onSelect}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex h-auto min-w-0 flex-1 items-center justify-start gap-3 bg-transparent px-0 py-0 text-left hover:!bg-transparent focus:!bg-transparent disabled:opacity-100 aria-disabled:opacity-100",
          !onSelect && "cursor-default"
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 flex-none items-center justify-center rounded-sm border text-xs font-medium",
            isSelected
              ? "border-pi-brand-border bg-pi-surface-panel text-pi-brand"
              : "border-pi-line-2 bg-pi-fill text-pi-body"
          )}
        >
          {isSelected ? (
            <Check className="!h-4 !w-4" strokeWidth={2.25} />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <SmartTooltip message={company.companyName}>
            <Typography
              weight="medium"
              className="block truncate text-[13px] text-pi-ink"
            >
              {company.companyName}
            </Typography>
          </SmartTooltip>
          <SmartTooltip message={subtitle}>
            <Typography className="block truncate pt-0.5 text-[12px] text-pi-faint">
              {subtitle}
            </Typography>
          </SmartTooltip>
        </div>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`More actions for ${company.companyName}`}
            className="h-7 w-7 flex-shrink-0 rounded-sm text-pi-faint hover:bg-pi-fill hover:text-pi-ink"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit(company);
            }}
          >
            <UserCog className="h-4 w-4" />
            Edit Organisation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default OrganizationListItem;
