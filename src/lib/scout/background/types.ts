import type { ScoutAutonomousExecutionSummary } from "@/lib/scout/autonomous/types";

export type RunScoutBackgroundCycleInput = {
  organization_id: string;
  due_at?: string;
};

export type ScoutBackgroundCycleResult = {
  started_at: string;
  completed_at: string;
  duration_ms: number;
  total_due: number;
  executed: number;
  skipped: number;
  failed: number;
  execution_summaries: ScoutAutonomousExecutionSummary[];
};
