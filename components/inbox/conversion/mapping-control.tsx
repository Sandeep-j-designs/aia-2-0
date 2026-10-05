import React, { useState } from "react";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXISTING_PARTIES } from "@/config/pages/inbox/conversions";
import type { MappingRow } from "@/types/pages/inbox/conversion";

/**
 * The control for a mapping row the user has to resolve. Ported from
 * MappingControl in js/conversion-panel.jsx.
 *
 * `party-flip` is the interesting one: converting a Bill to an Invoice turns a
 * vendor into a customer, and that customer usually does not exist in the
 * master yet. Rather than bouncing the accountant out to create it, the row
 * offers to add it inline with the GSTIN already carried across — or to pick an
 * existing party if this is a re-bill of someone already on file.
 */

type Props = {
  row: MappingRow;
  value: string | undefined;
  onResolve: (value: string) => void;
};

const MappingControl = ({ row, value, onResolve }: Props) => {
  const [adding, setAdding] = useState(false);

  if (row.control === "party-flip") {
    if (adding) {
      return (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-section p-2">
          <div className="text-[12px] font-semibold text-primary">
            Adding as {row.partyType}
          </div>
          <Input
            defaultValue={row.partyName}
            readOnly
            className="h-7 text-xs"
            aria-label={`${row.partyType} name`}
          />
          <Input
            defaultValue={row.partyGstin}
            readOnly
            className="h-7 text-xs"
            aria-label="GSTIN"
          />
          <Input
            defaultValue={row.suggestedLedger}
            placeholder="Default ledger (e.g., Sales Income)"
            className="h-7 text-xs"
            aria-label="Default ledger"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[12px]"
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-[12px]"
              onClick={() => {
                onResolve(`+ Added: ${row.partyName}`);
                setAdding(false);
              }}
            >
              Add
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 self-start px-3 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Add {row.partyName} as {row.partyType}
        </Button>
        <Select value={value ?? ""} onValueChange={onResolve}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue
              placeholder={`Or pick existing ${row.partyType?.toLowerCase()}…`}
            />
          </SelectTrigger>
          <SelectContent>
            {EXISTING_PARTIES.map((party) => (
              <SelectItem key={party} value={party}>
                {party}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (row.control === "ledger-flip") {
    return (
      <div className="flex flex-col gap-1">
        <Select value={value ?? ""} onValueChange={onResolve}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={`Pick ${row.ledgerSide} ledger…`} />
          </SelectTrigger>
          <SelectContent>
            {(row.ledgerOptions ?? []).map((ledger) => (
              <SelectItem key={ledger} value={ledger}>
                {ledger}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          className="self-start text-[12px] text-primary hover:underline"
          onClick={() => onResolve(`+ New: ${row.ledgerSide} ledger`)}
        >
          + Add new {row.ledgerSide} ledger inline
        </button>
      </div>
    );
  }

  return (
    <Input
      value={value ?? ""}
      placeholder={row.placeholder}
      onChange={(event) => onResolve(event.target.value)}
      className="h-7 text-xs"
      aria-label={row.targetLabel}
    />
  );
};

export default MappingControl;
