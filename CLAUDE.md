# CLAUDE.md — Darb Fleet Management Platform

## Project Overview

Darb is a multi-platform delivery fleet management system for Kuwait operations. It manages couriers across Keeta, Talabat, Deliveroo, and Americana platforms with a unified dashboard, mobile agent app, and AI-powered analytics.

## Tech Stack

- **Frontend:** Next.js 14 + React 18 + TypeScript + Tailwind CSS + Shadcn/ui + React Leaflet
- **Backend:** Express 4 + TypeScript + Prisma 5 (PostgreSQL 15) + Redis 7 + BullMQ
- **Mobile:** React Native / Expo 52
- **AI:** Anthropic Claude API (OCR, chat, scoring, anomaly detection, digests)
- **Infra:** Docker Compose, Vercel deployment

## Architecture

- Multi-tenant with Tenant as root entity
- JWT auth (15-min access + 7-day refresh cookies)
- RBAC middleware (ADMIN, OPS_MANAGER, SUPERVISOR, ACCOUNTANT, VIEWER)
- RESTful API with Swagger docs
- SSE for real-time notification streaming
- BullMQ workers for background jobs

## Key Directories

```
frontend/src/app/(dashboard)/   → Page routes (Next.js App Router)
frontend/src/components/        → Reusable components (ai/, insights/, layout/, platform/, shared/)
backend/src/routes/             → Express route handlers (32 files)
backend/src/services/           → Business logic (17 files)
backend/src/middleware/         → auth.ts, rbac.ts, tenantScope.ts, errorHandler.ts
backend/prisma/schema.prisma   → Database schema (40+ models)
mobile/src/                     → Expo app (screens, components, services)
```

## Commands

```bash
# Start full stack
docker-compose up -d

# Backend dev
cd backend && npm run dev          # Express on :8001

# Frontend dev
cd frontend && npm run dev         # Next.js on :3000

# Database
cd backend && npx prisma migrate dev    # Run migrations
cd backend && npx prisma db seed        # Seed data
cd backend && npx prisma studio         # Visual DB explorer

# Tests
cd backend && npm test
```

## Coding Conventions

- TypeScript strict mode throughout
- Prisma for all DB access (never raw SQL unless aggregation requires it)
- All routes use authMiddleware + tenantScope middleware
- Pagination via getPagination() + paginatedResponse() utils
- Error handling: try/catch in every route, return { error: message }
- Frontend: Tailwind utility classes, Shadcn components, Lucide icons
- Arabic/English bilingual support via i18n directory
- Platform-specific code lives under platform-named directories (keeta/, talabat/, etc.)

---

# NEW FEATURES — Keeta Operations Module Enhancement

The following features need to be added to bring the Keeta module to parity with the Keeta operations platform (kt_KuwaitCity_Sidra). These are based on a training session recorded on 12 April 2026 documenting exactly how the real Keeta ops console works.

## Context: What Already Exists

**Keeta backend** (`backend/src/routes/keeta.ts`):
- GET/POST/PUT `/metrics` — KeetaDailyMetrics CRUD
- GET `/metrics/summary` — Aggregated stats
- GET `/drivers/summary` — Driver stats via adapter
- GET `/overview` — Today's overview (drivers + metrics + attendance)
- POST `/import` — XLSX upload for metrics

**Keeta frontend pages** (`frontend/src/app/(dashboard)/keeta/`):
- `/keeta/overview`, `/keeta/drivers`, `/keeta/drivers/[id]`
- `/keeta/attendance`, `/keeta/shifts`, `/keeta/orders`
- `/keeta/performance`, `/keeta/phones`, `/keeta/vehicles`, `/keeta/settings`

**Notifications** (`backend/src/routes/notifications.ts`):
- Basic CRUD + unread count + SSE stream + notification rules

**What's MISSING (Talabat has it, Keeta doesn't):**
- `/keeta/violations` page (Talabat has `/talabat/violations`)
- `/keeta/cash` page (Talabat has `/talabat/cash`)
- Real-time courier monitor with irregular courier alerts
- Violation detection engine with penalty system
- Order flow timeline visualization
- GPS monitoring alerts
- Appeal workflow

