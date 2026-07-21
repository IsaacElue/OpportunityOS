import "server-only";

import { runScheduledScoutSessions } from "@/lib/scout/schedules/runScheduledSessions";
import type {
  RunScoutBackgroundCycleInput,
  ScoutBackgroundCycleResult
} from "@/lib/scout/background/types";

/** Execute one server-side Scout scheduling cycle; invocation remains the caller's responsibility. */
export async function runScoutBackgroundCycle({
  organization_id,
  due_at
}: RunScoutBackgroundCycleInput): Promise<ScoutBackgroundCycleResult> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const logContext = {
    organization_id,
    objective_id: null,
    execution_id: null
  };
  console.info("Scout background cycle started", {
    ...logContext,
    duration_ms: 0,
    status: "running"
  });

  try {
    const scheduledSessions = await runScheduledScoutSessions({
      organization_id,
      ...(due_at ? { due_at } : {})
    });
    const completedAt = new Date().toISOString();
    const result = {
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: Date.now() - startedAtMs,
      ...scheduledSessions
    };
    console.info("Scout background cycle completed", {
      ...logContext,
      duration_ms: result.duration_ms,
      status: result.failed > 0 ? "completed_with_failures" : "completed"
    });

    return result;
  } catch (error) {
    console.error("Scout background cycle failed", {
      ...logContext,
      duration_ms: Date.now() - startedAtMs,
      status: "failed",
      error: "Background cycle failed."
    });
    throw error;
  }
}
