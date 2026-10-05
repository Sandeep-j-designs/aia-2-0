import React, { useState } from "react";
import { ChevronsUpDown } from "@/components/icons";
import { SmartTooltip } from "@/components/common/smart-tooltip";
import type { UserCompany } from "@/types/pages/organisation";
import { cn } from "@/lib/utils";
import { OrganisationDrawer } from "./organization-drawer";

type Props = {
  companies: UserCompany[];
  selectedCompanyUuid?: string;
  onSelect: (companyUuid: string) => void;
  onCreate: (companyName: string) => string;
  onRename: (companyUuid: string, companyName: string) => void;
  /** The top bar's chip styling — kept with the bar, which owns its look. */
  className?: string;
};

/**
 * The top bar's organisation chip and the drawer it opens. Production:
 * components/top-bar-layout/organization-switcher.tsx.
 *
 * The chip keeps the prototype's styling (bg-surface-badge initials) rather
 * than production's hard-coded teal (#12A594), which has no token.
 */
const OrganisationSwitcher = ({
  companies,
  selectedCompanyUuid,
  onSelect,
  onCreate,
  onRename,
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selectedCompany = companies.find(
    (company) => company.companyUuid === selectedCompanyUuid
  );

  const companyName = selectedCompany?.companyName || "Select organisation";
  const companyInitial = companyName.trim().charAt(0).toUpperCase() || "O";

  return (
    <>
      <button
        type="button"
        aria-label={`Organisation: ${companyName}. Switch organisation`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen(true)}
        className={className}
      >
        <span
          aria-hidden="true"
          className="grid size-6 flex-none place-items-center rounded-xs bg-gradient-to-br from-[#3146B0] to-[#6478D2] text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          {companyInitial}
        </span>
        <SmartTooltip message={companyName} className="hidden min-w-0 flex-1 overflow-hidden sm:flex">
          <span className="min-w-0 truncate text-[13px] font-semibold text-pi-ink">{companyName}</span>
        </SmartTooltip>
        <ChevronsUpDown
          aria-hidden="true"
          className="ml-auto size-3.5 flex-none text-pi-faint transition-colors group-hover:text-pi-body"
        />
      </button>

      <OrganisationDrawer
        open={open}
        onClose={() => setOpen(false)}
        companies={companies}
        selectedCompanyUuid={selectedCompanyUuid}
        onSelect={onSelect}
        onCreate={onCreate}
        onRename={onRename}
      />
    </>
  );
};

export default OrganisationSwitcher;
