import { test, expect, request, type APIRequestContext } from "@playwright/test";

// API performance budgets. These run against the live backend (skipped when it
// isn't up) and assert the key endpoints respond within a generous ceiling, so
// a serious latency regression fails the suite. Measured baselines locally are
// well under these budgets (health ~0.6s, assess ~1.6s, cells ~5.9s); the
// ceilings are deliberately loose to stay stable across machines.
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
  test.skip(!backendUp, `Backend API not reachable at ${API} - start the backend + database first (see DEPLOYMENT.md).`);
});

async function timed(fn: (ctx: APIRequestContext) => Promise<{ ok(): boolean }>): Promise<{ ms: number; ok: boolean }> {
  const ctx = await request.newContext();
  const start = Date.now();
  const res = await fn(ctx);
  const ms = Date.now() - start;
  await ctx.dispose();
  return { ms, ok: res.ok() };
}

test("health responds under 3s", async () => {
  const { ms, ok } = await timed((ctx) => ctx.get(`${API}/api/v1/health`));
  console.log(`[perf] health: ${ms}ms`);
  expect(ok).toBeTruthy();
  expect(ms).toBeLessThan(3000);
});

test("point assessment responds under 10s", async () => {
  const { ms, ok } = await timed((ctx) =>
    ctx.post(`${API}/api/v1/platform/assess`, {
      data: { latitude: -1.9536, longitude: 30.0606, business_category: "pharmacy" },
    }),
  );
  console.log(`[perf] assess: ${ms}ms`);
  expect(ok).toBeTruthy();
  expect(ms).toBeLessThan(10_000);
});

test("opportunity-cells map payload responds under 25s", async () => {
  const { ms, ok } = await timed((ctx) =>
    ctx.get(`${API}/api/v1/platform/opportunity-cells?category=pharmacy&limit=300`),
  );
  console.log(`[perf] opportunity-cells (300): ${ms}ms`);
  expect(ok).toBeTruthy();
  expect(ms).toBeLessThan(25_000);
});
