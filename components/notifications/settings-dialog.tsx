import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "@/components/icons";
import { PageDialog } from "@/components/inbox/v2/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_GROUPS } from "@/config/pages/notifications/kinds";
import {
  notificationActions,
  useNotificationStore,
} from "@/hooks/pages/notifications/use-notifications";
import type {
  NotificationChannel,
  NotificationDigest,
  NotificationGroup,
  NotificationPreferences,
} from "@/types/pages/notifications";

type Props = { open: boolean; onClose: () => void };

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: "inApp", label: "In app" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
];

const DIGESTS: { id: NotificationDigest; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "daily", label: "Daily, 9:00 am" },
  { id: "weekly", label: "Weekly, Monday 9:00 am" },
];

/**
 * Which notices reach you, and where. One row per group, one column per
 * channel. Edits are staged and saved together, like every form here.
 *
 * In app covers updates only: what needs action always shows, because
 * switching it off would hide work rather than noise. The dialog says so
 * on the column instead of offering a switch that does nothing.
 *
 * Email and WhatsApp are stored but not sent in the prototype.
 * DEV: PUT /api/notification-preferences
 */
const SettingsDialog = ({ open, onClose }: Props) => {
  const { preferences } = useNotificationStore();
  const [draft, setDraft] = useState<NotificationPreferences>(preferences);
  useEffect(() => {
    if (open) setDraft(preferences);
  }, [open]);

  const setChannel = (
    group: NotificationGroup,
    channel: NotificationChannel,
    value: boolean
  ) =>
    setDraft((d) => ({
      ...d,
      channels: {
        ...d.channels,
        [group]: { ...d.channels[group], [channel]: value },
      },
    }));

  const save = () => {
    notificationActions.setPreferences(draft);
    onClose();
    toast.success("Notification settings saved.");
  };

  return (
    <PageDialog
      open={open}
      onClose={onClose}
      title="Notification settings"
      description="Choose what reaches you and where. These apply to every organisation you work in."
      className="max-w-[640px]"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save settings</Button>
        </>
      }
    >
      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">Channels for each kind of notice</caption>
        <colgroup>
          <col />
          {CHANNELS.map((c) => (
            <col key={c.id} className="w-[88px]" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="border-b border-pi-line pb-2 text-[12px] font-medium text-pi-body">
              Notices about
            </th>
            {CHANNELS.map((c) => (
              <th
                key={c.id}
                className="border-b border-pi-line pb-2 text-center text-[12px] font-medium text-pi-body"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NOTIFICATION_GROUPS.map((g) => (
            <tr key={g.id}>
              <td className="border-b border-pi-line py-3 pr-4 align-top">
                <span className="block text-[14px] font-medium text-pi-ink">
                  {g.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-4 text-pi-faint">
                  {g.covers}
                </span>
              </td>
              {CHANNELS.map((c) => (
                <td
                  key={c.id}
                  className="border-b border-pi-line py-3 text-center align-top"
                >
                  <Checkbox
                    className="mt-0.5"
                    aria-label={`${g.label} by ${c.label}`}
                    checked={draft.channels[g.id][c.id]}
                    onCheckedChange={(v) => setChannel(g.id, c.id, v === true)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-4 text-pi-faint">
        <Lock className="mt-px size-3.5 flex-none" aria-hidden />
        Anything that needs action always shows in the app. In app turns off
        updates only.
      </p>

      <div className="mt-6 flex flex-col gap-4 border-t border-pi-line pt-5">
        <div className="flex items-center gap-4">
          <label htmlFor="ntf-digest" className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-pi-ink">
              Email digest
            </span>
            <span className="mt-0.5 block text-[12px] leading-4 text-pi-faint">
              What needs action across your organisations, in one email.
            </span>
          </label>
          <Select
            value={draft.digest}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, digest: v as NotificationDigest }))
            }
          >
            <SelectTrigger id="ntf-digest" className="h-9 w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIGESTS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="ntf-urgent" className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-pi-ink">
              Pop up urgent notices
            </span>
            <span className="mt-0.5 block text-[12px] leading-4 text-pi-faint">
              A file that couldn’t be read or a sync that failed shows at the
              bottom right as it happens.
            </span>
          </label>
          <Switch
            id="ntf-urgent"
            checked={draft.urgentToasts}
            onCheckedChange={(v) =>
              setDraft((d) => ({ ...d, urgentToasts: v }))
            }
          />
        </div>
      </div>
    </PageDialog>
  );
};

export default SettingsDialog;
