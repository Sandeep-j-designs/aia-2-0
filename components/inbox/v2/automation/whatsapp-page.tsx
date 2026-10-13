import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AIA_WHATSAPP } from "@/components/inbox/v2/store";
import { WHATSAPP_QUESTIONS } from "@/config/pages/inbox/mock-whatsapp";
import {
  askWhatsApp,
  toggleWhatsApp,
  useWhatsAppNumbers,
} from "@/hooks/pages/inbox/use-whatsapp-ask";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
type Props = { company: string };
const WhatsAppPage = ({ company }: Props) => {
  const numbers = useWhatsAppNumbers().filter((n) => n.company === company);
  const [unknown, setUnknown] = useState(false),
    [messages, setMessages] = useState<ReturnType<typeof askWhatsApp>[]>([]);
  return (
    <FeaturePage
      title="WhatsApp"
      tab="numbers"
      tabs={[
        { id: "numbers", label: "Registered numbers", count: numbers.length },
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div>
          <p className="mb-5 text-sm text-pi-body">
            Ask Neo at {AIA_WHATSAPP}. Registered users receive answers within
            their organisation’s access.
          </p>
          <div className="divide-y divide-pi-line rounded-lg border border-pi-line bg-background">
            {numbers.map((n) => (
              <div
                key={n.number}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="font-medium">
                    {n.name} · {n.number}
                  </p>
                  <p className="mt-2 text-sm text-pi-faint">{n.role}</p>
                </div>
                <Switch
                  aria-label={`Enable ${n.name}`}
                  checked={n.enabled}
                  onCheckedChange={(enabled) =>
                    toggleWhatsApp(n.number, enabled)
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium">Try a question</p>
            {WHATSAPP_QUESTIONS.map((q) => (
              <Button
                key={q}
                variant="outline"
                className="mr-2 h-auto whitespace-normal py-3 text-left"
                onClick={() =>
                  setMessages((xs) => [
                    ...xs,
                    askWhatsApp(
                      unknown ? "+91 90000 00001" : numbers[0]?.number || "",
                      q,
                      company
                    ),
                  ])
                }
              >
                {q}
              </Button>
            ))}
            <label className="flex items-center gap-3 py-4 text-sm">
              <input
                type="checkbox"
                checked={unknown}
                onChange={(e) => setUnknown(e.target.checked)}
              />
              Try an unregistered number
            </label>
          </div>
        </div>
        <section
          aria-label="WhatsApp conversation demo"
          className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-pi-line-2 bg-background"
        >
          <header className="border-b border-pi-line bg-pi-head-bg p-5">
            <h2 className="font-semibold">
              Neo ·{" "}
              {unknown
                ? "Unregistered sender"
                : numbers[0]?.name || "No registered number"}
            </h2>
            <p className="mt-1 text-xs text-pi-faint">
              Conversation preview · read-only
            </p>
          </header>
          <div className="max-h-[600px] flex-1 space-y-5 overflow-auto p-5">
            {!messages.length && (
              <p className="text-sm text-pi-faint">
                Choose a question to see the answer and its records.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="space-y-3">
                <p className="ml-8 rounded-md bg-pi-brand-tint p-3 text-sm">
                  {m.question}
                </p>
                <div className="mr-3 rounded-md border border-pi-line p-3 text-sm leading-6">
                  <p>{m.answer}</p>
                  {m.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="mr-3 inline-block text-pi-brand underline"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </FeaturePage>
  );
};
export default WhatsAppPage;
