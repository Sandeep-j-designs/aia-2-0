const { chromium } = require("/tmp/aia-playwright/node_modules/playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3001/inbox?module=AGENTS");
  await page.getByRole("button", { name: "Set up agent", exact: true }).click();
  await page.getByRole("button", { name: "Review setup" }).click();
  assert(await page.getByRole("radio", { name: /Run on demand/ }).isChecked());
  await page.getByText("4 in scope", { exact: true }).waitFor();
  await page.screenshot({ path: "/tmp/aia-agents-setup.png" });
  await page.getByRole("button", { name: "Save agent", exact: true }).click();
  await page.getByText("On demand · Ready", { exact: true }).waitFor();
  await page.getByText("No collection tasks yet.", { exact: true }).waitFor();
  await page.clock.install();
  await page.clock.fastForward(31000);
  await page.getByText("No collection tasks yet.", { exact: true }).waitFor();
  await page.clock.resume();
  await page.getByRole("button", { name: "Run now", exact: true }).click();
  await page
    .getByText(
      /2 prepared · 0 duplicates linked · 1 need a decision · 1 unreadable\./
    )
    .waitFor();
  await page.getByRole("button", { name: /Close Neo/ }).click();
  await page.getByText("On demand · Ready", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Configuration", exact: true }).click();
  await page.getByRole("radio", { name: /Run continuously/ }).check();
  await page.getByRole("button", { name: "Save run mode" }).click();
  await page.getByRole("button", { name: "Pause agent" }).click();
  await page.getByText("Continuous · Paused", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  const count = await page.locator("article").count();
  await page.clock.fastForward(31000);
  assert.equal(await page.locator("article").count(), count);
  await page.getByRole("button", { name: "Resume agent" }).click();
  await page.clock.fastForward(31000);
  await page
    .getByRole("heading", { name: "Background collection", exact: true })
    .first()
    .waitFor();
  await page.screenshot({ path: "/tmp/aia-agents-activity.png" });
  await page.getByRole("tab", { name: "Configuration", exact: true }).click();
  await page.getByRole("radio", { name: /Run on demand/ }).check();
  await page.getByRole("button", { name: "Save run mode" }).click();
  await page.getByText("On demand · Ready", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Add connection" }).click();
  await page.getByRole("radio", { name: "Google Drive", exact: true }).check();
  await page.getByRole("button", { name: "Review setup" }).click();
  await page.getByRole("button", { name: "Save connection" }).click();
  await page.getByRole("button", { name: "Run now", exact: true }).click();
  await page
    .getByText(
      /1 prepared · 1 duplicates linked · 0 need a decision · 0 unreadable\./
    )
    .waitFor();
  // Use Neo's in-app links to retain the prototype session when opening records.
  await page.getByRole("button", { name: /Close Neo/ }).click();
  await page.getByRole("tab", { name: "Activity", exact: true }).click();
  await page
    .getByRole("button", { name: "SCAN-0928", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Ask Neo for a clearer copy" })
    .click();
  await page
    .getByLabel("Message to send", { exact: true })
    .fill("Please resend the readable PDF.");
  await page.getByRole("button", { name: "Send request (simulated)" }).click();
  await page.getByText(/Request recorded with your approved message/).waitFor();
  await page.getByRole("button", { name: /Close Neo/ }).click();
  await page.getByRole("button", { name: "Simulate supplier reply" }).click();
  await page
    .getByText(
      /1 prepared · 0 duplicates linked · 0 need a decision · 0 unreadable\./
    )
    .waitFor();
  await page.getByRole("button", { name: /Close Neo/ }).click();
  await page
    .getByRole("button", { name: "Back to Inbox", exact: true })
    .click();
  assert.equal(await page.getByRole("button", { name: /^Sources/ }).count(), 0);
  assert.equal(
    await page
      .getByText("An Inbox that collects for you", { exact: true })
      .count(),
    0
  );
  // Source is already part of the default Inbox table; no separate strip.
  await page
    .getByRole("button", {
      name: "Source details for COLLECT-shakun-ML-0925",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "Document sources", exact: true })
    .waitFor();
  assert((await page.getByRole("dialog").innerText()).includes("Google Drive"));
  assert((await page.getByRole("dialog").innerText()).includes("Gmail"));
  await page.screenshot({ path: "/tmp/aia-agents-provenance.png" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: /Organisation:.*Switch organisation/ })
    .click();
  await page
    .getByRole("button", { name: /Sahyadri Precision/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await page
    .getByRole("button", { name: "Set up agent", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/aia-agents-mobile.png" });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Set up agent", exact: true }).click();
  await page.getByRole("button", { name: "Review setup" }).click();
  await page.getByRole("radio", { name: /Run continuously/ }).check();
  await page
    .getByRole("button", { name: "Activate agent", exact: true })
    .click();
  await page
    .getByText(
      /2 prepared · 0 duplicates linked · 1 need a decision · 1 unreadable\./
    )
    .waitFor();
  await page.getByRole("button", { name: /Close Neo/ }).click();
  await page.getByText("Continuous · Watching", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: on-demand setup stays idle; manual run preserves mode; continuous pause/resume and background checks; mode switching; cross-source dedup; document follow-up; Source-column provenance; organisation isolation; mobile."
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
