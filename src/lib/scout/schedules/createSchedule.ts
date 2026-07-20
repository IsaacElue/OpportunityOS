import "server-only";

import { getScoutObjective } from "@/lib/scout/objectives/getObjectives";
import type { CreateScoutScheduleInput, ScoutSchedule } from "@/lib/scout/schedules/types";
import { createAdminClient } from "@/lib/supabase/admin";

const scheduleColumns = "id,organization_id,objective_id,frequency,next_run_at,enabled,last_run_at,created_at,updated_at";

/** Create a trusted schedule only for an objective owned by the supplied organization. */
export async function createScoutSchedule(input: CreateScoutScheduleInput): Promise<ScoutSchedule> {
  const objective = await getScoutObjective({
    organization_id: input.organization_id,
    objective_id: input.objective_id
  });
  if (!objective) throw new Error("Unable to create Scout schedule for that objective.");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_schedules")
    .insert({
      organization_id: input.organization_id,
      objective_id: input.objective_id,
      frequency: input.frequency,
      next_run_at: input.next_run_at,
      enabled: input.enabled ?? true
    })
    .select(scheduleColumns)
    .single();
  if (error) throw new Error(`Unable to create Scout schedule: ${error.message}`);

  return data as ScoutSchedule;
}
