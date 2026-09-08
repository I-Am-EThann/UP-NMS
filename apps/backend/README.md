# UP NMS Backend

NestJS API for the University of Phayao Network Monitoring System.

## Setup

```bash
cp .env.example .env.local   # adjust if needed — defaults match docker-compose.yml
npm run start:dev             # from this folder, or `npm run dev:backend` from repo root
```

Requires the infra services from the root `docker-compose.yml` (Postgres, InfluxDB, MinIO) to be running
for anything beyond the health check.

## Docker

```bash
docker build -f apps/backend/Dockerfile -t up-nms-backend .   # from the MONOREPO ROOT (needs the workspace lockfile)
```

Or just `docker compose up -d --build backend` from the repo root, which also wires up Postgres/InfluxDB/MinIO
with matching env vars automatically. The image generates the Prisma client during the build — this needs real
internet access to `binaries.prisma.sh` (works in any normal CI/build environment; see the root README for why
that specific step can't be verified in this project's dev sandbox).

## Database (Prisma)

```bash
npx prisma generate      # generates the typed client — needs internet access to binaries.prisma.sh
npx prisma migrate dev   # applies prisma/migrations/, creates the DB schema
npm run db:seed          # seeds ONLY the admin login — no sample zones/devices/alerts (see below)
npm run db:reset-data    # wipes all zones/devices/ports/alerts (cascade), keeps user accounts intact
```

`prisma generate` downloads a platform-specific engine binary from Prisma's CDN — this fails in
network-restricted environments (e.g. sandboxes without that domain allow-listed) but works normally
on a developer machine, CI runner, or Docker build with standard internet access.

## Zones & Devices

`GET/POST /api/zones`, `GET/PATCH/DELETE /api/zones/:id` — zones are identity-only in the DB;
every response includes computed `switchCount`/`accessPointCount`/`onlineCount`/`offlineCount`/`alertCounts`,
derived from the current device list via `buildZoneSummaries()` (mirrors `apps/frontend/src/lib/stats.ts`
`buildZones()` exactly).

`GET/POST /api/zones/:zoneId/devices`, `GET/PATCH/DELETE /api/devices/:id` — device CRUD. `status`/`severity`
are never accepted from the client (new devices are always `ONLINE`/`NORMAL`) — those fields are monitoring-derived,
matching the frontend's device form. Duplicate IP addresses return `409`.

## Image Upload (MinIO)

`POST /api/uploads/device-image` — multipart upload (field `file`, ≤5MB, image mimetypes only), stores the
object in MinIO and returns `{ url }` to use as a device's `imageUrl`. The bucket is created and set to
public-read automatically on boot (`MinioService.onModuleInit`) — if MinIO isn't reachable yet, this logs an
error but doesn't crash the app; uploads just fail until it is.

## Device Monitoring (SNMP + InfluxDB)

