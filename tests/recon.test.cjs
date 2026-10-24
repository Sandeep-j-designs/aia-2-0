/**
 * Three-way reconciliation evals (20 Oct 2026): the brief's rule-per-case
 * checks, run against the Nandhini September data. Run with
 * `node tests/recon.test.cjs`.
 */
const path = require("path");
const jiti = require("jiti")(__filename, {
  alias: { "@": path.resolve(__dirname, "..") },
  interopDefault: true,
});
const assert = require("assert");
const m = jiti("../config/pages/neo/mock-recon.ts");

let pass = 0;
const t = (name, fn) => {
  fn();
  pass++;
  console.log("ok -", name);
};
const r2 = (n) => Math.round(n * 100) / 100;

t("Zomato payouts prove gross − deductions = net (AMT-01)", () => {
  m.ZOMATO_PAYOUTS.forEach((p) => {
    const net = r2(p.gross + p.deductions.reduce((s, d) => s + d.amount, 0));
    assert.strictEqual(net, p.net, p.id);
  });
});
t("week 36 lands ₹0.01 short, within round-off (AMT-03)", () => {
  const w = m.ZOMATO_PAYOUTS[0];
  assert.strictEqual(r2(w.net - w.bank), 0.01);
});
t("Swiggy 14–20 Sep is ₹10 short (SUS-02)", () => {
  assert.strictEqual(r2(m.SWIGGY_PAYOUTS[2].net - m.SWIGGY_PAYOUTS[2].bank), 10);
});
t("Koramangala 12 Sep net equals a JP Nagar credit (IDN-03 trap)", () => {
  const k = m.KORAMANGALA_CARD[1];
  assert.ok(m.STATEMENT_ROWS.some((r) => r.side === "C" && r.amount === k.net));
});
t("statement only holds September", () => {
  assert.ok(m.STATEMENT_ROWS.every((r) => r.date >= "2026-09-01" && r.date <= "2026-09-30"));
});
t("every card settlement in September is on the statement", () => {
  m.CARD_SETTLEMENTS.filter((c) => c.payDate <= "2026-09-30").forEach((c) =>
    assert.ok(
      m.STATEMENT_ROWS.some((r) => r.amount === c.net && r.date === c.payDate),
      c.saleDate
    )
  );
});
console.log(`\n${pass} passed · ${m.STATEMENT_ROWS.length} statement rows`);

/* ------------------------------------------------------------- the engine */
const recon = jiti("../hooks/pages/neo/use-recon.ts");
const run = recon.startRun(
  "nandhini",
  m.RECON_SAMPLE_FILES.map((f) => f.name)
);
t("every voucher balances, Dr = Cr (PST)", () => {
  run.vouchers.forEach((v) => {
    const dr = r2(v.lines.reduce((s, l) => s + (l.dr || 0), 0));
    const cr = r2(v.lines.reduce((s, l) => s + (l.cr || 0), 0));
    assert.strictEqual(dr, cr, `${v.id}: ${dr} vs ${cr}`);
  });
});
t("every bank row is accounted (coverage 100%)", () => {
  const c = recon.coverage(run);
  assert.strictEqual(c.accounted, c.total);
});
t("wrong-outlet MPR is blocked, never matched (IDN-03)", () => {
  const d = run.docs.find((x) => x.file.includes("96201257"));
  assert.strictEqual(d.status, "blocked");
});
t("statement copy creates nothing new (DUP-01)", () => {
  assert.strictEqual(run.docs.find((x) => x.file.includes("stmt")).status, "duplicate");
});
t("milk receipt rejected (DOC-01)", () => {
  assert.strictEqual(run.docs.find((x) => x.file.includes("milk")).status, "rejected");
});
t("no daily sales voucher for 8 Sep card (DUP-04)", () => {
  assert.ok(!run.vouchers.some((v) => v.id === "SV-card-2026-09-08"));
});
t("8 Sep card receipt goes on account (ALC-04)", () => {
  const v = run.vouchers.find((x) => x.id === "RV-card-2026-09-08");
  assert.ok(v.lines.some((l) => l.ref === "On account"));
});
t("ICICI transfer is one contra; LLP payment is not (IDN-04, DUP-06)", () => {
  assert.ok(run.vouchers.some((v) => v.type === "Contra" && /ICICI/.test(v.lines[0].ledger)));
  const llp = run.vouchers.find((v) => /NANDHINI FOODS/.test(v.narration));
  assert.strictEqual(llp.type, "Payment");
});
t("platform sales carry no output GST (ENT-04, proposed)", () => {
  run.vouchers
    .filter((v) => v.type === "Sales" && ["zomato", "swiggy", "ownly"].includes(v.channel))
    .forEach((v) => assert.ok(!v.lines.some((l) => /Output/.test(l.ledger)), v.id));
});
t("Zomato 28–30 Sep are open, not short (MAT-06)", () => {
  assert.ok(run.open.some((o) => o.what.startsWith("Zomato 28 Sep")));
});
t("POS 'exclusive' answer holds only sales (ASK-04)", () => {
  recon.answerRun(run.id, "pos-inclusive", "exclusive");
  const r = recon.getRun(run.id);
  assert.ok(r.vouchers.filter((v) => v.type === "Sales").every((v) => v.status === "needs-input"));
  assert.ok(r.vouchers.filter((v) => v.type !== "Sales").every((v) => v.status !== "needs-input"));
});

