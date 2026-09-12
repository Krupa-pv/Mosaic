// ============================================================
// Who looks after whom.
//
// There was no answer to "who is this resident assigned to" anywhere in
// the app, which makes every suggestion ownerless — a recommendation
// nobody is responsible for is a recommendation nobody does.
//
// No auth in this build, so the signed-in caregiver is a constant.
// ============================================================

export interface Staff {
  id: string;
  firstName: string;
  /** Optional — staff are known by first name on the floor. */
  lastName?: string;
  role: string;
  shift: "day" | "evening";
}

/** Display name, tolerating staff with no surname on record. */
export function staffName(s: Staff): string {
  return [s.firstName, s.lastName].filter(Boolean).join(" ");
}

/** Initials for an avatar, from whatever name parts exist. */
export function staffInitials(s: Staff): string {
  return (s.firstName[0] + (s.lastName?.[0] ?? "")).toUpperCase();
}

export const staff: Staff[] = [
  { id: "menaka", firstName: "Menaka", role: "CNA", shift: "day" },
  { id: "krupa", firstName: "Krupa", role: "CNA", shift: "day" },
];

/** The caregiver using the app. */
export const CURRENT_STAFF_ID = "menaka";

// Two caregivers, splitting the floor. Menaka holds the demo set.
const assignment: Record<string, string> = {
  margaret: "menaka",
  helen: "menaka",
  dorothy: "menaka",
  frances: "menaka",
  eleanor: "menaka",
  thomas: "menaka",
  robert: "krupa",
  arthur: "krupa",
  beatrice: "krupa",
  walter: "krupa",
  yolanda: "krupa",
  samuel: "krupa",
  irene: "krupa",
};

export function staffFor(residentId: string): Staff | undefined {
  const id = assignment[residentId];
  return staff.find((s) => s.id === id);
}

export function currentStaff(): Staff {
  return staff.find((s) => s.id === CURRENT_STAFF_ID) ?? staff[0];
}

export function residentsOf(staffId: string): string[] {
  return Object.entries(assignment)
    .filter(([, s]) => s === staffId)
    .map(([r]) => r);
}

export function isMine(residentId: string): boolean {
  return assignment[residentId] === CURRENT_STAFF_ID;
}
