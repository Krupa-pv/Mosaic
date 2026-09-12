// ============================================================
// Whop product, plan and status catalog.
//
// One webhook endpoint receives every event for both products, so routing
// happens here rather than being scattered through the handler.
//
// Verified against the live account (GET /products, GET /plans) rather
// than transcribed — re-run those if a plan is added in the dashboard.
// ============================================================

export type ProductKind = "facility" | "family";
export type Tier = "starter" | "basic" | "growth" | "family";

interface ProductSpec {
  name: string;
  kind: ProductKind;
}

// Two Nursing Homes products exist. The newer one is what .env.local
// points at; the older one still carries live memberships, so both grant
// facility access and neither can be dropped yet.
export const PRODUCTS: Record<string, ProductSpec> = {
  prod_l7zWolodBoxKz: { name: "Mosaic for Nursing Homes", kind: "facility" },
  prod_UBbrTBEoC3xQW: { name: "Mosaic for Nursing Homes (legacy)", kind: "facility" },
  prod_xuhpewe0Fs48C: { name: "Mosaic for Family", kind: "family" },
};

interface PlanSpec {
  tier: Tier;
  /** Monthly price in USD. */
  monthly: number;
  /** A one-time plan settles to "completed" once fulfilled, and that is
   *  its entitled terminal state. On a renewal plan "completed" means the
   *  subscription ran its course and ended, which must NOT grant access. */
  oneTime: boolean;
}

export const PLANS: Record<string, PlanSpec> = {
  // prod_l7zWolodBoxKz — current pricing. These carry no metadata.tier,
  // so the mapping is by price, ascending.
  plan_i9jMQwnkfaypN: { tier: "starter", monthly: 29.99, oneTime: false },
  plan_bSwFF2ondz53F: { tier: "basic", monthly: 39.99, oneTime: false },
  plan_fZrkKlznGRj8N: { tier: "growth", monthly: 79.99, oneTime: false },

  // prod_UBbrTBEoC3xQW — legacy pricing, still has live memberships.
  plan_NmK4hEHqqlTno: { tier: "starter", monthly: 0, oneTime: true },
  plan_VWvT23IssuzF3: { tier: "basic", monthly: 199, oneTime: false },
  plan_0SATrHJQFp1SF: { tier: "growth", monthly: 499, oneTime: false },

  // prod_xuhpewe0Fs48C
  plan_hswCD4Xon07jE: { tier: "family", monthly: 20, oneTime: false },
};

export function productKind(productId?: string): ProductKind | undefined {
  return productId ? PRODUCTS[productId]?.kind : undefined;
}

/**
 * Products whose subscription unlocks the staff dashboard.
 * WHOP_PRODUCT_ID is honoured too, so pointing .env.local at a newly
 * created product works without a code change.
 */
export function facilityProductIds(): string[] {
  const ids = Object.entries(PRODUCTS)
    .filter(([, spec]) => spec.kind === "facility")
    .map(([id]) => id);

  const fromEnv = process.env.WHOP_PRODUCT_ID;
  if (fromEnv && !ids.includes(fromEnv)) ids.push(fromEnv);
  return ids;
}

/**
 * Plan id is authoritative because it is the identifier Whop guarantees.
 * `metadata.tier` carries the same string on the legacy plans and covers a
 * plan added in the dashboard that nobody has added here yet, so it is the
 * fallback rather than the source.
 */
export function tierFor(planId?: string, metadataTier?: unknown): Tier | undefined {
  if (planId && PLANS[planId]) return PLANS[planId].tier;

  const fromMetadata = typeof metadataTier === "string" ? metadataTier.toLowerCase() : undefined;
  if (fromMetadata && ["starter", "basic", "growth", "family"].includes(fromMetadata)) {
    return fromMetadata as Tier;
  }
  return undefined;
}

// ---- Status -> access ----------------------------------------

export type AccessDecision = "grant" | "grace" | "revoke";

export function accessFor(status?: string, planId?: string): AccessDecision {
  switch (status) {
    case "active":
    case "trialing":
      return "grant";

    case "completed": {
      // Only a one-time plan is entitled here. A renewal plan reaching
      // "completed" has ended.
      const plan = planId ? PLANS[planId] : undefined;
      if (!plan) {
        // Unknown plan: grant, so an unlisted one-time plan does not lock a
        // paying facility out mid-demo. The cost of being wrong is a
        // lapsed renewal keeping access, not a stranger getting in.
        console.warn(`[catalog] "completed" on unknown plan ${planId ?? "(none)"} — granting`);
        return "grant";
      }
      return plan.oneTime ? "grant" : "revoke";
    }

    // Keep the facility working while billing is chased. Flagged, not cut off.
    case "past_due":
      return "grace";

    default:
      return "revoke";
  }
}

/**
 * Statuses worth asking Whop for. "completed" is included because it is
 * entitled on a one-time plan, but the per-membership decision still runs
 * through accessFor() with the plan id.
 */
export const CANDIDATE_STATUSES = ["active", "trialing", "completed", "past_due"];
