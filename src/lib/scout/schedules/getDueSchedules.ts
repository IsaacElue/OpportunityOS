import "server-only";

import type { GetDueScoutSchedulesInput, ScoutSchedule } from "@/lib/scout/schedules/types";
import { createAdminClient } from "@/lib/supabase/admin";

const scheduleColumns = "id,organization_id,objective_id,frequency,next_run_at,enabled,last_run_at,created_at,updated_at";

/** Load enabled schedules due for an organization; execution remains the caller's responsibility. */
export async function getDueScoutSchedules({
  organization_id,
  due_at = new Date().toISOString()
}: GetDueScoutSchedulesInput): Promise<ScoutSchedule[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_schedules")
    .select(scheduleColumns)
    .eq("organization_id", organization_id)
    .eq("enabled", true)
    .lte("next_run_at", due_at)
    .order("next_run_at", { ascending: true });
  if (error) throw new Error(`Unable to load due Scout schedules: ${error.message}`);

  return (data ?? []) as ScoutSchedule[];
}
