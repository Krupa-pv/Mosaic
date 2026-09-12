import { buildFloorGraph } from "../../../lib/graph";
import { highRiskIds } from "@/lib/directory";
import ConnectionsView from "@/components/connections/ConnectionsView";

// Computed on the server from the same scorer the rest of the app uses.
// Deterministic and LLM-free, so it works with no credentials configured.
export default function ConnectionsPage() {
  return <ConnectionsView graph={buildFloorGraph({ highRiskIds: highRiskIds() })} />;
}
