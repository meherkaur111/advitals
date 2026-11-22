import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function noA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) – ${v.help}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test("landing page loads, links to the tool, and is accessible", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your ROAS dropped");
  await expect(page.getByRole("link", { name: /Run a free check/ }).first()).toBeVisible();
  await noA11yViolations(page);
  expect(errors).toEqual([]);
});

test("empty form shows field-level errors instead of a report", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: /Run the check/ }).click();
  await expect(page.getByRole("alert").first()).toContainText("is empty");
  await expect(page).toHaveURL(/\/check/);
});

test("impossible numbers are rejected with a clear message", async ({ page }) => {
  await page.goto("/check");
  const fill = async (label: string, prev: string, curr: string) => {
    await page.getByLabel(`${label}, previous period`).fill(prev);
    await page.getByLabel(`${label}, current period`).fill(curr);
  };
  await fill("Amount spent", "1000", "1000");
  await fill("Impressions", "100", "100");
  await fill("Link clicks", "500", "10"); // more clicks than impressions
  await fill("Purchases", "1", "1");
  await fill("Purchase value", "100", "100");
  await page.getByRole("button", { name: /Run the check/ }).click();
  await expect(page.getByRole("alert").first()).toContainText("clicks can't exceed impressions");
});

test("manual entry produces a diagnosis", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/check");
  const fill = async (label: string, prev: string, curr: string) => {
    await page.getByLabel(`${label}, previous period`).fill(prev);
    await page.getByLabel(`${label}, current period`).fill(curr);
  };
  await fill("Amount spent", "100000", "100000");
  await fill("Impressions", "500000", "500000");
  await fill("Reach", "250000", "150000");
  await fill("Link clicks", "6,000", "4,200");
  await fill("Purchases", "180", "126");
  await fill("Purchase value", "360000", "252000");
  await page.getByRole("button", { name: /Run the check/ }).click();
  await expect(page).toHaveURL(/\/report#/);
  await expect(page.getByRole("heading", { name: "Creative fatigue" })).toBeVisible();
  await noA11yViolations(page);
  expect(errors).toEqual([]);
});

test("sample report, share link, edit round-trip and history", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: "Try sample data" }).click();
  await page.getByRole("button", { name: /Run the check/ }).click();
  await expect(page.getByText("3 of 3 campaigns need attention")).toBeVisible();
  const url = page.url();

  // Opening the same link in a fresh page reproduces the report.
  const other = await page.context().newPage();
  await other.goto(url);
  await expect(other.getByText("3 of 3 campaigns need attention")).toBeVisible();

  // Edit goes back to the form, pre-filled.
  await page.getByRole("link", { name: "Edit numbers" }).click();
  await expect(page.getByRole("textbox", { name: "Campaign name" }).first()).toHaveValue(/Prospecting/);

  // History lists the check.
  await page.goto("/check");
  await expect(page.getByText("Your recent checks")).toBeVisible();
});

test("CSV upload matches campaigns and warns about unmatched ones", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("tab", { name: "Upload CSV" }).click();
  const header = "Campaign name,Amount spent (INR),Impressions,Reach,Link clicks,Purchases,Purchases conversion value\n";
  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles({
    name: "prev.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(header + "A,84000,420000,190000,5460,164,295200\nB,22000,61000,14500,1450,96,182400\n"),
  });
  await files.nth(1).setInputFiles({
    name: "curr.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(header + "A,86500,405000,128000,3890,117,210600\nB,23500,63500,15200,1510,68,129200\nC,100,400,300,4,0,0\n"),
  });
  await expect(page.getByText("2 campaigns matched across both periods")).toBeVisible();
  await expect(page.getByText(/only ran in the current period/)).toBeVisible();
  await page.getByRole("button", { name: /Run the check/ }).click();
  await expect(page).toHaveURL(/\/report#/);
});

test("a CSV missing columns explains what's missing", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("tab", { name: "Upload CSV" }).click();
  const files = page.locator('input[type="file"]');
  const bad = { name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from("Campaign name,Impressions\nA,100\n") };
  await files.nth(0).setInputFiles(bad);
  await files.nth(1).setInputFiles(bad);
  await expect(page.getByText(/Missing columns: Amount spent/)).toBeVisible();
});

test("a damaged report link shows a friendly error", async ({ page }) => {
  await page.goto("/report#not-a-real-report");
  await expect(page.getByRole("heading", { name: /couldn't open this report/ })).toBeVisible();
});

test("guides, privacy, sitemap and robots are served", async ({ page, request }) => {
  await page.goto("/blog");
  await page.getByRole("link", { name: /Why did my Meta ads ROAS drop/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ROAS drop");
  await noA11yViolations(page);
  for (const path of ["/privacy", "/sitemap.xml", "/robots.txt", "/opengraph-image"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  expect((await request.get("/definitely-missing")).status()).toBe(404);
});

test("feedback buttons respond", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: "Try sample data" }).click();
  await page.getByRole("button", { name: /Run the check/ }).click();
  await page.getByRole("button", { name: "Yes, it helped" }).click();
  await expect(page.getByRole("status")).toContainText("Thanks");
});

test("the report opens at the top, not mid-page", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: "Try sample data" }).click();
  await page.getByRole("button", { name: /Run the check/ }).click();
  await expect(page.getByRole("heading", { name: "Your ad vitals" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
});
