import "server-only";

import type {
  ScoutExecution,
  UpdateScoutExecutionStatusInput
} from "@/lib/scout/executions/types";
import { createAdminClient } from "@/lib/supabase/admin";

const executionColumns = "id,organization_id,objective_id,started_at,completed_at,status,summary,steps_completed,tools_used,created_at,updated_at";

/** Update one organization-scoped execution's status and optional completion details. */
export async function updateScoutExecutionStatus({
  organization_id,
  execution_id,
  status,
  completed_at,
  summary,
  steps_completed,
  tools_used
}: UpdateScoutExecutionStatusInput): Promise<ScoutExecution | null> {
  const supabase = createAdminClient();
  const updates = {
    status,
    ...(completed_at !== undefined ? { completed_at } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(steps_completed !== undefined ? { steps_completed } : {}),
    ...(tools_used !== undefined ? { tools_used } : {})
  };
  const { data, error } = await supabase
    .from("scout_executions")
    .update(updates)
    .eq("organization_id", organization_id)
    .eq("id", execution_id)
    .select(executionColumns)
    .maybeSingle();
  if (error) throw new Error(`Unable to update Scout execution: ${error.message}`);

  return data as ScoutExecution | null;
}
