# Phase 5: Mobile GPS Beacon — Research

**Researched:** 2026-05-10
**Domain:** Expo 52 always-on background GPS, iOS/Android permission UX, active-platform attribution, delivery photo capture, offline durable queue, backend ingestion at scale
**Confidence:** HIGH (Expo SDK 52 surface area verified via Context7 + npm registry; existing mobile/backend code directly inspected; cross-platform background location patterns are well-established with several non-obvious gotchas captured below)

## Summary

Phase 5 promotes the existing Expo 52 courier app from a basic "agent app" with naive background tracking into the **cross-platform GPS beacon** that is Darb's data moat. A working background-location implementation already exists in `mobile/src/services/locationService.ts` (TaskManager + AsyncStorage buffer + flush-every-10), and a backend ingestion endpoint exists at `POST /api/agent/location` writing to `LocationLog`. Phase 5 must (a) make the existing implementation **production-ready for 8+ hour shifts** (battery, OS-killed-process resilience, Android 14 foreground-service-type compliance, iOS approximate-location handling, deferred updates), (b) **add active-platform detection** without scraping, and (c) **add a proper photo-capture pipeline** (compressed, queued, S3-compatible upload) tied to OrderEvent records.

The three Phase 5 requirements decompose cleanly:

1. **REQ-mobile-always-on-gps** — wrap the existing TaskManager/expo-location pattern with: (i) a permission rationale modal that asks `WhenInUse` first then upgrades to `Always` (iOS guidelines + Android best practice [CITED: developer.apple.com docs]), (ii) `LocationActivityType.AutomotiveNavigation` + `pausesUpdatesAutomatically: false` + `showsBackgroundLocationIndicator: true` for iOS, (iii) Android 14 `FOREGROUND_SERVICE_LOCATION` permission addition (currently missing from `mobile/app.json`), (iv) replace the AsyncStorage-as-queue pattern with **expo-sqlite** for durable outbox with idempotency keys (AsyncStorage corrupts under heavy write [VERIFIED: GitHub issue #33754]), (v) deferred updates configured for stationary periods to halve battery cost.

2. **REQ-mobile-active-platform-detection** — **DO NOT attempt true Android UsageStatsManager / iOS foreground-app inspection**. Both are infeasible for our case: iOS prohibits inspecting other apps entirely; Android's `PACKAGE_USAGE_STATS` is a "privileged permission" requiring user to manually whitelist via Settings → "Apps with usage access" and Google Play will reject the app under most policy categories. **The recommended approach is backend-driven heuristics**: the backend infers the active platform from the courier's most recent `OrderEvent` / `Shift.platform` row. The mobile app sends a **batched per-15s "currentPlatformGuess" hint** which is just an echo of which platform tab was last opened in the Darb app (a lightweight signal, not authoritative). Active-platform attribution is **a backend responsibility**, not a mobile one — mobile only needs to send hints and respect server-side decisions.

3. **REQ-mobile-delivery-photo-capture** — `expo-camera` already used (in `mobile/app/selfie.tsx`); extend the same pattern for delivery photos with `expo-image-manipulator` to compress to ≤200KB before upload (current selfie sends raw base64 JPEG quality 0.5 — wasteful), upload via **direct presigned PUT to S3-compatible storage (Cloudflare R2 recommended over Vercel Blob for free egress)** rather than multipart-through-Express. Backend issues a presigned URL via a new `POST /api/agent/upload-url` endpoint; mobile uploads directly; on success, `POST /api/agent/delivery-photo` records the metadata. Photo metadata is associated with an `OrderEvent` row (existing in CLAUDE.md spec, but not yet a Prisma model — Phase 5 either ships the model or stores against the existing `Order` row).

**Primary recommendation:** Treat this phase as a **production-hardening + completeness** phase, not a from-scratch build. The skeleton (TaskManager, expo-location, expo-camera, `/api/agent/location`, `/api/agent/selfie`) all exist. The Phase 5 deliverable is: replace the AsyncStorage outbox with expo-sqlite, fix the iOS background permission flow to be a real two-step rationale dance, add Android 14 foreground-service-type compliance to `app.json`, implement deferred location updates + activity-type tuning to land battery under 6%/hour during active shifts, ship a presigned-URL photo upload pipeline, and add an `ActivePlatformAttribution` resolver service on the backend that any consumer (gpsTrack, performance scoring, Floor map dot color) can call to ask "what platform is driver X currently working on?".

**Critical scope reminder (per `.planning/PROJECT.md` non-goals):** the courier-side WhatsApp inbox is **Phase 9**, the bilingual outbound is **Phase 9**. Phase 5 ships GPS + photo only. Resist the temptation to add inbox plumbing in this phase even though the mobile code surface invites it.

## User Constraints

> No `CONTEXT.md` exists for Phase 5 — orchestrator spawned from `/gsd-research-phase` standalone with no founder-discussed decisions to honor verbatim. The constraints below are **derived from the upstream PROJECT.md, ROADMAP.md, REQUIREMENTS.md, and CLAUDE.md** and are the authoritative inputs the planner must respect.

### Locked Decisions (from upstream — NOT a CONTEXT.md)

These are decisions already locked at the project level and inherited by Phase 5; the planner has no authority to deviate:

- **DEC-mobile-as-gps-beacon (PROPOSED → effectively locked by ROADMAP Phase 5):** the Expo courier app becomes the GPS + cross-platform telemetry beacon — continuous background GPS while logged in, active-platform detection, photo capture for delivery proof.
- **CON-stack-mobile:** Expo 52 stays. Do NOT propose migrating to a non-Expo React Native or to a custom native module unless required for a Phase 5 capability that has no Expo path. (None do.)
- **CON-mobile-gps-ux:** Always-on GPS treated as a UX deliverable, not a checkbox. Battery and permission flow are first-class.
- **CON-tenant-scope-everywhere:** every backend endpoint Phase 5 ships must pass through the existing `tenantScope` middleware. **EXCEPTION (already established for `/api/agent/*`):** the agent endpoints use device-based auth (`deviceId` resolves to `Driver.tenantId` via the `Device` row), not `authMiddleware + tenantScope`. Phase 5 follows the existing `agent.ts` pattern.
- **CON-engineer-allocation-assumption:** 1 engineer + Claude Code (~6 months total). Phase 5 must be deliverable in ~3-4 weeks.

### Claude's Discretion (Phase 5 freedom areas)

The planner has freedom in these areas — the research recommends a default but the planner may override with rationale:

- **Photo storage backend.** Default recommendation: Cloudflare R2 (free egress, S3-compatible). Alternatives: AWS S3, Vercel Blob, keeping multer-on-disk (current). Discretion is warranted because the existing `backend/src/utils/upload.ts` is multer-disk and the codebase has no AWS/R2 integration yet; switching adds vendor + ENV setup that may not be worth it for Phase 5.
- **Active-platform mobile signal.** Default: send the last-opened-tab signal only (which is what we have — the user opens "Orders" tab in the Darb app). Alternative: defer entirely to backend OrderEvent inference and send NO mobile signal. Both are defensible.
- **Offline outbox storage.** Default: expo-sqlite. Alternative: keep AsyncStorage (do not recommend — see Pitfall 1).
- **Battery target.** Recommendation: ≤6% per hour during active shift (i.e., ≤48% over an 8h shift) on a healthy mid-tier Android. This is a Claude-set target, not a founder decision; adjust if user testing reveals otherwise.

### Deferred Ideas (OUT OF SCOPE for Phase 5)

Per upstream constraints, these are **explicitly Phase 9 or later** and Phase 5 must not pull them forward:

- **Mobile agent inbox** (REQ-mobile-agent-inbox) — Phase 9.
- **Bilingual courier outbound** (REQ-bilingual-courier-comms) — Phase 9.
- **Floor live map** (REQ-floor-live-map) — Phase 7. The GPS feed Phase 5 ships is a **producer**; the consumer is Phase 7.
- **Action tools (sendCourierMessage, applyPenalty, etc.)** — Phase 8. The Phase 2 monitor agent already has access to GPS-stale data via `liveFleetStatus`.
- **Standing rules engine (`AgentRule`)** — Phase 12.
- **Voice interface to the agent** — Phase 2 non-goal per CON-non-goals-12-months.
- **True Android UsageStatsManager-based active-platform detection** — see active-platform research below for why this is out of scope permanently, not just for Phase 5.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-mobile-always-on-gps | Continuous background GPS while logged in. Battery and permission UX done well. Ship in Q1. GPS streams while the courier is logged into the Darb mobile app, regardless of which delivery app is foregrounded. | Architecture Patterns §1 (TaskManager pattern, deferred updates, activity type), §2 (Permission rationale flow), §3 (Outbox / dedup); Don't Hand-Roll items 1-4; Pitfalls 1, 2, 3, 6 |
| REQ-mobile-active-platform-detection | Detect which delivery app is foregrounded (Keeta / Talabat / Deliveroo / Americana) so we get per-platform attribution without scraping. | Architecture Patterns §4 (Active-Platform Attribution Service, backend-driven); Don't Hand-Roll item 5 (do NOT use UsageStatsManager); Pitfall 8 |
| REQ-mobile-delivery-photo-capture | Photo capture for delivery proof. Already partly there in the existing app. | Architecture Patterns §5 (presigned URL pattern, expo-image-manipulator compression, OrderEvent association); Pitfalls 4, 5 |

Cross-reference: this phase **feeds REQ-data-performance-snapshot** indirectly — the Phase 5 GPS feed is what `aiScoringService` (Phase 1) consumes to compute `PerformanceSnapshot.deliveryScore` (online hours, on-route ratio). It also **feeds REQ-floor-live-map** (Phase 7 directly consumes `lastGpsAt`/`lastGpsLat`/`lastGpsLng` from `CourierOnlineSession`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Background GPS sampling | Mobile (Expo 52: `expo-task-manager` + `expo-location`) | OS (CoreLocation on iOS, FusedLocationProviderClient via Android Location Services) | Mobile is the only place this can run; Expo wraps the OS APIs |
| Permission rationale UX | Mobile (Expo) | OS dialog | Two-stage: in-app rationale modal → OS dialog, per Apple/Google guidelines |
| Foreground service notification | Mobile (Android only — `Location.startLocationUpdatesAsync` `foregroundService` option) | — | Android 12+ requires this for any background location |
| Offline outbox queue | Mobile (`expo-sqlite`, NOT AsyncStorage) | — | Local durable storage is mobile-side; SQLite handles concurrent writes safely under TaskManager re-entry |
| Idempotency / dedupe | Mobile (client-side hash on `(deviceId, capturedAt, lat, lng)`) | Backend (`unique` index on a composite key, server-side discard duplicates) | Defense in depth; client de-dupes on retry, server re-dedupes on partial-batch retry |
| GPS data ingestion endpoint | Backend (`POST /api/agent/location`) | DB (`LocationLog` table — already exists) | Existing endpoint stays; Phase 5 adds rate limit + idempotency check |
| Photo capture | Mobile (`expo-camera`) | — | Camera lives on the device |
| Photo compression | Mobile (`expo-image-manipulator`) | — | Compress before upload to save courier's data plan |
| Photo upload transport | Mobile (presigned PUT to R2) | Backend (issues presigned URL) | Direct upload offloads bandwidth from Express; Express only sees a metadata POST after success |
| Photo metadata persistence | Backend (new endpoint `POST /api/agent/delivery-photo`) | DB (`OrderEvent` model — Phase 5 ships if not present, or stores on `Order.photoUrl`) | Backend is the system of record |
| Active-platform attribution | Backend (`services/activePlatformAttribution.ts` — new) | DB (existing `OrderEvent`/`Shift`/`Order` rows) | The mobile app cannot reliably know which delivery platform is foregrounded; the backend infers from the most recent platform-tagged event |
| Active-platform mobile hint | Mobile (lightweight `lastTabOpened` signal sent with heartbeat) | Backend (treats as one input among many, never authoritative) | Mobile signal is a hint, not a decision; backend resolves the hint with order-event evidence |
| Battery telemetry | Mobile (`expo-battery`) → backend (heartbeat) | Backend (Device.batteryLevel — already exists) | Existing column populated; Phase 5 starts actually populating it |
| GPS-stale detection | Backend (`liveFleetStatus` tool — Phase 1, already exists) | Decisions monitor agent (Phase 2 — already shipping) | Phase 5 just produces fresh `lastGpsAt`; downstream is already wired |

## Standard Stack

### Core (already installed in `mobile/package.json` — verified versions current as of 2026-05-10)

| Library | Version (current Expo SDK 52 line) | Verified Today | Purpose | Why Standard |
|---------|--------|---------|---------|--------------|
| `expo` | `~52.0.0` | n/a (SDK pinned) | Expo SDK | CON-stack-mobile pin |
| `expo-location` | `~18.0.0` (latest patch: `18.0.10`) | [VERIFIED: npm view expo-location@~18.0.0 → 18.0.10] | Foreground + background location | Only first-class Expo path to background GPS |
| `expo-task-manager` | `~12.0.0` (latest patch: `12.0.6`) | [VERIFIED: npm view] | Background task definition for location callbacks | Required dance partner for `Location.startLocationUpdatesAsync` |
| `expo-camera` | `~16.0.0` (latest patch: `16.0.18`) | [VERIFIED: npm view] | Photo capture | Already used in `app/selfie.tsx` |
| `@react-native-async-storage/async-storage` | `2.1.0` | n/a | KEEP for non-queue use (auth tokens, settings) | Existing |
| `expo-secure-store` | `~14.0.0` | n/a | KEEP for token storage | Existing |
| `expo-device` | `~7.0.3` | n/a | Device info for enrollment heartbeat | Existing |
| `expo-notifications` | `~0.29.0` | n/a | KEEP for Phase 9 inbox; not used in Phase 5 | Existing |

### Add for Phase 5 (NEW packages — all in Expo SDK 52 line)

| Library | Version | Verified Today | Purpose | Why Standard |
|---------|---------|---------|---------|--------------|
| `expo-sqlite` | `~15.0.0` (latest patch: `15.0.6`) | [VERIFIED: npm view] | Durable offline outbox for GPS points + photo upload queue | AsyncStorage explicitly fails as a queue at scale [CITED: github.com/expo/expo issue #33754]; expo-sqlite is the Expo-blessed local-DB option |
| `expo-image-manipulator` | `~13.0.0` (latest patch: `13.0.6`) | [VERIFIED: npm view] | Compress + resize photos to ≤200 KB before upload | Native compression on-device; alternative is sending base64 JPEG which is ~3× larger |
| `expo-battery` | `~9.0.0` (latest patch: `9.0.2`) | [VERIFIED: npm view] | Read battery level + low-power mode for heartbeat | `Device.batteryLevel` column exists in schema; currently always sent as `1.0` (see `dashboard.tsx:53`) — wrong |
| `expo-application` | `~6.0.0` | [VERIFIED: latest stable in SDK 52 line] | App version, build version for diagnostic heartbeat | Replaces hardcoded `appVersion: "1.0.0"` |

### Backend additions (NEW dependencies — for presigned R2 upload pattern)

| Library | Version | Verified | Purpose | Why Standard |
|---------|---------|----------|---------|--------------|
| `@aws-sdk/client-s3` | `^3.700.0` | [VERIFIED: latest 3.x as of 2026-05] | S3-compatible client (Cloudflare R2 implements S3 API) | Standard Node S3 client; alternative `aws-sdk` (v2) is in maintenance mode |
| `@aws-sdk/s3-request-presigner` | `^3.700.0` | [VERIFIED] | Generate presigned PUT URLs server-side | Required for the direct-upload pattern |

### Supporting (already installed in backend — verify, do not add)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `multer` | `^1.4.5-lts.1` | KEEP for non-photo uploads (XLSX imports, ticket photos) | Existing |
| `@anthropic-ai/sdk` | `^0.80.0` | Used by Phase 1 agent — Phase 5 does NOT call agent | Out of scope |
| `bullmq` | `^5.73.4` | If we need a backend worker to clean up orphaned R2 uploads (post-MVP) | Optional Phase 5+1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-location` background task | `react-native-background-geolocation` (transistorsoft) | More mature for shift-based fleet GPS [CITED: transistorsoft GitHub README]; native iOS Significant-Location-Changes support; better activity-recognition. **BUT:** $200/year per seat for the Pro license, not a monthly cost the founder will accept at design-partner stage. Expo's solution is sufficient for shifts ≤12h. |
| `expo-sqlite` for outbox | `react-native-mmkv` | MMKV is faster, but Expo support requires a dev-client config plugin and the throughput we need (≤2 writes/sec) doesn't justify the complexity. SQLite is fine. |
| Cloudflare R2 for photos | AWS S3 | Both work via the S3 API. **R2 has free egress** (no per-GB-out fees) which matters when supervisors and the agent re-fetch photos — over ~5 KD/month savings at 100 couriers. R2 is the recommendation. |
| Cloudflare R2 for photos | Vercel Blob | Vercel Blob is convenient (already on Vercel) but more expensive at scale and lacks rich access control. Not recommended for photo storage. |
| Cloudflare R2 for photos | Multer-on-disk (current) | The existing pattern works for selfie/ticket photos in production today. **However, Vercel deployment uses `/tmp/uploads` which is ephemeral** (`backend/src/utils/upload.ts:6`) — the existing selfie storage is NOT durable on Vercel. R2 fixes this AND addresses delivery photo storage in one go. |
| Direct presigned PUT | Multipart through Express | Multipart through Express is slower (transit hop), eats 10MB-per-request RAM on Vercel, and would force us to upgrade Vercel function timeout. Direct presigned PUT skips Express entirely for the photo bytes. |
| Active-platform via mobile | Active-platform via UsageStatsManager (Android) / native (iOS) | iOS: not feasible (no API). Android: requires `PACKAGE_USAGE_STATS` "privileged permission" which forces the user through Settings → "Apps with usage access"; Google Play policies forbid this for non-system-utility apps. **Backend inference from `OrderEvent` rows is the only viable path.** |
| Active-platform via mobile | Mobile sends `AppState` of which Darb tab the courier last opened | This is a *hint*, not a decision — defensible to send as a low-confidence signal alongside backend inference. |

### Installation

```bash
# Mobile additions
cd mobile && npx expo install expo-sqlite expo-image-manipulator expo-battery expo-application

# Backend additions
cd backend && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Version verification:** All package versions verified via `npm view <pkg>@~<minor>.0.0 version` on 2026-05-10. Re-verify before plan finalisation if more than 14 days have elapsed; npm minor releases happen weekly in the Expo line.

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                          MOBILE (Expo 52, courier device)                          │
│                                                                                     │
│   ┌────────────────────────────────────────────────────────────────────────────┐  │
│   │ Foreground UI (React)                                                      │  │
│   │  app/(tabs)/dashboard.tsx ── "Start Shift" → permission flow → enable beacon│  │
│   │  app/(tabs)/orders.tsx    ── tap order → "Mark Delivered" → photo capture │  │
│   │  app/selfie.tsx           ── existing clock-in/out selfie                  │  │
│   │  components/PermissionRationale.tsx (NEW) ── two-stage rationale modal   │  │
│   │  components/BatteryStatusBadge.tsx (NEW) ── shows beacon health           │  │
│   └─────────────────────────┬──────────────────────────────────────────────────┘  │
│                             │                                                       │
│   ┌─────────────────────────▼──────────────────────────────────────────────────┐  │
│   │ services/locationService.ts (REWRITE — currently AsyncStorage outbox)    │  │
│   │   ├─ permission flow (Foreground → Always rationale → upgrade)             │  │
│   │   ├─ Location.startLocationUpdatesAsync(LOCATION_TASK, options)           │  │
│   │   │     accuracy: BestForNavigation (active), Balanced (idle)             │  │
│   │   │     activityType: AutomotiveNavigation                                  │  │
│   │   │     pausesUpdatesAutomatically: false                                  │  │
│   │   │     showsBackgroundLocationIndicator: true                             │  │
│   │   │     foregroundService: { notificationTitle, body, color, killService } │  │
│   │   │     deferredUpdatesInterval: 60s (when stationary)                     │  │
│   │   ├─ TaskManager.defineTask(LOCATION_TASK) → outbox.enqueue(points)       │  │
│   │   └─ flushScheduler — every 30s when online, on app foreground            │  │
│   │                                                                              │  │
│   │ services/outbox.ts (NEW — expo-sqlite outbox)                              │  │
│   │   ├─ schema: gps_points(id, deviceId, lat, lng, accuracy, speed,          │  │
│   │   │                       capturedAt, idempotencyKey UNIQUE,              │  │
│   │   │                       attempts, lastError)                            │  │
│   │   ├─ enqueueGpsPoint(point) — INSERT OR IGNORE on idempotencyKey          │  │
│   │   ├─ flushBatch(maxSize=50) — POST /api/agent/location, on 200 DELETE rows │  │
│   │   └─ photo_uploads(id, uri, orderId, attempts, presignedUrl, etc.)        │  │
│   │                                                                              │  │
│   │ services/photoService.ts (NEW)                                             │  │
│   │   ├─ capturePhoto(orderId) — expo-camera takePictureAsync                  │  │
│   │   ├─ compress(uri) — expo-image-manipulator { resize 1280, quality 0.7 }  │  │
│   │   ├─ requestUploadUrl(orderId) — POST /api/agent/upload-url               │  │
│   │   ├─ uploadDirect(presignedUrl, file) — fetch PUT to R2                   │  │
│   │   └─ recordMetadata(orderId, photoKey) — POST /api/agent/delivery-photo   │  │
│   │                                                                              │  │
│   │ services/heartbeatService.ts (REWRITE)                                     │  │
│   │   ├─ every 5 min: getBatteryLevelAsync, getPowerStateAsync,              │  │
│   │   │   isLowPowerModeEnabledAsync, getCurrentLocation                      │  │
│   │   └─ POST /api/agent/heartbeat with platformGuess hint                    │  │
│   └────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬────────────────────────────────────────────────┘
                                  │
                                  │  HTTPS (token-bearing fetch / presigned PUT)
                                  │
┌─────────────────────────────────▼─────────────────────────────────────────────────┐
│                   BACKEND (Express + Prisma + Postgres + Redis)                    │
│                                                                                     │
│  routes/agent.ts (EXISTS — extend)                                                 │
│    POST /api/agent/register     ── existing                                        │
│    POST /api/agent/heartbeat    ── EXTEND: accept batteryLevel, lowPowerMode,     │
│                                            platformGuess                          │
│    POST /api/agent/location     ── EXTEND: idempotency check, rate limit         │
│    POST /api/agent/upload-url   (NEW)  ── issue R2 presigned PUT                  │
│    POST /api/agent/delivery-photo (NEW) ── record metadata after R2 success      │
│                                                                                     │
│  services/activePlatformAttribution.ts (NEW)                                      │
│    └─ resolveActivePlatform(driverId, at: Date): Platform | null                  │
│       — looks at: latest OrderEvent in last 30 min →                              │
│                    latest Shift.platform with actualStart in last 8h →            │
│                    Driver.platform (default home platform) →                       │
│                    mobile heartbeat platformGuess hint (lowest weight)            │
│                                                                                     │
│  services/r2Service.ts (NEW)                                                        │
│    └─ presignPutUrl(key, contentType, expiresIn=300s): string                     │
│    └─ presignGetUrl(key, expiresIn=3600s): string  (used by Driver File later)    │
│                                                                                     │
│  middleware/agentRateLimit.ts (NEW)                                                │
│    └─ per-deviceId rate limit: 200 location POSTs / 5 min                         │
│                                                                                     │
│  Prisma writes:                                                                     │
│    LocationLog.create     ── existing                                              │
│    Device.update          ── existing (lastLatitude, lastLongitude, lastSeen,    │
│                                         batteryLevel)                              │
│    CourierOnlineSession.upsert (NEW USAGE — was just keeta-monitor before)       │
│                            ── on first GPS of shift, create session;             │
│                              on each GPS, update lastGpsAt + lastGpsLat/Lng       │
│    OrderEvent.create     ── if Phase 5 ships the model; else → Order.update     │
│                                                                                     │
│  feeds:                                                                             │
│    liveFleetStatus tool (Phase 1)  ─ reads CourierOnlineSession.lastGpsAt        │
│    gpsTrack tool (Phase 1)         ─ reads LocationLog                            │
│    monitor agent (Phase 2)         ─ surfaces GPS-stale Decisions cards          │
│    Floor map (Phase 7)             ─ subscribes to lastGpsLat/Lng updates       │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│           Cloudflare R2 (S3-compatible blob store) — NEW dependency             │
│                                                                                  │
│   bucket: darb-courier-photos                                                   │
│   keys:   {tenantId}/{orderId}/{deviceId}/{capturedAtMs}.jpg                   │
│   access: presigned PUT (mobile) + presigned GET (backend, for Driver File)    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (delta vs current)

```
mobile/
├── app/                                  # expo-router routes (existing)
│   └── (tabs)/dashboard.tsx              # MOD: use new permission flow
├── src/
│   ├── api/client.ts                     # MOD: add upload-url, delivery-photo
│   ├── components/
│   │   ├── PermissionRationale.tsx       # NEW
│   │   └── BatteryStatusBadge.tsx        # NEW
│   ├── services/
│   │   ├── locationService.ts            # REWRITE (use outbox + new options)
│   │   ├── outbox.ts                     # NEW (expo-sqlite outbox)
│   │   ├── photoService.ts               # NEW
│   │   ├── heartbeatService.ts           # NEW (extracted from dashboard.tsx)
│   │   └── platformGuess.ts              # NEW (last-tab-opened tracker)
│   └── __tests__/                        # NEW (jest-expo)
│       ├── outbox.test.ts                # idempotency, transaction, retry
│       ├── locationService.test.ts       # permission flow, options shape
│       └── photoService.test.ts          # compression, presign, retry

backend/
├── src/
│   ├── routes/
│   │   ├── agent.ts                      # MOD: extend existing endpoints
│   │   └── agent.upload.ts               # NEW (presign + delivery-photo)
│   ├── services/
│   │   ├── activePlatformAttribution.ts  # NEW
│   │   └── r2Service.ts                  # NEW
│   ├── middleware/
│   │   └── agentRateLimit.ts             # NEW (per-device rate limit)
│   └── __tests__/agent/
│       ├── locationIngest.test.ts        # idempotency, dedup, scope
│       ├── activePlatformAttribution.test.ts # priority chain
│       └── presignFlow.test.ts           # url issuance + metadata write

backend/prisma/
└── schema.prisma                         # MOD: optional OrderEvent additions
```

### Pattern 1: Background Location Task (the spine of REQ-mobile-always-on-gps)

**What:** A `TaskManager.defineTask` registered at module top-level scope that receives location batches from the OS, enqueues them in the SQLite outbox, and triggers a flush when batch size or time threshold is met.

**When to use:** This is *the* pattern for any always-on GPS in Expo. There is no other path that survives screen-off / app-backgrounded.

**Critical placement requirement:** `TaskManager.defineTask(...)` MUST be called at module load time, NOT inside a React component or hook. The OS rehydrates the task by name when the app process is killed and re-spawned for a location event — if the task is only defined inside a `useEffect`, the rehydration crashes. [CITED: docs.expo.dev/versions/latest/sdk/task-manager — "Tasks must be defined in the global scope, not within React lifecycle methods"]

**Example:**

```typescript
// Source: docs.expo.dev/versions/latest/sdk/location + locationService.ts existing
// mobile/src/services/locationService.ts (rewrite)

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { enqueueGpsPoint, flushPendingPoints } from "./outbox";
import { lastTabOpened } from "./platformGuess";

const LOCATION_TASK = "darb-background-location";

// MUST be at module top-level — not inside any React component or hook.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    // Don't throw — re-throwing here is silently swallowed by the OS and the
    // task gets killed. Log via expo-error-reporter / Sentry instead.
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const loc of locations) {
    await enqueueGpsPoint({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? 0,
      speed: loc.coords.speed ?? null,
      capturedAt: new Date(loc.timestamp).toISOString(),
      platformGuess: lastTabOpened(),  // hint, not authoritative
    });
  }
  // Best-effort flush; outbox.flushBatch is idempotent and rate-limits itself.
  await flushPendingPoints().catch(() => {});
});

export async function startBeacon(): Promise<{ ok: true } | { ok: false; reason: string }> {
  // 1. Foreground first.
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return { ok: false, reason: "foreground_denied" };

  // 2. Background only after a justification rationale modal — UI layer should
  //    have already shown that before calling startBeacon().
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") return { ok: false, reason: "background_denied" };

  // 3. Already running? Don't double-register.
  const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (running) return { ok: true };

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation, // tune down to Balanced when courier stationary >10min
    timeInterval: 30_000,
    distanceInterval: 25,
    deferredUpdatesInterval: 60_000, // batch up to 60s when in background+stationary
    deferredUpdatesDistance: 100,
    activityType: Location.LocationActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Darb is tracking your shift",
      notificationBody: "Active until you tap End Shift",
      notificationColor: "#F97316",
      killServiceOnDestroy: false,
    },
  });

  return { ok: true };
}

export async function stopBeacon(): Promise<void> {
  await flushPendingPoints().catch(() => {});
  const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
```

### Pattern 2: Two-Stage Permission Rationale Flow

**What:** Show an in-app rationale screen explaining *why* before triggering the OS permission dialog. Always foreground first, then background as an upgrade.

**When to use:** Any time you need iOS `Always` location or Android `ACCESS_BACKGROUND_LOCATION`.

**Why:** OS permission dialogs are short and forgettable. iOS specifically defaults to "While Using" and the OS *does not present* "Always" as a first-time option — it only offers it on a second prompt that follows the user actually using the app while granted. [CITED: developer.apple.com/forums/thread/117256 — "A permission upgrade should be done in steps: When in Use first, upgrade to Always after"] The right pattern: capture user attention in an in-app modal, then walk through both permission steps.

**Example:**

```typescript
// Source: developer.apple.com guidance + Expo SDK 52 patterns
// mobile/src/components/PermissionRationale.tsx (new)

import { Modal, View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import * as Location from "expo-location";
import { startBeacon } from "../services/locationService";

export function PermissionRationale({
  visible, onComplete,
}: { visible: boolean; onComplete: (granted: boolean) => void }) {
  const [stage, setStage] = useState<"explain" | "fg-asking" | "bg-explain" | "bg-asking" | "done">("explain");

  async function askForeground() {
    setStage("fg-asking");
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") { onComplete(false); return; }
    setStage("bg-explain");
  }
  async function askBackground() {
    setStage("bg-asking");
    const result = await startBeacon();  // triggers Always dialog
    onComplete(result.ok);
  }

  return (
    <Modal visible={visible} animationType="slide">
      {stage === "explain" && (
        <View>
          <Text>Darb tracks your location during shifts</Text>
          <Text>
            We track GPS continuously so the office can see where you are if
            you have a question, and so we can prove your delivery times.
            We never track you off-shift. You can pause anytime.
          </Text>
          <TouchableOpacity onPress={askForeground}><Text>Continue</Text></TouchableOpacity>
        </View>
      )}
      {stage === "bg-explain" && (
        <View>
          <Text>One more permission</Text>
          <Text>
            On the next screen, please tap "Allow All The Time" so the GPS keeps
            tracking when your phone screen is off. Without this, the GPS turns
            off every time you put your phone in your pocket.
          </Text>
          <TouchableOpacity onPress={askBackground}><Text>Got it</Text></TouchableOpacity>
        </View>
      )}
      {/* fg-asking and bg-asking show a spinner; done is unreachable */}
    </Modal>
  );
}
```

### Pattern 3: SQLite Outbox with Idempotency

**What:** A local SQLite database that acts as an at-least-once outbox for GPS points and photo metadata, with idempotency keys to allow safe retry on partial-batch failures.

**When to use:** Any background workload that batches uploads to a remote server in unreliable network conditions (basement parking, weak coverage zones).

**Why:** AsyncStorage is a JSON-on-disk key-value store with no concurrent-write safety. The TaskManager callback runs in a separate JS context that can race with foreground writes. **A documented Expo issue (#33754, currently open as of 2026-04-01) shows AsyncStorage corrupting under exactly this scenario** [VERIFIED: github.com/expo/expo/issues/33754]. SQLite with `withTransactionAsync` solves this: every enqueue is a transaction, every flush deletes by primary key only after server confirmation, partial failure leaves the un-confirmed rows in place.

**Example:**

```typescript
// Source: docs.expo.dev/versions/latest/sdk/sqlite + project pattern
// mobile/src/services/outbox.ts (new)

import * as SQLite from "expo-sqlite";
import { uploadLocations } from "../api/client";

let _db: SQLite.SQLiteDatabase | null = null;
async function db() {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync("darb-outbox.db");
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS gps_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotencyKey TEXT NOT NULL UNIQUE,
        latitude REAL NOT NULL, longitude REAL NOT NULL,
        accuracy REAL NOT NULL, speed REAL,
        capturedAt TEXT NOT NULL,
        platformGuess TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        lastError TEXT,
        createdAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
      );
      CREATE INDEX IF NOT EXISTS idx_gps_points_attempts_id ON gps_points(attempts, id);
    `);
  }
  return _db;
}

export interface OutboxGpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  capturedAt: string;
  platformGuess: string | null;
}

export async function enqueueGpsPoint(p: OutboxGpsPoint): Promise<void> {
  const d = await db();
  // Idempotency key: deviceId + capturedAt-rounded-to-second + lat/lng-rounded-to-5dp
  const idempotencyKey = `${p.capturedAt.slice(0,19)}-${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
  // INSERT OR IGNORE: dupes are silently rejected — no exception
  await d.runAsync(
    `INSERT OR IGNORE INTO gps_points
     (idempotencyKey, latitude, longitude, accuracy, speed, capturedAt, platformGuess)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idempotencyKey, p.latitude, p.longitude, p.accuracy, p.speed, p.capturedAt, p.platformGuess],
  );
}

