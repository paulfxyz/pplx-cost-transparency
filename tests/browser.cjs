const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");
const { html, orgHtml } = require("./fixture.cjs");
const root = path.resolve(__dirname, "..");

async function launch() {
  return chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  });
}

async function routeFixtures(context) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      contentType: "text/html",
      body: url.pathname.startsWith("/account/org/credits-usage") ? orgHtml() : html(),
    });
  });
}

async function waitText(page, selector, text) {
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent === text,
    { selector, text },
    { timeout: 5000 },
  );
}

async function fit(page, selector) {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width, `${selector} fits horizontally`);
  assert.ok(box.y >= 0 && box.y + box.height <= viewport.height, `${selector} fits vertically`);
}

async function run() {
  const context = await launch();
  const errors = [];
  try {
    await routeFixtures(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const session = "https://www.perplexity.ai/computer/tasks/synthetic-example";
    await page.goto(session);
    await waitText(page, "[data-pct-value]", "$2.63");
    assert.equal(await page.locator("[data-pct-row]").count(), 1);
    assert.equal(await page.locator("[data-native-row]").evaluate((e) => e.nextElementSibling.hasAttribute("data-pct-row")), true);
    await fit(page, "[data-pct-row]");
    await page.locator("#increase").click();
    await waitText(page, "[data-pct-value]", "$14.81");
    await page.locator(".usage-toggle").click();
    assert.equal(await page.locator("[data-pct-value]").isVisible(), false);
    await page.locator(".usage-toggle").click();
    assert.equal(await page.locator("[data-pct-value]").isVisible(), true);
    await page.locator("#replace").click();
    await waitText(page, "[data-pct-value]", "$6.00");
    await page.locator("#switch").click();
    await waitText(page, "[data-pct-value]", "$600.00");
    await page.locator("#invalid").click();
    await waitText(page, "[data-pct-value]", "Unavailable");
    await page.locator("#restore").click();
    await waitText(page, "[data-pct-value]", "$2.63");
    await page.locator("#theme").click();
    assert.equal(await page.locator("[data-pct-value]").evaluate((e) => getComputedStyle(e).color),
      await page.locator("[data-native-value]").evaluate((e) => getComputedStyle(e).color));
    await page.locator("#leave").click();
    await page.waitForFunction(() => !document.querySelector("[data-pct-row]"));
    await page.locator("#return").click();
    await waitText(page, "[data-pct-value]", "$2.63");
    await page.setViewportSize({ width: 375, height: 812 });
    await fit(page, "[data-pct-row]");
    await fit(page, "[data-pct-value]");
    await page.setViewportSize({ width: 1280, height: 800 });
    await fit(page, "[data-pct-row]");
    console.log("PASS session: actual extension loading, alignment, live updates, collapse, rerender, SPA, recovery, themes and resize");

    await page.goto("https://www.perplexity.ai/account/org/credits-usage");
    await waitText(page, "[data-pct-org]", "($600.00)");
    await page.locator("#decrease").click();
    await waitText(page, "[data-pct-org]", "($300.00)");
    assert.match(await page.locator("[data-pct-org]").getAttribute("aria-label"), /\$300\.00/);
    await page.locator("#replace").click();
    await waitText(page, "[data-pct-org]", "($1,200.00)");
    await page.locator("#invalid").click();
    await waitText(page, "[data-pct-org]", "(Unavailable)");
    await page.locator("#restore").click();
    await waitText(page, "[data-pct-org]", "($600.00)");
    await page.locator("#theme").click();
    assert.equal(await page.locator("[data-pct-org]").evaluate((e) => getComputedStyle(e).color),
      await page.locator("[data-org-value]").evaluate((e) => getComputedStyle(e).color));
    assert.equal(await page.locator("[data-refill]").textContent(), "20,000");
    await page.setViewportSize({ width: 375, height: 812 });
    await fit(page, "[data-pct-org]");
    await page.setViewportSize({ width: 1280, height: 800 });
    await fit(page, "[data-pct-org]");
    console.log("PASS organization: adjacent suffix, updates, rerenders, unavailable recovery, preserved refill value, themes and resize");

    await page.goto("https://www.perplexity.ai/");
    assert.equal(await page.locator("[data-pct-row]").count(), 0);
    await page.locator("#switch").click();
    await waitText(page, "[data-pct-value]", "$600.00");
    await page.goto("https://perplexity.ai/computer/tasks/synthetic-example");
    await waitText(page, "[data-pct-value]", "$2.63");
    await page.goto("https://example.com/computer/tasks/synthetic-example");
    assert.equal(await page.locator("[data-pct-row]").count(), 0);
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log("PASS boundaries: dormant non-target paths, SPA entry, apex hostname, no injection on unrelated sites, no page errors");
  } finally {
    await context.close();
  }
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { launch, routeFixtures, waitText };
