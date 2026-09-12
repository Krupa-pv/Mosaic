import { NextResponse } from "next/server";
import {
  ENTITLED_STATUSES,
  FACILITY_PRODUCT_ID,
  accessFor,
  tierFor,
} from "../../../../lib/whop/catalog";

// Whop access gate. Whop only ever sees the facility's subscription status —
// no resident or clinical data crosses this boundary.
//
// Endpoint shape verified against docs.whop.com and against this account:
//   GET https://api.whop.com/api/v1/memberships
//   Authorization: Bearer <account API key>
//   account_id    the seller company, a biz_... id. Required with an API key.
//   product_ids[] restricts the answer to the Nursing Homes product, so a
//                 Family subscription cannot unlock the staff dashboard.
//   statuses[]    the entitled set from the catalog, which includes
//                 "completed" (where the free Starter lands, since a
//                 one-time plan never becomes "active") and "past_due"
//                 (grace period — access continues while billing is chased).
//
// Until the key and account id are set this returns 503 so the client's
// graceful path runs. An unconfigured gate must not claim a subscription.

const WHOP_API = "https://api.whop.com/api/v1";

interface WhopMembership {
  id?: string;
  status?: string;
  plan?: { id?: string; metadata?: Record<string, unknown> };
  product?: { id?: string };
}

export async function GET() {
  const apiKey = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_ACCOUNT_ID ?? process.env.WHOP_COMPANY_ID;

  if (!apiKey || !accountId) {
    return NextResponse.json({ error: "Whop not configured" }, { status: 503 });
  }

  const params = new URLSearchParams({ account_id: accountId, first: "25" });
  params.append("product_ids[]", FACILITY_PRODUCT_ID);
  for (const status of ENTITLED_STATUSES) params.append("statuses[]", status);

  try {
    const res = await fetch(`${WHOP_API}/memberships?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Api-Version-Date": "2026-07-01" },
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[/api/access] Whop returned", res.status, detail.slice(0, 300));
      return NextResponse.json({ error: `Whop returned ${res.status}` }, { status: 502 });
    }

    const json = (await res.json()) as { data?: WhopMembership[] };
    const memberships = json.data ?? [];
    const active = memberships.length > 0;

    // Report the best tier held, so a facility on Growth is not described by
    // a stale Starter membership that is also still entitled.
    const RANK = { starter: 0, family: 1, basic: 2, growth: 3 } as const;
    let tier: string | undefined;
    let dunning = false;

    for (const m of memberships) {
      if (accessFor(m.status) === "grace") dunning = true;
      const t = tierFor(m.plan?.id, m.plan?.metadata?.tier);
      if (t && (!tier || RANK[t] > RANK[tier as keyof typeof RANK])) tier = t;
    }

    console.log(
      `[/api/access] ${memberships.length} entitled facility membership(s) -> active=${active} tier=${tier ?? "?"}${dunning ? " dunning" : ""}`,
    );

    // `active` is what src/lib/api.ts reads. `has_access` is an alias so a
    // caller expecting either name works.
    return NextResponse.json({ active, has_access: active, tier, dunning });
  } catch (error) {
    console.error("[/api/access]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
