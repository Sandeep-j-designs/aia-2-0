import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import {
  receiveSourceReply,
  resolveSourceReference,
  useInboxSources,
} from "@/hooks/pages/inbox/use-inbox-sources";
import type { Item } from "@/components/inbox/v2/store";

const CollectionDocumentIssue = ({ item }: { item: Item }) => {
  const state = useInboxSources();
  const neo = useNeo();
  const [reference, setReference] = useState("");
  const receipt = state.receipts.find(
    (r) =>
      r.company === item.company &&
      r.itemId === item.id &&
      ["failed", "needs-decision"].includes(r.outcome)
  );
  if (
    !receipt ||
    (receipt.outcome === "failed" && item.status !== "Failed") ||
    (receipt.outcome === "needs-decision" && item.form.invoiceNo)
  )
    return null;
  const request = state.requests.find(
    (r) =>
      r.company === item.company &&
      r.candidateKey === receipt.candidateKey &&
      r.status === "waiting"
  );
  const run = (prompt: string) => {
    neo.setOpen(true);
    void neo.startRun(prompt);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-pi-line bg-background px-6 py-3 text-sm">
      <p className="text-pi-body">
        {receipt.outcome === "failed"
          ? request
            ? "Waiting for a clearer copy from the supplier."
            : "This attachment is unreadable. No voucher has been prepared."
          : "Supplier invoice number is missing."}
      </p>
      {receipt.outcome === "needs-decision" ? (
        <>
          <Input
            className="w-56"
            aria-label="Supplier invoice number"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Button
            disabled={!reference.trim() || !!neo.busy}
            variant="outline"
            onClick={() => resolveSourceReference(item.id, reference)}
          >
            Save invoice number
          </Button>
        </>
      ) : request ? (
        <Button
          disabled={!!neo.busy}
          variant="outline"
          onClick={() => {
            if (receiveSourceReply(request.runId)) {
              neo.completeWaiting(request.runId);
              run("Collect replacement documents from my connected sources");
            }
          }}
        >
          Simulate supplier reply
        </Button>
      ) : (
        <>
          <Button
            disabled={!!neo.busy}
            variant="outline"
            onClick={() => run("Retry failed collection attachments")}
          >
            Retry collection
          </Button>
          <Button
            disabled={!!neo.busy}
            variant="outline"
            onClick={() =>
              run("Request a clearer copy of the unreadable source attachment")
            }
          >
            Ask Neo for a clearer copy
          </Button>
        </>
      )}
    </div>
  );
};
export default CollectionDocumentIssue;
