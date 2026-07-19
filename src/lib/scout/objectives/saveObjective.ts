import "server-only";

import type { SaveScoutObjectiveInput, ScoutObjective } from "@/lib/scout/objectives/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Save a trusted server-side objective for Scout. */
export async function saveScoutObjective(input: SaveScoutObjectiveInput): Promise<ScoutObjective> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_objectives")
    .insert({
      organization_id: input.organization_id,
      created_by: input.created_by,
      title: input.title,
      goal: input.goal,
      preferences: input.preferences ?? {},
      status: input.status ?? "active"
    })
    .select("id,organization_id,created_by,title,goal,preferences,status,created_at,updated_at")
    .single();
  if (error) throw new Error(`Unable to save Scout objective: ${error.message}`);

  return data as ScoutObjective;
}
