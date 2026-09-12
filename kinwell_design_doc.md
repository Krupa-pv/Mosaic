# Kinwell — Whopathon Design Doc

**One-liner:** A social-health intelligence platform for nursing homes that detects residents at risk of isolation, understands who they are, recommends personalized social interventions, and learns from outcomes — with Whop as the subscription/access layer.

Build window: **6 hours.** Two devs. This doc is the single source of truth — build against this, not the original spec PDF, which describes the full product, not the hackathon cut.

---

## 1. Problem

**Understaffing is real and current.**
- Nursing homes provide ~24.6% less nurse staffing than residents' clinical needs require (Q1 2026 analysis); ~1.15M residents live below expected staffing levels.
- 94% of nursing home providers and 81% of assisted living communities reported a staff shortage in the past month.
- A federal minimum-staffing rule (3.48 nurse-hours/resident/day) is actively phasing in through 2026–2027 — only ~55% of facilities meet it every shift across a full quarter. This is a live regulatory pressure point, not a hypothetical.

**Understaffing → unmet emotional needs (this is the direct causal link, not just correlation).**
- A national survey of nursing home social services directors found "insufficient number of nurse aide staff" was the #1 cited barrier (31%) to meeting residents' psychosocial/emotional needs — followed by "having to do things other people could do" (29%).
- This names your personal experience directly: staff aren't failing to care, they're structurally unable to spend the time.

**Loneliness is severe and has measurable health consequences.**
- ~61% of residents in care homes are moderately lonely; ~35% severely lonely (systematic review).
- Loneliness increases dementia risk by 31% independent of depression and isolation (NIA, 600,000+ participants, 21 cohorts) — 14% ↑ Alzheimer's, 17% ↑ vascular dementia, 12% ↑ cognitive impairment.
- Social isolation: ~29% ↑ heart disease risk, ~32% ↑ stroke risk (CDC).
- Loneliness + depression together nearly double dementia risk vs. either alone (synergistic, not additive) — this is your justification for early/proactive detection rather than reactive care.

**Pitch sequencing:** personal story (CNA experience) → 31% staffing-barrier stat → 61% loneliness stat → 31% dementia-risk stat → into solution.

---

## 2. Solution — full vision vs. hackathon scope

Full concept (5 stages): detect risk → extract profile (care plan + intake) → match residents → recommend activities/events → feedback loop that improves future matches.

**What we demo (6-hour scope) — 4 of 5 stages, feedback loop mentioned but not shown:**

1. **Risk detection — dummy/hardcoded.** No live calculation. Pre-seeded risk score, trend, and contributing factors for one resident (Margaret). This is a deliberate cut — detection is not technically interesting and the demo value comes from the reveal, not the computation.
2. **Profile extraction — real, built live.** Care-plan text → structured extraction. Intake (text or voice) → interests/personality extraction. This is genuinely real engineering and the best "watch the AI work" demo moment.
3. **Matching — real, the centerpiece.** Hybrid architecture: hard filters → deterministic compatibility score → LLM explains (LLM never invents the score). One-tap accept/decline UI.
4. **Activity/event recommendation — real, but simplified.** Reuses the matching logic's shape against a small hardcoded event catalog. Combined into one "resident + resident + event" recommendation card.
5. **Feedback loop — NOT built or demoed.** State verbally only: "every accepted intervention gets a one-tap outcome rating, and future matches adjust accordingly." Zero build hours spent here.

**Explicitly do not build:** live risk calculation engine, database-backed behavioral history, real embeddings for interest similarity, resident matching weights / pair history persistence, Google Calendar API, Whop notifications, Whop chat/community, family-facing UI, multi-resident seed set (10–15 residents). All of this is real in the full spec — none of it earns its build-hour cost in 6 hours.

---

## 3. Demo scenario (memorize this, it's your whole pitch)

