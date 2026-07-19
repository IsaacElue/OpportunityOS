import type { ScoutBrainContext } from "@/lib/scout/brain/types";

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

export type ScoutAgentRun = {
  plan: ScoutAgentPlan;
  execution: ScoutAgentExecution;
};
