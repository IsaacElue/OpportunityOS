import type { ScoutDecision } from "@/lib/scout/intelligence/types";

export type ScoutToolPlan = {
  next_tool: string | null;
  reason: string;
  expected_result: string;
  confidence: number;
};

export type PlanScoutToolInput = {
  decision: ScoutDecision;
  called_tools?: readonly string[];
};
