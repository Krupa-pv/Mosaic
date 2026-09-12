import { NextResponse } from "next/server";
import { unwrapWebhook, WebhookVerificationError } from "@whop/sdk/helpers";
import {
  accessFor,
  productKind,
  tierFor,
  type ProductKind,
} from "../../../../../lib/whop/catalog";
import {
  deactivateSubscriber,
  deactivateTenant,
  flagDunning,
  markDelivery,
  upsertSubscriber,
  upsertTenant,
} from "../../../../../lib/tenants";

// standardwebhooks needs node crypto, so this route cannot run on edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The SDK verifies the signature but does not model the payload —
 * `Whop.WebhookEvent` is the enum of event *names*, not a body type — and
 * Whop does not publish the envelope. So it is typed here and read
 * defensively, and every field we could not find is logged.
 *
 * Standard Webhooks names the event field `type`; older Whop webhooks used
 * `action`. Read whichever is present.
 */
interface WhopWebhookBody {
  type?: string;
  action?: string;
  event?: string;
  data?: {
    id?: string;
    status?: string;
    user?: { id?: string };
    user_id?: string;
    product?: { id?: string };
    product_id?: string;
    plan?: { id?: string; metadata?: Record<string, unknown> };
    plan_id?: string;
    metadata?: Record<string, unknown>;
    // Payment events reference the membership rather than being one.
    membership?: { id?: string; product?: { id?: string }; plan?: { id?: string } };
    membership_id?: string;
  };
}

function eventNameOf(body: WhopWebhookBody): { name?: string; field?: string } {
  if (body.type) return { name: body.type, field: "type" };
  if (body.action) return { name: body.action, field: "action" };
  if (body.event) return { name: body.event, field: "event" };
  return {};
}

/** On a membership event this is data.id. On a payment event data.id is the
 *  payment, so the membership has to be read from a nested reference. */
function membershipIdOf(body: WhopWebhookBody, isPayment: boolean): string | undefined {
  const d = body.data;
  if (!d) return undefined;
  if (isPayment) return d.membership?.id ?? d.membership_id;
  return d.id;
}

function productIdOf(body: WhopWebhookBody): string | undefined {
  const d = body.data;
  return d?.product?.id ?? d?.product_id ?? d?.membership?.product?.id;
}

function planIdOf(body: WhopWebhookBody): string | undefined {
  const d = body.data;
  return d?.plan?.id ?? d?.plan_id ?? d?.membership?.plan?.id;
}

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...extra });

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
  console.log(
    `[whop-webhook] verified ${eventName ?? "(unnamed)"} via "${field ?? "none"}", delivery ${deliveryId}`,
  );

  // A repeat is a success, not an error — a non-2xx would make Whop retry
  // it forever.
  if (!markDelivery(deliveryId)) {
    console.log(`[whop-webhook] duplicate delivery ${deliveryId}, skipping`);
    return ok({ duplicate: true });
  }

  const isPayment = eventName?.startsWith("payment.") ?? false;
  const membershipId = membershipIdOf(body, isPayment);
  const productId = productIdOf(body);
  const planId = planIdOf(body);

  // ---- Route on product first -------------------------------
  // Which product was bought decides what the event means. A Family
  // subscriber must never provision a facility tenant.
  const kind: ProductKind | undefined = productKind(productId);
  const tier = tierFor(planId, body.data?.plan?.metadata?.tier ?? body.data?.metadata?.tier);

  console.log(
    `[whop-webhook] product=${productId ?? "?"} (${kind ?? "unknown"}) plan=${planId ?? "?"} tier=${tier ?? "?"} membership=${membershipId ?? "?"}`,
  );

  if (!membershipId) {
    console.warn(`[whop-webhook] ${eventName} carried no membership id, acknowledging`);
    return ok({ ignored: "missing membership id" });
  }

  if (!kind) {
    console.warn(`[whop-webhook] unknown product ${productId ?? "(none)"}, acknowledging`);
    return ok({ ignored: "unknown product" });
  }

  // ---- Payment events ---------------------------------------
  // These never grant or revoke access on their own. Whop moves the
  // membership to past_due or canceled and sends a membership event for
  // that. A failed payment raises a flag; a successful one clears it.
  if (isPayment) {
    if (kind === "family") {
      console.log(`[whop-webhook] ${eventName} for a family subscriber, no tenant action`);
      return ok({ kind, handled: false });
    }
    const failed = eventName === "payment.failed";
    const tenant = flagDunning(membershipId, failed);
    console.log(
      tenant
        ? `[whop-webhook] dunning=${failed} on ${membershipId}`
        : `[whop-webhook] ${eventName} for unknown membership ${membershipId}`,
    );
    return ok({ kind, dunning: failed, tenant: tenant ?? null });
  }

  // ---- Membership events ------------------------------------
  const isActivation =
    eventName === "membership.activated" || eventName === "membership.went_valid";
  const isDeactivation =
    eventName === "membership.deactivated" || eventName === "membership.went_invalid";

  if (!isActivation && !isDeactivation) {
    console.log(`[whop-webhook] no handler for ${eventName ?? "(unnamed)"}, acknowledged`);
    return ok({ handled: false });
  }

  // Trust the status on the payload when it is there; the event name is the
  // fallback. past_due arrives as an activation-shaped event but must keep
  // access rather than being treated as a fresh grant.
  const whopStatus = body.data?.status ?? (isActivation ? "active" : "canceled");
  const decision = accessFor(whopStatus, planId);
  const granted = decision !== "revoke";

  if (kind === "family") {
    const subscriber = granted
      ? upsertSubscriber({
          whopMembershipId: membershipId,
          whopProductId: productId,
          whopPlanId: planId,
          whopUserId: body.data?.user?.id ?? body.data?.user_id,
          tier,
          status: "active",
          whopStatus,
        })
      : deactivateSubscriber(membershipId);
    console.log(
      `[whop-webhook] family subscriber ${membershipId} -> ${granted ? "active" : "inactive"} (${whopStatus})`,
    );
    return ok({ kind, subscriber: subscriber ?? null });
  }

  const tenant = granted
    ? upsertTenant({
        whopMembershipId: membershipId,
        whopProductId: productId,
        whopPlanId: planId,
        ownerWhopUserId: body.data?.user?.id ?? body.data?.user_id,
        tier,
        status: "active",
        whopStatus,
        // A membership event that reports past_due keeps the flag raised.
        ...(decision === "grace" ? { dunning: true } : {}),
      })
    : deactivateTenant(membershipId);

  console.log(
    `[whop-webhook] facility tenant ${membershipId} -> ${granted ? "active" : "inactive"} (${whopStatus}, tier ${tier ?? "?"}${decision === "grace" ? ", dunning" : ""})`,
  );

  return ok({ kind, tenant: tenant ?? null });
}
