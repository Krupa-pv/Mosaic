import { NextResponse } from "next/server";

// Whop access gate. Whop only ever sees the facility's subscription status —
// no resident or clinical data crosses this boundary.
//
// Endpoint shape verified against docs.whop.com (Sept 2026):
//   GET https://api.whop.com/api/v1/memberships
//   Authorization: Bearer <account API key>
//   account_id  — the seller company, a biz_... id. Required with an API key.
//   statuses[]  — one of trialing | active | past_due | completed |
//                 canceled | expired | unresolved | drafted | canceling
//   first       — page size
// Response: { data: [...], page_info, total_count }
//
// Until the key and account id are set this returns 503 so the client's
// graceful path runs. An unconfigured gate must not claim an active
// subscription.

const WHOP_API = "https://api.whop.com/api/v1";

// Statuses that mean the facility has paid and has not been revoked.
//
// "completed" is in this list because the Mosaic plan is a one-time
// purchase (plan_type "one_time", release_method "buy_now"). A one-time
// membership never becomes "active" — it settles to "completed" once
// fulfilled, and that IS the entitled terminal state. "active" and
// "trialing" stay so the gate keeps working if the plan is ever switched
// to a recurring one.
//
// Caveat worth knowing before changing the plan: on a RECURRING plan
// "completed" means the subscription ran its course and ended, which
// should not grant access. Revisit this list if the plan type changes.
//
// "canceled" and "expired" are deliberately absent.
const ENTITLED = ["active", "trialing", "completed"];

export async function GET() {
  const apiKey = process.env.WHOP_API_KEY;
  const accountId = process.env.WHOP_ACCOUNT_ID ?? process.env.WHOP_COMPANY_ID;

  if (!apiKey || !accountId) {
    return NextResponse.json({ error: "Whop not configured" }, { status: 503 });
  }

  const params = new URLSearchParams({ account_id: accountId, first: "1" });
  for (const status of ENTITLED) params.append("statuses[]", status);

  try {
    const res = await fetch(`${WHOP_API}/memberships?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Api-Version-Date": "2026-07-01",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[/api/access] Whop returned", res.status, detail.slice(0, 300));
      return NextResponse.json({ error: `Whop returned ${res.status}` }, { status: 502 });
    }

    const json = (await res.json()) as { data?: unknown[]; total_count?: number };
    const count = json.total_count ?? json.data?.length ?? 0;
    const active = count > 0;

    console.log(`[/api/access] ${count} entitled membership(s) -> active=${active}`);

    // `active` is what src/lib/api.ts reads. `has_access` is an alias so a
    // caller expecting either name works.
    return NextResponse.json({ active, has_access: active });
  } catch (error) {
    console.error("[/api/access]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
