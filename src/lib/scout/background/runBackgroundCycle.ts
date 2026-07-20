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
  const scheduledSessions = await runScheduledScoutSessions({
    organization_id,
    ...(due_at ? { due_at } : {})
  });
  const completedAt = new Date().toISOString();

  return {
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: Date.now() - startedAtMs,
    ...scheduledSessions
  };
}
