const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { panel, nativeRow, orgPanel } = require("./fixture.cjs");

const core = fs.readFileSync(path.join(__dirname, "../src/cost.js"), "utf8");
const content = fs.readFileSync(path.join(__dirname, "../src/content.js"), "utf8");
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function setup(t, markup = panel(), route = "/computer/tasks/example") {
  const dom = new JSDOM(`<html><body>${markup}</body></html>`, {
    url: `https://www.perplexity.ai${route}`,
    runScripts: "outside-only",
  });
  t.after(() => {
    dom.window.dispatchEvent(new dom.window.Event("pagehide"));
    dom.window.close();
  });
  dom.window.eval(core);
  dom.window.eval(content);
  await flush();
  return { window: dom.window, document: dom.window.document };
}

const value = (document) => document.querySelector("[data-pct-value]")?.textContent;

test("adds exactly one correctly aligned native-style row", async (t) => {
  const { document } = await setup(t);
  const source = document.querySelector("[data-native-row]");
  const row = document.querySelector("[data-pct-row]");
  assert.equal(source.nextElementSibling, row);
  assert.equal(value(document), "$2.63");
  assert.equal(row.querySelector(".pct-label").textContent, "Cost equi.");
  assert.equal(row.querySelector(".pct-icon").textContent, "$");
  assert.match(row.title, /\$0\.012/);
  assert.match(row.title, /Not an invoice/);
  assert.equal(row.querySelectorAll("button,a").length, 0);
  assert.equal(document.querySelectorAll('[aria-label="About session usage"]').length, 1);
});

test("updates on textContent replacement and direct text-node mutation", async (t) => {
  const { document } = await setup(t);
  const sourceValue = document.querySelector("[data-native-value]");
  sourceValue.textContent = "1,234.56 credits";
  await flush();
  assert.equal(value(document), "$14.81");
  sourceValue.firstChild.data = "50'000 credits";
  await flush();
  assert.equal(value(document), "$600.00");
  assert.equal(document.querySelectorAll("[data-pct-row]").length, 1);
});

test("handles asynchronously mounted panels and zero credits", async (t) => {
  const { document } = await setup(t, "<main>Conversation</main>");
  assert.equal(value(document), undefined);
  document.body.insertAdjacentHTML("beforeend", panel("0 credits"));
  await flush();
  assert.equal(value(document), "$0.00");
});

test("repairs an extension row removed by a framework rerender", async (t) => {
  const { document } = await setup(t);
  document.querySelector("[data-pct-row]").remove();
  await flush();
  assert.equal(value(document), "$2.63");
  assert.equal(document.querySelectorAll("[data-pct-row]").length, 1);
});

test("survives full panel replacement and collapse/remount", async (t) => {
  const { document } = await setup(t);
  document.querySelector(".panel").outerHTML = panel("500 credits");
  await flush();
  assert.equal(value(document), "$6.00");
  document.querySelector(".usage-content").innerHTML = "";
  await flush();
  assert.equal(value(document), undefined);
  document.querySelector(".usage-content").innerHTML = nativeRow("1 credit");
  await flush();
  assert.equal(value(document), "$0.01");
});

test("unreadable values cannot leave stale cost or imply zero", async (t) => {
  const { document } = await setup(t);
  document.querySelector("[data-native-value]").textContent = "Loading…";
  await flush();
  assert.equal(value(document), "Unavailable");
  document.querySelector("[data-native-value]").textContent = "0.01 credits";
  await flush();
  assert.equal(value(document), "<$0.01");
});

test("never confuses an available pool or message text with session usage", async (t) => {
  const { document } = await setup(t, `
    <p>Session usage 50,000 credits</p><div>Available org credits 1,000,000 credits</div>
    <div>Cost equi. $99</div>${panel("10 credits")}`);
  assert.equal(value(document), "$0.12");
  assert.equal(document.querySelectorAll("[data-pct-row]").length, 1);
});

test("is dormant on non-session pages and resumes after SPA navigation", async (t) => {
  const { window, document } = await setup(t, panel(), "/");
  assert.equal(value(document), undefined);
  window.history.pushState({}, "", "/computer/tasks/new-session");
  document.body.append(document.createElement("div"));
  await flush();
  assert.equal(value(document), "$2.63");
  window.history.pushState({}, "", "/search");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await flush();
  assert.equal(value(document), undefined);
  window.history.pushState({}, "", "/computer/tasks/another-session");
  document.querySelector("[data-native-value]").textContent = "100 credits";
  await flush();
  assert.equal(value(document), "$1.20");
});

test("duplicate injection is harmless", async (t) => {
  const { window, document } = await setup(t);
  window.eval(content);
  document.querySelector("[data-native-value]").textContent = "500 credits";
  await flush();
  assert.equal(value(document), "$6.00");
  assert.equal(document.querySelectorAll("[data-pct-row]").length, 1);
});

test("uses a bounded structural fallback without the native row class", async (t) => {
  const { document } = await setup(t, panel().replace("group/context-pane-row", "new-native-row"));
  assert.equal(value(document), "$2.63");
});