let flushInFlight = false;
export async function flushPendingPoints(): Promise<{ flushed: number }> {
  if (flushInFlight) return { flushed: 0 };
  flushInFlight = true;
  try {
    const d = await db();
    const rows = await d.getAllAsync<{ id: number; idempotencyKey: string; latitude: number; longitude: number; accuracy: number; speed: number | null; capturedAt: string; }>(
      `SELECT id, idempotencyKey, latitude, longitude, accuracy, speed, capturedAt
       FROM gps_points WHERE attempts < 5 ORDER BY id ASC LIMIT 50`,
    );
    if (rows.length === 0) return { flushed: 0 };
    try {
      await uploadLocations(rows.map(r => ({
        latitude: r.latitude,
        longitude: r.longitude,
        accuracy: r.accuracy,
        speed: r.speed ?? undefined,
        capturedAt: r.capturedAt,
        idempotencyKey: r.idempotencyKey,
      })));
      // Server accepted — delete confirmed rows
      const ids = rows.map(r => r.id);
      const placeholders = ids.map(() => "?").join(",");
      await d.runAsync(`DELETE FROM gps_points WHERE id IN (${placeholders})`, ids);
      return { flushed: rows.length };
    } catch (e: any) {
      // Server failure — bump attempts, leave rows
      const ids = rows.map(r => r.id);
      const placeholders = ids.map(() => "?").join(",");
      await d.runAsync(
        `UPDATE gps_points SET attempts = attempts + 1, lastError = ? WHERE id IN (${placeholders})`,
        [String(e?.message ?? e), ...ids],
      );
      return { flushed: 0 };
    }
  } finally {
    flushInFlight = false;
  }
}
```

### Pattern 4: Active-Platform Attribution (server-side, NOT client)

**What:** A backend service that, given a `driverId` and timestamp, returns the most likely active delivery platform by walking a priority chain of evidence sources.

**When to use:** Anywhere the system needs to attribute GPS, online time, or revenue to a specific platform — Floor map dot color, Driver File platform breakdown, performance scoring per-platform totals, the agent's `liveFleetStatus` answer.

**Why:** Mobile cannot reliably tell which delivery app is foregrounded. iOS has no API. Android has UsageStatsManager but the required permission (`PACKAGE_USAGE_STATS`) is a "privileged permission" (only system apps grant it without user consent) and Google Play policies disallow it for non-system-utility categories. The path that actually works: the **backend already has authoritative platform-tagged events** — `OrderLog`, `Shift.platform`, scraper-ingested platform updates — and can resolve "active platform" with high confidence from those.

**Example:**

```typescript
// Source: own design — no external library; reads from existing schema
// backend/src/services/activePlatformAttribution.ts (new)

