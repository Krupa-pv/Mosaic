import { NextResponse } from "next/server";
import {
  CANDIDATE_STATUSES,
  accessFor,
  facilityProductIds,
  tierFor,
} from "../../../../lib/whop/catalog";

// Whop access gate. Whop only ever sees the facility's subscription status —
// no resident or clinical data crosses this boundary.
//
// Endpoint shape verified against docs.whop.com and against this account:
//   GET https://api.whop.com/api/v1/memberships
//   Authorization: Bearer <account API key>
//   account_id    the seller company, a biz_... id. Required with an API key.
//   product_ids[] restricts the answer to the Nursing Homes products, so a
//                 Family subscription cannot unlock the staff dashboard.
//   statuses[]    candidate statuses only. "completed" is entitled on a
//                 one-time plan but means "ended" on a renewal plan, so the
//                 real decision runs per membership through accessFor()
//                 with that membership's plan id.
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

  const params = new URLSearchParams({ account_id: accountId, first: "50" });
  for (const productId of facilityProductIds()) params.append("product_ids[]", productId);
  for (const status of CANDIDATE_STATUSES) params.append("statuses[]", status);

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
    const candidates = json.data ?? [];

    // Whop's status filter cannot express "completed, but only on a
    // one-time plan", so the decision is made here per membership.
    const entitled = candidates.filter(
      (m) => accessFor(m.status, m.plan?.id) !== "revoke",
    );
    const active = entitled.length > 0;

    // Report the best tier held, so a facility on Growth is not described by
    // a Starter membership that is also still entitled.
    const RANK = { starter: 0, family: 1, basic: 2, growth: 3 } as const;
    let tier: string | undefined;
    let dunning = false;

    for (const m of entitled) {
      if (accessFor(m.status, m.plan?.id) === "grace") dunning = true;
      const t = tierFor(m.plan?.id, m.plan?.metadata?.tier);
      if (t && (!tier || RANK[t] > RANK[tier as keyof typeof RANK])) tier = t;
    }

    console.log(
      `[/api/access] ${entitled.length}/${candidates.length} facility membership(s) entitled -> active=${active} tier=${tier ?? "?"}${dunning ? " dunning" : ""}`,
    );

    // `active` is what src/lib/api.ts reads. `has_access` is an alias so a
    // caller expecting either name works.
    return NextResponse.json({ active, has_access: active, tier, dunning });
  } catch (error) {
    console.error("[/api/access]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
