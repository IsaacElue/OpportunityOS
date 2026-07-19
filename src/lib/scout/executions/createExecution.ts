import "server-only";

import type { CreateScoutExecutionInput, ScoutExecution } from "@/lib/scout/executions/types";
import { createAdminClient } from "@/lib/supabase/admin";

const executionColumns = "id,organization_id,objective_id,started_at,completed_at,status,summary,steps_completed,tools_used,created_at,updated_at";

/** Create a trusted server-side record for an active Scout execution. */
export async function createScoutExecution(input: CreateScoutExecutionInput): Promise<ScoutExecution> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_executions")
    .insert({
      organization_id: input.organization_id,
      objective_id: input.objective_id,
      ...(input.started_at ? { started_at: input.started_at } : {}),
      status: "active",
      summary: input.summary ?? {},
      steps_completed: input.steps_completed ?? 0,
      tools_used: input.tools_used ?? []
    })
    .select(executionColumns)
    .single();
  if (error) throw new Error(`Unable to create Scout execution: ${error.message}`);

  return data as ScoutExecution;
}
