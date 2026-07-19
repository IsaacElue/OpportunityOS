export type ScoutObjectiveStatus = "active" | "paused" | "completed";

export type ScoutObjective = {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  goal: string;
  preferences: Record<string, unknown>;
  status: ScoutObjectiveStatus;
  created_at: string;
  updated_at: string;
};

export type SaveScoutObjectiveInput = {
  organization_id: string;
  created_by: string;
  title: string;
  goal: string;
  preferences?: Record<string, unknown>;
  status?: ScoutObjectiveStatus;
};

export type GetScoutObjectivesInput = {
  organization_id: string;
  status?: ScoutObjectiveStatus;
};

export type GetScoutObjectiveInput = {
  organization_id: string;
  objective_id: string;
};
