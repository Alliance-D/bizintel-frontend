import { test, expect } from "@playwright/test";

// Cross-engine rendering smoke: runs on Chromium, Firefox and WebKit (see
// playwright.config.ts). It checks the app shell renders correctly on each
// engine and needs only the frontend (no backend), so it is fast and stable.

test("home page renders on this browser", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BizIntel/i);
});

test("the start form renders its controls on this browser", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("button", { name: "Pharmacy", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salon", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "See the results" })).toBeVisible();
});

test("the explore map mounts its canvas on this browser", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 20_000 });
});
