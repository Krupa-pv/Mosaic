// Exercises the Whop webhook route end to end without ngrok or the Whop
// dashboard. Signs the way Whop's backend does — HMAC-SHA256 over
// "{id}.{timestamp}.{body}" using the LITERAL bytes of the secret — so this
// independently checks the SDK helper's verification rather than assuming it.
//
//   WHOP_WEBHOOK_SECRET=ws_test... npm run dev
//   npx tsx scripts/test-whop-webhook.ts

import { createHmac, randomUUID } from "node:crypto";
import { loadEnvLocal } from "../lib/env-local";

// The dev server reads .env.local through Next.js. Without this the script
// would sign with a different secret than the server verifies with, and
// every request would come back 401 for a reason that looks like a bug in
// the handler.
loadEnvLocal();

const URL_ = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/whop";
const SECRET = process.env.WHOP_WEBHOOK_SECRET;

if (!SECRET) {
  console.error(
    "Missing WHOP_WEBHOOK_SECRET. Set it in .env.local (keep the ws_ prefix)\n" +
      "so this script signs with the same secret the server verifies with.",
  );
  process.exit(1);
}

function sign(id: string, timestamp: number, body: string): string {
  const mac = createHmac("sha256", Buffer.from(SECRET as string, "utf8"));
  mac.update(`${id}.${timestamp}.${body}`);
  return mac.digest("base64");
}

async function send(
  body: unknown,
  opts: { id?: string; timestamp?: number; corrupt?: boolean } = {},
) {
  const raw = JSON.stringify(body);
  const id = opts.id ?? `msg_${randomUUID()}`;
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  let signature = sign(id, timestamp, raw);
  if (opts.corrupt) signature = signature.replace(/^./, (c) => (c === "A" ? "B" : "A"));

  const res = await fetch(URL_, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
    body: raw,
  });
  return { status: res.status, json: await res.json().catch(() => null), id };
}

const activated = (membershipId: string) => ({
  type: "membership.activated",
  data: {
    id: membershipId,
    user: { id: "user_test123" },
    product: { id: process.env.WHOP_PRODUCT_ID ?? "prod_UBbrTBEoC3xQW" },
  },
});

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

async function main() {
  const membershipId = `mem_${randomUUID().slice(0, 8)}`;

  console.log("\n--- valid membership.activated ---");
  const a = await send(activated(membershipId));
  check("returns 200", a.status, 200);
  check("tenant is active", a.json?.tenant?.status, "active");
  check("membership id stored", a.json?.tenant?.whopMembershipId, membershipId);
  check("owner captured", a.json?.tenant?.ownerWhopUserId, "user_test123");

  console.log("\n--- same delivery replayed (idempotency) ---");
  const dup = await send(activated(membershipId), { id: a.id });
  check("returns 200, not an error", dup.status, 200);
  check("flagged duplicate", dup.json?.duplicate, true);

  // These expect 401. A wrong secret also produces 401, so they would pass
  // while proving nothing — the valid-signature case above is what rules
  // that out. Keep it first, and read a failure there before these.
  console.log("\n--- tampered signature ---");
  const bad = await send(activated("mem_should_not_exist"), { corrupt: true });
  check("rejected 401", bad.status, 401);

  console.log("\n--- replayed old timestamp (10 min) ---");
  const old = await send(activated("mem_stale"), {
    timestamp: Math.floor(Date.now() / 1000) - 600,
  });
  check("rejected 401", old.status, 401);

  console.log("\n--- membership.deactivated ---");
  const off = await send({ type: "membership.deactivated", data: { id: membershipId } });
  check("returns 200", off.status, 200);
  check("tenant is inactive", off.json?.tenant?.status, "inactive");

  console.log("\n--- unhandled event type ---");
  const other = await send({ type: "invoice.paid", data: { id: "inv_1" } });
  check("acknowledged 200", other.status, 200);
  check("marked unhandled", other.json?.handled, false);

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
