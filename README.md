# Mosaic

**Social-health intelligence for senior living and long-term care.**

Mosaic helps caregivers spot residents who may be becoming socially isolated and decide what to do next. That could mean changing where someone sits at meals, helping them return to an activity they used to attend, introducing them to another resident, or reaching out to family.

Staff can then log how the intervention went, so the resident's profile gets more useful over time.

We built Mosaic for the Whopathon.

---

## Why we built this

Senior-living staff already have a lot competing for their attention. Nursing homes operate with staffing levels below estimated clinical need, and staffing shortages remain common across the industry.

At the same time, loneliness is widespread among care-home residents and is associated with worse health outcomes, including a higher risk of dementia.

The problem is often not that staff do not care. It is that small changes are easy to miss.

A resident starts eating in their room. They stop showing up to an activity they used to enjoy. A few notes mention that they seem quieter than usual. None of those things may look urgent on their own, but together they can show that someone is starting to withdraw.

Mosaic brings those signals together and gives staff a practical next step.

The name comes from the idea that every resident has a different history, personality, routine, and set of interests. There is no single social intervention that works for everyone.

## What it does

### Flags residents who may be withdrawing

Each resident has an isolation-risk score and a six-week trend compared with the rest of the floor.

Mosaic also shows what is contributing to that change, such as:

- Event attendance down 64%
- Shared meals down 41%
- Staff notes mentioning withdrawal

Instead of only showing a score, it gives staff the context behind it.

### Builds a resident profile from existing paperwork

Staff can upload a care plan as a PDF or text file, or enter an intake note by typing or dictating it.

Mosaic turns that information into a structured profile with things like:

- Interests
- Preferred conversation style
- Preferred group size
- Best time of day
- Mobility
- Hearing
- Cognition

There is also a life-history section. Details like "taught fourth grade for 31 years" may not belong in a clinical score, but they can give a caregiver a much better starting point for a conversation.

### Recommends possible interventions

Pairing residents is only one option.

Mosaic ranks several possible actions based on what seems to be contributing to a resident's isolation:

- Change their dining table
- Help them return to an activity they stopped attending
- Spend time with them one-to-one
- Call their family
- Introduce them to a companion

The first recommendation is marked **Best first step**, and Mosaic explains why it was chosen.

The ranking can also change as more information is added. If a resident has already declined multiple group invitations, for example, group-based options move down while one-to-one support moves up.

### Matches residents with compatible companions

When a companion could help, Mosaic scores other residents using:

- Shared interests
- Social preferences
- Care compatibility
- Schedule overlap
- Personality
- Complementary traits

Residents who are filtered out are still shown along with the reason.

For example:

> Also at elevated isolation risk. Mosaic won't pair two residents who are both currently withdrawing.

Staff can override any recommendation.

### Plans the week for the floor

Mosaic can generate a weekly social plan across the floor.

It prioritizes residents whose social engagement is declining and places them into existing activities that fit their preferences, schedule, and accessibility needs.

The schedule is meant to be a starting point, not something staff have to follow exactly. Every row can be edited.

### Uses caregiver feedback

At the end of a shift, a caregiver can quickly record how an interaction or activity went and optionally leave a typed or dictated note.

Over time, those notes create a useful history for the resident.

If the same theme keeps coming up, Mosaic can suggest an update to the resident's profile. For example:

> Add gardening to their interests? Mentioned in 4 notes.

Profile changes are never applied automatically.

## Walkthrough

The demo follows **Margaret Chen, room 214**.

1. **Today** shows Margaret near the top of the attention list because her isolation-risk trend is increasing.
2. Open her **Profile**. It starts mostly empty. Upload the sample care plan and intake note from [`demo/`](demo/), and Mosaic extracts details including her walker use, mild hearing loss, preference for mornings and small groups, and interests in gardening, jazz, and cooking.
3. Open **Companion**. Mosaic compares Margaret with the other residents on the floor and ranks Helen first.
4. It recommends **Indoor Garden Circle** on Wednesday morning because Helen already attends it and the activity fits both residents.
5. In **Schedule**, you can see Margaret and Helen's weeks side by side and accept the suggestion.
6. Back on **Your floor**, Margaret moves inward on the connection map.

One part of the demo we wanted to keep realistic is that Helen already attends Garden Circle.

