import type { NeoCard } from "@/types/pages/neo";

/**
 * Which of Neo's cards are documents, opened beside the chat rather than
 * drawn inside it (19 Oct 2026, the chat apps' artifact pattern). A voucher,
 * a batch, a change set or a dry run is something to read and edit at full
 * size; the chat keeps a tile for it and the sign-off underneath.
 *
 * Small cards stay in the thread: a short list, an outbound message (read
 * verbatim right beside its Send), an agent, a live pipeline.
 */
export const opensInCanvas = (card?: NeoCard) => {
  if (!card) return false;
  switch (card.kind) {
    case "voucher":
    case "batch":
    case "changeset":
    case "diff":
    case "collection-setup":
    case "collection-dry-run":
      return true;
    case "list":
      return card.groups.reduce((n, g) => n + g.rows.length, 0) > 5;
    default:
      return false;
  }
};

/** The tile's name and one-line summary for a document card. */
export const canvasTitle = (card: NeoCard): { title: string; meta: string } => {
  switch (card.kind) {
    case "voucher":
      return {
        title: `${card.voucherType} · ${card.party}`,
        meta: `${card.state} · ${card.voucherNo}`,
      };
    case "batch":
      return {
        title:
          card.view === "settings"
            ? "Batch settings"
            : card.view === "register"
              ? "Batch register"
              : "Batch drafts",
        meta: card.batchId,
      };
    case "changeset":
      return {
        title: card.title,
        meta: `${card.rows.filter((r) => r.checked).length} of ${card.rows.length} ticked · ${card.field}`,
      };
    case "diff":
      return { title: card.title, meta: `${card.rows.length} changes` };
    case "collection-setup":
      return { title: "Document collection setup", meta: "Agent settings" };
    case "collection-dry-run":
      return { title: "Dry run", meta: "What collecting would do" };
    case "list":
      return {
        title: card.title,
        meta: `${card.groups.reduce((n, g) => n + g.rows.length, 0)} records`,
      };
    default:
      return { title: "Document", meta: "" };
  }
};