**Margaret.**
- Previously: 3 social events/week, most meals in dining room, weekly daughter visits.
- Recently: 0–1 events/week, most meals in-room, staff notes mention withdrawal.
- Kinwell shows: **Isolation Risk 82, ↑31 over 3 weeks.** Contributing factors (all hardcoded): event attendance ↓64%, meals in shared dining ↓41%, staff notes increasingly mention withdrawal, family visits unchanged.
- Care plan (real extraction, run live): walker, mild hearing impairment, mild cognitive impairment, morning energy, prefers small groups. Interests: gardening, jazz, cooking.
- Best match (real matching, run live): **Helen — 91%.** Both enjoy gardening, both prefer small groups, both use walkers, both most active mornings. Helen is socially active/welcoming while Margaret is withdrawing — complementary, not just similar.
- Recommended intervention: Margaret + Helen + **Indoor Garden Circle, Wednesday 10 AM** (accessible, seated, small group, matches shared interest).
- Staff accepts (real UI interaction).
- Say verbally, don't build: "Later, staff record that they talked about gardening the whole session and asked to sit together again — Kinwell uses that to reinforce gardening as a strong compatibility signal for both of them going forward."

Build 2–3 supporting residents (including Helen) with enough profile data to make matching look real. Do not build 10+.

---

## 4. Architecture

### Data model (simplified — static seed data + in-memory objects, no database)

No Postgres/Supabase for this build. Use hardcoded JSON/TS objects. This alone saves ~1.5–2 hours vs. a real DB.

```
Resident {
  id, firstName, lastName, roomNumber
  riskScore: number          // hardcoded for Margaret, e.g. 82
  riskTrend: number          // e.g. +31
  riskFactors: string[]      // hardcoded, e.g. ["Event attendance ↓64%", ...]
}

ResidentProfile {
  residentId
  interests: string[]
  personality: { introversion: 0-1, conversationalStyle: "quiet"|"balanced"|"talkative" }
  socialPreferences: { preferredGroupSize: "one_on_one"|"small"|"large" }
  careNeeds: { mobility, fallRisk, hearing, vision, cognition }
  activityConstraints: string[]
  personalityNote: string
}

SocialEvent {
  id, title, startTime, location
  interests: string[]
  groupSize: "one_on_one"|"small"|"large"
  accessibility: { wheelchairAccessible, seatedAvailable, physicalIntensity }
}

ResidentMatch {
  residentAId, residentBId, score
  components: { interests, socialPreferences, careCompatibility, schedule, personality, complementaryTraits }
  rationale: string   // LLM-generated
  status: "suggested"|"accepted"|"declined"
}
```

### AI functions (deterministic function calls, not "agents" — don't oversell this in the pitch)

- `extractCarePlan(text)` → careNeeds, activityConstraints, interests
- `extractResidentIntake(text)` → interests, personality, socialPreferences, personalityNote
- `scoreMatch(profileA, profileB)` → deterministic 0–100 score (hard filters first, then weighted components — **LLM does not compute this score**)
- `explainMatch(components)` → LLM turns the structured score components into a plain-language rationale
- `recommendEvent(profileA, profileB, events[])` → filter + score events against the pair, same shape as matching logic

**Important framing for judges:** the LLM extracts and explains; a deterministic function scores and decides. This is the honest, defensible answer if anyone asks "isn't this just an LLM guessing."

### Whop integration (MVP scope only)

One B2B product ("Kinwell — Facility OS"), sold to the facility, not per-nurse.

