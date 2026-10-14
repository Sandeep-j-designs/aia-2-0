import { FolderOpen, Mail, MessageCircle } from "lucide-react";
import type { SourceProvider } from "@/types/pages/inbox/sources";

export const providerCopy: Record<SourceProvider, string> = {
  Gmail: "Invoice attachments from your accounts mailbox",
  "Google Drive": "Supplier invoices from a shared finance folder",
  "WhatsApp Business": "Documents shared in vendor conversations",
};

export const ProviderIcon = ({ provider }: { provider: SourceProvider }) => {
  const Icon =
    provider === "Gmail"
      ? Mail
      : provider === "Google Drive"
        ? FolderOpen
        : MessageCircle;
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-pi-line bg-background ${provider === "Gmail" ? "text-pi-brand" : provider === "Google Drive" ? "text-pi-warning" : "text-pi-success"}`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
};
