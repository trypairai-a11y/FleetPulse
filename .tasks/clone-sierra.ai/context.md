# Sierra.ai → Darb Design System Extraction

**Source:** https://sierra.ai/
**Extracted:** 2026-04-15
**Target:** Next.js 14 + Tailwind + Shadcn frontend at `/Users/mac/Documents/Darb/frontend`

## What was borrowed

The *system*, not the assets. Sierra's visual language is built around:
- Warm, earthy neutral palette (cream / sand / charcoal) instead of cool grays
- Deep forest green (`#006838`) as the primary action color
- Pill-radius CTAs (9999px) — their signature button shape
- Elegant serif display for headlines (Instrument Serif substitute for GT America)
- Generous whitespace, large display type, tight tracking
- Section-curved corners (large radii at top/bottom of dark sections)
- Subtle, warm-tinted shadows rather than generic gray

## Token Mapping

### Palette (extracted → Darb token)

| Sierra hex | Usage | Darb token |
|------------|-------|-----------|
| `#006838` | Primary CTA / focus | `primary.DEFAULT`, `forest.600` |
| `#00552E` | Primary hover | `primary.hover`, `forest.700` |
| `#05351D` | Dark hero panel | `forest.800` |
| `#042716` | Deepest forest | `forest.900` |
| `#468254` | Moss accent | `moss` |
| `#F9FFFA` | Green-tint bg | `primary.soft` |
| `#F6F5F3` | Warm cream body | `sand.100`, `--color-bg` |
| `#FBFAF8` | Cream surface | `sand.50`, `--color-surface` |
| `#E4E0DC` | Sand border | `sand.300`, `--color-border` |
| `#C5BBB1` | Muted taupe | `sand.400` |
| `#A99E92` | Mid sand | `sand.500`, `--color-muted` |
| `#716F6C` | Body secondary | `sand.700`, `--color-secondary` |
| `#302E2D` | Warm charcoal | `sand.900`, `--color-fg` |
| `#C57B59` | Clay (feature card) | `clay` |
| `#27455C` | Deep teal (feature card) | `slate2` |
| `#3860BE` | Link blue | `linkBlue` |

### Typography

- **Body**: Inter 400, 16px/24px, tracking -0.005em
- **Display**: Instrument Serif 400 (substitute for Sierra's GT America display usage)
- **Scale**:
  - `display-2xl`: 80/84, -0.03em
  - `display-xl`: 65/72, -0.02em (matches Sierra H1 exactly)
  - `display-lg`: 48/54, -0.02em
  - `display-md`: 36/42, -0.015em
  - `display-sm`: 28/34, -0.01em

### Radii

- `sm` 4px · `DEFAULT` 8px · `md` 10px · `lg` 12px · `xl` 16px · `2xl` 24px · `3xl` 32px
- `pill` 9999px — Sierra's signature; used on all CTAs, nav pills, filter chips
- Section curves: `rounded-t-[64px]` on dark panels (matches Sierra's hero bottom curve)

### Shadows

- `soft` — card hover rest state (warm, low)
- `lift` — card hover raised state
- `float` — Sierra's signature deep blue-tinted float for overlay cards
- `ring` — focus ring in primary green

### Motion

- `ease-sierra-out` = `cubic-bezier(0.22, 1, 0.36, 1)` — elegant overshoot-less ease-out
- `ease-sierra-inout` = `cubic-bezier(0.65, 0, 0.35, 1)`
- Durations: 250 (micro), 400 (card), 600 (reveal)
- `animate-fade-up` and `animate-fade-in` utilities for section reveals

## Files Changed

1. `frontend/tailwind.config.ts` — full token refresh (palette, typography, radii, shadows, motion)
2. `frontend/src/app/globals.css` — CSS variables, fonts (Inter + Instrument Serif), button primitives (`.btn-primary`, `.btn-secondary`, `.btn-ghost`)
3. `frontend/src/app/login/page.tsx` — split-panel layout with forest hero + warm auth form
4. `frontend/src/app/marketing/page.tsx` — new marketing landing using Sierra patterns (hero + stats + platform cards + feature grid + CTA + footer)

## Preserved

- Platform brand colors (`keeta`, `talabat`, `deliveroo`, `americana`) unchanged
- Existing dashboard pages untouched — they'll inherit the new neutral palette automatically via CSS variables
- Legacy `bg-gray-*` overrides kept in globals.css for dark mode

## Not Borrowed

- Sierra's logos, product names, copy, illustrations, photography
- GT America font (paid) → substituted with Inter + Instrument Serif (both free, Google Fonts)

## Next Steps

- Check how existing dashboard pages render with the new palette; expect warmer look automatically
- Consider updating Sidebar.tsx to use forest-800 background (matches Sierra sidebar treatment)
- Refresh core Shadcn components (button, card, badge, tabs) to use `rounded-pill` and new tokens
