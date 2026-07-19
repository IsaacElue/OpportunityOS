export type ScoutExecutionStatus = "active" | "completed" | "failed";

export type ScoutExecution = {
  id: string;
  organization_id: string;
  objective_id: string;
  started_at: string;
  completed_at: string | null;
  status: ScoutExecutionStatus;
  summary: Record<string, unknown>;
  steps_completed: number;
  tools_used: string[];
  created_at: string;
  updated_at: string;
};

export type CreateScoutExecutionInput = {
  organization_id: string;
  objective_id: string;
  started_at?: string;
  summary?: Record<string, unknown>;
  steps_completed?: number;
  tools_used?: string[];
};

export type UpdateScoutExecutionStatusInput = {
  organization_id: string;
  execution_id: string;
  status: ScoutExecutionStatus;
  completed_at?: string | null;
  summary?: Record<string, unknown>;
  steps_completed?: number;
  tools_used?: string[];
};

export type GetScoutExecutionsInput = {
  organization_id: string;
  objective_id?: string;
  status?: ScoutExecutionStatus;
};
