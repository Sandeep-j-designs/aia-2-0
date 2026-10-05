/* Browser regression checks. Uses Playwright when installed, or PLAYWRIGHT_MODULE. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const source = fs.readFileSync(
      path.join(__dirname, "../public/ar/index.html"),
      "utf8"
    );
    const html = source.replace(
      "\nboot();",
      `
window.arTest = {get state(){return state}, masters:MASTERS, compute, runPredictions,
  predictRow, predictHsn, blankItem, blankLedger, draftCustomer, draftLedger, predictGroup,
  fbRecordLine, fbLineHit, render, hsnState, consentUpdateMaster, clearHsn, abSuggested,
  journalEntries, matchCustomer, fbRecordSalesLedger, fbSalesLedgerHit};
boot();`
    );
    await page.route("http://ar.test/**", (route) =>
      route.fulfill({ contentType: "text/html", body: html })
    );
    await page.goto("http://ar.test/");
    await page.waitForFunction(() => window.arTest?.state.ledgers.length > 1);
    assert.equal(await page.locator('[data-bind="reverseCharge"]').count(), 0);
    assert.ok((await page.locator('[data-act="pred-accept"]').count()) > 0);
    const checks = await page.evaluate(() => {
      const t = arTest,
        results = {};
      const known = t.masters.incomeLedgers.find(
        (m) =>
          m.sac &&
          t.masters.incomeLedgers.filter((x) => x.sac === m.sac).length === 1
      );
      const row = {
        ...t.blankLedger(),
        description: "Exact classification sample",
        invoiceHsn: known.sac,
        amount: 1000,
      };
      t.predictRow(row, "ledger");
      results.exactCode = row.ledger === known.id;
      const unknown = {
        ...t.blankLedger(),
        description: "Bespoke customer service",
        invoiceHsn: "999999",
        amount: 1000,
      };
      t.predictRow(unknown, "ledger");
      results.newProposal =
        !unknown.ledger &&
        unknown.pred?.resolution === "new" &&
        unknown.predState === "open";
      results.salesContext = unknown.pred.draft.group === "Sales Accounts";
      t.fbRecordLine(unknown, "ledger", known.id);
      const again = {
        ...t.blankLedger(),
        description: unknown.description,
        invoiceHsn: "999999",
        amount: 1000,
      };
      t.predictRow(again, "ledger");
      results.correctionWins =
        again.ledger === known.id && again.pred?.evidence === "habit";
      t.fbRecordSalesLedger(t.state.customer, "led-sales-local");
      results.salesHistory =
        t.fbSalesLedgerHit(t.state.customer)?.id === "led-sales-local";
      const code = {
        ...t.blankItem(),
        description: "Desktop computer",
        qty: 1,
        rate: 1000,
      };
      t.predictHsn(code, "item");
      results.hsnInferred = !!code.hsn && code.hsnFrom === "pred";
      t.clearHsn(code);
      t.predictHsn(code, "item");
      results.hsnUndo = !code.hsn && code.hsnDismissed;
      const manual = {
        ...t.blankItem(),
        description: "Desktop computer",
        hsn: "1234",
        hsnFrom: "user",
      };
      t.predictHsn(manual, "item");
      results.manualPreserved = manual.hsn === "1234";
      results.depositContext =
        t.predictGroup("Refundable caution deposit", "", "").group ===
        "Current Liabilities";
      results.goodsContext =
        t.predictGroup("Sale of new machinery", "8504", "").group !==
        "Fixed Assets";
      results.customerContext =
        t.draftCustomer({ name: "New Customer", gstin: "29AAGFT1122R1Z8" })
          .group === "Sundry Debtors";
      results.customerMatch =
        t.matchCustomer({
          name: "Spelling variant",
          gstin: t.masters.customers[0].gstin,
        })?.id === t.masters.customers[0].id;
      const before = t.compute();
      t.state.reverseCharge = true;
      results.noRcmCalculation = t.compute().grand === before.grand;
      delete t.state.reverseCharge;
      results.outputTax = t.state.taxLines
        .filter((r) => r.type === "gst")
        .every((r) => r.name.startsWith("Output "));
      results.taxProposals = t
        .abSuggested()
        .filter((r) => r.kind === "tax")
        .every(
          (r) => !r.name.includes("Input ") && !r.name.includes("TDS Payable")
        );
      return results;
    });
    for (const [name, passed] of Object.entries(checks))
      assert.equal(passed, true, name);
    // A suggested ledger displays its name and opens the same review-and-create flow as AP.
    const row = page
      .locator('[data-kind="ledgers"]')
      .filter({ has: page.locator('[data-act="pred-accept"]') })
      .first();
    assert.equal(await row.locator('[data-act="new-ledger"]').count(), 0);
    const before = await page.evaluate(() => arTest.state.newMasters.length);
    await row.locator('[data-act="pred-accept"]').click();
    await page.locator("#nm-dialog[open]").waitFor();
    await page.locator("#nm-save").click();
    await page.waitForFunction(
      (n) => arTest.state.newMasters.length === n + 1,
      before
    );
    assert.ok(
      await page.evaluate(() =>
        arTest.state.ledgers.some(
          (r) => r.pred?.made && r.predState === "applied"
        )
      )
    );
    assert.deepEqual(errors, []);
    console.log(
      `PASS: ${Object.keys(checks).length} AR prediction, feedback, HSN, customer, tax and RCM checks; master creation UI.`
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
