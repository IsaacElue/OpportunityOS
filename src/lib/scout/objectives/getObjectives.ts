import "server-only";

import type {
  GetScoutObjectiveInput,
  GetScoutObjectivesInput,
  ScoutObjective
} from "@/lib/scout/objectives/types";
import { createAdminClient } from "@/lib/supabase/admin";

const objectiveColumns = "id,organization_id,created_by,title,goal,preferences,status,created_at,updated_at";

/** Load an organization's objectives with optional status filtering. */
export async function getScoutObjectives({
  organization_id,
  status
}: GetScoutObjectivesInput): Promise<ScoutObjective[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("scout_objectives")
    .select(objectiveColumns)
    .eq("organization_id", organization_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load Scout objectives: ${error.message}`);

  return (data ?? []) as ScoutObjective[];
}

/** Load one objective only when it belongs to the requested organization. */
export async function getScoutObjective({
  organization_id,
  objective_id
}: GetScoutObjectiveInput): Promise<ScoutObjective | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_objectives")
    .select(objectiveColumns)
    .eq("organization_id", organization_id)
    .eq("id", objective_id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load Scout objective: ${error.message}`);

  return data as ScoutObjective | null;
}
