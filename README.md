# BizIntel frontend

Next.js frontend for BizIntel, a business-location intelligence platform for
Kigali. The main flow is simple: pick a business type and one or more
locations, and get a report that shows, for that category, the gap between the
demand an area's fundamentals predict and the businesses actually observed
there (underserved vs. saturated) — with an interactive map and a plain-language
explanation. It is **not** a business-success, survival, or revenue predictor,
and no page in this app claims otherwise.

## Links

- **Live app**: https://bizintel-frontend.onrender.com
- **Demo video**: https://youtu.be/iDnu1ndx2P0
- **Backend API + data/ML pipeline**: [bizintel-backend](https://github.com/Alliance-D/bizintel-backend)

## Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Map**: MapLibre GL, OpenStreetMap raster tiles
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Auth**: only the admin console requires an account — a JWT issued by the
  backend, mirrored to a cookie so the edge middleware can protect `/admin/*`.
  The rest of the app needs no sign-in.
- **Testing**: Vitest (unit) and Playwright (end-to-end, cross-browser, performance)

## Local setup

You need the backend running first (see the
[backend README](https://github.com/Alliance-D/bizintel-backend) for setup
and how to populate it with real data), then:

```bash
npm install
cp .env.example .env.local        # set NEXT_PUBLIC_API_BASE_URL if the backend isn't on 127.0.0.1:8000
npm run dev
```

The app runs on `http://localhost:3000`. Every page reads live data from the
backend; there is no bundled demo or mock dataset.

## Pages

| Route | Purpose |
|---|---|
| `/start` → `/report/[id]` | **Primary flow.** Pick a business type and one or more locations (by area or exact coordinates) and get a unified report: the verdict, a capacity bar, the signals behind it, an interactive map with competitor/anchor icons, and a plain-language AI explanation. Comparison and the AI advice are folded into this report. |
| `/map` | Explore the whole city on the opportunity map; click a cell or drop a pin to assess a point. Scout and Competitive are starting *modes* within this one workspace, not separate routes |
| `/insights` | Score distribution, factor breakdown, and district charts for a business category |
| `/field-validation` | Submits on-the-ground observations that calibrate the backend's predictions |
| `/legal` | Privacy Policy and End User Licence Agreement (Terms of Use), in English and Kinyarwanda; linked from the footer and the start form |
| `/admin` (+ `/admin/data-quality`, `/admin/models`, `/admin/status`) | Dataset and model health, retraining and feature-rebuild triggers, model activation, audit log. Admin/super-admin only; protected server-side by `middleware.ts` |

A couple of secondary routes (`/login`, `/profile`) still resolve by direct URL,
but the main experience is the `/start` → `/report` flow above.

## Project layout

```
app/                 Next.js App Router routes, one folder per page, each a thin wrapper
                      around a component in components/pages or components/platform
components/
  layout/             AppShell, nav, auth modal, brand mark
  pages/              Standalone pages extracted from the shared helpers (Admin, Reports,
                      Insights, Advisor, Expansion Planner, Compare, Saved, etc.)
  platform/           The map workspace (LocationIntelligenceWorkspace) and shared page
                      helpers (pageHelpers.tsx)
lib/                  API client (platform-api.ts), auth helpers, category definitions
middleware.ts         Edge middleware protecting /admin/*
```

## Testing

```bash
npm test        # Vitest unit tests (report logic + map-icon resolvers), no server needed
npm run e2e     # Playwright: form -> report flow, cross-browser smoke (Chromium/Firefox/
                # WebKit) and API performance budgets. Needs the backend + database running
                # (see DEPLOYMENT.md at the project root); it skips with a clear message if not.
```

## Deployment

The Dockerfile in this repo runs `next dev` and is meant for local/dev use
inside `docker-compose.yml` at the project root, alongside the backend and a
Postgres/PostGIS container. For a real deployment (Render, Vercel, a VPS),
build a production image with `next build` + `next start`, or use the
platform's native Next.js build pipeline, and set `NEXT_PUBLIC_API_BASE_URL`
to the deployed backend's URL.

## Related

- Backend API and data pipeline: [bizintel-backend](https://github.com/Alliance-D/bizintel-backend)
- Full deployment + verification runbook: `DEPLOYMENT.md` at the project root
