export type ScoutScheduleFrequency = "daily" | "weekly" | "monthly";

export type ScoutSchedule = {
  id: string;
  organization_id: string;
  objective_id: string;
  frequency: ScoutScheduleFrequency;
  next_run_at: string;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateScoutScheduleInput = {
  organization_id: string;
  objective_id: string;
  frequency: ScoutScheduleFrequency;
  next_run_at: string;
  enabled?: boolean;
};

export type UpdateScoutScheduleInput = {
  organization_id: string;
  schedule_id: string;
  frequency?: ScoutScheduleFrequency;
  next_run_at?: string;
  enabled?: boolean;
  last_run_at?: string | null;
};

export type GetDueScoutSchedulesInput = {
  organization_id: string;
  due_at?: string;
};

export type RunScheduledScoutSessionsInput = GetDueScoutSchedulesInput;

export type ScoutScheduledSessionsResult = {
  total_due: number;
  executed: number;
  skipped: number;
  failed: number;
  execution_summaries: import("@/lib/scout/autonomous/types").ScoutAutonomousExecutionSummary[];
};
