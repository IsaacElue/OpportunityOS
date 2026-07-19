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

export type ScoutAgentStep = {
  decision: ScoutDecision;
  tool?: string;
  result?: ToolResult;
  observation: string;
};

export type ScoutAgentRun = {
  goal: string;
  steps: ScoutAgentStep[];
  final_response: string;
  completed: boolean;
  /** @deprecated Use steps for the complete multi-step agent trace. */
  decision: ScoutDecision;
  /** @deprecated Use steps for the complete multi-step agent trace. */
  tool_result?: ToolResult;
  /** @deprecated Use steps for the complete multi-step agent trace. */
  observation: string;
};

export type RunScoutLoopInput = RunScoutAgentInput;
