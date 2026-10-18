const fs = require("node:fs");
const path = require("node:path");
const { launch, waitText } = require("../tests/browser.cjs");
const { html, orgHtml } = require("../tests/fixture.cjs");

async function capture() {
  const context = await launch();
  const folder = path.resolve(__dirname, "../docs");
  fs.mkdirSync(folder, { recursive: true });
  try {
    await context.route("**/*", (route) => route.fulfill({
      contentType: "text/html",
      body: route.request().url().includes("/account/org/credits-usage") ? orgHtml("50,000", false) : html("218.77 credits", false),
    }));
    const page = await context.newPage();
    await page.setViewportSize({ width: 760, height: 440 });
    for (const theme of ["light", "dark"]) {
      await page.goto("https://www.perplexity.ai/computer/tasks/synthetic-example");
      await waitText(page, "[data-pct-value]", "$2.63");
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.locator(".panel").screenshot({ path: path.join(folder, `session-${theme}.png`), scale: "css" });
      await page.goto("https://www.perplexity.ai/account/org/credits-usage");
      await waitText(page, "[data-pct-org]", "($600.00)");
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.locator(".org-panel").screenshot({ path: path.join(folder, `organization-${theme}.png`), scale: "css" });
    }
    console.log("Captured light/dark session and organization screenshots from the loaded extension with synthetic balances.");
  } finally {
    await context.close();
  }
}

capture().catch((error) => { console.error(error); process.exitCode = 1; });
