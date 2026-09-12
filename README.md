# Mosaic — Facility OS

Social-health intelligence for long-term care. Built against
[kinwell_design_doc.md](kinwell_design_doc.md) — that doc is the source of truth,
not the original spec PDF.

```bash
npm install
npm run dev     # http://localhost:3000
```

## The demo path (definition of done)

Today → Margaret → risk explained → Profile tab: upload or paste the care
plan + intake, watch the profile fill itself in → Companion tab: the
scored field, Helen at 92 → Schedule tab: both weeks side by side →
accept. If that runs clean, stop building.

The final beat is worth narrating: Margaret's week goes from 1 activity to
2, while Helen already attends Garden Circle. The intervention is Margaret
joining Helen's existing routine, not a new event for both — which is why
it's a low-friction ask of staff.

## Layout

| Route | What |
|---|---|
| `/` | Today — morning (before rounds) / evening (log outcomes) |
| `/residents` | Roster, ranked by isolation risk |
| `/residents/[id]` | Overview · Profile · Companion · Schedule |
| `/connections` | Every pair — physics graph + compatibility matrix |
| `/plan` | Generated week plan, editable |
| `/activities` | Upcoming events — week calendar or list |

| Path | Owner | What |
|---|---|---|
| `types.ts`, `seed-data.ts` (repo root) | Dev A | Locked shared contract. `@shared/types` / `@shared/seed`. |
| `lib/ai/**`, `lib/matching/**`, `lib/candidates.ts` | Dev A | Extraction, scoring, event fit |
| `lib/graph.ts`, `lib/planner.ts` | Dev B | All-pairs graph and week planner — both reuse Dev A's `scoreMatch`, nothing is scored twice |
| `src/app/residents/[id]/layout.tsx` | Dev B | Summary rail + flow provider (state survives tab navigation) |
| `src/lib/api.ts` | **seam** | Calls the real routes, falls back to seed data |

---

## API contract — what the UI already calls

The frontend is wired and live *now*. Every call hits the route below; if it
404s or times out (12s), the UI silently falls back to the pre-verified seed
response and tags the card `cached`. **Nothing in the demo breaks while these
routes are missing** — dropping each one in upgrades a `cached` badge to real
output, with no frontend change needed.

Return shapes are the types in `types.ts`. Non-2xx = fallback.

### `POST /api/extract/care-plan`
```ts
// in
{ residentId: string, rawText: string }
// out: ExtractionResponse (= Partial<ResidentProfile>)
{ careNeeds, activityConstraints, preferredTimeOfDay, interests }
```

### `POST /api/extract/intake`
```ts
// in  — rawText is typed OR voice-transcribed; same endpoint either way
{ residentId: string, rawText: string }
// out: ExtractionResponse
{ interests, personality, socialPreferences, personalityNote }
```

The UI merges both panes client-side for display (care plan wins on conflict,
mirroring your server-side merge). Return only the fields your extractor is
confident about — missing keys are fine, the merge tolerates them.

### `POST /api/match`
```ts
// in  — `profile` is the merged profile, including any staff edits made in the UI
{ residentId: string, profile: ResidentProfile }
// out: ResidentMatch — the single best candidate, score already computed
```
Score must be deterministic; `rationale` is the LLM part. The UI renders all six
`components` as bars and prints "the model never sets this number" under them,
so please keep that true.

### `POST /api/recommend`
```ts
// in
{ match: ResidentMatch }
// out: SocialPrescription  ({ id, match, event, eventFitReason, status })
```
Called automatically right after `/api/match` resolves — the pair and the
activity land in one card, so no extra click is needed.

### `GET /api/match/graph`
```ts
// out — every pair on the floor, deterministic, no LLM
{ nodes: { residentId, affinity, degree }[],
  edges: { a, b, score, components, blockedBy? }[],
  threshold: number }
```

### `POST /api/plan-week`
```ts
// in
{ priorities: { residentId, score, trend }[], existing?: Record<eventId, residentId[]> }
// out
{ pairings: { eventId, eventTitle, startTime, subjectId, companionId, score, reason }[],
  unplaced: { residentId, reason }[] }
```

### `GET /api/access`
```ts
// out
{ active: boolean }
```
Whop gate. **Until this route exists the app stays open** (unreachable = not
blocking). Once it returns `{active:false}` the UI hard-blocks with a checkout
modal, so only ship it when the webhook works.

Set `NEXT_PUBLIC_WHOP_CHECKOUT_URL` in `.env.local` for the checkout button.

### `POST /api/webhooks/whop`
Yours entirely — no UI depends on it.

---

## Notes

- **Care plan upload** is client-side only: `.txt`/`.md` via `file.text()`,
  `.pdf` via `pdfjs-dist` in the browser. The extracted text posts to the
  existing extraction route, so it needed no backend change. Every failure
  path falls back to the textarea.
- **Voice input** is on the intake pane (Web Speech API, Chrome/Safari). It
  degrades silently: unsupported browser → button hidden, mic denied → inline
  error, and typing always works. Per the doc's cut rule this can be dropped
  from the demo without touching code.
- **Light theme is pinned** — an OS dark-mode flip mid-recording is pure downside.
- Only Margaret and Helen have raw notes. Robert exists to make the list look
  real; his detail page works but starts with empty extraction panes.
