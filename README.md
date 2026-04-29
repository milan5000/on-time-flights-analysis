# Analysis of Airline On-Time Performance

This project provides a platform for analyzing historical data for flight on-time performance across a variety of variables (marketing carriers, locations, time of day/year, etc.), as well as predicting whether future flights are likely to be delayed based on data available to ticket buyers. It is our hope that these tools will prove useful for leisure and business travellers alike in assessing the reliability of the flights they have booked, as well as airlines, researchers, or other interested people in seeing how delays have behaved and evolved over time in the past.

## Features

- A FastAPI backend loads Bureau of Transportation Statistics flight records into Redis and exposes routes for raw data, individual flight lookup, queued analysis jobs, job results, and generated heatmap images.
- A Redis-backed worker processes origin/destination/date analysis jobs and summarizes flight counts, average delays, cancellations, diversions, and matching flight records.
- A Next.js dashboard in `frontend` supports exploratory analysis with filters, summary cards, delay breakdowns, a US route-delay map, a sortable flight table, and a backend job runner.

## Usage

Run the backend services separately using the backend instructions, then start the frontend from `frontend`:

```bash
bun install
bun --bun run dev
```

The frontend proxies `/api/*` requests to the FastAPI backend, which defaults to `http://localhost:8000`. Use `BACKEND_URL` to point the dashboard at a different backend host.

After opening the frontend, use **Load Data** to call the backend `/data` route, then use the filters and visualizations to explore route-level and time-based delay patterns. The backend analysis panel can submit queued worker jobs and display their returned summaries and heatmap images.

## Developer Instructions

### Setup

First, make sure you have the appropriate tooling installed. This project uses [Python 3.14](https://www.python.org/) with the [uv project manager](https://docs.astral.sh/uv/) and [Next.js](https://nextjs.org/) with [Bun](https://bun.com/). Users should make sure to install those as appropriate for their system before proceeding.

To set up either of the `backend` and `utils` directories, run `uv sync` and then `source .venv/bin/activate` in whichever you want to use. If using Pylance in VS Code, the `.vscode/settings.json` file should take care of resolving imports; run the "Python: Clear Cache and Reload Window" command if this does not work at first after setting up the environment. For the backend code specifically, please refer to the associated [README](./backend/README.md) file.

To set up `frontend`, run `bun install` in the directory. Detailed instructions for running the frontend are in the associated [README](./frontend/README.md) file.

### Testing & Deployment

Backend testing instructions are documented in [backend/README.md](./backend/README.md). For frontend checks, run the following from `frontend`:

```bash
bun run lint
bun test
bun run build
```

### Detailed Usage

See [frontend/README.md](./frontend/README.md) for dashboard-specific usage and proxy details.
