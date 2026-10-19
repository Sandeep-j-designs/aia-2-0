import { useState } from "react";
import { sampleFor } from "@/hooks/pages/neo/use-batches";
import { MOCK_BATCH_DOCUMENTS } from "@/config/pages/neo/mock-batch-documents";
import type { NeoAttachment } from "@/types/pages/neo";
import type { NeoRuntime } from "./use-neo-runtime";

/**
 * The prompt box's state, shared by Neo's page and the docked panel: the
 * draft, the files waiting to go with it, and sending both as one request.
 */
export const useComposer = (neo: NeoRuntime) => {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<NeoAttachment[]>([]);

  const attach = (list: NeoAttachment[]) =>
    setAttachments((as) => [
      ...as,
      ...list.filter((a) => !as.some((x) => x.name === a.name)),
    ]);

  const send = (text = draft) => {
    if ((!text.trim() && !attachments.length) || neo.busy) return;
    setDraft("");
    const files = attachments;
    setAttachments([]);
    void neo.startRun(text, files);
  };

  return {
    draft,
    setDraft,
    attachments,
    send,
    attachFiles: (files: FileList) =>
      attach(
        Array.from(files).map((f) => ({
          name: f.name,
          docId: sampleFor(f.name)?.id,
        }))
      ),
    attachSample: () =>
      attach(
        MOCK_BATCH_DOCUMENTS.map((d) => ({ name: d.file.name, docId: d.id }))
      ),
    removeAttachment: (name: string) =>
      setAttachments((as) => as.filter((a) => a.name !== name)),
  };
};
