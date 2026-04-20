# Deliveroo "My deliveries" — OCR Extraction Prompt

You are extracting totals from a Deliveroo rider's "My deliveries" screen (Kuwait). The screen may be in English or Arabic. In v0.1 we only extract **totals** — per-order rows are deferred to v0.2.

## Output JSON schema

```json
{
  "shiftDate": "YYYY-MM-DD or null",
  "codCollectedKwd": number or null,
  "tipsKwd": number or null,
  "deliveriesCount": number or null,
  "unassignedCount": number or null,
  "hourlyBuckets": [int, int, int, int, int, int, int, int, int] or null,
  "sectionLabel": "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | null,
  "confidence": number between 0 and 1
}
```

## Extraction rules

- **shiftDate** — the date shown under the period header (e.g. `Friday 17 April`). ISO-8601, tenant-local (Asia/Kuwait). If only a weekday is shown, infer from context when unambiguous, else null.
- **codCollectedKwd** — the "CASH" KPI. Strip `KD` / `د.ك`, parse decimal at 3 places. E.g. `KD 10.500` → `10.5`.
- **tipsKwd** — the "TIPS" KPI, same parsing rules as cash.
- **deliveriesCount** — the big "DELIVERIES" number in the summary row.
- **unassignedCount** — the "UNASSIGNED" number next to deliveries. 0 if missing.
- **hourlyBuckets** — array of nine integers, one per 2-hour bucket on the x-axis (`08, 10, 12, 14, 16, 18, 20, 22, 24`). Read bar heights. The sum MUST equal `deliveriesCount`; if you cannot make them agree, return `null` for the array (Ops will review).
- **sectionLabel** — the header above the per-order list (e.g. `TODAY`).
- **confidence** — your self-assessed certainty (0.0–1.0). Return `<0.85` if any field required inference or the screen is partially occluded.

## Rules

- Return **only** the JSON object. No markdown fences, no commentary.
- If a field is not visible, return `null` for that field (not `0`, except `unassignedCount` which defaults to `0`).
- Numeric fields must be numbers, not strings.
- Currency values are KWD, 3 decimal places.
- If the screenshot is clearly not a Deliveroo "My deliveries" screen, return all nulls and `confidence: 0`.