---

## Feature 1: Real-time Courier Monitor

**Priority: HIGH**

Build a live operational dashboard showing all active couriers with real-time status.

### Backend

Create `backend/src/routes/keetaMonitor.ts`:

```
GET /api/keeta/monitor/couriers
```
Returns all couriers currently working, with:
- Online status (working, idle, offline)
- Current shift info (area assignment: Hawally, Avenues, etc.)
- Online hours counter
- Completed/cancelled order counts for today
- Vehicle info (type, plate number)
- Current active order (if any)

```
GET /api/keeta/monitor/alerts
```
Returns irregular courier alerts:
- **Scheduled not online:** Couriers with a shift that haven't logged in
- **GPS upload failures:** Couriers whose location hasn't updated recently (check LocationLog timestamps)
- **Order rejections ×N:** Couriers who rejected 3+ orders

### Frontend

Create `frontend/src/app/(dashboard)/keeta/monitor/page.tsx`:

- Header showing total courier count with status breakdown
- Alert panel at top: 3 pill-shaped badges showing counts for each alert type (scheduled-not-online, GPS failures, order rejections)
- Two view tabs: "By Order" and "By Courier"
- Courier list cards showing: name, phone, vehicle, online hours, completed count, shift schedule with area labels
- Clicking a courier opens a right-side detail panel showing:
  - Courier profile (ID, vehicle, phone, online hours)
  - Tabs: Current (active orders), Completed & Cancelled (history with timestamps), Shift (schedule)
  - Map showing courier's last known location (use React Leaflet, already installed)
- Flight mode detection: flag couriers who are online but haven't updated GPS in >10 minutes

### Database Changes

Add to `schema.prisma`:
```prisma
model CourierOnlineSession {
  id          String   @id @default(cuid())
  tenantId    String
  driverId    String
  startTime   DateTime
  endTime     DateTime?
  isOnline    Boolean  @default(true)
  lastGpsAt   DateTime?
  lastGpsLat  Float?
  lastGpsLng  Float?
  area        String?
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  driver      Driver   @relation(fields: [driverId], references: [id])
  @@index([tenantId, isOnline])
  @@index([driverId, startTime])
}
```

---

## Feature 2: Violation Detection & Management

**Priority: HIGH**

Build an automated violation detection engine with a management UI.

### Backend

Create `backend/src/services/violationEngine.ts`:

Violation types to detect (based on Keeta platform):
1. **Late pickup** — Courier took >X minutes to arrive at merchant after accepting
2. **Order rejection (timeout)** — Courier let acceptance timer expire
3. **Drop-off in advance** — Courier marked delivered but GPS shows >500m from customer (use Haversine formula on coordinates)
4. **Order slightly late** — Delivery exceeded ETA by >5 minutes
5. **Invalid delivery photo** — AI vision check on delivery photo (use existing aiOcrService)

Create `backend/src/routes/violations.ts`:
```
GET  /api/violations          — List with filters (dateFrom, dateTo, reason, status, appealStatus, courierId, platform)
GET  /api/violations/:id      — Detail with linked penalties and appeal history
POST /api/violations          — Create (usually automated by engine)
PUT  /api/violations/:id      — Update status
```

### Database Changes

