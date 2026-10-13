import type { NeoTask } from "@/types/pages/neo";
import { getState } from "@/components/inbox/v2/store";
import { rupees } from "@/utils/pages/inbox/ai-calculations";
const invoiceFromPo: NeoTask = {
  id: "invoice-from-po",
  title: "Raise invoice from customer PO",
  match: (p) =>
    /\bpo\b|purchase order/i.test(p) && /invoice|raise/i.test(p) ? 20 : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const po = getState().items.find(
      (x) =>
        x.company === company &&
        x.original.invoice?.customerPoNo &&
        x.status !== "Deleted"
    );
    if (!po) {
      await api.say(
        "There is no customer purchase order in this organisation’s Inbox. Upload one before raising its invoice."
      );
      return;
    }
    const invoice = po.original.invoice!;
    await api.say(
      `Customer PO ${invoice.customerPoNo}: ${invoice.items.map((l) => `${l.qty} ${l.unit} × ${rupees(l.rate || 0)} = ${rupees(l.amount)}`).join("; ")}. CGST ${rupees(invoice.taxes.cgst || 0)} + SGST ${rupees(invoice.taxes.sgst || 0)}; total ${rupees(invoice.grandTotal)}. A draft sales invoice already exists from intake; opening it avoids a duplicate. Review the customer, stock item and ledger before approval.`,
      [{ label: "Review draft sales invoice", itemId: po.id }]
    );
    const choice = await api.card(
      {
        kind: "voucher",
        voucherType: "Sales",
        state: "Draft created",
        voucherNo: po.form.voucherNo,
        party: po.form.party,
        date: po.form.date,
        lines: [
          { ledger: po.form.party, side: "Dr", amount: invoice.grandTotal },
          {
            ledger: "Sales — Local (GST)",
            side: "Cr",
            amount: invoice.subTotal,
            inferred: true,
          },
          {
            ledger: "Output CGST",
            side: "Cr",
            amount: invoice.taxes.cgst || 0,
          },
          {
            ledger: "Output SGST",
            side: "Cr",
            amount: invoice.taxes.sgst || 0,
          },
        ],
        source: { label: invoice.customerPoNo!, itemId: po.id },
        why: "Customer order matched to Refined Sunflower Oil — 15 L Tin; income ledger from history",
      },
      [
        { id: "review", label: "Review invoice", primary: true, risk: "read" },
        { id: "leave", label: "Leave in Needs Review" },
      ]
    );
    if (choice === "review") await api.navigate(`/inbox?id=${po.id}`);
    return "Existing PO invoice prepared for review";
  },
};
export default invoiceFromPo;
