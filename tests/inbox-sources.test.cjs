const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  vm = require("node:vm");
const root = path.resolve(__dirname, ".."),
  cache = new Map();
const context = {
  structuredClone,
  Date,
  console,
  crypto: require("node:crypto").webcrypto,
  setTimeout() {
    return 1;
  },
  window: { dispatchEvent() {} },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
  },
  CustomEvent: class {},
};
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const req = (n) =>
    n === "react"
      ? { useSyncExternalStore() {} }
      : n.startsWith("@/")
        ? load(path.join(root, n.slice(2) + ".ts"))
        : require(n);
  vm.runInNewContext("(function(require,exports){" + js + "\n})", context)(
    req,
    exports
  );
  return exports;
}
const mod = (f) => load(path.join(root, f + ".ts"));
const store = mod("components/inbox/v2/store");
const sources = mod("hooks/pages/inbox/use-inbox-sources");
(async () => {
  store.applyScenario("whatsapp");
  const company = store.getState().company;
  sources.connectSource(company, "Gmail", "Accounts / Invoices", "2026-09-01");
  assert.equal(sources.collectionAgent(company).runMode, "on-demand");
  sources.configureCollectionAgent(company, "on-demand");
  assert.equal(sources.shouldWatchSources(company), false);
  assert.equal(
    (
      await sources.collectSources(
        company,
        "background-denied",
        async () => {},
        undefined,
        undefined,
        undefined,
        "continuous"
      )
    ).length,
    0
  );
  assert.equal(sources.getSourceState().runs.length, 0);
  const first = await sources.collectSources(
    company,
    "test-collect",
    async () => {}
  );
  assert.equal(first.length, 4);
  assert.equal(first.filter((r) => r.outcome === "prepared").length, 2);
  assert.equal(first.filter((r) => r.outcome === "needs-decision").length, 1);
  assert.equal(first.filter((r) => r.outcome === "failed").length, 1);
  for (const receipt of first.filter((r) => r.itemId)) {
    const item = store.getState().items.find((i) => i.id === receipt.itemId);
    assert.equal(
      item.status,
      receipt.outcome === "failed" ? "Failed" : "Needs Review"
    );
    assert.equal(item.company, company);
  }
  assert.equal(
    (await sources.collectSources(company, "repeat", async () => {})).length,
    0
  );
  assert.equal(sources.collectionAgent(company).runMode, "on-demand");
  sources.connectSource(
    company,
    "Google Drive",
    "Finance / September invoices",
    "2026-09-01"
  );
  const drive = await sources.collectSources(company, "drive", async () => {});
  assert.equal(drive.filter((r) => r.outcome === "linked").length, 1);
  assert.equal(drive.filter((r) => r.outcome === "prepared").length, 1);
  assert.equal(
    store.getState().items.filter((i) => i.id === `COLLECT-${company}-ML-0925`)
      .length,
    1
  );
  const missing = first.find((r) => r.outcome === "needs-decision");
  assert.equal(
    sources.resolveSourceReference(missing.itemId, "HT/2026/123"),
    true
  );
  assert.equal(
    sources.resolveSourceReference(missing.itemId, "OVERWRITE"),
    false
  );
  assert.equal(
    store.getState().items.find((i) => i.id === missing.itemId).form.invoiceNo,
    "HT/2026/123"
  );
  const failed = first.find((r) => r.outcome === "failed");
  assert.equal(
    sources.requestSourceCopy(failed, "request-1", "User edited request"),
    true
  );
  assert.equal(
    sources.requestSourceCopy(failed, "request-2", "Duplicate request"),
    false
  );
  assert.equal(
    sources.getSourceState().requests[0].body,
    "User edited request"
  );
  assert.equal(sources.receiveSourceReply("request-1"), true);
  const reply = await sources.collectSources(company, "reply", async () => {});
  assert.equal(reply.length, 1);
  assert.equal(reply[0].outcome, "prepared");
  assert.equal(
    store.getState().items.find((i) => i.id === reply[0].itemId).amount,
    24000
  );
  sources.connectSource(
    company,
    "WhatsApp Business",
    "Registered vendor conversations",
    "2026-09-01"
  );
  let release;
  const paused = sources.collectSources(
    company,
    "lock",
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  await assert.rejects(
    sources.collectSources(company, "concurrent", async () => {}),
    /already running/
  );
  // Stop the current source run before it writes anything, then safely retry.
  sources
    .getSourceState()
    .sources.forEach((s) => sources.setSourceStatus(s.id, "paused"));
  release();
  // Subsequent source checkpoints must not block the test.
  // A paused source should not be traversed at all on subsequent checks.
  const interval = setInterval(() => release(), 1);
  await paused;
  clearInterval(interval);
  assert.equal(
    store.getState().items.some((i) => i.id === `COLLECT-${company}-VR-0930`),
    false
  );
  const whatsapp = sources
    .getSourceState()
    .sources.find((s) => s.provider === "WhatsApp Business");
  sources.setSourceStatus(whatsapp.id, "connected");
  sources.configureCollectionAgent(company, "continuous");
  assert.equal(sources.shouldWatchSources(company), true);
  sources.configureCollectionAgent(company, "continuous", true);
  assert.equal(sources.shouldWatchSources(company), false);
  const runCount = sources.getSourceState().runs.length;
  await sources.collectSources(
    company,
    "paused-background",
    async () => {},
    undefined,
    undefined,
    undefined,
    "continuous"
  );
  assert.equal(sources.getSourceState().runs.length, runCount);
  assert.equal(
    (await sources.collectSources(company, "resume", async () => {})).length,
    1
  );
  assert.equal(
    sources.collectionAgent(company).paused,
    true,
    "Run now must not resume the agent"
  );
  sources.configureCollectionAgent(company, "continuous");
  await sources.collectSources(
    company,
    "background",
    async () => {},
    undefined,
    undefined,
    undefined,
    "continuous"
  );
  assert.equal(sources.getSourceState().runs[0].trigger, "continuous");
  sources.configureCollectionAgent(company, "on-demand");
  assert.equal(sources.shouldWatchSources(company), false);
  sources.connectSource(company, "Gmail", "Accounts / Freight", "2026-09-01", {
    account: "second@example.test",
  });
  assert.equal(
    sources.getSourceState().sources.filter((s) => s.provider === "Gmail")
      .length,
    2
  );
  const interrupted = sources.collectSources(company, "stop-test", async () =>
    sources.stopCollection(company)
  );
  await assert.rejects(interrupted, /stopped/);
  assert.equal(sources.getSourceState().runs[0].status, "stopped");
  assert.equal(sources.getSourceState().busy.length, 0);
  sources.configureCollectionAgent(company, "continuous");
  let releaseModeChange;
  const gate = new Promise((resolve) => {
    releaseModeChange = resolve;
  });
  const inFlight = sources.collectSources(
    company,
    "mode-change-in-flight",
    () => gate,
    undefined,
    undefined,
    undefined,
    "continuous"
  );
  sources.configureCollectionAgent(company, "on-demand");
  releaseModeChange();
  await inFlight;
  assert.equal(sources.getSourceState().runs[0].status, "completed");
  assert.equal(sources.shouldWatchSources(company), false);
  await assert.rejects(
    sources.collectSources(
      company === "shakun" ? "acme" : "shakun",
      "cross",
      async () => {}
    ),
    /Organisation changed/
  );
  assert.equal(
    sources.previewSource(company, "Gmail", "Accounts / Invoices", "2026-10-01")
      .length,
    0
  );
  console.log(
    "PASS: draft preparation, exact dedup, source provenance, idempotency, missing-field guard, edited request + reply, lock, pause/resume, date scope and organisation isolation."
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
