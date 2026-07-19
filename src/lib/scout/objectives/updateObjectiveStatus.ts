import "server-only";

import type {
  ScoutObjective,
  UpdateScoutObjectiveStatusInput
} from "@/lib/scout/objectives/types";
import { createAdminClient } from "@/lib/supabase/admin";

const objectiveColumns = "id,organization_id,created_by,title,goal,preferences,status,created_at,updated_at";

/** Update only an objective's status when it belongs to the supplied organization. */
export async function updateScoutObjectiveStatus({
  organization_id,
  objective_id,
  status
}: UpdateScoutObjectiveStatusInput): Promise<ScoutObjective | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_objectives")
    .update({ status })
    .eq("organization_id", organization_id)
    .eq("id", objective_id)
    .select(objectiveColumns)
    .maybeSingle();
  if (error) throw new Error(`Unable to update Scout objective: ${error.message}`);

  return data as ScoutObjective | null;
}