Mosaic is not inventing a new event or asking staff to organize something special. Margaret is joining something that already exists, which makes the recommendation much easier to act on.

More details on the sample files are in [`demo/README.md`](demo/README.md).

## How the AI is used

We deliberately keep scoring and decision logic separate from the LLM.

| Deterministic code | LLM |
|---|---|
| Compatibility scores and hard filters | Care plan → structured profile |
| Activity fit and accessibility filtering | Intake note → interests and personality |
| Intervention ranking | Explaining why a pair may work |
| Weekly planner | Explaining why an activity is a good fit |
| Connection map | Rephrasing profile suggestions |

The numbers shown in the product are calculated by normal code, not generated by the model.

For example, the companion scoring logic is in [`lib/matching/score-match.ts`](lib/matching/score-match.ts).

The LLM is mainly used to turn unstructured information into something useful to staff and to explain recommendations in plain language.

Mosaic also works without an API key. Each AI-powered feature has a deterministic fallback, and uploaded documents are parsed in the browser. When a fallback result is being used, the card is tagged `cached`.

## Where Whop fits

Mosaic is designed as a B2B product purchased by the senior-living facility.

Whop handles:

- Checkout
- Subscription management
- Access gating

Subscription access is checked through `/api/access` and updated through a membership webhook.

**Resident and clinical data are not sent to Whop.** Whop is only used to determine whether the facility has an active subscription.

## Getting started

```bash
git clone https://github.com/Krupa-pv/Mosaic.git
cd Mosaic
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

That's enough to run the demo.

To use the live AI pipeline and Whop access gate, copy `.env.example` to `.env.local` and add the following variables:

| Variable | Used for |
|---|---|
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` | Profile extraction and explanations |
| `NEXT_PUBLIC_WHOP_CHECKOUT_URL` | Checkout button |
| `WHOP_API_KEY`, `WHOP_ACCOUNT_ID`, `WHOP_WEBHOOK_SECRET`, `WHOP_PRODUCT_ID` | Subscription access and webhook |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run lint` | Run linting |
| `npm run verify:matching` | Check the scoring engine against expected results |
| `npm run verify:ai` | Run the Margaret → Helen pipeline against live Azure OpenAI |
| `npm run verify:demo` | Run the full demo flow against live Azure OpenAI |
| `npm run probe` | Test the Azure OpenAI connection |
| `npm run test:webhook` | Send a signed test event to the Whop webhook |

## Tech stack

- [Next.js](https://nextjs.org) 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Azure OpenAI through the `openai` SDK with structured JSON output
- `d3-force` for the connection map
- `pdfjs-dist` for in-browser PDF parsing
- Web Speech API for dictated notes
- [Whop](https://whop.com) for payments and subscription access

## Project layout

```text
src/app/            Pages and API routes
  api/extract/      Care plan + intake → profile
  api/match/        Scoring, candidates, all-pairs graph
  api/recommend/    Best activity for a pair
  api/plan-week/    Weekly floor plan
  api/access/       Whop subscription gate
  api/webhooks/     Whop membership webhook

src/components/     UI
src/lib/            Client state, fallbacks, interventions, speech
lib/ai/             LLM calls
                    lib/ai/client.ts is the only file that knows the provider
lib/matching/       Deterministic scoring and activity fit
lib/graph.ts        All-pairs compatibility graph
lib/planner.ts      Weekly planner
types.ts            Shared types
seed-data.ts        Residents, staff, and activities
demo/               Sample care plans for the walkthrough
```

## What's real and what isn't

This is a hackathon project, so there are a few important limitations.

- **Risk scores are currently seeded.** The trends are internally consistent for the demo, but there is not yet a live detection engine calculating risk from facility data.
- **Data is not persisted to a server.** Profiles, notes, and schedules currently live in the browser. The plan and connection map are recomputed when the app reloads.
- **The residents are fictional.** Their portraits are AI-generated.
- **Authentication is simulated.** Signing in currently means choosing a caregiver account.
- **Feedback does not retrain the matching algorithm yet.** Caregiver notes can generate profile suggestions, but compatibility weights are still fixed.

## What's next

- Calculate isolation risk from real attendance, dining, and staff-note data
- Add a database and real staff authentication
- Use outcome feedback to improve matching weights
- Build a family-facing view