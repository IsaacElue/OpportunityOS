import "server-only";

import type { GetScoutExecutionsInput, ScoutExecution } from "@/lib/scout/executions/types";
import { createAdminClient } from "@/lib/supabase/admin";

const executionColumns = "id,organization_id,objective_id,started_at,completed_at,status,summary,steps_completed,tools_used,created_at,updated_at";

/** Load an organization's newest Scout execution records with optional filters. */
export async function getScoutExecutions({
  organization_id,
  objective_id,
  status
}: GetScoutExecutionsInput): Promise<ScoutExecution[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("scout_executions")
    .select(executionColumns)
    .eq("organization_id", organization_id);
  if (objective_id) query = query.eq("objective_id", objective_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("started_at", { ascending: false });
  if (error) throw new Error(`Unable to load Scout executions: ${error.message}`);

  return (data ?? []) as ScoutExecution[];
}
