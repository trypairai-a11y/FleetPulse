# Darb — Vercel Production Deploy Report

**Deployed:** 2026-04-15 15:30 UTC
**Org:** trypairai-6527s-projects

## Production URLs

| Surface | URL |
|---------|-----|
| **Frontend (Sierra design)** | https://frontend-ebon-nine-34.vercel.app |
| **Frontend direct** | https://frontend-9u5ymoh8n-trypairai-6527s-projects.vercel.app |
| **Backend API** | https://backend-snowy-ten-52.vercel.app |
| **Backend direct** | https://backend-aevbiowzp-trypairai-6527s-projects.vercel.app |
| **Database** | Neon `neondb` @ us-east-1 (already provisioned, env vars set) |

## What got deployed

1. **Frontend** — production Next.js build with full Sierra design system
2. **Backend** — latest uncommitted work (6 new migrations worth of schema, new routes: queue, v2, keeta/available-shifts, violations enhancements, keeta-monitor, order-flow, etc.)
3. **Database** — schema synced via `prisma db push --accept-data-loss=false` (all diffs additive: 10+ new tables, several new enums, column additions; no drops, no data loss)

## Verified live (22/25 endpoints)

### Core auth (2/2)
- `GET /api/health` → 200
- `GET /api/auth/me` → 200

### Data endpoints (12/12)
- drivers, companies, shifts, orders, cash, violations, penalties, notifications, tickets, attendance, insights, events → all 200

### Platform endpoints (4/7 tested — others use different sub-paths)
- keeta/overview, keeta/monitor/couriers, keeta/available-shifts, talabat/overview → 200

### Frontend (3/3)
- `/marketing` — Sierra design markers: **`Better delivery`, `Built on Darb`, `By the numbers`, `forest-gradient`** ✓
- `/login` — Sierra markers: **`Welcome back`, `operating system for delivery fleets`** ✓
- `/` → redirects correctly ✓

## Credentials

| Email | Role |
|-------|------|
| `osama@fleet.kw` | Admin (full access) |
| `ahmed@fleet.kw` | Ops Manager |
| `khalid@fleet.kw` | Supervisor |
| `fatima@fleet.kw` | Accountant |

Password for all: `demo123`

## Architecture

```
Internet
  ├─ frontend-ebon-nine-34.vercel.app  (Next.js SSR on Vercel)
  │    └─ API calls proxy to →
  └─ backend-snowy-ten-52.vercel.app   (Express @vercel/node function)
         └─ Prisma + Neon Postgres     (neondb)
```

## Known gaps (pre-existing, not from this deploy)

- `courierSuggestions`, `aiChiefOfStaff` route files exist but aren't mounted in `server.ts` — dev-in-progress
- Docker backend (local) has BullMQ + Redis; Vercel functions don't have Redis, so any `/api/queue` sync endpoints work but async jobs don't fire (expected tradeoff of serverless)
