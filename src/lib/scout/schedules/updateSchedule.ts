import "server-only";

import type { ScoutSchedule, UpdateScoutScheduleInput } from "@/lib/scout/schedules/types";
import { createAdminClient } from "@/lib/supabase/admin";

const scheduleColumns = "id,organization_id,objective_id,frequency,next_run_at,enabled,last_run_at,created_at,updated_at";

/** Update only an organization-scoped Scout schedule definition. */
export async function updateScoutSchedule({
  organization_id,
  schedule_id,
  frequency,
  next_run_at,
  enabled,
  last_run_at
}: UpdateScoutScheduleInput): Promise<ScoutSchedule | null> {
  const updates = {
    ...(frequency !== undefined ? { frequency } : {}),
    ...(next_run_at !== undefined ? { next_run_at } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(last_run_at !== undefined ? { last_run_at } : {})
  };
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_schedules")
    .update(updates)
    .eq("organization_id", organization_id)
    .eq("id", schedule_id)
    .select(scheduleColumns)
    .maybeSingle();
  if (error) throw new Error(`Unable to update Scout schedule: ${error.message}`);

  return data as ScoutSchedule | null;
}
