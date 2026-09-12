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

// A facility on a free trial still has access.
const ENTITLED = ["active", "trialing"];

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

    return NextResponse.json({ active: count > 0 });
  } catch (error) {
    console.error("[/api/access]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
