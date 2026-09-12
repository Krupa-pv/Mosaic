import { events } from "@shared/seed";
import ActivitiesView from "@/components/activities/ActivitiesView";

export default function ActivitiesPage() {
  return <ActivitiesView events={events} />;
}
