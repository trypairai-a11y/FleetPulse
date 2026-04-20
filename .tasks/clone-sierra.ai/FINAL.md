# Sierra.ai Design System → Darb CRM — Final Applied State

**Applied:** 2026-04-15
**Source:** https://sierra.ai/
**Target:** `frontend/` (Next.js 14 + Tailwind + custom shared components)

## Scope Delivered

Full design-system rollout across every page. No per-page edits were needed — changes are at the shared-primitive level, so all ~100 dashboard pages inherit the new look.

### Tokens (tailwind.config.ts)

- **Forest palette** (50–900) with `primary = forest.600 = #006838`
- **Sand palette** (50–900) replacing cool grays in CSS vars
- **Accent colors**: `clay`, `moss`, `slate2`, `linkBlue`
- **Typography scale**: `display-2xl/xl/lg/md/sm` with tight tracking and Instrument Serif display font
- **Radii**: `pill` (9999px) for all CTAs, tabs, chips
- **Shadows**: `soft`, `lift`, `float`, `ring` (warm, low-saturation, Sierra-style)
- **Motion**: `ease-sierra-out`, `ease-sierra-inout`, durations 250/400/600, `animate-fade-up` / `animate-fade-in`

### CSS Variables + Overrides (globals.css)

- Light mode: warm cream `#F6F5F3` bg, charcoal `#302E2D` fg, sand borders
- Dark mode: forest-tinted near-black `#0B1410` bg
- **Legacy `gray-*` → sand mapping** layer — any dashboard page using raw `bg-gray-100`, `text-gray-600`, etc. auto-inherits warm palette without per-file edits
- `.btn-primary` / `.btn-secondary` / `.btn-ghost` primitives (pill radius, Sierra easing)
- Inter + Instrument Serif loaded from Google Fonts

### Components Refreshed

| File | Change |
|------|--------|
| `app/login/page.tsx` | Split-panel: forest brand side + warm auth form |
| `app/marketing/page.tsx` | **New** — full Sierra-style landing page |
| `app/page.tsx` | Anonymous → `/marketing` (was `/login`) |
| `components/layout/Sidebar.tsx` | Forest-900 bg, pill nav items |
| `components/layout/Header.tsx` | Warm sand/blur, display greeting, avatar pill |
| `components/shared/StatCard.tsx` | Display font for numbers, warm lift shadow |
| `components/shared/StatusBadge.tsx` | Pill radius, tracking refinement |
| `components/shared/PlatformBadge.tsx` | Pill radius, ring outline |
| `components/shared/DataTable.tsx` | Sand borders, warm hover, pill pagination |
| `components/shared/FilterBar.tsx` | Pill inputs + selects + chips |
| `components/shared/SlidePanel.tsx` | Warm card, forest backdrop |
| `components/shared/ConfirmModal.tsx` | Display headline, pill buttons |
| `components/shared/Toast.tsx` | Forest success, pill close, lift shadow |
| `components/shared/ErrorState.tsx` | Display headline, pill retry |
| `lib/formatters.ts` | Semantic status palette shifted to forest/sand/clay |
| `lib/api.ts` | `/marketing` added to public-route 401 exemption |

### Verified in Browser (http://localhost:3002)

- `/marketing` — landing
- `/login` — split-panel
- `/talabat/drivers` — table + KPI cards
- `/keeta/overview` — stat cards + chart
- `/keeta/violations` — red/amber violation pills
- `/map` — forest sidebar against Leaflet
- `/insights` — KWD display numbers + quick-win cards

### Not Borrowed (Legal / Ethical)

- Sierra's logos, trademarks, marketing copy
- GT America font (paid) → substituted with Inter + Instrument Serif (both Google Fonts)
- Sierra's photography and illustrations

### Still Using Platform Brand Colors

Preserved untouched — `keeta #FFB800`, `talabat #FF5A00`, `deliveroo #00CCBC`, `americana #0066FF`. Sierra palette applied around them as the neutral shell.

## Deployment

- **Dev server**: `PORT=3002 npm run dev` inside `frontend/` (already running)
- **Docker**: `docker compose build frontend && docker compose up -d frontend` to promote to `:3000`
