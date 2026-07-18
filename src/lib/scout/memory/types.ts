export type ScoutMemoryType = "preference" | "rejection" | "interest" | "goal" | "feedback";

export type ScoutMemory = {
  id: string;
  organization_id: string;
  user_id: string;
  memory_type: ScoutMemoryType;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SaveScoutMemoryInput = {
  organization_id: string;
  user_id: string;
  memory_type: ScoutMemoryType;
  content: string;
  metadata?: Record<string, unknown>;
};

export type GetScoutMemoriesInput = {
  organization_id: string;
  memory_type?: ScoutMemoryType;
};
