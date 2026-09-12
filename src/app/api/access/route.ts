import { NextResponse } from "next/server";

// Whop access gate. Whop only ever sees the facility's subscription status —
// no resident or clinical data crosses this boundary.
//
// Until WHOP_API_KEY and WHOP_COMPANY_ID are set, this returns 503 so the
// client's graceful path runs and reports the gate as unwired. That is
// honest: an unconfigured gate should not claim an active subscription.

export async function GET() {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;

  if (!apiKey || !companyId) {
    return NextResponse.json({ error: "Whop not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.whop.com/api/v2/memberships?company_id=${encodeURIComponent(companyId)}&valid=true&per=1`,
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Whop returned ${res.status}` }, { status: 502 });
    }

    const json = (await res.json()) as { data?: unknown[] };
    return NextResponse.json({ active: (json.data?.length ?? 0) > 0 });
  } catch (error) {
    console.error("[/api/access]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
