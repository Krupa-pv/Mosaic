// ============================================================
// Whop product, plan and status catalog.
//
// One webhook endpoint receives every event for both products, so routing
// happens here rather than being scattered through the handler.
// ============================================================

export type ProductKind = "facility" | "family";
export type Tier = "starter" | "basic" | "growth" | "family";

interface ProductSpec {
  name: string;
  kind: ProductKind;
}

export const PRODUCTS: Record<string, ProductSpec> = {
  prod_UBbrTBEoC3xQW: { name: "Nursing Homes", kind: "facility" },
  prod_xuhpewe0Fs48C: { name: "Family", kind: "family" },
};

/** The product whose subscription unlocks the staff dashboard. */
export const FACILITY_PRODUCT_ID = "prod_UBbrTBEoC3xQW";

interface PlanSpec {
  tier: Tier;
  /** Monthly price in USD. Starter is free. */
  monthly: number;
}

export const PLANS: Record<string, PlanSpec> = {
  plan_NmK4hEHqqlTno: { tier: "starter", monthly: 0 },
  plan_VWvT23IssuzF3: { tier: "basic", monthly: 199 },
  plan_0SATrHJQFp1SF: { tier: "growth", monthly: 499 },
  plan_hswCD4Xon07jE: { tier: "family", monthly: 20 },
};

export function productKind(productId?: string): ProductKind | undefined {
  return productId ? PRODUCTS[productId]?.kind : undefined;
}

/**
 * Plan id is authoritative because it is the identifier Whop guarantees.
 * `metadata.tier` carries the same string and covers a plan added in the
 * dashboard that nobody has added here yet, so it is the fallback rather
 * than the source.
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

const STATUS_ACCESS: Record<string, AccessDecision> = {
  active: "grant",
  trialing: "grant",
  // A one-time plan never becomes "active" — the free Starter settles here.
  completed: "grant",
  // Keep the facility working while billing is chased. Flagged, not cut off.
  past_due: "grace",
  canceled: "revoke",
  expired: "revoke",
};

export function accessFor(status?: string): AccessDecision {
  if (!status) return "revoke";
  return STATUS_ACCESS[status] ?? "revoke";
}

/** Statuses that keep the dashboard open, for the Whop list-memberships filter. */
export const ENTITLED_STATUSES = Object.entries(STATUS_ACCESS)
  .filter(([, decision]) => decision !== "revoke")
  .map(([status]) => status);
