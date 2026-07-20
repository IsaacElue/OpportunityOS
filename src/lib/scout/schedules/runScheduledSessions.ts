import "server-only";

import { runScoutAutonomousSession } from "@/lib/scout/autonomous/runAutonomousSession";
import type { ScoutAutonomousExecutionSummary } from "@/lib/scout/autonomous/types";
import { getScoutObjective } from "@/lib/scout/objectives/getObjectives";
import { getDueScoutSchedules } from "@/lib/scout/schedules/getDueSchedules";
import type {
  RunScheduledScoutSessionsInput,
  ScoutSchedule,
  ScoutScheduledSessionsResult
} from "@/lib/scout/schedules/types";
import { updateScoutSchedule } from "@/lib/scout/schedules/updateSchedule";

function nextRunAt(schedule: ScoutSchedule, lastRunAt: string) {
  const next = new Date(lastRunAt);

  if (schedule.frequency === "daily") next.setUTCDate(next.getUTCDate() + 1);
  if (schedule.frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (schedule.frequency === "monthly") {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDayOfMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDayOfMonth));
  }

  return next.toISOString();
}

function boundedError(error: unknown) {
  return error instanceof Error && error.message
    ? error.message.slice(0, 300)
    : "Unknown scheduled session failure.";
}

function recordFailure(scheduleId: string, error: unknown) {
  console.error("Scout scheduled session failed", {
    schedule_id: scheduleId,
    error: boundedError(error)
  });
}

/** Run due schedules sequentially; callers remain responsible for invoking this runner. */
export async function runScheduledScoutSessions({
  organization_id,
  due_at
}: RunScheduledScoutSessionsInput): Promise<ScoutScheduledSessionsResult> {
  const schedules = await getDueScoutSchedules({ organization_id, ...(due_at ? { due_at } : {}) });
  const executionSummaries: ScoutAutonomousExecutionSummary[] = [];
  let executed = 0;
  let skipped = 0;
  let failed = 0;

  for (const schedule of schedules) {
    try {
      const objective = await getScoutObjective({
        organization_id,
        objective_id: schedule.objective_id
      });
      if (!objective || objective.status !== "active") {
        skipped += 1;
        continue;
      }

      const execution = await runScoutAutonomousSession({
        organization_id,
        objective_id: objective.id
      });
      executionSummaries.push(execution);

      if (execution.status === "no_active_objective") {
        skipped += 1;
        continue;
      }
      if (execution.status !== "completed") {
        failed += 1;
        recordFailure(schedule.id, new Error(`Autonomous session ${execution.status}.`));
        continue;
      }

      const updatedSchedule = await updateScoutSchedule({
        organization_id,
        schedule_id: schedule.id,
        last_run_at: execution.completed_at,
        next_run_at: nextRunAt(schedule, execution.completed_at)
      });
      if (!updatedSchedule) throw new Error("Scheduled metadata update was not applied.");

      executed += 1;
    } catch (error) {
      failed += 1;
      recordFailure(schedule.id, error);
    }
  }

  return {
    total_due: schedules.length,
    executed,
    skipped,
    failed,
    execution_summaries: executionSummaries
  };
}
