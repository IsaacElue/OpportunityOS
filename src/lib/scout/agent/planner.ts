import "server-only";

import type { ScoutBrainContext } from "@/lib/scout/brain/types";
import type { ScoutAgentAction, ScoutAgentPlan } from "@/lib/scout/agent/types";

function scopeLabel(context: ScoutBrainContext) {
  const { industry, geography } = context.current_research.filters;
  return [industry, geography].filter(Boolean).join(" in ") || "the current research brief";
}

function actionForGoal(goal: string): ScoutAgentAction {
  const normalizedGoal = goal.toLowerCase();
  if (/feedback|prefer|like|dislike|reject/.test(normalizedGoal)) return "request_feedback";
  if (/compare|versus|vs\.?|rank/.test(normalizedGoal)) return "compare_opportunities";
  if (/summari[sz]e|recap|brief/.test(normalizedGoal)) return "summarize_findings";
  if (/problem|pain|pattern|theme/.test(normalizedGoal)) return "analyze_problem";
  if (/evidence|discussion|signal|source/.test(normalizedGoal)) return "find_evidence";
  return "research_market";
}

const nextSteps: Record<ScoutAgentAction, string> = {
  research_market: "Define the market scope and identify the strongest research sources.",
  find_evidence: "Search available evidence for repeated, source-backed signals.",
  analyze_problem: "Group the evidence into recurring founder problems and affected personas.",
  compare_opportunities: "Compare opportunities against the founder's observed preferences and evidence strength.",
  request_feedback: "Ask the founder for the smallest useful piece of feedback to refine Scout's learning.",
  summarize_findings: "Produce a concise, evidence-grounded summary of the current research context."
};

/** Deterministically choose Scout's next action until an LLM planner is introduced. */
export function planScoutAction(context: ScoutBrainContext, goal: string): ScoutAgentPlan {
  const action = actionForGoal(goal);
  const scope = scopeLabel(context);
  const memoryCount = context.memories.length;
  const feedbackCount = context.feedback.length;

  return {
    action,
    reasoning: `The goal is framed around ${scope}. Scout has ${memoryCount} saved ${memoryCount === 1 ? "memory" : "memories"} and ${feedbackCount} feedback ${feedbackCount === 1 ? "item" : "items"} to ground its next step.`,
    next_step: nextSteps[action]
  };
}