```prisma
enum ViolationType {
  LATE_PICKUP
  ORDER_REJECTION_TIMEOUT
  DROP_OFF_IN_ADVANCE
  ORDER_SLIGHTLY_LATE
  ORDER_VERY_LATE
  INVALID_DELIVERY_PHOTO
  GPS_NOT_UPLOADING
}

enum ViolationStatus {
  ESTABLISHED
  UNDER_REVIEW
  OVERTURNED
  EXPIRED
}

enum AppealStatus {
  NOT_RAISED
  PENDING
  APPROVED
  REJECTED
}

model Violation {
  id              String          @id @default(cuid())
  tenantId        String
  driverId        String
  platform        Platform
  violationType   ViolationType
  violationStatus ViolationStatus @default(ESTABLISHED)
  appealStatus    AppealStatus    @default(NOT_RAISED)
  violationTime   DateTime
  details         String?         // Human-readable description (e.g., "Distance between drop-off and customer: 3232.63 meters")
  metadata        Json?           // Structured data (coordinates, distances, times)
  taskId          String?         // Link to the order/task that triggered it
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  tenant          Tenant          @relation(fields: [tenantId], references: [id])
  driver          Driver          @relation(fields: [driverId], references: [id])
  penalties       Penalty[]
  appeals         Appeal[]

  @@index([tenantId, violationTime])
  @@index([driverId, violationType])
  @@index([tenantId, platform, violationStatus])
}

model Penalty {
  id            String       @id @default(cuid())
  tenantId      String
  driverId      String
  penaltyType   String       // "ONLINE_TRAINING", "VIOLATION_RECORD", "ACCOUNT_SUSPENSION", "WARNING"
  penaltyStatus String       @default("EFFECTIVE") // EFFECTIVE, COMPLETED, OVERTURNED
  penaltyValue  String?      // Training ID, fine amount, etc.
  createdAt     DateTime     @default(now())
  violations    Violation[]
  tenant        Tenant       @relation(fields: [tenantId], references: [id])
  driver        Driver       @relation(fields: [driverId], references: [id])

  @@index([tenantId, driverId])
}

model Appeal {
  id            String       @id @default(cuid())
  violationId   String
  appealStatus  AppealStatus @default(PENDING)
  channel       String?      // "APP", "PHONE", "EMAIL"
  reason        String?
  rejectionNote String?
  appealedAt    DateTime     @default(now())
  reviewedAt    DateTime?
  reviewedBy    String?
  violation     Violation    @relation(fields: [violationId], references: [id])

  @@index([violationId])
}
```

### Frontend

Create `frontend/src/app/(dashboard)/keeta/violations/page.tsx`:

- Filterable table: date range picker, violation reason dropdown, violation status, appeal status, courier name search
- Table columns: Violation ID, Reason, Task ID (clickable), Courier Name, Courier ID, Vehicle Type, Settlement Mode, Violation Time, Status
- Clicking a row opens violation detail page

Create `frontend/src/app/(dashboard)/keeta/violations/[id]/page.tsx`:

- Violation info section: ID, appeal status, type, timestamp, detailed description
- Penalty info section: table of linked penalties with ticket IDs
- Appeal info section: table showing appeal history with status, channel, reasons, timestamps

---

## Feature 3: Order Flow Timeline

**Priority: MEDIUM**

Enhance the existing order detail view with a visual step-by-step timeline.

### Backend

Add to existing order routes or create `backend/src/routes/orderFlow.ts`:

```
GET /api/orders/:id/flow — Returns ordered list of events for an order
```

Each event: { action, description, operator, operatorPhone, timestamp }

Events to track:
1. Customer placed order
2. Customer made payment (amount)
3. Merchant accepted order
4. Merchant placed order
5. Courier accepted order (courier ID, name)
6. Courier arrived at merchant
7. Courier picked up
8. Courier arrived at customer
9. Order delivered
10. Order cancelled (with reason)

### Database Changes

```prisma
model OrderEvent {
  id          String   @id @default(cuid())
  tenantId    String
  orderId     String
  action      String   // Event type key
  description String   // Human-readable description
  operator    String?  // Who triggered it (customer name, merchant name, courier name)
  operatorId  String?  // Platform ID
  timestamp   DateTime
  metadata    Json?    // Extra data (payment amount, courier ID, etc.)
  tenant      Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, orderId])
  @@index([orderId, timestamp])
}
```

### Frontend

Add to the existing order detail component (likely in the Keeta orders page):

