# Frontend

This directory contains the source code for the project frontend. It uses Next.js,
React, Tailwind CSS, and Bun to provide a lightweight dashboard for exploring the
FastAPI flight-delay analysis backend.

## Setup

Install dependencies from this directory:

```bash
bun install
```

Run the local development server:

```bash
bun --bun run dev
```

The app expects the backend API to be available at `http://localhost:8000` by
default. To point at another backend host, set `BACKEND_URL` when starting Next:

```bash
BACKEND_URL=http://localhost:8000 bun --bun run dev
```

## Backend Proxy

The frontend calls FastAPI through relative `/api/*` URLs. `next.config.ts`
rewrites those requests to the backend without preserving the `/api` prefix:

- `/api/data` -> `http://localhost:8000/data`
- `/api/jobs` -> `http://localhost:8000/jobs`
- `/api/results/{jobId}` -> `http://localhost:8000/results/{jobId}`

This keeps browser requests same-origin during local development, so the backend
does not need separate CORS configuration for the dashboard.

## Dashboard Features

- Load, refresh, and clear Redis-backed flight records through the existing
  `/data` routes.
- Filter records by date, carrier, origin, destination, and arrival-delay range.
- Inspect summary metrics, worst average route/carrier, delay causes, time
  breakdowns, and a compact sortable flight table.
- View an SVG US route map colored green through red by average arrival delay.
- Submit backend worker jobs for exact origin/destination/date analysis and
  display the returned summary plus generated heatmap image.

## Verification

Useful frontend commands:

```bash
bun run lint
bun test
bun run build
```
