import {
  actor,
  companyOf,
  getState,
  neoLog,
} from "@/components/inbox/v2/store";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import { findName, has } from "@/utils/pages/neo";
import {
  companyItems,
  describe,
  isOpen,
  pickItem,
  refTo,
  resolveItem,
} from "./shared";

/**
 * "Ask AWS for their GSTIN."
 *
 * The one external task. Neo drafts the message from what the document says
 * and shows it word for word, editable; it goes only when the user sends it.
 * It goes to the address the vendor's bill came from. Without one, Neo hands
 * over the text instead of guessing a recipient.
 *
 * In the prototype the send is simulated and logged. Nothing leaves the page.
 *
 * DEV: tool — send_vendor_message(itemId, channel, body). WhatsApp goes
 * through the approved template API; free text only inside the 24-hour window.
 */

const ASKS = [
  {
    id: "gstin",
    label: "Their GSTIN",
    test: /gstin|gst number|gst no|registration/i,
  },
  {
    id: "copy",
    label: "A clearer copy of the bill",
    test: /copy|clear|legible|scan|resend/i,
  },
  {
    id: "invoice",
    label: "The tax invoice, not the proforma",
    test: /tax invoice|proforma/i,
  },
  {
    id: "credit",
    label: "A credit note for the difference",
    test: /credit note|difference|short/i,
  },
];

const body = (ask: string, vendor: string, doc: string, company: string) => {
  const hello = `Hello ${vendor.split(" ")[0]} team,`;
  const sign = `Thanks,\n${actor}\nAccounts, ${company}`;
  switch (ask) {
    case "gstin":
      return `${hello}\n\nWe're booking your invoice ${doc} and need your GSTIN to claim the input tax credit. Could you share it, or a copy of your GST registration certificate?\n\n${sign}`;
    case "copy":
      return `${hello}\n\nThe copy of invoice ${doc} we received isn't readable in places. Could you send a clearer PDF?\n\n${sign}`;
    case "invoice":
      return `${hello}\n\nWe have a proforma for ${doc}. To book it we need the final tax invoice. Could you send it across?\n\n${sign}`;
    default:
      return `${hello}\n\nOn invoice ${doc}, the amount billed is more than agreed. Could you issue a credit note for the difference?\n\n${sign}`;
  }
};

const chase: NeoTask = {
  id: "chase",
  title: "Message a vendor",
  match: (p) =>
    has(
      p,
      /\b(ask|chase|message|whatsapp|email|remind|write to|follow up)\b/i
    ) && !has(p, /\bwhy\b/i)
      ? 3
      : 0,
  run: async (api) => {
    const bills = companyItems().filter((x) => x.route === "AP" && isOpen(x));
    const vendor = findName(api.prompt, [
      ...new Set(bills.map((x) => x.form.party).filter(Boolean)),
    ]);
    let x =
      resolveItem(api, (i) => i.route === "AP") ||
      bills.find((b) => b.form.party === vendor);
    if (!x) {
      if (!bills.length) {
        await api.say("There are no open bills to follow up on.");
        return "Nothing open";
      }
      x = await pickItem(
        api,
        "Which bill is this about?",
        [...bills].sort(
          (a, b) =>
            Number(!!b.original.bill?.vendorMissing) -
            Number(!!a.original.bill?.vendorMissing)
        )
      );
      if (!x) return;
    }
    const askId =
      ASKS.find((a) => a.test.test(api.prompt))?.id ||
      (await api.ask(
        `What do you need from ${x.form.party || "the vendor"}?`,
        ASKS.map((a) => ({ id: a.id, label: a.label }))
      ));

    const drafting = await api.step("Drafting the message", refTo(x));
    await api.wait(500);
    /*
      The vendor's own address, from the email the bill arrived on. A bill
      that came in on WhatsApp was forwarded by a teammate, so its sender is
      one of us — never message that number as if it were the vendor.
    */
    const src = x.original.source;
    const to =
      src.channel === "email" && /@/.test(src.sender) ? src.sender : "";
    const company = companyOf(getState().company)?.name || "";
    const doc = x.form.invoiceNo || x.file.name;
    drafting(
      to
        ? `Drafted an email to ${x.form.party || to}`
        : `Drafted a message — no contact for ${x.form.party || "this vendor"} on file`
    );
    const card: NeoCard = {
      kind: "message",
      channel: "Email",
      to: to || "no address on file",
      body: body(askId, x.form.party || "Vendor", doc, company),
    };
    if (!to) {
      const pick = await api.card(card, [
        { id: "copy", label: "Copy the text", primary: true },
        { id: "cancel", label: "Don't send" },
      ]);
      if (pick === "copy") {
        if (!navigator.clipboard)
          throw new Error(
            "Clipboard access is unavailable. Select and copy the message text manually."
          );
        await navigator.clipboard.writeText(card.body);
        neoLog("Neo Vendor Message Drafted", api.runId, x, { request: askId });
        await api.say(
          `Copied. ${x.form.party || "This vendor"} has no email or WhatsApp in the vendor master, so send it from your own phone — and add their contact so I can send the next one.`
        );
        return "Drafted, not sent";
      }
      await api.say("Not sent.");
      return "Not sent";
    }
    const choice = await api.card(card, [
      {
        id: "send",
        label: "Simulate send",
        primary: true,
        risk: "external",
      },
      { id: "cancel", label: "Don't send" },
    ]);
    if (choice !== "send") {
      await api.say("Not sent.");
      return "Not sent";
    }
    const sending = await api.step(`Sending to ${to}`);
    await api.wait(700);
    neoLog("Neo Vendor Message Sent", api.runId, x, {
      channel: card.channel,
      to,
      request: askId,
      simulated: true,
      body: card.body,
    });
    api.touch([x.id]);
    sending(`Sent to ${to} · logged against ${x.id}`);
    await api.say(
      `Sent — simulated in this prototype, so nothing actually left the page. It's logged against ${describe(x)}.`,
      [refTo(x)]
    );
    return `Asked ${x.form.party || to}`;
  },
};

export default chase;
