# UP NMS — University of Phayao Network Monitoring System

Monorepo containing the frontend (Next.js) and backend (NestJS) for the network
monitoring & alerting system.

```
up-nms/
├── apps/
│   ├── frontend/   → Next.js dashboard (see apps/frontend/README.md)
│   └── backend/    → NestJS API (see apps/backend/README.md)
├── docker-compose.yml → Postgres + InfluxDB + MinIO (infra services)
└── package.json       → npm workspaces root
```

## Getting started

```bash
npm install                 # installs both apps' dependencies (npm workspaces)
cp apps/backend/.env.example apps/backend/.env.local
cp apps/frontend/.env.example apps/frontend/.env.local

# start the infra services (Postgres, InfluxDB, MinIO)
docker compose up -d postgres influxdb minio

# apply migrations + create the admin login (no sample zones/devices — add real ones through the UI)
cd apps/backend && npx prisma migrate deploy && npm run db:seed && cd ../..

# run each app in dev mode (separate terminals)
npm run dev:backend
npm run dev:frontend
```

Frontend: http://localhost:3000 · Backend: http://localhost:3001/api · MinIO console: http://localhost:9001

## Backend status

The backend is being built in sprints, mirroring how the frontend was:

- [x] **Backend Sprint 1** — NestJS setup, env config, health check (`GET /api/health`), Docker Compose skeleton for Postgres/InfluxDB/MinIO
- [x] **Backend Sprint 2** — Prisma schema (`User`/`Zone`/`Device`/`Port`/`Alert`), migration, seed script matching the frontend's mock data exactly
- [x] **Backend Sprint 3** — Auth module (JWT via httpOnly cookie): `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `JwtAuthGuard` + `@CurrentUser()` for protecting future routes. Covered by unit + e2e tests (mocked DB layer).
- [x] **Backend Sprint 4** — Zone & Device CRUD REST API (computed zone summaries mirror the frontend's `buildZones()` exactly) + MinIO image upload (`POST /api/uploads/device-image`). 31 unit + 14 e2e tests, all mocked (Prisma/MinIO), run independently of the Prisma engine block.
- [x] **Backend Sprint 5** — SNMP monitoring service: `MonitoringScheduler` polls every device on an interval, updates status/severity/usage metrics in Postgres (+ ports for switches), writes time-series to InfluxDB, and logs an `Alert` only when severity gets worse (not on every poll of an already-bad device). `SnmpProvider` is pluggable — `mock` (default, no hardware needed) or `real` (via `net-snmp`; CPU/memory/switch-port polling is real working code against standard MIBs, AP client/bandwidth OIDs are a documented TODO since they're vendor-specific and there's no real hardware here to test against). Severity thresholds mirror the frontend's `UsageBar` component exactly. 58 unit + 14 e2e tests.
- [x] **Backend Sprint 6** — Realtime WebSocket gateway (`/realtime` Socket.io namespace): authenticates via the same JWT cookie as the REST API, clients subscribe to a per-device room, and `MonitoringService` pushes live updates after each poll via `EventEmitter2` (no circular dependency between monitoring and realtime). Payload shape mirrors the frontend's `useLiveMetrics` hook, so wiring it up later is close to a 1:1 swap.
- [x] **Backend Sprint 7** — Alert engine: `GET /api/alerts` (filterable by zone/device/severity, joined with zone/device names, sorted Critical-first — mirrors the frontend's `sortAlerts()` exactly) + closed a documented gap where a CPU-driven severity increase updated the device's severity but silently skipped logging an alert (`HIGH_CPU` added to the schema enum, migration applied and verified against a real Postgres). 81 unit + 21 e2e tests — including a genuine end-to-end WebSocket test with a real `socket.io-client` against a real listening server (auth rejection/acceptance + room-scoped broadcast isolation).
- [x] **Backend Sprint 8** — Wired the frontend to the real backend end-to-end; removed the mock layer entirely
  (`mock-data.ts`, `mock-users.ts`, the Next.js `/api/auth/*` routes, the client-side mock `live-metrics.ts`).
  Frontend connects **directly** to the backend (no BFF proxy) — see the cross-port cookie-sharing note in
  `apps/frontend/README.md`. Added a thin `api-client.ts` + `api-mappers.ts` layer that converts the backend's
  UPPERCASE enums into the frontend's existing lowercase types, so none of the ~50 pre-existing UI components
  needed to change. Device image upload now hits the real MinIO endpoint; `live-metrics.ts` is now a real
  `socket.io-client` hook against `/realtime`. Wrote multi-stage Dockerfiles for both apps (backend generates the
  Prisma client at build time — works with normal internet access outside this sandbox; frontend uses Next's
  `standalone` output) and wired both into `docker-compose.yml`.
  **Verification**: since Prisma still can't run in this sandbox, built a throwaway fake backend (plain
  Express + Socket.io implementing the identical REST/WS contract) to genuinely exercise the frontend's new
  integration code — confirmed login, zones/devices CRUD, image upload, and a full WebSocket
  auth→subscribe→broadcast round-trip all work over real HTTP/WS requests. This surfaced one real bug (zone/device
  detail pages called Next.js's `notFound()` before the async data fetch resolved, which — unlike a normal
  conditional render — doesn't "un-happen" on a later re-render once data arrives) — fixed by gating on an
  `isLoading` flag first.

> **Note on verification**: `prisma generate` needs to download an engine binary from
> `binaries.prisma.sh`, which isn't reachable from every environment (this one included). The
> schema and migrations were verified by applying the raw SQL directly to a real local Postgres
> and confirming the resulting tables, constraints, and foreign keys match the design — but the
> Prisma client itself hasn't been runtime-tested here. Run `npx prisma generate` on a machine
> with normal internet access (or inside the Docker build) and it'll work as expected.

## Running the whole stack

```bash
cp .env.example .env               # then edit .env — see below
docker compose up -d --build
docker compose exec backend sh -c "npx prisma migrate deploy && npm run db:seed"
```

Frontend: http://localhost:3000 · Backend: http://localhost:3001/api · MinIO API: http://localhost:9000

> **All secrets live in `.env`, not in `docker-compose.yml`** — the compose file only references
> `${VARIABLE}` placeholders, so it's safe to commit to git. `.env` itself is git-ignored (never commit it —
> see `.env.example` for the full list of variables and what each one does, including how to point the same
> compose file at a real server instead of `localhost`). This repo also ships `.env.vm-10.204.10.209`
> (also git-ignored) with values already filled in for a specific VM this project was tested against — copy
> it to `.env` on that VM, or pass `--env-file .env.vm-10.204.10.209` to `docker compose` to use it directly
> without touching your local `.env`.
>
> `SNMP_PROVIDER` defaults to `mock` in `.env.example`; set it to `real` in your own `.env` once you have
> hardware to poll over SNMP v2c. Confirmed working against a real Aruba 6200F switch (see
> `ARUBA-6200F-TESTING-GUIDE.md` — the switch needed `response-source` configured explicitly before it would
> answer SNMP requests). Alcatel OS6450-24 testing was in progress but not yet confirmed working — see
> `SWITCH-TESTING-GUIDE.md` for where that troubleshooting left off. Every SNMP read failure now logs a
> specific warning (which OID, which device, why) instead of silently reporting 0% — check
> `docker compose logs backend` if a device's numbers don't move. Postgres (5432) and InfluxDB (8086) are
> not published to the host — only reachable from other containers on the same Docker network. MinIO's API
> port (9000) stays published since every device-image `<img>` tag loads directly from it; the admin
> console (9001) does not.

**Deploying to a real server?** See [`DEPLOYMENT.md`](./DEPLOYMENT.md) — server prep, secrets, Nginx + HTTPS
reverse proxy (needed for cookie sharing in production), backups, and an update workflow.

### Changing the admin password

There's no "change password" screen in the app yet — the way to change it is to edit the seed value and
re-run seeding, which now **overwrites** the existing password (it used to only create-if-missing):

```bash
# 1. Edit .env — find SEED_ADMIN_PASSWORD and change its value.

# 2. Recreate the backend container so it picks up the new .env value:
docker compose up -d backend

# 3. Re-run the seed script (no need to rebuild or migrate again):
docker compose exec backend npm run db:seed
```

You'll be logged out of any existing session and need to log in again with the new password. Nothing else
in the database is touched — zones, devices, and alert history are untouched by this.

Or in dev mode without Docker: `docker compose up -d postgres influxdb minio` for the infra services, then
`npm run dev:backend` + `npm run dev:frontend` (with `apps/backend/.env.local` and `apps/frontend/.env.local`
copied from their `.env.example` files) in separate terminals.

See `apps/backend/README.md` and `apps/frontend/README.md` for details.
