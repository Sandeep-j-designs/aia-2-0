import { getState } from "@/components/inbox/v2/store";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import {
  freightSummary,
  itcRisk,
  rupees,
} from "@/utils/pages/inbox/ai-calculations";
import type { NeoTask } from "@/types/pages/neo";
export const freightInsight: NeoTask = {
  id: "freight-insight",
  title: "Explain freight movement",
  match: (p) =>
    /freight/i.test(p) && /why|spent|spend|up|September/i.test(p) ? 8 : 0,
  run: async (api) => {
    const f = freightSummary(
      getState().items,
      api.context.company || getState().company
    );
    await api.say(
      `September freight ${rupees(f.september)} minus August ${rupees(f.august)} = increase ${rupees(f.september - f.august)}. September has ${f.septemberRecords.length} bills; the nine Mahindra bills include the additional plant route. Amounts below exclude tax and sum directly from bill lines.`,
      f.records.map((x) => ({ label: x.form.invoiceNo, itemId: x.id }))
    );
    api.show({
      kind: "list",
      title: "Freight calculation records",
      groups: [
        {
          label: "August and September source bills",
          tone: "neutral",
          rows: f.records.map((x) => ({
            itemId: x.id,
            primary: x.form.party,
            secondary: `${x.form.date} · ${x.form.invoiceNo}`,
            amount: x.form.lines.reduce((n, l) => n + l.amount, 0),
          })),
        },
      ],
    });
    return "Freight movement computed";
  },
};
export const itcInsight: NeoTask = {
  id: "itc-risk",
  title: "Compute Q2 ITC at risk",
  match: (p) => (/itc|input.*credit/i.test(p) ? 9 : 0),
  run: async (api) => {
    const company = api.context.company || getState().company;
    const rows = Object.entries(getGstState(company).invoices)
      .filter(([m]) => m >= "2026-07" && m <= "2026-09")
      .flatMap(([, r]) => r);
    const r = itcRisk(rows);
    await api.say(
      `Q2 (Jul–Sep 2026), available reconciled periods: Missing in 2B ${r.missingCount} invoices, ${rupees(r.missing)} + AI Probable ${r.probableCount}, ${rupees(r.probable)} = ${rupees(r.total)} at risk. Computed by summing purchase-register GST, without model arithmetic.`,
      [
        {
          label: "Open GST source records",
          href: "/inbox?module=GST&tab=invoices",
        },
      ]
    );
    return "ITC risk computed";
  },
};
