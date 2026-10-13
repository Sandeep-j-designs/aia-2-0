import React from "react";
import type { NeoCard } from "@/types/pages/neo";

type Props = {
  inputId: string;
  card: Extract<NeoCard, { kind: "message" }>;
  editable: boolean;
  onChange: (body: string) => void;
};

/**
 * An outbound message, word for word, before it goes. Editable until sent —
 * what is in the box is what the vendor receives.
 */
const MessageCard = ({ inputId, card, editable, onChange }: Props) => (
  <div className="overflow-hidden rounded-lg border border-border bg-background text-foreground">
    <div className="flex items-center justify-between gap-2 bg-accent px-3 py-2">
      <p className="text-label-3 font-semibold text-foreground">
        {card.channel} message
      </p>
      <span className="truncate text-caption-1 text-muted-foreground">
        To {card.to}
      </span>
    </div>
    <label className="sr-only" htmlFor={inputId}>
      Message to send
    </label>
    <textarea
      id={inputId}
      value={card.body}
      readOnly={!editable}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      className="block w-full resize-none bg-background px-3 py-2 text-body-4 leading-5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary read-only:text-muted-foreground"
    />
  </div>
);

export default MessageCard;