test("multiple responsive panels each get exactly one matching estimate", async (t) => {
  const { document } = await setup(t, panel("100 credits") + panel("200 credits"));
  assert.deepEqual(
    [...document.querySelectorAll("[data-pct-value]")].map((node) => node.textContent),
    ["$1.20", "$2.40"],
  );
});

test("ignores unrelated streaming text and has no observer write loop", async (t) => {
  const { window, document } = await setup(t);
  let writes = 0;
  const observer = new window.MutationObserver((records) => { writes += records.length; });
  observer.observe(document.querySelector("[data-pct-row]"), { childList: true, subtree: true, attributes: true });
  const paragraph = document.createElement("p");
  document.body.append(paragraph);
  for (let i = 0; i < 100; i++) paragraph.textContent = `Streamed token ${i}`;
  await flush();
  assert.equal(writes, 0);
  observer.disconnect();
});

test("manifest has no privileged APIs, background process or external origins", () => {
  const manifest = require("../manifest.json");
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, require("../package.json").version);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.action, undefined);
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "https://www.perplexity.ai/*",
    "https://perplexity.ai/*",
  ]);
});

const orgValue = (document) => document.querySelector("[data-pct-org]")?.textContent;
const orgRoute = "/account/org/credits-usage";

test("adds the org equivalent inside the balance, not beside a refill amount", async (t) => {
  const { document } = await setup(t, orgPanel(), orgRoute);
  assert.equal(orgValue(document), "($600.00)");
  assert.equal(document.querySelector("[data-pct-org]").parentElement, document.querySelector("[data-org-value]"));
  assert.equal(document.querySelector("[data-refill]").textContent, "20,000");
});

for (const label of ["Available org credits", "Available organization credits", "Available organisation credits"]) {
  test(`accepts the exact org label ${label}`, async (t) => {
    const { document } = await setup(t, orgPanel("50,000", label), orgRoute);
    assert.equal(orgValue(document), "($600.00)");
  });
}

test("updates org credit text nodes without reading its own suffix", async (t) => {
  const { document } = await setup(t, orgPanel(), orgRoute);
  const source = document.querySelector("[data-org-value]");
  source.firstChild.data = "25,000";
  await flush();
  assert.equal(orgValue(document), "($300.00)");
  assert.match(document.querySelector("[data-pct-org]").getAttribute("aria-label"), /\$300\.00/);
  source.textContent = "1,234.56";
  await flush();
  assert.equal(orgValue(document), "($14.81)");
  assert.equal(document.querySelectorAll("[data-pct-org]").length, 1);
});

test("handles unavailable org balances and subsequent recovery", async (t) => {
  const { document } = await setup(t, orgPanel("Loading…"), orgRoute);
  assert.equal(orgValue(document), "(Unavailable)");
  document.querySelector("[data-org-value]").textContent = "0";
  await flush();
  assert.equal(orgValue(document), "($0.00)");
});

test("unknown org formats drop the suffix instead of keeping a stale estimate", async (t) => {
  const { document } = await setup(t, orgPanel(), orgRoute);
  document.querySelector("[data-org-value]").textContent = "50k";
  await flush();
  assert.equal(orgValue(document), undefined);
  document.querySelector("[data-org-value]").textContent = "50,000";
  await flush();
  assert.equal(orgValue(document), "($600.00)");
});

test("does not convert grants, refill limits, or similarly named usage totals", async (t) => {
  const { document } = await setup(t, `
    <div>Org credits used</div><div>50,000</div>
    <div>Auto-refill amount</div><div>20,000</div>`, orgRoute);
  assert.equal(orgValue(document), undefined);
});

test("handles lazy org mounting and complete rerenders", async (t) => {
  const { document } = await setup(t, "", orgRoute);
  document.body.innerHTML = orgPanel();
  await flush();
  assert.equal(orgValue(document), "($600.00)");
  document.body.innerHTML = orgPanel("100,000");
  await flush();
  assert.equal(orgValue(document), "($1,200.00)");
});

test("cleans up both displays on SPA route changes", async (t) => {
  const { window, document } = await setup(t, panel() + orgPanel());
  assert.equal(value(document), "$2.63");
  assert.equal(orgValue(document), undefined);
  window.history.pushState({}, "", orgRoute);
  document.body.append(document.createElement("div"));
  await flush();
  assert.equal(value(document), undefined);
  assert.equal(orgValue(document), "($600.00)");
  window.history.pushState({}, "", "/");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await flush();
  assert.equal(orgValue(document), undefined);
  assert.equal(document.querySelector("[data-org-value]").textContent, "50,000");
});

test("disconnects on pagehide and recovers from the back-forward cache", async (t) => {
  const { window, document } = await setup(t);
  window.dispatchEvent(new window.Event("pagehide"));
  document.querySelector("[data-native-value]").textContent = "100 credits";
  window.dispatchEvent(new window.Event("pageshow"));
  await flush();
  assert.equal(value(document), "$1.20");
});