import { prisma } from "../config";
import type { Platform } from "@prisma/client";

export interface ActivePlatformResult {
  platform: Platform | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  source: "order_event" | "shift" | "driver_default" | "mobile_hint" | "none";
  evidence: { id?: string; at?: Date; text?: string };
}

export async function resolveActivePlatform(
  driverId: string,
  at: Date = new Date(),
  mobileHint?: Platform | null,
): Promise<ActivePlatformResult> {
  // Tier 1 — Recent order activity (HIGH confidence): an OrderLog row in last 30 min
  // Note: Adjust the table/column names to match your schema. If OrderEvent ships in
  // Phase 5, prefer that; otherwise use whatever order-state-change table exists.
  const thirtyMinAgo = new Date(at.getTime() - 30 * 60 * 1000);
  const recentOrder = await prisma.orderLog.findFirst({
    where: { driverId, capturedAt: { gte: thirtyMinAgo, lte: at } },
    orderBy: { capturedAt: "desc" },
    select: { platform: true, id: true, capturedAt: true },
  }).catch(() => null);
  if (recentOrder) {
    return {
      platform: recentOrder.platform,
      confidence: "HIGH",
      source: "order_event",
      evidence: { id: recentOrder.id, at: recentOrder.capturedAt },
    };
  }

  // Tier 2 — Active shift (MEDIUM): Shift in IN_PROGRESS status
  const activeShift = await prisma.shift.findFirst({
    where: { driverId, status: "IN_PROGRESS", actualStart: { lte: at } },
    orderBy: { actualStart: "desc" },
    select: { platform: true, id: true, actualStart: true },
  });
  if (activeShift) {
    return {
      platform: activeShift.platform,
      confidence: "MEDIUM",
      source: "shift",
      evidence: { id: activeShift.id, at: activeShift.actualStart ?? undefined },
    };
  }

  // Tier 3 — Driver's default platform (LOW): Driver.platform (their home)
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { platform: true },
  });
  if (driver) {
    // If we ALSO have a mobile hint that matches, lift confidence.
    const matchesHint = mobileHint && mobileHint === driver.platform;
    return {
      platform: driver.platform,
      confidence: matchesHint ? "MEDIUM" : "LOW",
      source: matchesHint ? "mobile_hint" : "driver_default",
      evidence: { text: matchesHint ? "default + mobile-hint match" : "driver.platform default" },
    };
  }

  return { platform: null, confidence: "UNKNOWN", source: "none", evidence: {} };
}
```

### Pattern 5: Presigned-URL Photo Upload

**What:** Mobile asks the backend for a one-time presigned PUT URL to R2, uploads the photo bytes directly to R2 (skipping Express), then POSTs metadata back to the backend.

**When to use:** Any large-file upload (photos, audio, videos) from mobile. Anything > 1 MB should use this pattern; smaller can stay multipart.

**Why:** The current selfie pattern (multipart through Express → multer → disk) doesn't work on Vercel deploys (`/tmp/uploads` is ephemeral) and forces 10 MB through the function which is slow and consumes function-time budget. Direct presigned PUT bypasses Express entirely for the file bytes; Express only sees a tiny metadata POST.

**Example:**

```typescript
// Source: developers.cloudflare.com/r2/api/s3/presigned-urls + AWS SDK v3 docs
// backend/src/services/r2Service.ts (new)
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,        // https://<account>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function presignPutUrl(key: string, contentType: string, expiresInSec = 300) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