/* --------------------------------------------- phase 3: close September */
const sep = recon.startRun("nandhini", m.RECON_SAMPLE_FILES.map((f) => f.name), "sep");
recon.answerRun(sep.id, "amazon", "office-always");
recon.answerRun(sep.id, "llp", "loan");
recon.showRunRegister(sep.id);
const made = recon.createReconDrafts(sep.id);
t("September sign-off drafts sales and codes every bank line", () => {
  assert.strictEqual(made.sales, 179);
  assert.strictEqual(made.bank, 93);
});
t("signing off teaches formats, Ownly, and a shadow Amazon rule (LRN-02/04, DOC-06)", () => {
  const rules = recon.rulesOf("nandhini");
  assert.ok(rules.some((r) => r.kind === "format" && r.match === "Petpooja day-end" && r.state === "active"));
  assert.ok(rules.some((r) => r.match === "CTRLX" && r.state === "active"));
  const amz = rules.find((r) => r.match === "AMAZON PAY");
  assert.strictEqual(amz.state, "shadow");
  assert.strictEqual(amz.confirmations, 1);
  assert.ok(!rules.some((r) => r.match === "NANDHINI FOODS LLP"), "a this-time answer teaches nothing (LRN-03)");
});
const ev = recon.readCloseStatement(sep.id, m.CLOSE_STATEMENT.name);
t("the 1–7 Oct statement evidences what was open (MAT-06)", () => {
  const e = recon.getRun(sep.id).evidence;
  assert.ok(e.some((x) => x.what.startsWith("Zomato 28 Sep") && x.state === "collected"));
  assert.ok(e.some((x) => x.what.startsWith("Swiggy 21 Sep") && x.state === "collected"));
  assert.ok(e.some((x) => x.what.startsWith("Swiggy 28 Sep") && x.state === "not-due"));
  assert.ok(!e.some((x) => x.state === "overdue"));
});
t("September can't close with suspense open (SUS-04)", () => {
  assert.strictEqual(recon.closeReadiness(recon.getRun(sep.id)).ready, false);
});
recon.getRun(sep.id).suspense.forEach((l) =>
  recon.resolveSuspense(sep.id, l.id, /Swiggy/.test(l.what) ? { ledger: "Swiggy Commission" } : "carry")
);
t("resolved suspense leaves balanced vouchers; carried counts at close", () => {
  const r = recon.getRun(sep.id);
  r.vouchers.forEach((v) => {
    const dr = r2(v.lines.reduce((s, l) => s + (l.dr || 0), 0));
    const cr = r2(v.lines.reduce((s, l) => s + (l.cr || 0), 0));
    assert.strictEqual(dr, cr, v.id);
  });
  assert.ok(recon.closeReadiness(r).ready);
  recon.closeRun(sep.id);
  assert.ok(recon.getRun(sep.id).closed);
});

/* ------------------------------------------- phase 4: October asks less */
const oct = recon.startRun("nandhini", m.RECON_OCT_FILES.map((f) => f.name), "oct");
t("October asks fewer questions than September (EV-LRN)", () => {
  assert.ok(oct.questions.length < sep.questions.length, `${oct.questions.length} vs ${sep.questions.length}`);
  assert.ok(!oct.questions.some((q) => q.id === "pos-inclusive" || q.id === "ctrlx"));
  assert.ok(oct.questions.some((q) => q.id === "amazon" && q.confirms), "shadow rule asks to confirm");
  assert.ok(oct.questions.some((q) => q.id === "llp"), "this-time answer is asked again");
});
t("October's statement adds only rows Banking lacks (DUP-01, DUP-03)", () => {
  const d = oct.docs.find((x) => x.purpose === "Bank statement");
  assert.strictEqual(d.status, "read");
  assert.ok(d.hits.some((h) => h.rule === "DUP-03"));
});
t("October balances and covers every bank row", () => {
  oct.vouchers.forEach((v) => {
    const dr = r2(v.lines.reduce((s, l) => s + (l.dr || 0), 0));
    const cr = r2(v.lines.reduce((s, l) => s + (l.cr || 0), 0));
    assert.strictEqual(dr, cr, v.id);
  });
  const c = recon.coverage(oct);
  assert.strictEqual(c.accounted, c.total);
});
t("October receipts close September's receivables (ALC-01)", () => {
  const z = oct.vouchers.find((v) => v.id === "RV-ZMT-W40");
  assert.ok(z.lines.some((l) => l.ref === "Agst Ref 28 Sep zomato"));
});
recon.showRunRegister(oct.id);
recon.createReconDrafts(oct.id);
t("confirming the shadow rule counts towards it (2 of 3)", () => {
  assert.strictEqual(recon.rulesOf("nandhini").find((r) => r.match === "AMAZON PAY").confirmations, 2);
});
console.log(`\n${pass} passed · ${run.vouchers.length} vouchers · open: ${run.open.map((o) => o.what).join(", ")}`);