`MonitoringScheduler` runs `MonitoringService.pollAllDevices()` on an interval (`SNMP_POLL_INTERVAL_MS`,
default 5 minutes), registered/cleaned up via `SchedulerRegistry` so it starts on boot and stops cleanly on
shutdown (or when a test's `app.close()` runs).

**Newly-added devices are also polled immediately**, outside the normal cycle — `DevicesService.create()`
fires `MonitoringService.pollDeviceById()` right after the Prisma write, without awaiting it (so device
creation stays fast even if the device is slow to answer or unreachable). Without this, a device added just
after a scheduled poll finishes would sit at its 0%/placeholder values for up to the full interval before
anyone could tell whether it was actually working. Failures here are logged and swallowed — the normal
scheduled poll picks the device up regardless of whether this one-off attempt succeeded.

**Per-device SNMP community override** — `Device.snmpCommunity` (nullable) lets one specific device use a
different SNMP v2c community string than the server-wide default (`SNMP_COMMUNITY`). Confirmed necessary in
practice, not just theoretical: two real Aruba switches on the same network turned out to be configured
with two different community strings, so a single global value couldn't reach both. `RealSnmpProvider`
checks `device.snmpCommunity` first and falls back to the default when it's null/blank — set via the
"SNMP Community" field in the add/edit device form (leave blank for the common case of "same as everything
else").

Each poll, per device:
1. Calls `SnmpProvider.pollDevice()` — whichever provider is active (see below)
2. `buildDeviceUpdate()` (`device-update.util.ts`, a pure function) recomputes severity via
   `computeDeviceSeverity()` (`severity.util.ts` — same 85/70/50 thresholds as the frontend's `UsageBar`,
   offline always `CRITICAL`) and decides whether a new `Alert` row is warranted
3. Updates the `Device` row (+ upserts `Port` rows for switches) in Postgres
4. Writes a `device_metrics` point to InfluxDB via `InfluxService` (flushed once per poll cycle, never throws)
5. Creates an `Alert` **only** when severity got worse than it already was — an already-critical device
   doesn't spam a new alert on every single poll

`SnmpProvider` is pluggable via `SNMP_PROVIDER=mock|real`, no code changes needed either way:
- **`mock`** (default) — returns randomized-but-plausible metrics per device kind. No hardware needed.
- **`real`** — polls actual devices via `net-snmp`. CPU (`hrProcessorTable`) and memory (`hrStorageTable`)
  use standard HOST-RESOURCES-MIB tables; switch ports use IF-MIB (`ifTable`), computing bandwidth from
  `ifInOctets`/`ifOutOctets` counter deltas between polls (first poll after a restart has no baseline, so
  it reports 0 — expected), and reading the port's real name (`ifDescr`, e.g. `GigabitEthernet1/0/1`) from
  the same table walk — the frontend used to hardcode a fake Cisco-style `Gi0/N` label regardless of the
  actual device, a leftover from before this was wired to real hardware; it now falls back to `Port N` only
  when a device genuinely doesn't answer `ifDescr`, not as the default display. Confirmed working against a
  real Aruba 6200F switch.
  > **Note on OID levels**: `net-snmp`'s `session.table()` expects the *table*-level OID (e.g. `ifTable`),
  > not the *entry*-level OID (`ifEntry`) — it appends `.1.` internally to reach the entry, then the column,
  > then the row index. Passing the entry-level OID (as earlier versions of this file did) makes every row's
  > parsed path off-by-one, so `table()` silently returns an empty object even though the underlying SNMP
  > walk succeeds and a plain `snmpwalk` against the same OID returns real data. Cost real debugging time to
  > track down against a live switch — if you're touching `real-snmp.provider.ts`, keep OIDs one level up
  > from the column OID you actually want a value from.
  Access Point client-count/bandwidth have no universal MIB across vendors (Ubiquiti/Aruba/Cisco all
  differ) — that part is a documented `TODO` in the file, to be filled in with a per-`device.brand` OID map
  once real APs are available to test against. The session/reachability logic and switch-side parsing are
  real, working code — not a stub.
5. Emits an internal `device.metrics.updated` event (step 6 below picks this up for live pushes)

## Realtime (WebSocket / Socket.io)

`RealtimeGateway` runs on the `/realtime` Socket.io namespace and pushes live device metrics to
subscribed browser clients — this is what replaces the frontend's old client-side mock random-walk
(`useLiveMetrics`) with real server-pushed data.

- **Auth**: every connection is authenticated with the same `up_nms_token` JWT cookie the REST API uses.
  Socket.io handshakes don't go through Express's `cookie-parser` middleware, so the raw `Cookie` header
  is parsed by hand (`handshake-auth.util.ts`) and verified with the same `JwtService`/secret; connections
  without a valid token are disconnected immediately.
- **Subscriptions**: clients emit `device:subscribe` / `device:unsubscribe` with `{ deviceId }` to join/leave
  a per-device room (`device:${id}`) — broadcasts only reach clients actually viewing that device's page.
- **Decoupling**: `MonitoringService` never imports the gateway directly — it emits `device.metrics.updated`
  via `EventEmitter2` after each poll+apply, and `RealtimeGateway` listens with `@OnEvent(...)` and relays
  it to the right room as a `device:metrics` message. This avoids a circular dependency between the
  monitoring and realtime modules and keeps `MonitoringService` fully unit-testable without a gateway.
- **Payload**: `DeviceMetricsUpdatedEvent` (`realtime.events.ts`) mirrors the frontend's `useLiveMetrics`
  shape (`status`, `severity`, `cpuUsagePercent`, `memoryUsagePercent`, AP-only fields, `ports` for
  switches) so wiring the frontend up in a later sprint is a close to 1:1 swap.

## Alerts

`GET /api/alerts` — read-only event log, filterable by `?zoneId=`, `?deviceId=`, `?severity=NORMAL|WARNING|MAJOR|CRITICAL`,
and `?limit=` (1–200, default 100). Each row is joined with `zone.name` and `device.name`/`kind` server-side
so the response is ready to render without extra lookups, and sorted Critical→Normal (then most-recent-first
within a severity) via a pure `sortAlerts()` that mirrors the frontend's own `stats.ts` implementation exactly.

Alerts themselves are written by `MonitoringService` (see Device Monitoring above) whenever a device's
severity gets worse — `messageKey` is one of `DEVICE_OFFLINE`, `HIGH_BANDWIDTH`, `HIGH_MEMORY`, `HIGH_CPU`,
picked by whichever metric was the worst offender (`device-update.util.ts`'s `pickAlertMessageKey()`).
`HIGH_CPU` was added this sprint — earlier it was a documented gap where a CPU-driven severity increase
updated the device's stored severity correctly but silently skipped writing an alert row for it.

## Auth

`POST /api/auth/login` — validates username/password (bcrypt) against the `users` table, sets an
httpOnly JWT cookie (`up_nms_token`, 8h default) and returns `{ user }`.

`POST /api/auth/logout` — clears the cookie.

`GET /api/auth/me` — protected by `JwtAuthGuard`; returns the current user. Use `@UseGuards(JwtAuthGuard)`
+ `@CurrentUser()` on any route that needs an authenticated admin.

The JWT strategy reads the token from the cookie first, falling back to `Authorization: Bearer <token>`
for non-browser API clients.

## Testing

```bash
npx jest src                             # unit — 81 tests, all mocked (Prisma/MinIO/SNMP/Influx/WebSocket), no DB/engine/server needed
npx jest --config ./test/jest-e2e.json   # e2e  — 21 tests, real HTTP + real WebSocket connections via overridden providers
```

The WebSocket e2e suite (`realtime.e2e-spec.ts`) is a genuine end-to-end test — it boots a real listening
server and connects an actual `socket.io-client`, verifying cookie-based auth rejection/acceptance and that
broadcasts only reach clients subscribed to the right device room. Everything else mocks `PrismaService`
(and `MinioService` where relevant) directly, so the whole suite runs independently of whether `prisma
generate` has been run — useful in network-restricted environments (see the note in the root README).

## Endpoints so far

| Method | Path            | Auth      | Description                          |
|--------|-----------------|-----------|---------------------------------------|
| GET    | `/api/health`   | —         | Liveness + Postgres connectivity check |
| POST   | `/api/auth/login`  | —      | Login, sets httpOnly JWT cookie        |
| POST   | `/api/auth/logout` | —      | Clears the auth cookie                 |
| GET    | `/api/auth/me`     | required | Returns the current user               |
| GET    | `/api/zones`               | required | List zones with computed summaries |
| GET    | `/api/zones/:id`           | required | One zone's summary |
| POST   | `/api/zones`               | required | Create a zone |
| PATCH  | `/api/zones/:id`           | required | Rename a zone |
| DELETE | `/api/zones/:id`           | required | Delete a zone (cascades devices/alerts) |
| GET    | `/api/zones/:zoneId/devices` | required | List devices in a zone (`?kind=SWITCH\|ACCESS_POINT`) |
| POST   | `/api/zones/:zoneId/devices` | required | Create a device in a zone |
| GET    | `/api/devices/:id`         | required | One device + ports |
| PATCH  | `/api/devices/:id`         | required | Update a device |
| DELETE | `/api/devices/:id`         | required | Delete a device |
| POST   | `/api/uploads/device-image` | required | Upload a device image → `{ url }` |
| GET    | `/api/alerts`               | required | List alerts (`?zoneId=&deviceId=&severity=&limit=`), Critical-first |

WebSocket: connect to `/realtime` (Socket.io) with the same auth cookie, then emit `device:subscribe` /
`device:unsubscribe` with `{ deviceId }` to join/leave a device's live-metrics room.

## Structure

```
src/
├── config/
│   └── configuration.ts   → typed env var accessor, single source of truth
├── prisma/
│   ├── prisma.module.ts   → @Global module exporting PrismaService
│   └── prisma.service.ts  → extends PrismaClient, connects/disconnects with the app lifecycle
├── auth/
│   ├── ...                → login/logout/me
├── zones/
│   ├── zones.module.ts / .controller.ts / .service.ts
│   └── zone-summary.util.ts → pure function computing counts/severity from devices
├── devices/
│   ├── devices.module.ts
│   ├── zone-devices.controller.ts → POST/GET under /zones/:zoneId/devices
│   ├── devices.controller.ts      → GET/PATCH/DELETE /devices/:id
│   └── devices.service.ts
├── minio/
│   └── minio.service.ts   → bucket lifecycle, upload/delete
├── uploads/
│   └── uploads.controller.ts → POST /uploads/device-image
├── snmp/
│   ├── snmp-provider.interface.ts → SnmpProvider contract (`pollDevice`) + SNMP_PROVIDER DI token
│   ├── snmp.module.ts             → picks Mock or Real provider based on SNMP_PROVIDER env var
│   ├── mock-snmp.provider.ts      → default; randomized plausible metrics, no hardware needed
│   └── real-snmp.provider.ts      → real HOST-RESOURCES-MIB/IF-MIB polling; AP client/bandwidth OIDs are a documented TODO
├── influx/
│   └── influx.service.ts  → writes device_metrics points, flush() never throws
├── monitoring/
│   ├── monitoring.module.ts    → wires SnmpModule + InfluxModule + the scheduler
│   ├── monitoring.scheduler.ts → registers/cleans up the poll interval via SchedulerRegistry
│   ├── monitoring.service.ts   → orchestrates: SNMP poll -> Postgres update -> InfluxDB write -> Alert on severity increase
│   ├── device-update.util.ts   → pure function: poll result + previous severity -> {status, severity, newAlert}
│   └── severity.util.ts        → pure function, mirrors the frontend's UsageBar thresholds exactly
├── realtime/
│   ├── realtime.module.ts       → wires JwtModule (for handshake verification)
│   ├── realtime.gateway.ts      → /realtime Socket.io namespace: auth, subscribe/unsubscribe, broadcast
│   ├── realtime.events.ts       → DEVICE_METRICS_UPDATED_EVENT contract + deviceRoom() helper
│   └── handshake-auth.util.ts   → hand-rolled cookie parsing for the raw Socket.io handshake header
├── alerts/
│   ├── alerts.module.ts / .controller.ts / .service.ts → GET /api/alerts (filterable, joined, sorted)
│   └── sort-alerts.util.ts      → pure function, mirrors the frontend's stats.ts sortAlerts() exactly
├── health/
│   └── ...                → GET /api/health (checks Postgres connectivity via Prisma)
├── app.module.ts
└── main.ts                 → global prefix "api", cookie-parser, CORS, validation pipe

test/
├── auth.e2e-spec.ts           → full HTTP-level auth flow test (mocked PrismaService)
├── zones-devices.e2e-spec.ts  → full HTTP-level zones/devices flow test (mocked PrismaService/MinioService)
├── alerts.e2e-spec.ts         → full HTTP-level alerts flow test (filters, sorting, validation)
└── realtime.e2e-spec.ts       → real socket.io-client against a real listening server (auth + room-scoped broadcast)

prisma/
├── schema.prisma           → User, Zone, Device, Port, Alert models
├── migrations/              → SQL migrations (checked in, applied with `prisma migrate deploy`)
└── seed.ts                  → seeds only the admin login (SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD env vars, defaults to admin/phayao2569 with a warning) — no sample data
└── reset-data.ts            → wipes zones/devices/ports/alerts (cascade), keeps user accounts — for clearing out an already-seeded database
```

## Environment variables

See `.env.example` for the full list with defaults. Notable one: `SNMP_PROVIDER` —
`mock` (default, no real devices needed) or `real` (polls actual hardware once that
provider is implemented in a later sprint).

## Design notes

- **`Zone` stores identity only** — device counts, online/offline counts, and severity
  summaries are always derived from the `Device`/`Alert` tables at query time, never stored.
  This mirrors the frontend's `buildZones()` in `apps/frontend/src/lib/stats.ts` exactly, so
  the two layers can't drift out of sync.
- **`Device.severity`** is the device's current health classification (offline devices are
  always `CRITICAL`), separate from **`Alert`**, which is an append-only event log for the
  Alerts UI. Same split as the frontend's mock architecture.
- **Enum values** (`SWITCH`/`ACCESS_POINT`, `NORMAL`/`WARNING`/`MAJOR`/`CRITICAL`, etc.) map
  1:1 to the frontend's TypeScript string-literal unions, just upper-cased per Prisma/Postgres
  convention.

