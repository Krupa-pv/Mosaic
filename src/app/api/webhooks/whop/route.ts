import { NextResponse } from "next/server";
import { unwrapWebhook, WebhookVerificationError } from "@whop/sdk/helpers";
import {
  deactivateTenant,
  markDelivery,
  upsertTenant,
} from "../../../../../lib/tenants";

// standardwebhooks needs node crypto, so this route cannot run on edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The SDK verifies the signature but does not model the payload —
 * `Whop.WebhookEvent` is the enum of event *names*, not a body type. So the
 * envelope is typed here and read defensively.
 *
 * Whop follows the Standard Webhooks spec, which names the event field
 * `type`, but their older webhooks used `action`. Rather than bet on one,
 * read whichever is present and log which it was — the first real delivery
 * then settles it for good.
 */
interface WhopWebhookBody {
  type?: string;
  action?: string;
  event?: string;
  data?: {
    id?: string;
    user?: { id?: string };
    user_id?: string;
    product?: { id?: string };
    product_id?: string;
  };
}

function eventNameOf(body: WhopWebhookBody): { name?: string; field?: string } {
  if (body.type) return { name: body.type, field: "type" };
  if (body.action) return { name: body.action, field: "action" };
  if (body.event) return { name: body.event, field: "event" };
  return {};
}

export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[whop-webhook] WHOP_WEBHOOK_SECRET is not set — refusing to process");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Must be the raw bytes. The signature covers exactly what was sent, so
  // parsing first and re-serializing would fail verification.
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);

  let body: WhopWebhookBody;
  try {
    body = unwrapWebhook<WhopWebhookBody>(payload, { headers, key: secret });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.warn("[whop-webhook] signature rejected:", error.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.error("[whop-webhook] verification failed:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { name: eventName, field } = eventNameOf(body);
  const deliveryId = headers["webhook-id"] ?? "unknown";
  console.log(`[whop-webhook] verified ${eventName ?? "(unnamed)"} via "${field ?? "none"}", delivery ${deliveryId}`);

  // Whop delivers at least once. A repeat is a success, not an error —
  // returning non-2xx would make Whop retry it forever.
  if (!markDelivery(deliveryId)) {
    console.log(`[whop-webhook] duplicate delivery ${deliveryId}, skipping`);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const membershipId = body.data?.id;

  switch (eventName) {
    case "membership.activated":
    case "membership.went_valid": {
      if (!membershipId) {
        console.warn("[whop-webhook] activation with no data.id, ignoring");
        return NextResponse.json({ ok: true, ignored: "missing membership id" });
      }
      const tenant = upsertTenant({
        whopMembershipId: membershipId,
        whopProductId: body.data?.product?.id ?? body.data?.product_id,
        ownerWhopUserId: body.data?.user?.id ?? body.data?.user_id,
        status: "active",
      });
      console.log(`[whop-webhook] tenant active: ${tenant.whopMembershipId} (owner ${tenant.ownerWhopUserId ?? "unknown"})`);
      return NextResponse.json({ ok: true, tenant });
    }

    case "membership.deactivated":
    case "membership.went_invalid": {
      if (!membershipId) {
        return NextResponse.json({ ok: true, ignored: "missing membership id" });
      }
      const tenant = deactivateTenant(membershipId);
      console.log(
        tenant
          ? `[whop-webhook] tenant inactive: ${membershipId}`
          : `[whop-webhook] deactivation for unknown membership ${membershipId}`,
      );
      return NextResponse.json({ ok: true, tenant: tenant ?? null });
    }

    default:
      // Acknowledge everything else. A non-2xx makes Whop retry an event
      // we were never going to act on.
      console.log(`[whop-webhook] no handler for ${eventName ?? "(unnamed)"}, acknowledged`);
      return NextResponse.json({ ok: true, handled: false });
  }
}
