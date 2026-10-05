import React from "react";
import { HardDrive, Mail, MessageCircle, Upload } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";
import { CHANNELS } from "@/config/pages/inbox";
import type { InboxChannel } from "@/types/pages/inbox";

/**
 * How a document arrived. Ported from ChannelPill in js/icons.jsx.
 *
 * The original gave each channel its own tint (chan--email, chan--whatsapp…).
 * They are all one neutral chip here: the channel is context, not a state the
 * accountant acts on, and four tinted chips per row competed with the status
 * column that does carry action.
 */

const CHANNEL_ICONS: Record<InboxChannel, LucideIcon> = {
  email: Mail,
  whatsapp: MessageCircle,
  upload: Upload,
  drive: HardDrive,
};

type Props = {
  channel: InboxChannel;
};

const ChannelPill = ({ channel }: Props) => {
  const Icon = CHANNEL_ICONS[channel] ?? Upload;

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-md bg-section px-2 py-0.5 text-[12px] text-secondary-foreground">
      <Icon className="h-3 w-3 flex-none" />
      {CHANNELS[channel]?.label ?? CHANNELS.upload.label}
    </span>
  );
};

export default ChannelPill;
