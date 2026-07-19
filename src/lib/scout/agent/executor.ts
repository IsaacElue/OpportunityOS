import "server-only";

import { planScoutAction } from "@/lib/scout/agent/planner";
import type {
  RunScoutAgentInput,
  ScoutAgentExecution,
  ScoutAgentPlan,
  ScoutAgentRun
} from "@/lib/scout/agent/types";

const plannedMessages: Record<ScoutAgentPlan["action"], string> = {
  research_market: "Scout would begin market research.",
  find_evidence: "Scout would search available evidence.",
  analyze_problem: "Scout would analyze repeated founder problems.",
  compare_opportunities: "Scout would compare the available opportunities.",
  request_feedback: "Scout would request founder feedback.",
  summarize_findings: "Scout would summarize the current findings."
};

/** Execute a planned action through deterministic mock handlers for now. */
export function executeScoutPlan(plan: ScoutAgentPlan): ScoutAgentExecution {
  return {
    status: "planned",
    message: plannedMessages[plan.action]
  };
}

/** Plan and mock-execute one Scout task using an existing brain context. */
export function runScoutAgent({ context, goal }: RunScoutAgentInput): ScoutAgentRun {
  const plan = planScoutAction(context, goal);
  const execution = executeScoutPlan(plan);

  return { plan, execution };
}
