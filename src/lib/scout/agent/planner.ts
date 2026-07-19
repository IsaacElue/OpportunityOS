import "server-only";

import { reasonWithScout } from "@/lib/scout/intelligence/reason";
import type { ScoutBrainContext } from "@/lib/scout/brain/types";
import type { ScoutAgentAction, ScoutAgentPlan } from "@/lib/scout/agent/types";

const nextSteps: Record<ScoutAgentAction, string> = {
  research_market: "Define the market scope and identify the strongest research sources.",
  find_evidence: "Search available evidence for repeated, source-backed signals.",
  analyze_problem: "Group the evidence into recurring founder problems and affected personas.",
  compare_opportunities: "Compare opportunities against the founder's observed preferences and evidence strength.",
  request_feedback: "Ask the founder for the smallest useful piece of feedback to refine Scout's learning.",
  summarize_findings: "Produce a concise, evidence-grounded summary of the current research context."
};

/** Use Scout's structured reasoning decision to choose the next agent action. */
export async function planScoutAction(context: ScoutBrainContext, goal: string): Promise<ScoutAgentPlan> {
  const decision = await reasonWithScout({ context, goal });

  return {
    action: decision.action,
    reasoning: decision.reasoning,
    next_step: nextSteps[decision.action]
  };
}
