import type { ScoutBrainContext } from "@/lib/scout/brain";
import type { ScoutExecution } from "@/lib/scout/executions";

export type ScoutBriefingPriority = "low" | "medium" | "high";

export type ScoutBriefingInsight = {
  title: string;
  detail: string;
  priority: ScoutBriefingPriority;
};

export type ScoutBriefingRecommendedAction = {
  title: string;
  detail: string;
  priority: ScoutBriefingPriority;
};

export type ScoutBriefing = {
  greeting: string;
  summary: string;
  insights: ScoutBriefingInsight[];
  recommended_actions: ScoutBriefingRecommendedAction[];
  priority: ScoutBriefingPriority;
  generated_at: string;
};

export type GenerateScoutBriefingInput = {
  context?: ScoutBrainContext | null;
  recent_executions?: ScoutExecution[] | null;
  generated_at?: Date;
};
