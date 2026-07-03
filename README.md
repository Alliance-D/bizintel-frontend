# BizIntel frontend

Next.js frontend for BizIntel, a business-location intelligence platform for
Kigali. It renders an opportunity map, location comparison, reports, an AI
advisor, and an admin console on top of a transparent
demand/accessibility/commercial-activity/competition/welfare index, not a
business-success, survival, or revenue predictor. No page in this app claims
otherwise.

The backend API this app talks to lives in a separate repository:
**[bizintel-backend](https://github.com/Alliance-D/bizintel-backend)**.

## Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Map**: MapLibre GL, OpenStreetMap raster tiles
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Auth**: JWT issued by the backend, stored client-side, mirrored to a
  cookie so the edge middleware can protect `/admin/*`

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
| `/map`, `/scout`, `/competitive` | Opportunity map, single-location assessment, and saturation view (one shared workspace component, different starting mode) |
| `/compare` | Side by side comparison of saved or manually entered candidate locations |
| `/insights` | Score distribution, factor breakdown, and district charts for a business category |
| `/advisor` | Narrative location advice from the Gemini-backed advisor, grounded only in computed factors |
| `/expansion-planner` | Ranks candidate zones for a second or third location, spaced away from ones already chosen |
| `/reports` | Generates a branded report preview and PDF download for a location |
| `/saved`, `/watchlist` | Saved candidate locations and monitoring signals |
| `/field-validation` | Submits on-the-ground observations that calibrate the backend's opportunity index |
| `/login`, `/profile` | Account sign in/registration and profile |
| `/admin` | Dataset and model health, retraining and feature-rebuild triggers, model activation, audit log. Requires an admin or super admin account; protected server-side by `middleware.ts` |

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

## Deployment

The Dockerfile in this repo runs `next dev` and is meant for local/dev use
inside `docker-compose.yml` at the project root, alongside the backend and a
Postgres/PostGIS container. For a real deployment (Render, Vercel, a VPS),
build a production image with `next build` + `next start`, or use the
platform's native Next.js build pipeline, and set `NEXT_PUBLIC_API_BASE_URL`
to the deployed backend's URL.

## Related

- Backend API and data pipeline: [bizintel-backend](https://github.com/Alliance-D/bizintel-backend)
