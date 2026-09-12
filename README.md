# Mosaic — Facility OS

Social-health intelligence for long-term care. Built against
[kinwell_design_doc.md](kinwell_design_doc.md) — that doc is the source of truth,
not the original spec PDF.

```bash
npm install
npm run dev     # http://localhost:3000
```

## The demo path (definition of done)

Dashboard → Margaret → risk explained → extract care plan + intake →
merged profile → find a companion → Helen at 91 → Indoor Garden Circle →
accept. If that runs clean, stop building.

## Layout

| Path | Owner | What |
|---|---|---|
| `types.ts`, `seed-data.ts` (repo root) | Dev A | Locked shared contract. Imported as `@shared/types` / `@shared/seed`. |
| `src/app/page.tsx` | Dev B | Dashboard — resident list, risk badges |
| `src/app/residents/[id]/page.tsx` | Dev B | Risk card (static) + workspace |
| `src/components/ResidentWorkspace.tsx` | Dev B | Stages extraction → match → prescription |
| `src/lib/api.ts` | **seam** | Calls Dev A's routes, falls back to seed data |
| `src/app/api/**` | Dev A | Not built yet |

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

- **Voice input** is on the intake pane (Web Speech API, Chrome/Safari). It
  degrades silently: unsupported browser → button hidden, mic denied → inline
  error, and typing always works. Per the doc's cut rule this can be dropped
  from the demo without touching code.
- **Light theme is pinned** — an OS dark-mode flip mid-recording is pure downside.
- Only Margaret and Helen have raw notes. Robert exists to make the list look
  real; his detail page works but starts with empty extraction panes.
