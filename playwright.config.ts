import { defineConfig, devices } from "@playwright/test";

// Drives the already-running local stack (frontend on :3000 -> backend on :8000).
// Start both before running: `npm start` here and uvicorn in the backend repo.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 900 },
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Auto-start the frontend for the run (reused if you already have one up).
  // The BACKEND (:8000) and its database must be started separately - the
  // spec skips with a clear message if the API isn't reachable.
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
