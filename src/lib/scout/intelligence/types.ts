import type { ScoutAgentAction } from "@/lib/scout/agent/types";
import type { ScoutBrainContext } from "@/lib/scout/brain/types";

export type ScoutDecision = {
  action: ScoutAgentAction;
  reasoning: string;
  confidence: number;
  tool_needed: boolean;
  suggested_tool?: string;
};

export type ReasonWithScoutInput = {
  context: ScoutBrainContext;
  goal: string;
};