- Facility admin → Whop checkout → `membership.activated` webhook → create `Tenant` record → grant dashboard access
- App calls `checkAccess` on load to confirm active subscription
- **Skip:** Whop notifications, Whop chat/community, license keys, iframe app — all wrong fit for a B2B SaaS sold to facilities (per Whop's own SaaS docs).
- **Never put resident/clinical data in Whop** — Whop only ever sees the facility's subscription status.

Whop touches exactly two things: checkout and the access-check gate. Everything else is your own app.

---

## 5. Two-dev split

Split by **intelligence (backend/AI) vs. interface (frontend/platform)**, not by feature — this lets both devs work in parallel against a schema locked at hour 0.

### Dev A — Data + AI functions
- Seed dataset: Margaret, Helen, 1 more supporting resident; 6–8 events (Garden Circle, Jazz Hour, Trivia, Book Club, Morning Walk, Cooking Demo, Shared Breakfast)
- Hardcode Margaret's risk score/trend/factors
- `extractCarePlan()` — LLM call, structured JSON out
- `extractResidentIntake()` — LLM call (text and/or voice transcript input), structured JSON out
- Profile merge (care-plan fields win on conflict)
- `scoreMatch()` — hard filters + deterministic weighted score
- `explainMatch()` — LLM rationale
- Event filter/recommendation logic
- Then: Whop webhook handler + `checkAccess` helper

### Dev B — Frontend + platform
- Next.js + TS scaffold, shared types file (built together, hour 0)
- Facility dashboard: resident list + risk badges (static data)
- Resident detail page: risk explanation card (static factors), profile display
- Profile extraction two-pane UI (care plan / intake text-in, extracted JSON out, editable) + voice input button (Web Speech API `SpeechRecognition`)
- Match review UI: swipe/tap accept-decline, combined resident+event recommendation card
- Whop checkout button + wraps app behind Dev A's `checkAccess` gate once ready

---

## 6. Timeline (6 hours)

| Time | Together / Dev A | Dev B |
|---|---|---|
| 0:00–0:30 | Scaffold repo, lock `ResidentProfile`/`Match`/`Event` types, agree on Margaret+Helen as the only fully-built demo pair | (same) |
| 0:30–2:30 | `extractCarePlan()`, `extractResidentIntake()` against real synthetic notes | Dashboard + resident detail page (static/mocked data) |
| 2:30–4:00 | `scoreMatch()` + `explainMatch()`, event filter logic | Voice input wiring + profile extraction two-pane UI |
| 4:00–5:00 | Whop webhook + `checkAccess` | Swipe/match UI + event recommendation card |
| 5:00–5:30 | **Together:** wire real extraction/matching endpoints into the UI, run the full Section-40-style end-to-end sequence once | |
| 5:30–6:00 | **Together:** record the demo (screen capture, not live), cache one known-good LLM response for the Margaret+Helen path as a fallback | |

**Explicit cut rule:** if voice input isn't clean by hour 3:30, drop it from the demo (mention verbally instead). Decide this now, not under pressure at hour 5.

**Definition of done** (judges should follow this with zero explanation):
Dashboard shows Margaret's risk ↑ → click Margaret → risk explained → open care plan → extraction shown → recommend Helen → match explained → recommend Garden Circle → staff accepts. That's it — if this sequence runs smoothly, stop building.

---

## 7. Pitch structure (3 minutes)

- **~40 sec — Problem:** personal CNA story + 31% staffing-barrier stat + one loneliness/health stat.
- **~75 sec — Solution + demo:** play the pre-recorded Margaret→Helen sequence, narrate over it. One sentence on the multi-function pipeline ("care-plan extraction, deterministic matching, LLM-generated rationale — the LLM explains, it doesn't decide"). One sentence on Whop ("facilities subscribe and get access through Whop; family-side community features are a natural next step").
- **~35 sec — Business:** state TAM/SAM/SOM conclusions fast, don't explain methodology live (~50,000 US long-term care facilities; started assumption of $X/resident/month; beachhead = [region/segment]).
- **~30 sec — Team + close:** CNA + SWE backgrounds, why this team executes.

**Do not demo live.** Record ahead of time — timing control matters more than "proving it's real," and a recording of real working software is still credible.

---

## 8. Naming

Current favorites: **Kindred**, **Mosaic**, or an elder-specific variant (**Elder Mosaic**, **Golden Kindred**, **Mosaic Years**). "Kinwell" (from the spec doc) also works if you want something that reads as software/product-y rather than warm/consumer — worth a quick gut-check between the two of you before locking slides.

---

## 9. Market sizing (methodology + numbers to cite)

- ~15,000 nursing homes (avg 109 beds) + ~30,000–41,000 assisted living communities = **~45,000–56,000 US facilities**, ~2.4–3M residents combined.
- No public per-bed pricing exists for comparable tools (Rendever, Sagely are enterprise/quote-based) — state your own assumption explicitly rather than citing a number that doesn't exist publicly.
- **TAM:** all US long-term care facilities × assumed contract value.
- **SAM:** realistic reach for a 2-person team — regional/state beachhead (e.g., Ohio), not all 50,000 facilities.
- **SOM:** pilot-facility count for year 1, tied to an actual acquisition plan (e.g., direct outreach via CNA network), not an arbitrary % of SAM.
- **Competitive honesty:** Rendever, Sagely, Linked Senior exist and do programming/communication — none do proactive isolation-risk detection or compatibility-based matching. Name them; explain the gap.

---

## 10. Known risks / fallbacks

- **Live LLM calls during recording:** cache one known-good Margaret+Helen extraction/matching response as a fallback if the API is slow/flaky mid-recording.
- **Voice input:** riskiest single item (browser/mic dependent) — cut first if behind schedule.
- **Scope creep:** if either of you starts rebuilding anything marked "explicitly do not build" above, stop and re-read Section 2.
