import { redirect } from "next/navigation";

// Connections merged into "Your floor" — the plan page already showed
// this map, and two pages answering the same question was one too many.
export default function ConnectionsPage() {
  redirect("/floor");
}
