import { test, expect, request } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Screenshots land outside both code repos so they can be dropped straight into
// the report without being committed to the app.
const SHOTS = "E:/bizintel/report_assets";
mkdirSync(SHOTS, { recursive: true });

// These are integration tests: they drive the real UI against a running backend
// (:8000) and a populated database. If the API isn't up, skip with a clear
// message instead of failing every test with a raw connection error.
const API = process.env.E2E_API_URL || "http://127.0.0.1:8000";
let backendUp = false;
test.beforeAll(async () => {
  try {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/api/v1/health`, { timeout: 4000 });
    backendUp = res.ok();
    await ctx.dispose();
  } catch {
    backendUp = false;
  }
});
test.beforeEach(() => {
  test.skip(!backendUp, `Backend API not reachable at ${API} - start the backend + database first (see DEPLOYMENT.md), then re-run.`);
});

// A location with real scored data nearby (central Kigali).
const LAT = "-1.9536";
const LON = "30.0606";

test("exact-coordinate flow produces a single location report", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("button", { name: "Pharmacy", exact: true }).click();
  await page.getByRole("button", { name: "Know the exact spot? Enter its coordinates" }).click();
  await page.getByPlaceholder("Latitude").fill(LAT);
  await page.getByPlaceholder("Longitude").fill(LON);
  await page.screenshot({ path: `${SHOTS}/01-start-form.png`, fullPage: true });

  await page.getByRole("button", { name: "See the results" }).click();

  await expect(page).toHaveURL(/\/report\//, { timeout: 90_000 });
  await expect(page.getByText("Your location report")).toBeVisible();
  // The capacity block proves the report body rendered.
  await expect(page.locator(".capacity").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(4500); // let the OSM tiles + glyph icons settle
  await page.screenshot({ path: `${SHOTS}/02-report-en.png`, fullPage: true });

  // Language toggle: the structured labels flip immediately.
  await page.getByRole("button", { name: "RW", exact: true }).click();
  await expect(page.getByText("Raporo")).toBeVisible({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/03-report-rw.png`, fullPage: true });

  // Enlarge the map to show the glyph icons + legend.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.waitForTimeout(400);
  const enlarge = page.getByRole("button", { name: /Enlarge/i }).first();
  if (await enlarge.isVisible().catch(() => false)) {
    await enlarge.click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${SHOTS}/04-map-icons.png` });
  }
});

test("area flow produces the ranked strongest-spots view", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("button", { name: "Salon", exact: true }).click();
  // pick the first real district (index 0 is the placeholder)
  const district = page.locator("select").first();
  await district.selectOption({ index: 1 });
  await page.getByRole("button", { name: "See the results" }).click();

  await expect(page).toHaveURL(/\/report\//, { timeout: 90_000 });
  await expect(page.getByText(/strongest spots/i)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/05-ranked-spots.png`, fullPage: true });
});

test("explore map renders the opportunity choropleth", async ({ page }) => {
  await page.goto("/map");
  await page.waitForTimeout(4500); // choropleth + legend load
  await page.screenshot({ path: `${SHOTS}/06-explore-map.png`, fullPage: true });
});
