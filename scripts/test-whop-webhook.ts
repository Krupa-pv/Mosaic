// Exercises the Whop webhook route end to end without ngrok or the Whop
// dashboard. Signs the way Whop's backend does — HMAC-SHA256 over
// "{id}.{timestamp}.{body}" using the LITERAL bytes of the secret — so this
// independently checks the SDK helper's verification rather than assuming it.
//
//   npm run dev          (in one terminal)
//   npm run test:webhook (in another)

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

const FACILITY = "prod_l7zWolodBoxKz";
const FACILITY_LEGACY = "prod_UBbrTBEoC3xQW";
const FAMILY = "prod_xuhpewe0Fs48C";
const PLAN_STARTER_ONETIME = "plan_NmK4hEHqqlTno"; // legacy, free, one_time
const PLAN_STARTER = "plan_i9jMQwnkfaypN"; // $29.99/mo
const PLAN_GROWTH = "plan_fZrkKlznGRj8N"; // $79.99/mo
const PLAN_FAMILY = "plan_hswCD4Xon07jE";

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

const membershipEvent = (
  type: string,
  o: { membership: string; product: string; plan: string; status?: string; user?: string },
) => ({
  type,
  data: {
    id: o.membership,
    ...(o.status ? { status: o.status } : {}),
    user: { id: o.user ?? "user_test123" },
    product: { id: o.product },
    plan: { id: o.plan },
  },
});

const paymentEvent = (type: string, o: { membership: string; product: string; plan: string }) => ({
  type,
  data: {
    id: `pay_${randomUUID().slice(0, 8)}`,
    membership: { id: o.membership, product: { id: o.product }, plan: { id: o.plan } },
  },
});

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

async function main() {
  const facilityMem = `mem_fac_${randomUUID().slice(0, 6)}`;
  const familyMem = `mem_fam_${randomUUID().slice(0, 6)}`;

  console.log("\n--- Nursing Homes activation (growth tier) ---");
  const a = await send(
    membershipEvent("membership.activated", {
      membership: facilityMem, product: FACILITY, plan: PLAN_GROWTH, status: "active",
    }),
  );
  check("returns 200", a.status, 200);
  check("routed as facility", a.json?.kind, "facility");
  check("tenant active", a.json?.tenant?.status, "active");
  check("tier from plan id", a.json?.tenant?.tier, "growth");
  check("owner captured", a.json?.tenant?.ownerWhopUserId, "user_test123");

  console.log("\n--- Family activation creates a subscriber, NOT a tenant ---");
  const f = await send(
    membershipEvent("membership.activated", {
      membership: familyMem, product: FAMILY, plan: PLAN_FAMILY, status: "active", user: "user_fam9",
    }),
  );
  check("routed as family", f.json?.kind, "family");
  check("subscriber recorded", f.json?.subscriber?.status, "active");
  check("family tier", f.json?.subscriber?.tier, "family");
  check("no tenant created", f.json?.tenant, undefined);

  console.log("\n--- legacy free Starter is one_time: completed still grants ---");
  const starterMem = `mem_start_${randomUUID().slice(0, 6)}`;
  const s = await send(
    membershipEvent("membership.activated", {
      membership: starterMem, product: FACILITY_LEGACY, plan: PLAN_STARTER_ONETIME, status: "completed",
    }),
  );
  check("tenant active", s.json?.tenant?.status, "active");
  check("starter tier", s.json?.tenant?.tier, "starter");

  console.log("\n--- renewal plan reaching completed means ENDED, revoke ---");
  const endedMem = `mem_ended_${randomUUID().slice(0, 6)}`;
  const e = await send(
    membershipEvent("membership.activated", {
      membership: endedMem, product: FACILITY, plan: PLAN_GROWTH, status: "completed",
    }),
  );
  check("not granted", e.json?.tenant, null);

  console.log("\n--- current $29.99 plan maps to starter ---");
  const newStarter = `mem_new_${randomUUID().slice(0, 6)}`;
  const ns = await send(
    membershipEvent("membership.activated", {
      membership: newStarter, product: FACILITY, plan: PLAN_STARTER, status: "active",
    }),
  );
  check("starter tier", ns.json?.tenant?.tier, "starter");

  console.log("\n--- payment.failed raises dunning, keeps access ---");
  const pf = await send(
    paymentEvent("payment.failed", { membership: facilityMem, product: FACILITY, plan: PLAN_GROWTH }),
  );
  check("returns 200", pf.status, 200);
  check("dunning raised", pf.json?.tenant?.dunning, true);
  check("still active", pf.json?.tenant?.status, "active");

  console.log("\n--- payment.succeeded clears dunning ---");
  const ps = await send(
    paymentEvent("payment.succeeded", { membership: facilityMem, product: FACILITY, plan: PLAN_GROWTH }),
  );
  check("dunning cleared", ps.json?.tenant?.dunning, false);

  console.log("\n--- past_due keeps access and flags dunning ---");
  const pd = await send(
    membershipEvent("membership.activated", {
      membership: facilityMem, product: FACILITY, plan: PLAN_GROWTH, status: "past_due",
    }),
  );
  check("still active", pd.json?.tenant?.status, "active");
  check("flagged for dunning", pd.json?.tenant?.dunning, true);

  console.log("\n--- canceled revokes ---");
  const c = await send(
    membershipEvent("membership.deactivated", {
      membership: facilityMem, product: FACILITY, plan: PLAN_GROWTH, status: "canceled",
    }),
  );
  check("tenant inactive", c.json?.tenant?.status, "inactive");

  console.log("\n--- unknown product is acknowledged, not provisioned ---");
  const u = await send(
    membershipEvent("membership.activated", {
      membership: "mem_unknown", product: "prod_notOurs", plan: PLAN_GROWTH, status: "active",
    }),
  );
  check("returns 200", u.status, 200);
  check("ignored", u.json?.ignored, "unknown product");

  console.log("\n--- replay of the same delivery ---");
  const dup = await send(
    membershipEvent("membership.activated", {
      membership: facilityMem, product: FACILITY, plan: PLAN_GROWTH, status: "active",
    }),
    { id: a.id },
  );
  check("returns 200, not an error", dup.status, 200);
  check("flagged duplicate", dup.json?.duplicate, true);

  // These expect 401. A wrong secret also produces 401, so they would pass
  // while proving nothing — the valid-signature cases above rule that out.
  console.log("\n--- tampered signature ---");
  const bad = await send(
    membershipEvent("membership.activated", {
      membership: "mem_nope", product: FACILITY, plan: PLAN_GROWTH,
    }),
    { corrupt: true },
  );
  check("rejected 401", bad.status, 401);

  console.log("\n--- stale timestamp (10 min) ---");
  const old = await send(
    membershipEvent("membership.activated", {
      membership: "mem_stale", product: FACILITY, plan: PLAN_GROWTH,
    }),
    { timestamp: Math.floor(Date.now() / 1000) - 600 },
  );
  check("rejected 401", old.status, 401);

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
