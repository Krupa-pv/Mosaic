# Task: Verify or create the Whop webhook handler

## Context
We're integrating Whop as the billing/access layer for our app (Next.js, App Router). Facilities subscribe via Whop checkout; Whop sends a webhook to our server when a membership activates, and we need to create a `Tenant` record from that event.

## What to do first — CHECK, don't assume

Search the codebase for an existing webhook route before creating anything new:

```bash
find . -path ./node_modules -prune -o -name "route.ts" -print | grep -i webhook
find . -path ./node_modules -prune -o -iname "*whop*" -print | grep -v node_modules
```

Also check `pages/api/` in case it was built under the old Pages Router convention by mistake — if so, it needs to move to the App Router location below, since this project uses `app/`.

## If it doesn't exist, create it here

**Required path (App Router convention — must be exact):**
```
app/api/webhooks/whop/route.ts
```

## What the handler needs to do

1. Read the **raw** request body as text — never `JSON.parse` before signature verification, or the signature check will fail.
2. Verify the webhook signature. Try `unwrapWebhook` from `@whop/sdk/helpers` first:
   ```ts
   import { unwrapWebhook } from "@whop/sdk/helpers";

   const payload = await request.text();
   const event = unwrapWebhook(payload, {
     headers: Object.fromEntries(request.headers),
     key: process.env.WHOP_WEBHOOK_SECRET!, // keep the ws_ prefix as issued, don't strip it
   });
   ```
   If that import fails (not available in the installed SDK version), fall back to manual verification:
   - Whop uses the Standard Webhooks spec. The signed string is `{webhook-id}.{webhook-timestamp}.{raw body}` — NOT the raw body alone.
   - Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature` (format: `v1,<base64 signature>`, space-delimited if multiple).
   - Reject if `webhook-timestamp` is more than 5 minutes old.
   - Compute HMAC-SHA256 over the signed string using the webhook secret, base64-encode it, and compare against the provided signature using `crypto.timingSafeEqual` (constant-time comparison — never `===`).
3. **Idempotency:** store the `webhook-id` header value somewhere (even an in-memory Set is fine for the hackathon) and skip processing if we've already seen it — Whop delivers at least once, so duplicates are expected.
4. Handle `membership.activated`:
   - Pull `data.id` (the membership ID) and `data.user.id` (the Whop user who paid) from the event payload.
   - Create/update a `Tenant` record: `{ whopMembershipId, whopProductId, ownerWhopUserId, status: "active" }`.
5. Handle `membership.deactivated`: find the `Tenant` by `whopMembershipId` and set `status: "inactive"`.
6. Return a 2xx response quickly (under 5 seconds) — do any slower provisioning work after responding, don't block the response on it.
7. Log clearly at each step (event type received, signature verified, tenant created/updated) — we need to see this in the terminal while testing with Whop's dashboard "send test event" feature.

## Environment variables this depends on

```
WHOP_API_KEY=...          (server-only, already set)
WHOP_WEBHOOK_SECRET=...   (from Whop dashboard, keep the ws_ prefix)
WHOP_PRODUCT_ID=prod_UBbrTBEoC3xQW
```

## How we'll test it

1. `ngrok http 3000 --request-header-add "ngrok-skip-browser-warning: true"` running locally
2. Whop dashboard → Webhooks → webhook URL set to `https://<ngrok-subdomain>.ngrok-free.app/api/webhooks/whop`
3. Send a test `membership.activated` event from Whop's dashboard
4. Confirm: ngrok inspector (127.0.0.1:4040) shows a 200 response with real JSON (not an ngrok error page, not a Next.js 404/HTML page)
5. Confirm: terminal logs show the event was received, verified, and a tenant was created

## Report back

After checking/creating, tell us:
- Whether the file already existed or was just created, and its exact path
- Whether `unwrapWebhook` was available in our installed `@whop/sdk` version, or whether the manual fallback is being used
- Any TypeScript/import errors encountered
