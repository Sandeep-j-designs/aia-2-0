import React from "react";
import { BookOpen, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  BuiltLine,
  LineBuilderSpec,
} from "@/types/pages/inbox/conversion";

/**
 * Line items for a JV → Bill/Invoice conversion. Ported from LineBuilder in
 * js/conversion-panel.jsx.
 *
 * This exists because of an asymmetry in the data: a Journal Voucher is
 * freeform — a narration and balanced Dr/Cr lines — while a Bill or Invoice
 * needs descriptions, ledgers, HSN codes, quantities and rates. Those fields
 * simply are not in the source, so the accountant has to supply them. At least
 * one line is required, which is what gates the CTA.
 */

type Props = {
  spec: LineBuilderSpec;
  lines: BuiltLine[];
  onChange: (lines: BuiltLine[]) => void;
};

const EMPTY_LINE: BuiltLine = {
  desc: "",
  ledger: "",
  hsn: "",
  qty: "1",
  rate: "0",
};

const LineBuilder = ({ spec, lines, onChange }: Props) => {
  const updateLine = (index: number, key: keyof BuiltLine, value: string) => {
    onChange(
      lines.map((line, i) => (i === index ? { ...line, [key]: value } : line))
    );
  };

  return (
    <div className="mt-5 rounded-lg border border-border bg-accent p-4">
      <div className="mb-2 flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <strong className="flex-1 text-sm">
          Line items for the new {spec.target}
        </strong>
        <span className="text-[12px] text-secondary-foreground">
          {lines.length} line{lines.length === 1 ? "" : "s"} · at least 1
          required
        </span>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-center text-xs text-secondary-foreground">
          A Journal is freeform. A {spec.target} needs line items. Add at least
          one to continue.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-panel-border bg-background">
          <div className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.6fr_0.8fr_auto] gap-2 border-b border-panel-border bg-section px-2 py-2 text-[12px] font-medium text-secondary-foreground">
            <div>Description</div>
            <div>Ledger</div>
            <div>HSN/SAC</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Rate</div>
            <div className="w-8" />
          </div>

          {lines.map((line, index) => (
            <div
              // Rows have no stable id until they are saved; index is the key
              // the original used and there is nothing better available here.
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.6fr_0.8fr_auto] items-center gap-2 border-b border-panel-border px-2 py-2 last:border-b-0"
            >
              <Input
                value={line.desc}
                onChange={(event) =>
                  updateLine(index, "desc", event.target.value)
                }
                placeholder="Description"
                className="h-7 text-xs"
                aria-label={`Line ${index + 1} description`}
              />
              <Input
                value={line.ledger}
                onChange={(event) =>
                  updateLine(index, "ledger", event.target.value)
                }
                placeholder={spec.suggestedLedger}
                className="h-7 text-xs"
                aria-label={`Line ${index + 1} ledger`}
              />
              <Input
                value={line.hsn}
                onChange={(event) =>
                  updateLine(index, "hsn", event.target.value)
                }
                placeholder="HSN"
                className="h-7 text-xs"
                aria-label={`Line ${index + 1} HSN`}
              />
              <Input
                value={line.qty}
                onChange={(event) =>
                  updateLine(index, "qty", event.target.value)
                }
                className="h-7 text-right text-xs tabular-nums"
                aria-label={`Line ${index + 1} quantity`}
              />
              <Input
                value={line.rate}
                onChange={(event) =>
                  updateLine(index, "rate", event.target.value)
                }
                placeholder={spec.suggestedRate}
                className="h-7 text-right text-xs tabular-nums"
                aria-label={`Line ${index + 1} rate`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-8 text-secondary-foreground hover:text-destructive-foreground"
                onClick={() => onChange(lines.filter((_, i) => i !== index))}
                title="Remove line"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-2 h-7 text-xs"
        onClick={() => onChange([...lines, { ...EMPTY_LINE }])}
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} />
        Add line
      </Button>
    </div>
  );
};

export default LineBuilder;
