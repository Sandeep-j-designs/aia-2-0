import React, { ReactNode } from "react";
import { useRouter } from "next/router";
import NeoNav from "./nav";

export type NeoPageId = "chat" | "agents" | "attention" | "activity";

export const NEO_PAGES: NeoPageId[] = [
  "chat",
  "agents",
  "attention",
  "activity",
];

export const neoHref = (page: NeoPageId) =>
  page === "chat" ? "/inbox?module=NEO" : `/inbox?module=NEO&page=${page}`;

type Props = { page: NeoPageId; children: ReactNode };

/**
 * Neo as a place (19 Oct 2026): the app rail folds to icons and Neo's own
 * column takes its place — Chat, Agents, Needs attention, Activity and the
 * recent chats. The docked panel stays for asking from any other screen; it
 * holds the same conversation.
 */
const NeoPage = ({ page, children }: Props) => {
  const router = useRouter();
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 bg-background">
      <NeoNav page={page} onPage={(p) => void router.push(neoHref(p))} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
};

export default NeoPage;
