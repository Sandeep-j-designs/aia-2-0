const { chromium } = require("/tmp/aia-playwright/node_modules/playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:3001/inbox?id=CHECK-CANCELLED");
    await page.locator(".review-toolbar").waitFor();
    assert(await page.locator(".review-toolbar-reason-text").isVisible());
    assert((await page.locator(".review-toolbar").boundingBox()).height <= 56);
    await page.getByRole("button", { name: /Ask Neo/ }).first().click();
    const panel = page.getByRole("complementary", { name: "Neo", exact: true });
    await panel.waitFor();
    for (const width of [1920, 1440, 1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(300);
      const bounds = await panel.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      assert(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth));
      assert.equal(
        await panel.evaluate((el) => getComputedStyle(el).backgroundColor),
        "rgb(255, 255, 255)"
      );
      const send = await panel
        .getByRole("button", { name: "Send", exact: true })
        .boundingBox();
      assert(send.y + send.height <= 1000);
      if (width >= 1440) {
        assert(!(await page.locator(".review-toolbar-reason-text").isVisible()));
        assert((await page.locator(".review-toolbar").boundingBox()).height <= 56);
        const suggestion = page.getByRole("button", { name: "AI routing suggestion" });
        await suggestion.hover();
        await page.getByRole("tooltip").filter({ hasText: "Your company is the buyer on this vendor invoice." }).waitFor();
        await page.mouse.move(0, 200);
        const approve = await page
          .getByRole("button", { name: "Approve & Next", exact: true })
          .boundingBox();
        assert(approve.x + approve.width <= bounds.x);
        const route = await page.locator("#inbox-post-as").boundingBox();
        assert(route.x + route.width < approve.x);
      }
      await page.screenshot({ path: `/tmp/neo-layout-${width}.png` });
    }
    await panel.getByRole("tab", { name: "Tasks", exact: true }).click();
    await panel.getByText(/Nothing yet/).waitFor();
    await panel.getByRole("tab", { name: "Chat", exact: true }).click();
    await panel
      .getByRole("textbox", { name: "Ask Neo" })
      .fill("Explain this document");
    await panel.getByRole("button", { name: "Send", exact: true }).click();
    await panel.getByText("Explain this document", { exact: true }).waitFor();
    await panel.getByRole("button", { name: "Close Neo" }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(
      await page
        .locator(".review-toolbar")
        .evaluate((el) => el.getBoundingClientRect().width),
      1440
    );
    assert.deepEqual(errors, []);
    console.log(
      "Neo light mode, responsive layout, review actions, tabs and composer: passed"
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
