const { chromium } = require("/tmp/aia-playwright/node_modules/playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const button = (name) => page.getByRole("button", { name, exact: true });
    const fits = async () =>
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      );
    await page.goto("http://localhost:3001/inbox?module=AGENTS");
    await button("Set up agent").click();
    await page
      .getByRole("radio", { name: "WhatsApp Business", exact: true })
      .check();
    await fits();
    assert.equal(
      await page.getByLabel("Source account", { exact: true }).inputValue(),
      "Registered business number · demo"
    );
    await page.getByRole("radio", { name: "Gmail", exact: true }).check();
    const account = page.getByLabel("Source account", { exact: true });
    await account.selectOption({ index: 1 });
    const selected = await account.inputValue();
    const date = page.getByLabel("Collection start date", { exact: true });
    await page.locator("summary").click();
    await date.fill("");
    assert(await button("Review setup").isDisabled());
    await date.fill("2026-10-01");
    await button("Review setup").click();
    await page.getByText("0 in scope", { exact: true }).waitFor();
    await page.getByText(/No sample documents match/).waitFor();
    await button("Edit").click();
    assert.equal(await account.inputValue(), selected);
    assert.equal(await date.inputValue(), "2026-10-01");
    await page.locator("summary").click();
    await date.fill("2026-09-01");
    await fits();
    await button("Review setup").click();
    await page.getByText("4 in scope", { exact: true }).waitFor();
    await fits();
    await button("Save agent").click();
    await page
      .getByText("Connected. Let’s collect your first invoices.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("tab", { name: "Configuration", exact: true }).click();
    await page.getByText(selected, { exact: true }).waitFor();
    await button("Edit access").click();
    assert.equal(await account.inputValue(), selected);
    await date.fill("2026-09-15");
    await button("Review setup").click();
    await button("Save connection").click();
    await page.getByText(/from 2026-09-15/).waitFor();
    await button("Add connection").click();
    await button("Cancel").click();
    assert.equal(await button("Edit access").count(), 1);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile setup, provider switching, account preservation, date validation, empty preview, back/edit, completion, edit connection and cancel."
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