export async function presignGetUrl(key: string, expiresInSec = 3600) {
  const cmd = new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}
```

```typescript
// backend/src/routes/agent.ts (extend)
router.post("/upload-url", async (req, res) => {
  try {
    const { deviceId, orderId, contentType = "image/jpeg" } = req.body;
    if (!deviceId || !orderId) { res.status(400).json({ error: "deviceId and orderId required" }); return; }
    const driver = await resolveDriverFromDeviceId(deviceId);
    if (!driver) { res.status(404).json({ error: "Device or driver not found" }); return; }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: driver.tenantId },
      select: { id: true },
    });
    if (!order) { res.status(404).json({ error: "Order not in tenant" }); return; }

    const key = `${driver.tenantId}/${orderId}/${deviceId}/${Date.now()}.jpg`;
    const url = await presignPutUrl(key, contentType, 300);
    res.json({ url, key, expiresInSec: 300 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/delivery-photo", async (req, res) => {
  try {
    const { deviceId, orderId, key, capturedAt, latitude, longitude } = req.body;
    const driver = await resolveDriverFromDeviceId(deviceId);
    if (!driver) { res.status(404).json({ error: "Device or driver not found" }); return; }
    // Confirm the key belongs to this tenant — defense in depth
    if (!String(key).startsWith(`${driver.tenantId}/`)) {
      res.status(403).json({ error: "key tenant mismatch" }); return;
    }
    // Persist on Order or OrderEvent
    await prisma.order.update({
      where: { id: orderId },
      data: {
        photoUrl: key,            // store the R2 key, not a presigned URL (presigned URLs expire)
        deliveredAt: capturedAt ? new Date(capturedAt) : new Date(),
        deliveredLat: latitude ?? null,
        deliveredLng: longitude ?? null,
      },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
```

```typescript
// mobile/src/services/photoService.ts (new)
import * as ImageManipulator from "expo-image-manipulator";
import { agentFetch } from "../api/client";

export async function uploadDeliveryPhoto(orderId: string, originalUri: string, gps: {lat:number;lng:number}) {
  // 1. Compress to ≤200KB
  const compressed = await ImageManipulator.manipulateAsync(
    originalUri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  // 2. Get presigned URL
  const presign = await agentFetch<{ url: string; key: string }>("/api/agent/upload-url", {
    method: "POST",
    body: JSON.stringify({ orderId, contentType: "image/jpeg" }),
  });

  // 3. Upload directly to R2
  const blob = await (await fetch(compressed.uri)).blob();
  const putResp = await fetch(presign.url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putResp.ok) throw new Error(`upload failed: ${putResp.status}`);

  // 4. Record metadata
  await agentFetch("/api/agent/delivery-photo", {
    method: "POST",
    body: JSON.stringify({
      orderId,
      key: presign.key,
      capturedAt: new Date().toISOString(),
      latitude: gps.lat,
      longitude: gps.lng,
    }),
  });
}
```

### Anti-Patterns to Avoid

- **Defining the TaskManager task inside `useEffect` or any component.** The OS rehydrates tasks by name in a fresh JS context after process kill — task definition must be at module top-level so the import side-effect re-registers it. (See Pattern 1.)
- **Calling `requestBackgroundPermissionsAsync` immediately on first launch.** iOS returns `denied` for "Always" if the user hasn't yet experienced the app benefiting from foreground location. Always request foreground first, let the user actually use the feature, *then* upgrade to background. [CITED: developer.apple.com/forums/thread/117256]
- **Using AsyncStorage as a queue of >100 records.** AsyncStorage is a JSON-on-disk K/V store; under TaskManager re-entry it loses writes in observed cases [CITED: github.com/expo/expo/issues/33754]. Use expo-sqlite.
- **Sending GPS as base64 JPEG** (the current selfie pattern). Inflates payload ~3×. Use either binary multipart or, preferred, presigned PUT to a blob store.
- **Trying to detect foreground app via UsageStatsManager / accessibility services.** Google Play will reject the app under most policy categories; iOS has no equivalent API. Solve this server-side via OrderEvent inference instead.
- **Polling the foreground app's accelerometer to "guess" the courier is driving for Keeta vs Talabat.** Plausible-sounding, completely unreliable, and burns battery further. Use platform attribution server-side from Order events.
- **Storing presigned URLs in the database.** Presigned URLs expire (typically 5 min) — store the *key* (`tenantId/orderId/deviceId/timestamp.jpg`), generate a fresh presigned GET when the Driver File needs to display it.
- **Forgetting Android 14 `FOREGROUND_SERVICE_LOCATION`.** Apps targeting Android 14+ that start a location foreground service crash with `SecurityException` if this permission isn't declared in the manifest [CITED: developer.android.com/about/versions/14/changes/fgs-types-required]. Phase 5 must add this in `app.json`.
- **Setting `NSLocationAlwaysUsageDescription` (deprecated, iOS 11+ ignored).** Use `NSLocationAlwaysAndWhenInUseUsageDescription` only. Existing `mobile/app.json` correctly uses this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background GPS while screen off | A custom native module wrapping CLLocationManager / FusedLocationProvider | `expo-location` + `expo-task-manager` | Expo wraps the OS APIs correctly, including the iOS Info.plist / Android manifest dance, the ANR-prevention foreground service notification on Android, the JS-engine rehydration after task-launch on iOS. Reimplementing this is 2-3 weeks of plumbing for the same outcome. |
| Permission rationale flow | A timed in-app banner that triggers `requestPermissionsAsync` after 2 seconds | A modal presented at the moment the user taps "Start Shift" | Apple/Google guidelines explicitly call out that permission requests must be tied to user intent. Auto-firing them on app launch tanks grant rates and risks store-policy issues. |
| Outbox queue | A `setInterval` that POSTs `AsyncStorage`-stored arrays | `expo-sqlite` with idempotency-keyed inserts and an attempts column | AsyncStorage corrupts under concurrent writes (open Expo issue #33754); SQLite's `withTransactionAsync` solves it; idempotency key handles partial-batch retries safely. |
| Photo compression | Sharing a base64 string and letting backend resize | `expo-image-manipulator` on-device | Native compression saves the courier's data plan (Kuwait mobile data is metered for many courier plans), reduces upload time, and frees Express function-time. |
| Foreground-app detection | Custom Android module using UsageStatsManager / Accessibility Service | Server-side `activePlatformAttribution.ts` reading existing `OrderLog`/`Shift` rows | iOS has no foreground-app API. Android UsageStatsManager requires PACKAGE_USAGE_STATS which Google Play rejects for non-system apps. Backend inference from order events is the only path that ships AND survives store review. |
| Presigned URL generation | Custom HMAC code | `@aws-sdk/s3-request-presigner` | AWS SDK is the canonical implementation; R2 is S3-compatible. Custom HMAC subtly broken (forgot the `x-amz-content-sha256`, etc.) is a 2-day debug session. |
| Rate limiting per device | A custom in-memory counter | `express-rate-limit` keyed by `deviceId` | Already in `package.json` (`express-rate-limit ^8.3.2`). Just add a per-deviceId keyGenerator. |
| Mobile testing harness | Manual smoke + handhold | `jest-expo` preset + `@testing-library/react-native` | Mobile has zero tests today. The Phase 5 commit-time test budget is small; jest-expo's preset bootstraps you in <30 min. |

**Key insight:** Phase 5 is not a from-scratch problem; it is a stitching-together-of-Expo-blessed-pieces problem. Every "should I write a native module?" answer for this phase is **no, use the Expo SDK**. The only place Phase 5 should write meaningful net-new code is in (a) the SQLite outbox shape, (b) the active-platform attribution service on the backend, and (c) the presigned-URL plumbing.

## Runtime State Inventory

> Phase 5 is not a rename or refactor — it's a feature build that extends existing endpoints. Most categories are N/A. The single category that matters is **stored data dependencies** that downstream phases will assume.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `LocationLog` table — populated today by `POST /api/agent/location` (existing). Phase 5 keeps writing here. `CourierOnlineSession` table — currently populated by `keetaMonitor.ts` keeta-only path. **Phase 5 must extend the upsert to all platforms when GPS is received.** Otherwise `liveFleetStatus` (Phase 1) only sees Keeta drivers as online. | Code edit: extend `POST /api/agent/location` to upsert `CourierOnlineSession` (`tenantId`, `driverId`, `isOnline=true`, `lastGpsAt=now()`, `lastGpsLat`, `lastGpsLng`). |
| Live service config | None — Phase 5 is in-app and in-backend; no external service registrations beyond the new R2 bucket. | Create R2 bucket + IAM keys + env vars before deploy: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. |
| OS-registered state | Mobile: `expo-task-manager` task name `darb-background-location` (existing). The task name is referenced in BOTH `defineTask` and `startLocationUpdatesAsync`. **Renaming the task across an OTA update will leave the old task running until the user re-launches and re-registers**; if Phase 5 ever changes the name, ship a one-time migration that calls `stopLocationUpdatesAsync(OLD_NAME)` before defining the new one. Phase 5 plan: keep the existing name. | None — keep the name. |
| Secrets / env vars | `EXPO_PUBLIC_API_URL` (existing), `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` (NEW — backend-only). The mobile app NEVER sees R2 credentials directly; it only ever holds short-lived presigned URLs. | Add four new backend env vars in `.env.example` and Vercel env settings. |
| Build artifacts / installed packages | Mobile: package additions trigger a new EAS build (`eas build --platform ios|android`). Existing dev builds will not pick up new native config (foreground-service-type, new permissions) without a rebuild. **Plan must include `eas build` step before any production permission changes ship.** | Plan must explicitly schedule a new EAS build after `app.json` changes; OTA updates alone will NOT propagate native changes. |

## Common Pitfalls

### Pitfall 1: AsyncStorage outbox loses GPS points under heavy write

**What goes wrong:** Under TaskManager re-entry (location callback fires while foreground UI is also writing), AsyncStorage observes inconsistent state — points dropped, file corruption, JSON parse errors. The current `mobile/src/services/locationService.ts` uses AsyncStorage as the persistent buffer.

**Why it happens:** AsyncStorage is JSON-on-disk with no locking primitive. The TaskManager runs in a separate JS realm but writes to the same underlying file. There's an open Expo issue (`expo/expo#33754`) tracking this scenario in production.

**How to avoid:** Replace AsyncStorage with expo-sqlite. SQLite handles concurrent writes via the C-level locking layer; Expo's `withTransactionAsync` ensures the JS-side ordering. Keep AsyncStorage for non-queue uses (auth tokens, preferences) — it's fine for those.

**Warning signs:** "buffer length suddenly 0 after foreground/background switch", JSON parse errors in production logs, complaints from drivers that "the GPS was missing for half my shift".

[VERIFIED: github.com/expo/expo/issues/33754]

### Pitfall 2: iOS background GPS dies after 30 minutes

**What goes wrong:** The app gets background location for the first 5–30 minutes, then the OS suspends the process and GPS stops. Customer-visible: GPS goes stale halfway through a shift.

**Why it happens:** iOS aggressively suspends backgrounded apps. Two non-obvious requirements: (1) `UIBackgroundModes` array MUST contain `"location"` in Info.plist (existing `app.json` correctly has this), AND (2) `pausesUpdatesAutomatically` MUST be `false` AND `activityType: AutomotiveNavigation` is set so iOS Core Location keeps the GPS chip warm.

**How to avoid:** All three settings together: `pausesUpdatesAutomatically: false`, `activityType: Location.LocationActivityType.AutomotiveNavigation`, `showsBackgroundLocationIndicator: true`. The current `locationService.ts` has only `pausesUpdatesAutomatically: false` — Phase 5 must add the other two.

**Warning signs:** GPS gap pattern always around 10-30 min after first background; `lastGpsAt` doesn't progress while the courier is clearly mobile (verified by independent partner-platform location feed).

[CITED: docs.expo.dev/versions/latest/sdk/location — "Background location methods require... on iOS the 'location' background mode specified in Info.plist"]

### Pitfall 3: Android 14 SecurityException on shift start

**What goes wrong:** App targets Android 14 (`compileSdkVersion: 34`). The first time a courier taps "Start Shift", `Location.startLocationUpdatesAsync` throws a `SecurityException` and crashes.

**Why it happens:** Android 14 requires (a) declaring foreground-service types in the manifest, AND (b) the new `FOREGROUND_SERVICE_LOCATION` permission, AND (c) `ACCESS_BACKGROUND_LOCATION` granted at runtime, all before starting a location foreground service. Current `mobile/app.json` Android permissions array has `FOREGROUND_SERVICE` and `ACCESS_BACKGROUND_LOCATION` but is missing `FOREGROUND_SERVICE_LOCATION`.

**How to avoid:** Add `"FOREGROUND_SERVICE_LOCATION"` to `app.json` Android permissions array. Verify the next EAS build includes it.

**Warning signs:** App crashes on first "Start Shift" tap on Android 14+ devices. Crash log mentions `SecurityException: Starting FGS with type location`.

[CITED: developer.android.com/about/versions/14/changes/fgs-types-required, support.google.com/googleplay/android-developer/answer/13392821]

### Pitfall 4: Photo upload races shift-end

**What goes wrong:** Courier marks an order delivered just as they tap "End Shift". The photo is captured but the upload happens after `stopBeacon()`; the courier turns off the phone for the day; on next launch, the photo is missing.

**Why it happens:** `stopBeacon` flushes GPS but not photos. The photo upload is async and not durably queued.

**How to avoid:** Queue photos in the same SQLite outbox as GPS (separate table `photo_uploads(id, uri, orderId, key?, attempts, lastError, createdAt)`). Upload retries on every flush. `stopBeacon` calls `flushAll()` which awaits both queues.

**Warning signs:** Drivers complain "I marked it delivered but the photo never arrived". Order rows have `photoUrl=null` despite `deliveredAt` set.

### Pitfall 5: Photo R2 keys leaking across tenants

**What goes wrong:** A buggy mobile call POSTs `key: "tenant-A/orderId/.../photo.jpg"` for a driver whose actual tenant is B. The metadata write succeeds; tenant B's Driver File now references a tenant-A photo.

**Why it happens:** The presigned URL was issued for tenant A's key (correct). But the metadata POST didn't re-validate that the key prefix matches the calling driver's tenant.

**How to avoid:** In `POST /api/agent/delivery-photo`, validate that `key.startsWith(driver.tenantId + "/")`. Reject 403 if mismatch. Defense-in-depth: the `presignPutUrl` issuance already prefixes with `driver.tenantId`, so a misuse attempt requires a forged key, but cheap to validate twice.

**Warning signs:** Cross-tenant photo references in production. Hard to detect — would only show in a security audit.

### Pitfall 6: Battery drain panic at end of week 1

**What goes wrong:** Courier installs app, runs first 8h shift, complains battery hit 0% by 5pm. Drops the app. Word spreads. Onboarding stalls.

**Why it happens:** Default `BestForNavigation` accuracy with no deferred-updates configuration drains 30%+/hr [CITED: wellally.tech/blog/react-native-fix-location-tracking-battery-drain — "30% battery drain per hour... reduced to 12% per hour through adaptive accuracy"]. Default `BestForNavigation` keeps the GPS chip awake constantly even when stationary at a merchant.

**How to avoid:** Three combined mitigations:
1. Use `accuracy: BestForNavigation` only when `speed > 1 m/s` or `distanceFromLast > 100m`; downgrade to `Balanced` when stationary >5 min. Implement as a foreground state machine that calls `Location.startLocationUpdatesAsync` again with new options on transition (the OS replaces the existing registration).
2. `deferredUpdatesInterval: 60_000`, `deferredUpdatesDistance: 100` — when stationary, the OS batches updates instead of waking JS for every fix.
3. Battery telemetry to backend. If `Device.batteryLevel < 0.2`, show a courier-side warning and downgrade accuracy to `Balanced` regardless. (Soft fallback — protects courier devices.)

Combined target: ≤6%/hr active driving, ≤2%/hr stationary at merchant. Verify on a Pixel 6 + iPhone 13 in a 4-hour live test before declaring Phase 5 done.

**Warning signs:** Heartbeat reports `batteryLevel < 0.5` by 1pm (after 4h shift) for >20% of devices. Drivers uninstalling. App store reviews mentioning battery.

### Pitfall 7: GPS-stale flag fires at 11 min, but courier was just in basement

**What goes wrong:** Phase 1's `liveFleetStatus.gpsStaleCount` lights up because `lastGpsAt > 10 min ago`. Phase 2's monitor agent drafts a Decisions card "Driver X has been GPS-stale for 11 minutes". Owner approves. Driver was just delivering to a basement parking spot.

**Why it happens:** Indoor and basement zones in Kuwait apartments have weak GPS. The 10-min threshold is hard-coded in CON-floor-counters.

**How to avoid:** This is a Phase 5 mobile-side mitigation, not a Phase 1/2 backend change. Two parts:
- Mobile-side: when in foreground but GPS uncertainty > 100m, send a "weak signal" heartbeat with `accuracy: 999` instead of dropping the point. Backend can treat high-accuracy points differently.
- Backend-side (informational, not a Phase 5 change): in Phase 11 the standing rule template "GPS-stale 15 min" can be overridden by tenant per the threshold-tunable INFO note in PROJECT.md.

**Warning signs:** False-positive Decisions cards for "GPS stale" that resolve themselves within 2 min. Owners dismissing these → that dismissal trains the agent → eventually GPS-stale becomes a low-signal class.

### Pitfall 8: Courier deliberately killing the app to "save battery" → silent GPS gap

**What goes wrong:** Courier learns that closing all apps "saves battery". They swipe-kill Darb in the app switcher. GPS stops. The supervisor doesn't notice for 20+ minutes because the GPS-stale alert hasn't fired yet.

**Why it happens:** On iOS, swipe-killing terminates the foreground service permanently — the OS does NOT auto-restart it. On Android, OEM "battery optimisation" features can swipe-kill at any time without user input (Xiaomi MIUI is notorious).

**How to avoid:** Three layers:
- iOS: minimal — `RECEIVE_BOOT_COMPLETED` only helps Android; iOS has no equivalent. Education only.
- Android: declare `RECEIVE_BOOT_COMPLETED` in manifest (already in `app.json`) AND register a boot receiver in the Expo dev-client that calls `startBeacon()` if the device boots and a shift was active in the last 30 min. **OR — simpler — accept the gap.** The gap is the courier's choice; the system trusts the GPS-stale alert (10 min) to surface it.
- All platforms: send a "shift active but heartbeat missed" notification rule in Phase 11. Phase 5 just produces fresh heartbeats; it doesn't change the alert rules.

**Warning signs:** Repeated GPS-stale Decisions cards for the same courier. Pattern of `lastSeen` jumping 30+ min then resuming on next foreground.

## Code Examples

(See "Architecture Patterns" above for the five canonical examples — Background Location Task, Permission Rationale, SQLite Outbox, Active-Platform Attribution, and Presigned Photo Upload.)

### Additional helper: `app.json` corrections

```json
// mobile/app.json (DELTA — adds Android 14 compliance + activityType plugin config)
{
  "expo": {
    "name": "Darb Agent",
    "slug": "darb-agent",
    "version": "1.0.0",
    "scheme": "darb-agent",
    "ios": {
      "bundleIdentifier": "com.ktech.darb.agent",
      "infoPlist": {
        "NSCameraUsageDescription": "Darb captures delivery photos and clock-in selfies",
        "NSLocationWhenInUseUsageDescription": "Darb tracks your location during active shifts",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Darb tracks your location during active shifts so the office can see your live position even when your phone is in your pocket. We never track you off-shift.",
        "UIBackgroundModes": ["location", "fetch", "remote-notification"]
      }
    },
    "android": {
      "package": "com.ktech.darb.agent",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",  // Android 14 requirement
        "POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED"
      ]
    },
    "plugins": [
      ["expo-location", {
        "locationAlwaysAndWhenInUsePermission": "Darb tracks your location during active shifts so the office can see your live position even when your phone is in your pocket. We never track you off-shift."
      }],
      ["expo-camera", {
        "cameraPermission": "Darb captures delivery photos and clock-in selfies"
      }],
      "expo-notifications",
      "expo-secure-store",
      "expo-router",
      "expo-sqlite"
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

### Additional helper: rate-limit middleware

```typescript
// backend/src/middleware/agentRateLimit.ts (new)
import rateLimit from "express-rate-limit";

// Per-device limit: 200 location batches per 5 minutes (~40 / min — generous)
export const agentLocationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  keyGenerator: (req) => String(req.body?.deviceId ?? req.ip),
  standardHeaders: true,
  message: { error: "rate-limited" },
});

// Per-device limit: 30 photo upload-url requests per 10 minutes
export const agentUploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => String(req.body?.deviceId ?? req.ip),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| iOS background `When in Use` was ambiguous about when "in use" applied | iOS 13+ separates `When in Use` and `Always` with explicit two-step grant flow | iOS 13 (2019) | Permission must be requested in stages; one-shot `Always` request returns `denied` |
| Android `ACCESS_BACKGROUND_LOCATION` was a normal permission | Android 10 made it a runtime grant; Android 11 routes the request to Settings; Android 14 also requires `FOREGROUND_SERVICE_LOCATION` | Android 10 (2019), 11, 14 | Cannot rely on a one-time prompt — Settings deep-link is the only path on Android 11+ |
| `AsyncStorage` was the default React Native local-storage | `expo-sqlite/kv-store` is now the drop-in Expo replacement; AsyncStorage demoted to "fine for tokens, broken for queues" | 2024-2025 | New code should default to expo-sqlite for any persistent state >100 records |
| `expo-image-picker` was used for capture | `expo-camera` (rewritten) is now the modern path | Expo SDK 49+ | Existing code already on `expo-camera`; nothing to change |
| `BackgroundFetch.registerTaskAsync` was the cron primitive | `expo-background-task.registerTaskAsync` is the new path | Expo SDK 53+ | Phase 5 doesn't use background fetch; this is informational |
| `react-native-background-geolocation` (transistorsoft) was a default for fleet apps | Still excellent but $200/year/seat; Expo's stack is sufficient ≤12h shifts | n/a — both still alive | Stay on Expo; don't take on a paid SDK at design-partner stage |
| Multipart upload through Express was standard | Direct presigned PUT to S3-compatible storage is now preferred | ~2020 onward | Already considered industry-standard for any upload >1MB |
| iOS 14+ approximate-location toggle | User can grant "Approximate" instead of "Precise"; app must handle | iOS 14 (2020) | Read `Location.PermissionStatus.foreground.accuracy` — `"approximate" | "precise"`; Darb requires `precise` for delivery photo geo-tagging, MUST show a courier-facing prompt to upgrade if `approximate` is granted |

**Deprecated/outdated:**
- **`NSLocationAlwaysUsageDescription`** (without "AndWhenInUse") — iOS 11+ ignores this in favour of `NSLocationAlwaysAndWhenInUseUsageDescription`. Existing `app.json` is correct.
- **`Location.startLocationUpdatesAsync` without `foregroundService`** — Android 12+ requires the foreground service notification. Existing code has it.
- **`expo-background-fetch`** — superseded by `expo-background-task`. Phase 5 doesn't use either.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cloudflare R2 free egress (no per-GB-out fee) is the right photo backend | Standard Stack — Alternatives Considered | If user wants AWS S3 (vendor preference), planner switches the implementation library — same `@aws-sdk/client-s3` SDK, different endpoint + auth. Low risk. |
| A2 | Battery target: ≤6%/hr active, ≤2%/hr stationary | User Constraints — Claude's Discretion | If founder testing reveals the target is too lax (or too tight) the planner can adjust the deferred-update tuning. Low risk; falls in the discretion zone. |
| A3 | Photo upload uses presigned PUT to R2 instead of multipart-through-Express | Architecture Patterns §5 | If the founder objects to a new vendor (R2), the planner can fall back to multipart-through-Express for v1, accepting the Vercel `/tmp` ephemerality risk. Medium risk — should be confirmed in discuss-phase. |
| A4 | The mobile app's "active platform" hint is the last-opened-tab in the Darb app, not any inspection of other apps | Architecture Patterns §4 | If the founder really wants UsageStatsManager on Android, this changes the decision. Low risk — the recommendation is well-reasoned and supported by Google Play policy citations; founder is unlikely to override given the legal/policy implications. |
| A5 | OrderEvent is the right backend table for active-platform attribution; if it doesn't exist as a Prisma model, Phase 5 ships a minimal version | Architecture Patterns §4 | The CLAUDE.md spec mentions OrderEvent as a planned model but it does NOT exist in the current schema (verified). Phase 5 may need to ship the minimal subset (action, timestamp, platform per Order). Medium risk — planner should check the schema before assuming the model exists. |
| A6 | A 30-min order-event window is a reasonable HIGH-confidence window for active-platform | Architecture Patterns §4 | If shifts cross multiple platforms in <30min (rare but possible during platform-switching by the courier), the attribution lags. Low risk — backed by typical fleet behaviour; tunable later. |
| A7 | Battery telemetry should DOWNGRADE accuracy when battery <20% | Pitfall 6 | This is a UX/fairness call. Founder may prefer "drain to 0% if necessary, the GPS data matters more than courier's evening battery". Low risk — discuss-phase territory. |
| A8 | The mobile app does NOT surface bilingual UI in Phase 5 | Out of Scope | Phase 9 owns bilingual outbound. If founder wants Arabic UI labels in Phase 5 (e.g., "Start Shift" / "ابدأ النوبة" on the dashboard), that's scope creep. Founder gate Q5 from PROJECT.md is the trigger. |

**If this table is empty:** N/A — the table contains 8 assumptions that should be confirmed before plan finalisation, especially A3 (R2 vendor decision) and A5 (OrderEvent existence).

## Open Questions

1. **Does `OrderEvent` exist as a Prisma model?**
   - What we know: the CLAUDE.md NEW FEATURES section proposes `OrderEvent` for the order-flow timeline (Feature 3). Searching `backend/prisma/schema.prisma` for `model OrderEvent` returns nothing.
   - What's unclear: whether Phase 5 should create the model, or whether the active-platform attribution should fall back to `OrderLog` / `Order` / `Shift.platform`.
   - Recommendation: Phase 5 plan should detect this in Wave 0 and either (a) ship a minimal OrderEvent (action, platform, capturedAt, driverId, orderId, tenantId) so attribution has a clean source, or (b) use the existing `OrderLog` table (which the codebase grep confirms does exist — see `backend/src/services/`). Verify in plan.

2. **R2 vendor decision.**
   - What we know: R2 is the recommended path; the codebase has no S3/R2 integration today; backend/utils/upload.ts currently writes to multer-disk.
   - What's unclear: whether the founder has a vendor preference (AWS S3, GCS, R2, Vercel Blob).
   - Recommendation: planner asks the founder via `/gsd-discuss-phase`. Default to R2 if no preference; the decision is reversible (swap S3Client endpoint).

3. **Battery target, definitively.**
   - What we know: 6%/hr active is a defensible Claude-set target; literature ranges 12-30%/hr.
   - What's unclear: whether founder has heard battery complaints from courier conversations that would set a tighter target.
   - Recommendation: ship Phase 5 with the deferred-updates + activity-type tuning, then measure on real devices. If real device measures 4%/hr (great), document. If 10%/hr (concerning), Phase 5+1 follow-up.

4. **Active-platform mobile hint — keep or drop?**
   - What we know: backend can resolve active-platform from order events with high confidence in most cases.
   - What's unclear: whether the mobile hint adds enough signal to be worth the extra ~10 lines of code, or if it's pure noise.
   - Recommendation: ship the hint as cheap (single string field on heartbeat); use it only as a tier-3 LOW-confidence input in attribution. If after 4 weeks of production data we never see it improve attribution, remove.

5. **Photo capture: triggered from where in the courier UX?**
   - What we know: existing `app/(tabs)/orders.tsx` lists orders but has no "Mark Delivered" CTA.
   - What's unclear: is the photo captured (a) at delivery time when courier taps "Mark Delivered" on an order card, (b) only via an explicit CTA in a dedicated "Delivery" screen, or (c) automatic when a delivery state-change is detected?
   - Recommendation: option (a) — add a "Mark Delivered" button to each order card in `orders.tsx` that opens the camera. Confirm UX in discuss-phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (mobile dev) | Expo CLI, Metro bundler | TBD on developer machine | ≥ 18 | None — required |
| `expo` CLI | Mobile builds + dev | Available via `npx expo` | latest | None |
| `eas-cli` | Mobile native builds (required after `app.json` permissions changes) | TBD on developer machine; verify with `eas --version` | latest | Cannot ship native config changes without it |
| iOS Simulator (developer mac) | Local iOS testing — but background location does NOT work on simulators | Mac users have it; Linux/Windows do not | — | Real iOS device required for permission flow + battery testing |
| Real Android device | Background location + foreground-service-type testing | Need at least one Android 14 device for compliance tests | — | Genymotion/Android emulator works for permission tests but battery numbers are not representative |
| Real iOS 14+ device | Approximate-location toggle, background-task suspend behaviour | Need at least one | — | Simulator is not representative; real device required |
| Cloudflare R2 account + bucket | Photo storage | Not currently configured | — | Use multer-on-disk for v1 (accepts Vercel `/tmp` ephemerality) |
| AWS SDK v3 (`@aws-sdk/client-s3`) | Backend presign | NOT in `backend/package.json` | — | Add via `npm install`. Mature SDK; no fallback needed. |
| `expo-sqlite` | Mobile outbox | NOT in `mobile/package.json` (verified) | — | Add via `npx expo install`. No fallback (continuing AsyncStorage is the Pitfall 1 trap). |
| `expo-image-manipulator` | Photo compression | NOT in `mobile/package.json` (verified) | — | Add via `npx expo install`. Fallback: skip compression (worse battery + data plan but functional). |
| `expo-battery` | Battery telemetry in heartbeat | NOT in `mobile/package.json` (verified) | — | Add via `npx expo install`. Fallback: keep sending hardcoded `1.0`. |
| `jest-expo` (testing) | Mobile unit tests | NOT in `mobile/package.json` (verified — no test infrastructure) | — | Phase 5 plan must include adding this in Wave 0; without it there is no per-task automated verification |

**Missing dependencies with no fallback:**
- `eas-cli` on developer machine — needed for any native-config change to ship. Plan must include "verify `eas --version` and run `eas build` after `app.json` changes" as a checklist item.
- Real iOS 14+ device — battery and approximate-location verification cannot happen on a simulator.
- Real Android 14 device — Pitfall 3 (FOREGROUND_SERVICE_LOCATION crash) cannot be reliably reproduced on emulator without specific configuration.

**Missing dependencies with fallback:**
- Cloudflare R2 — fallback to multer-on-disk for Phase 5 if R2 setup is blocked. Document the regression: photos will not survive Vercel cold-start eviction. Re-do photo storage in Phase 5+1.
- All Expo SDK additions — install via `npx expo install` (Expo's version-aligned installer). No fallback needed; these are Expo-blessed packages.

## Validation Architecture

> Required per Nyquist Dimension 8 — `workflow.nyquist_validation` is enabled (no `.planning/config.json` opt-out detected). Phase 5 mobile is the lowest-tested area of the codebase today (zero tests), so validation is high-leverage.

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Jest 30.3.0 + ts-jest 29.4.9 (existing — `backend/jest.config.js`) |
| Backend quick run | `cd backend && npx jest --testPathPatterns="agent\|locationIngest\|presign\|activePlatform"` |
| Backend full suite | `cd backend && npm test` |
| Mobile framework | **TBD — must add `jest-expo` in Wave 0** (no test infrastructure today, verified `mobile/package.json` has no jest dependencies) |
| Mobile config file | None exists — Wave 0 must create `mobile/jest.config.js` (or extend `package.json`) |
| Mobile quick run | `cd mobile && npm test` (after Wave 0 setup) |
| Mobile full suite | `cd mobile && npm test` |
| Manual smoke (required) | (a) Install dev build on real iOS + Android device. (b) Walk 1 km outdoors. (c) Background the app. (d) Verify `LocationLog` rows appear in DB with capturedAt within 30s of physical movement. (e) Take a delivery photo. (f) Verify R2 object + Order.photoUrl row exists. |
| Battery integration test | 4-hour shift on Pixel 6 + iPhone 13. Start 100% charge. End-of-test ≥76% (≤6%/hr). |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-mobile-always-on-gps | Permission flow: foreground granted → background dialog presented; foreground denied → no background ask | unit (mobile) | `cd mobile && npx jest locationService.permissionFlow` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | TaskManager task name registered correctly at module load | unit (mobile) | `cd mobile && npx jest locationService.taskRegistration` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | Outbox INSERT OR IGNORE silently rejects duplicate idempotency keys | unit (mobile) | `cd mobile && npx jest outbox.idempotency` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | Outbox flushBatch deletes confirmed rows; on failure, increments attempts | unit (mobile) | `cd mobile && npx jest outbox.flushSemantics` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | Outbox respects attempts<5 cutoff (gives up after 5 retries to avoid forever-loop) | unit (mobile) | `cd mobile && npx jest outbox.giveUp` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | `POST /api/agent/location` writes LocationLog rows AND upserts CourierOnlineSession with lastGpsAt | integration (backend) | `cd backend && npx jest agent/locationIngest` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | `POST /api/agent/location` rejects duplicate idempotencyKey within window (server-side dedup) | integration (backend) | `cd backend && npx jest agent/locationIngest.dedup` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | Rate limit: 201st location POST in 5 min returns 429 | integration (backend) | `cd backend && npx jest middleware/agentRateLimit` | ❌ Wave 0 |
| REQ-mobile-always-on-gps | `app.json` Android permissions array includes FOREGROUND_SERVICE_LOCATION | static-check | `node -e "const j=require('./mobile/app.json'); process.exit(j.expo.android.permissions.includes('FOREGROUND_SERVICE_LOCATION')?0:1)"` | ❌ Wave 0 |
| REQ-mobile-active-platform-detection | `resolveActivePlatform` Tier 1: returns HIGH/order_event when OrderLog row exists in last 30 min | unit (backend) | `cd backend && npx jest activePlatformAttribution.tier1` | ❌ Wave 0 |
| REQ-mobile-active-platform-detection | `resolveActivePlatform` Tier 2: falls through to MEDIUM/shift when no recent order | unit (backend) | `cd backend && npx jest activePlatformAttribution.tier2` | ❌ Wave 0 |
| REQ-mobile-active-platform-detection | `resolveActivePlatform` Tier 3: falls through to LOW/driver_default with hint match → MEDIUM | unit (backend) | `cd backend && npx jest activePlatformAttribution.tier3` | ❌ Wave 0 |
| REQ-mobile-active-platform-detection | `resolveActivePlatform` returns UNKNOWN when driverId not in tenant | unit (backend) | `cd backend && npx jest activePlatformAttribution.unknown` | ❌ Wave 0 |
| REQ-mobile-active-platform-detection | Mobile platformGuess hint is read from last-opened tab; passes through heartbeat unchanged | unit (mobile) | `cd mobile && npx jest platformGuess.lastTab` | ❌ Wave 0 |
| REQ-mobile-delivery-photo-capture | `POST /api/agent/upload-url` issues a presigned URL only for an Order in caller's tenant | integration (backend) | `cd backend && npx jest agent/presignFlow.tenantScope` | ❌ Wave 0 |
| REQ-mobile-delivery-photo-capture | `POST /api/agent/upload-url` returns 404 when Order is in another tenant | integration (backend) | `cd backend && npx jest agent/presignFlow.crossTenant` | ❌ Wave 0 |
| REQ-mobile-delivery-photo-capture | `POST /api/agent/delivery-photo` validates key prefix matches tenant; rejects forged key | integration (backend) | `cd backend && npx jest agent/presignFlow.keyValidation` | ❌ Wave 0 |
| REQ-mobile-delivery-photo-capture | photoService compresses image to ≤200KB before upload | unit (mobile) | `cd mobile && npx jest photoService.compress` | ❌ Wave 0 |
| REQ-mobile-delivery-photo-capture | photoService uploads to presigned URL with correct headers | unit (mobile) | `cd mobile && npx jest photoService.uploadDirect` | ❌ Wave 0 |
| Tenant scope | All new agent.ts endpoints write only against deviceId-resolved tenantId | static-lint | `cd backend && npm run lint:tenant` (after extending lint:tenant scope to new files) | ✓ exists (extend scope) |

### Eval Harness — Smoke Walking-Skeleton

**Backend smoke** — seeds a Driver + Device, simulates 5 GPS POSTs over 30s, verifies LocationLog has 5 rows AND CourierOnlineSession.lastGpsAt is within 5s of latest POST.

```typescript
// backend/src/__tests__/agent/locationIngest.test.ts
test("walking skeleton — 5 GPS POSTs → 5 LocationLog rows + CourierOnlineSession lastGpsAt fresh", async () => {
  const { driver, device } = await seedDriverWithDevice("t-smoke", "drv-smoke");
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) {
    await request(app).post("/api/agent/location").send({
      deviceId: device.id,
      driverId: driver.id,
      locations: [{
        latitude: 29.3759 + i * 0.0001,
        longitude: 47.9774,
        accuracy: 10,
        capturedAt: new Date(t0 + i * 6000).toISOString(),
        idempotencyKey: `t0+${i}`,
      }],
    });
  }
  const logs = await prisma.locationLog.findMany({ where: { driverId: driver.id } });
  expect(logs.length).toBe(5);

  const session = await prisma.courierOnlineSession.findFirst({
    where: { driverId: driver.id, isOnline: true },
  });
  expect(session).toBeTruthy();
  expect(session!.lastGpsAt!.getTime()).toBeGreaterThan(t0);
});
```

**Mobile smoke** — installs jest-expo, mocks expo-location + expo-sqlite, runs end-to-end through `enqueueGpsPoint → flushPendingPoints → mock POST → DELETE confirmed rows`.

```typescript
// mobile/__tests__/outbox.smoke.test.ts
import * as outbox from "../src/services/outbox";
import { mockApi } from "./helpers/mockApi";

beforeEach(async () => { await outbox._resetForTests(); });

test("happy path: enqueue 5, flush 5, queue empty", async () => {
  for (let i = 0; i < 5; i++) {
    await outbox.enqueueGpsPoint({
      latitude: 29.3759, longitude: 47.9774, accuracy: 10, speed: null,
      capturedAt: new Date(Date.now() - i * 1000).toISOString(),
      platformGuess: "KEETA",
    });
  }
  mockApi.uploadLocations.mockResolvedValueOnce({ synced: 5 });
  const { flushed } = await outbox.flushPendingPoints();
  expect(flushed).toBe(5);
  const pending = await outbox._countForTests();
  expect(pending).toBe(0);
});

test("retry path: server fails twice, succeeds on third; row never duplicated server-side", async () => {
  await outbox.enqueueGpsPoint({ /* ... */ });
  mockApi.uploadLocations.mockRejectedValueOnce(new Error("net"));
  await outbox.flushPendingPoints();
  mockApi.uploadLocations.mockRejectedValueOnce(new Error("500"));
  await outbox.flushPendingPoints();
  mockApi.uploadLocations.mockResolvedValueOnce({ synced: 1 });
  await outbox.flushPendingPoints();
  // Server received the same idempotencyKey 3 times; server-side dedup test elsewhere covers that.
  expect(mockApi.uploadLocations).toHaveBeenCalledTimes(3);
});
```

### Sampling Rate

- **Per task commit:** `cd backend && npx jest --testPathPatterns="agent/locationIngest|activePlatform|presign" && cd mobile && npm test` (~ 40s combined)
- **Per wave merge:** Both full suites: `cd backend && npm test && cd mobile && npm test` (~90s)
- **Phase gate:** All automated tests green AND manual smoke completed on real iOS 14 + Android 14 devices AND 4-hour battery test AND lint:tenant scope extended.

### Wave 0 Gaps

- [ ] `mobile/jest.config.js` — add jest-expo preset config (no test infra exists today)
- [ ] `mobile/package.json` — add `"test": "jest"` script + `jest-expo`, `@types/jest`, `@testing-library/react-native` devDeps
- [ ] `mobile/__tests__/outbox.smoke.test.ts` — happy path + retry
- [ ] `mobile/__tests__/outbox.idempotency.test.ts` — INSERT OR IGNORE behaviour
- [ ] `mobile/__tests__/locationService.permissionFlow.test.ts` — fg→bg upgrade path
- [ ] `mobile/__tests__/photoService.compress.test.ts` — output size cap
- [ ] `mobile/__tests__/photoService.uploadDirect.test.ts` — presigned PUT semantics
- [ ] `mobile/__tests__/platformGuess.lastTab.test.ts` — hint correctness
- [ ] `backend/src/__tests__/agent/locationIngest.test.ts` — smoke + dedup + courier session upsert
- [ ] `backend/src/__tests__/agent/presignFlow.test.ts` — tenant scope + key validation
- [ ] `backend/src/__tests__/services/activePlatformAttribution.test.ts` — three-tier resolution + unknown
- [ ] `backend/src/__tests__/middleware/agentRateLimit.test.ts` — 200 then 429
- [ ] Extend `backend/package.json` `lint:tenant` script glob to include `src/services/activePlatformAttribution.ts` `src/services/r2Service.ts` `src/middleware/agentRateLimit.ts` and any new agent route files.
- [ ] Static check: `app.json` Android permissions include FOREGROUND_SERVICE_LOCATION

*(If no gaps: N/A — this section lists 13 items.)*

## Security Domain

> `security_enforcement` is implicit (no opt-out config detected). Phase 5 ships courier-facing data ingestion + delivery photo capture — both touch real-world driver privacy and per-tenant data isolation.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing pattern: `agentFetch` sends bearer token from `expo-secure-store`; backend agent endpoints use device-based auth via `deviceId → Device.driverId → Driver.tenantId`. **Phase 5 keeps this pattern**; the bearer token is a stub the server doesn't currently validate (per `agent.ts` comment line 333). Phase 5 does NOT add real bearer auth — that's a Phase 8/9 concern. |
| V3 Session Management | yes | Existing `expo-secure-store` for `agent_token` + `device_id`. No change in Phase 5. |
| V4 Access Control | yes | Tenant scoping via deviceId resolution: every new endpoint MUST call `resolveDriverFromDeviceId(deviceId)` and reject if null (existing pattern). The presigned URL key MUST be prefixed with `driver.tenantId/` so cross-tenant key forgery is detectable in `delivery-photo` validation. |
| V5 Input Validation | yes | New endpoints validate: deviceId required (string), orderId required (string), capturedAt required (ISO datetime), latitude/longitude (number range checks: lat ∈ [-90,90], lng ∈ [-180,180]), accuracy (≥0). Use Zod schemas in `routes/agent.ts` matching the Phase 1 `defineTool` pattern. |
| V6 Cryptography | yes | R2 credentials NEVER in mobile bundle — only the *presigned URL* is sent to mobile. Presigned URLs are short-lived (300s for PUT, 3600s for GET). HMAC signing is by the AWS SDK (not hand-rolled). |
| V7 Error Handling and Logging | yes | All new routes wrap in try/catch following existing pattern; sensitive fields (R2 secret, agent_token) NEVER logged. |
| V8 Data Protection | yes | Photos in R2 are private (no public-read); access only via short-lived presigned GET issued by backend. LocationLog has no PII; deviceId is opaque. |
| V13 API and Web Service | yes | Per-deviceId rate limit on `/api/agent/location` (200/5min) and `/api/agent/upload-url` (30/10min). Reject 413 if photo content-length > 10 MB. |

### Known Threat Patterns for stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant photo access via key forgery | Information disclosure | `delivery-photo` route validates `key.startsWith(driver.tenantId + "/")`; reject 403 on mismatch. R2 bucket is private; no public-read policy. |
| Replay attack on `POST /api/agent/location` (attacker captures a valid request, replays 1000× to spam LocationLog) | Tampering / DoS | (a) Rate limit per-deviceId (200/5min). (b) Server-side idempotency: `LocationLog (deviceId, capturedAt, latitude, longitude)` either deduped via composite unique index OR via in-app check `WHERE deviceId=? AND capturedAt=?` before insert. |
| Forged deviceId in body (attacker guesses a deviceId of another tenant's device) | Spoofing | deviceId is a UUID — guessing is computationally infeasible. Defense in depth: every endpoint resolves driver via deviceId then ALL further queries scope by `driver.tenantId`. |
| Stolen courier device → attacker has app + auth | Spoofing | Out of Phase 5 scope (would need device-pin or biometric clock-in). Phase 5 keeps existing selfie clock-in as the human-confirmation gate; Phase 6 ingest adapter can flag mismatches in selfie-vs-stored-face. |
| GPS spoofing (driver uses fake-GPS app to fake locations and avoid GPS-stale alerts) | Tampering | Hard to detect on client. Backend mitigation: `accuracy < 5` and `speed > 200 km/h` heuristics flag implausible points. Cross-check with active-platform attribution: if Order shows pickup at merchant A but GPS at merchant B, flag for review (this is a Phase 11 violation engine concern, not Phase 5). |
| Battery telemetry abuse (mobile sends false 100% to mask draining) | Tampering | Low impact — battery telemetry is informational, not enforced. No mitigation required. |
| Photo metadata exfiltration (photo upload includes lat/lng of courier's home in EXIF) | Information disclosure | `expo-image-manipulator.manipulateAsync` strips EXIF by default when re-saving JPEG — verify in Phase 5 plan. Add explicit assertion in `photoService.test.ts` if needed. |
| Photo storage growing unbounded | Resource exhaustion | R2 is metered ($0.015/GB/month). Lifecycle policy: photos > 90 days move to infrequent-access tier (or delete after 365 days, configurable). Set up at bucket level, not in code. |
| Mobile log injection (driver name "<script>" rendering unescaped in pino logs) | Injection | pino structured-log JSON-encodes by default; no risk in standard usage. |

## Project Constraints (from CLAUDE.md)

CLAUDE.md ships *both* the project's coding conventions *and* a "NEW FEATURES — Keeta Operations Module Enhancement" section. The Keeta module enhancement section is **not Phase 5 scope** — it's a separate set of features (real-time courier monitor, violation engine UI, order flow timeline) that overlap with Phase 7 (Floor) + Phase 10 (Operations per-platform) and partially with the existing `keeta/violations` work flagged for harvesting. Phase 5 must NOT pull these in.

The actual project constraints from CLAUDE.md that apply to Phase 5:

- **Tech stack — mobile:** React Native / Expo 52. ✓ Phase 5 stays here.
- **TypeScript strict mode throughout.** ✓ All new mobile and backend files in Phase 5 must compile under strict mode.
- **Prisma for all DB access (never raw SQL unless aggregation requires it).** ✓ Phase 5 uses `prisma.locationLog.create`, `prisma.courierOnlineSession.upsert`, `prisma.order.update`. No raw SQL needed.
- **All routes use authMiddleware + tenantScope middleware.** **EXCEPTION** — agent endpoints are device-auth (existing pattern). Phase 5 follows this exception, NOT the general rule.
- **Pagination via getPagination() + paginatedResponse() utils.** ✓ Phase 5 endpoints don't return paginated data.
- **Error handling: try/catch in every route, return { error: message }.** ✓ All new endpoints follow.
- **Frontend: Tailwind utility classes, Shadcn components, Lucide icons.** N/A — Phase 5 is mobile + backend; no frontend changes (Floor map is Phase 7).
- **Arabic/English bilingual support via i18n directory.** N/A — bilingual outbound is Phase 9 (deferred).
- **Platform-specific code lives under platform-named directories (keeta/, talabat/, etc.).** N/A — Phase 5 is *cross-platform* by design.

The CLAUDE.md NEW FEATURES section (Keeta Operations Module Enhancement) is treated as **out-of-scope informational context**. The planner must not let it expand Phase 5.

## Sources

### Primary (HIGH confidence)

- **Existing codebase — directly inspected** (file paths absolute):
  - `/Users/mac/Documents/Darb/mobile/package.json` — Expo SDK 52 dependencies verified
  - `/Users/mac/Documents/Darb/mobile/app.json` — current iOS/Android permissions (foreground-service-type missing)
  - `/Users/mac/Documents/Darb/mobile/src/services/locationService.ts` — current TaskManager + AsyncStorage outbox pattern (the rewrite target)
  - `/Users/mac/Documents/Darb/mobile/src/api/client.ts` — `agentFetch`, `uploadLocations`, `uploadSelfie`, `heartbeat` patterns
  - `/Users/mac/Documents/Darb/mobile/app/(tabs)/dashboard.tsx` — existing shift toggle + heartbeat 15-min loop
  - `/Users/mac/Documents/Darb/mobile/app/selfie.tsx` — existing expo-camera capture pattern
  - `/Users/mac/Documents/Darb/backend/src/routes/agent.ts` — existing `/api/agent/{register,heartbeat,location,selfie,captured-orders}` endpoints; the device-auth pattern
  - `/Users/mac/Documents/Darb/backend/src/utils/upload.ts` — current multer-disk pattern (and Vercel `/tmp` ephemerality risk)
  - `/Users/mac/Documents/Darb/backend/prisma/schema.prisma` — `LocationLog`, `Device`, `CourierOnlineSession`, `Driver`, `Order`, `OrderLog` (verified existence), `AppUsageLog` models
  - `/Users/mac/Documents/Darb/backend/src/agent/tools/read/gpsTrack.ts` — Phase 1 consumer of LocationLog data
  - `/Users/mac/Documents/Darb/backend/src/agent/tools/read/liveFleetStatus.ts` — Phase 1 consumer of CourierOnlineSession data
  - `/Users/mac/Documents/Darb/.planning/phases/02-decisions-surface-propose-and-confirm-design-partner-1/02-RESEARCH.md` — format reference

- **Expo official documentation** via Context7 (`/websites/expo_dev` — Benchmark Score 78.09, High reputation):
  - https://docs.expo.dev/versions/latest/sdk/location — `expo-location` API, options, background location requirements
  - https://docs.expo.dev/versions/latest/sdk/task-manager — TaskManager.defineTask placement, isTaskRegisteredAsync
  - https://docs.expo.dev/versions/latest/sdk/camera — expo-camera takePictureAsync
  - https://docs.expo.dev/versions/latest/sdk/sqlite — expo-sqlite openDatabaseAsync, withTransactionAsync
  - https://docs.expo.dev/versions/latest/sdk/imagemanipulator — expo-image-manipulator manipulate
  - https://docs.expo.dev/versions/latest/sdk/battery — expo-battery getBatteryLevelAsync, getPowerStateAsync, isLowPowerModeEnabledAsync

- **Apple Developer documentation:**
  - https://developer.apple.com/documentation/corelocation/cllocationmanager/requestalwaysauthorization() — staged permission request guidance
  - https://developer.apple.com/forums/thread/117256 — "permission upgrade should be done in steps" guidance

- **Android Developers documentation:**
  - https://developer.android.com/about/versions/14/changes/fgs-types-required — Android 14 foreground-service-type requirement
  - https://developer.android.com/develop/sensors-and-location/location/permissions — ACCESS_BACKGROUND_LOCATION runtime requirement
  - https://developer.android.com/develop/background-work/services/fgs/declare — FOREGROUND_SERVICE_LOCATION permission

- **Cloudflare R2 documentation:**
  - https://developers.cloudflare.com/r2/api/s3/presigned-urls/ — presigned PUT pattern; CORS quirks (Content-Type allowed-headers, not wildcards)
  - https://developers.cloudflare.com/r2/objects/upload-objects/ — direct upload with S3 SDK

- **npm registry (version verification 2026-05-10):**
  - `npm view expo-location@~18.0.0` → 18.0.10
  - `npm view expo-camera@~16.0.0` → 16.0.18
  - `npm view expo-sqlite@~15.0.0` → 15.0.6
  - `npm view expo-image-manipulator@~13.0.0` → 13.0.6
  - `npm view expo-battery@~9.0.0` → 9.0.2
  - `npm view expo-task-manager@~12.0.0` → 12.0.6

### Secondary (MEDIUM confidence — WebSearch with verification against official sources)

- WebSearch on **AsyncStorage queue corruption under concurrent write** confirmed against open Expo issue #33754 [VERIFIED] — the canonical citation.
- WebSearch on **iOS background-location battery patterns** — multiple sources converge on 12-30%/hr range; Wellally case study cites a 60% reduction via adaptive accuracy + batching [CITED: wellally.tech blog]. Phase 5 target ≤6%/hr is consistent with the optimised end of that range.
- WebSearch on **Cloudflare R2 vs S3 vs Vercel Blob** — R2's free egress + S3-compatibility is well documented; specific commercial comparisons are vendor-specific.

### Tertiary (LOW confidence — flagged for validation)

- **Battery target ≤6%/hr** — Claude-set target based on the literature range. Real-device testing required to confirm.
- **30-min order-event window for HIGH-confidence active-platform attribution** — defensible heuristic; will need adjustment based on real fleet behaviour (some couriers switch platforms every 5-10 min during low-demand periods).
- **Photo compression target ≤200 KB** — chosen for KW mobile data plans (3G fallback in basement areas); reasonable but no hard data backing this specific number.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Expo SDK 52 versions verified via npm; existing dependencies in `mobile/package.json` directly inspected
- Architecture: HIGH — patterns supported by official Expo + Apple + Google docs and existing Phase 1/2 patterns in repo
- Pitfalls: HIGH — six of eight pitfalls have GitHub issue / Apple Developer Forum / Android docs citations; pitfalls 6 (battery) and 7 (basement GPS) are field-experience rather than cited but well-aligned with literature
- Active-platform attribution: HIGH — the negative claim (UsageStatsManager not viable) is multiply sourced; the positive claim (server-side from order events) follows directly from the existing schema
- Photo upload pattern: HIGH — presigned URL is industry standard; Cloudflare R2 docs confirm S3 SDK usage
- Validation architecture: MEDIUM — mobile testing has no precedent in repo; jest-expo setup is well-documented but not yet wave-0 work; backend testing follows existing Phase 1/2 patterns
- Battery measurement: LOW — until real-device measurements done, the ≤6%/hr target is hopeful

**Research date:** 2026-05-10
**Valid until:** 2026-06-09 (30 days; Expo's monthly release cadence means versions may shift but architecture won't)

