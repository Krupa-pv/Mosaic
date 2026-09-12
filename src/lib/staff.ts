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
  lastName: string;
  role: string;
  shift: "day" | "evening";
}

export const staff: Staff[] = [
  { id: "menaka", firstName: "Menaka", lastName: "Raman", role: "CNA", shift: "day" },
  { id: "marcus", firstName: "Marcus", lastName: "Bell", role: "CNA", shift: "day" },
  { id: "priya", firstName: "Priya", lastName: "Nair", role: "LPN", shift: "evening" },
];

/** The caregiver using the app. */
export const CURRENT_STAFF_ID = "menaka";

const assignment: Record<string, string> = {
  margaret: "menaka",
  helen: "menaka",
  dorothy: "menaka",
  frances: "menaka",
  robert: "marcus",
  arthur: "marcus",
  beatrice: "marcus",
  walter: "priya",
  yolanda: "priya",
  samuel: "priya",
  irene: "priya",
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
