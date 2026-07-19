import type { ScoutBrainContext } from "@/lib/scout/brain/types";
import type { ScoutDecision } from "@/lib/scout/intelligence/types";
import type { ToolResult } from "@/lib/scout/tools/types";

export type ScoutAgentAction =
  | "research_market"
  | "find_evidence"
  | "analyze_problem"
  | "compare_opportunities"
  | "request_feedback"
  | "summarize_findings";

export type ScoutAgentPlan = {
  action: ScoutAgentAction;
  reasoning: string;
  next_step: string;
};

export type ScoutAgentExecution = {
  status: "planned";
  message: string;
};

export type RunScoutAgentInput = {
  context: ScoutBrainContext;
  goal: string;
};

export type ScoutAgentPlanRun = {
  plan: ScoutAgentPlan;
  execution: ScoutAgentExecution;
};

export type ScoutAgentRun = {
  goal: string;
  decision: ScoutDecision;
  tool_result?: ToolResult;
  observation: string;
};

export type RunScoutLoopInput = RunScoutAgentInput;
