// ============================================================
// Tenant store — facilities that have an active Whop subscription.
//
// In-memory on purpose: this build has no database. That means tenants
// do not survive a server restart, and in a multi-instance deploy each
// instance would keep its own copy. Fine for the hackathon, wrong for
// production — this is the seam where a real table goes.
//
// Nothing resident-related is ever stored here. Whop only sees billing.
// ============================================================

export interface Tenant {
  whopMembershipId: string;
  whopProductId?: string;
  ownerWhopUserId?: string;
  status: "active" | "inactive";
  updatedAt: string;
}

const tenants = new Map<string, Tenant>();

export function upsertTenant(tenant: Omit<Tenant, "updatedAt">): Tenant {
  const record: Tenant = { ...tenant, updatedAt: new Date().toISOString() };
  tenants.set(tenant.whopMembershipId, record);
  return record;
}

export function deactivateTenant(whopMembershipId: string): Tenant | undefined {
  const existing = tenants.get(whopMembershipId);
  if (!existing) return undefined;
  const record: Tenant = {
    ...existing,
    status: "inactive",
    updatedAt: new Date().toISOString(),
  };
  tenants.set(whopMembershipId, record);
  return record;
}

export function getTenant(whopMembershipId: string): Tenant | undefined {
  return tenants.get(whopMembershipId);
}

export function listTenants(): Tenant[] {
  return [...tenants.values()];
}

// ---- Idempotency ---------------------------------------------
// Whop delivers at least once, so duplicates are expected rather than
// exceptional. Bounded so a long-running process cannot grow without limit.

const MAX_SEEN = 1000;
const seen = new Set<string>();

/** True the first time this delivery id is seen, false on a repeat. */
export function markDelivery(webhookId: string): boolean {
  if (seen.has(webhookId)) return false;
  seen.add(webhookId);
  if (seen.size > MAX_SEEN) seen.delete(seen.values().next().value as string);
  return true;
}
