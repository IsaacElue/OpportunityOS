export type ScoutAutonomousExecutionStatus = "completed" | "stopped" | "no_active_objective" | "failed";

export type ScoutAutonomousExecutionSummary = {
  objective_id: string | null;
  objective_title: string | null;
  status: ScoutAutonomousExecutionStatus;
  steps_completed: number;
  tools_used: string[];
  final_response: string;
  started_at: string;
  completed_at: string;
};

export type RunScoutAutonomousSessionInput = {
  organization_id: string;
  objective_id?: string;
};
