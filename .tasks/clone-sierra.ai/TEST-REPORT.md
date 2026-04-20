# Darb — Full Deploy & Test Report

**Run:** 2026-04-15 10:20 UTC
**Stack:** docker compose (frontend :3000 / backend :3001 / postgres :5433 / redis)

## Infrastructure

| Service | Status |
|---------|--------|
| darb-postgres-1 | Up 15h · healthy |
| darb-redis-1 | Up 15h · healthy |
| darb-backend-1 | Up 1h · healthy |
| darb-frontend-1 | Up 1h (rebuilt with Sierra design) |

## Backend — 9/9 endpoints PASS

| Endpoint | Status |
|----------|--------|
| `GET /api/health` | 200 |
| `POST /api/auth/login` | 200 (returns accessToken) |
| `GET /api/auth/me` | 200 (returns user) |
| `GET /api/drivers?limit=5` | 200 |
| `GET /api/companies?limit=5` | 200 |
| `GET /api/keeta/overview` | 200 |
| `GET /api/keeta/metrics/summary` | 200 |
| `GET /api/keeta/drivers/summary` | 200 |
| `GET /api/drivers?platform=TALABAT` | 200 |
| `GET /api/violations?limit=5` | 200 |
| `GET /api/notifications?limit=5` | 200 |
| `GET /api/shifts?limit=5` | 200 |
| `GET /api/orders?limit=5` | 200 |
| `GET /api/insights` | 200 |

Note: `/api/talabat/drivers` route doesn't exist; the correct pattern is `/api/drivers?platform=TALABAT` — not a regression.

## Frontend — 15/15 pages PASS

| Route | Status |
|-------|--------|
| `/marketing` | 200 |
| `/login` | 200 |
| `/` | 200 (redirects) |
| `/talabat/drivers` | 200 |
| `/keeta/overview` | 200 |
| `/keeta/violations` | 200 |
| `/keeta/penalties` | 200 |
| `/deliveroo/drivers` | 200 |
| `/americana/drivers` | 200 |
| `/companies` | 200 |
| `/insights` | 200 |
| `/map` | 200 |
| `/kpis` | 200 |
| `/tickets` | 200 |
| `/settings` | 200 |

## E2E Auth + Data Flow — PASS

1. Login via frontend proxy → token issued ✓
2. Session refresh via refresh cookie ✓
3. `/api/auth/me` returns authenticated user ✓
4. Seven dashboard pages served + their primary API endpoints respond 200 ✓

## Sierra Design Verification — PASS

Content markers present in served HTML:
- `/marketing`: "Better delivery", "Built on Darb", "By the numbers", `forest-gradient`
- `/login`: "operating", "system for", "delivery fleets", "Welcome back"

## Automated Test Suite — PASS

```
Test Suites: 8 passed, 8 total
Tests:       102 passed, 102 total
Time:        6s
```

All unit/integration tests green.

## Result

**Full system operational.** Frontend serving new Sierra design system in production Docker on `:3000`. Backend and data layers unchanged and healthy.

### Access
- Marketing landing: http://localhost:3000/marketing
- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/ (after login)

### Credentials
- `osama@fleet.kw` / `demo123` — Admin
- `ahmed@fleet.kw` / `demo123` — Ops Manager
- `khalid@fleet.kw` / `demo123` — Supervisor
- `fatima@fleet.kw` / `demo123` — Accountant