- Visual timeline component: vertical stepper with green checkmark icons
- Each step shows: event name, time elapsed since previous step (e.g., "4m 27s"), timestamp
- Highlight delays in amber/red when time between steps exceeds threshold
- Below the timeline: Operation Record Table showing raw event log with columns: Action, Content, Operator [phone], Operation Time

---

## Feature 4: Notification Centre Enhancement

**Priority: MEDIUM**

Enhance the existing notification system with categories, bilingual support, and GPS monitoring alerts.

### Backend

Update `backend/src/routes/notifications.ts`:

Add category filter:
```
GET /api/notifications?category=IMPORTANT|OPS_TODO|BENEFITS|OTHER
GET /api/notifications/counts — Returns unread counts per category
```

Create GPS monitoring background job in `backend/src/queues/`:

```typescript
// gpsMonitorWorker.ts
// Runs every 5 minutes
// Checks LocationLog for all online couriers
// If last GPS update > 15 minutes ago, create notification:
//   title: "Not uploading GPS notification"
//   body: "The system detects that your rider {platformId} {name} has not uploaded the GPS location for a long time..."
//   bodyAr: Arabic translation
//   category: "IMPORTANT"
//   severity: "HIGH"
```

### Database Changes

Add to Notification model:
```prisma
// Add fields to existing Notification model:
category    String?   // "IMPORTANT", "OPS_TODO", "BENEFITS", "OTHER"
titleAr     String?   // Arabic title
bodyAr      String?   // Arabic body
severity    String?   // "LOW", "MEDIUM", "HIGH", "CRITICAL"
```

### Frontend

Update notification dropdown/page:

- Tab bar: All (count), Important (count), Ops to-do, Benefits and campaigns, Others (count)
- Each notification shows bilingual text (English primary, Arabic secondary)
- Red dot for unread items
- Clicking opens detail panel with full bilingual message
- Badge on notification bell icon showing total unread count

---

## Feature 5: Penalty Management Page

**Priority: MEDIUM**

### Frontend

Create `frontend/src/app/(dashboard)/keeta/penalties/page.tsx`:

- Filterable list of all penalties
- Detail view showing: Penalty ID, type (Online Training, Violation Record, Account Suspension), status, value, creation date
- Linked violations table showing all violations that contributed to this penalty
- Each violation row: ID (clickable), status, appeal status, type, timestamp

---

## Feature 6: Shift & Area Management Enhancement

**Priority: LOW**

Enhance the existing shifts page with area-based assignment and multi-shift support.

### Backend

Add area field to shift management:
- Couriers can have multiple shifts per day in different areas (e.g., 00:00-03:00 Hawally, 15:00-17:00 Hawally)
- Areas for Kuwait: Hawally, Avenues, Salmiya, Jabriya, etc.

### Frontend

Update shift display in courier cards to show:
- Multiple shifts per day with area labels
- Color-coded area badges
- Current active shift highlighted

---

## Implementation Order

1. **Database migrations first** — Add Violation, Penalty, Appeal, OrderEvent, CourierOnlineSession models
2. **Violation engine** — Backend service + routes + automated detection jobs
3. **Real-time monitor** — Backend routes + frontend page with courier cards and alert panel
4. **Order flow** — Backend events + frontend timeline component
5. **Notification enhancement** — Categories + GPS monitoring + bilingual support
6. **Penalty management** — Frontend page consuming violation/penalty APIs
7. **Shift enhancement** — Area assignment display

## Design Notes

- Follow the existing Apple-inspired design system already in the frontend
- Use Shadcn components (already configured) for tables, tabs, badges, cards
- Use Tailwind dark backgrounds sparingly — the Keeta platform uses a dark sidebar (#1A1A2E) with light content area
- All tables should be sortable and filterable
- All lists should be paginated using the existing getPagination/paginatedResponse pattern
- Violation detail pages should have clear visual hierarchy: Violation Info → Penalty Info → Appeal Info sections
- Timeline component should use vertical stepper design with connecting lines between steps
- Arabic text should use dir="rtl" attribute when displayed alongside English
