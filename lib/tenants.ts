// ============================================================
// Two stores, because the two Whop products mean different things.
//
//   Nursing Homes -> a facility Tenant, which unlocks the dashboard
//   Family        -> a Subscriber record only, which unlocks nothing
//
// In-memory on purpose: this build has no database. Records do not
// survive a restart, and each instance of a multi-instance deploy would
// keep its own copy. This is the seam where real tables go.
//
// Nothing resident-related is stored here. Whop only ever sees billing.
// ============================================================

import type { Tier } from "./whop/catalog";

export interface Tenant {
  whopMembershipId: string;
  whopProductId?: string;
  whopPlanId?: string;
  ownerWhopUserId?: string;
  tier?: Tier;
  /** Our own view: does this tenant get in? */
  status: "active" | "inactive";
  /** Whop's raw membership status, kept for display and debugging. */
  whopStatus?: string;
  /** True while a payment has failed and billing is being chased.
   *  Access continues — this is a flag, not a lock. */
  dunning: boolean;
  updatedAt: string;
}

export interface Subscriber {
  whopMembershipId: string;
  whopProductId?: string;
  whopPlanId?: string;
  whopUserId?: string;
  tier?: Tier;
  status: "active" | "inactive";
  whopStatus?: string;
  updatedAt: string;
}

const tenants = new Map<string, Tenant>();
const subscribers = new Map<string, Subscriber>();

const now = () => new Date().toISOString();

// ---- Facility tenants ----------------------------------------

export function upsertTenant(
  input: Omit<Tenant, "updatedAt" | "dunning"> & { dunning?: boolean },
): Tenant {
  const existing = tenants.get(input.whopMembershipId);
  const record: Tenant = {
    ...existing,
    ...input,
    // An explicit flag wins; otherwise carry the existing one forward so a
    // membership update does not silently clear an open dunning state.
    dunning: input.dunning ?? existing?.dunning ?? false,
    updatedAt: now(),
  };
  tenants.set(input.whopMembershipId, record);
  return record;
}

export function deactivateTenant(whopMembershipId: string): Tenant | undefined {
  const existing = tenants.get(whopMembershipId);
  if (!existing) return undefined;
  const record: Tenant = {
    ...existing,
    status: "inactive",
    dunning: false,
    updatedAt: now(),
  };
  tenants.set(whopMembershipId, record);
  return record;
}

/** Payment failed: keep access, raise the flag. */
export function flagDunning(whopMembershipId: string, dunning: boolean): Tenant | undefined {
  const existing = tenants.get(whopMembershipId);
  if (!existing) return undefined;
  const record: Tenant = { ...existing, dunning, updatedAt: now() };
  tenants.set(whopMembershipId, record);
  return record;
}

export function getTenant(id: string): Tenant | undefined {
  return tenants.get(id);
}

export function listTenants(): Tenant[] {
  return [...tenants.values()];
}

export function hasActiveTenant(): boolean {
  return listTenants().some((t) => t.status === "active");
}

// ---- Family subscribers --------------------------------------

export function upsertSubscriber(input: Omit<Subscriber, "updatedAt">): Subscriber {
  const record: Subscriber = { ...input, updatedAt: now() };
  subscribers.set(input.whopMembershipId, record);
  return record;
}

export function deactivateSubscriber(whopMembershipId: string): Subscriber | undefined {
  const existing = subscribers.get(whopMembershipId);
  if (!existing) return undefined;
  const record: Subscriber = { ...existing, status: "inactive", updatedAt: now() };
  subscribers.set(whopMembershipId, record);
  return record;
}

export function listSubscribers(): Subscriber[] {
  return [...subscribers.values()];
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
