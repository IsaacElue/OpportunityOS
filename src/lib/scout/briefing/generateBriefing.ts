import "server-only";

import type { ScoutExecution } from "@/lib/scout/executions";
import type {
  GenerateScoutBriefingInput,
  ScoutBriefing,
  ScoutBriefingInsight,
  ScoutBriefingPriority,
  ScoutBriefingRecommendedAction
} from "@/lib/scout/briefing/types";

const MAX_INSIGHTS = 4;
const MAX_ACTIONS = 3;

/** Build a deterministic, read-only workspace briefing from existing Scout context. */
export function generateScoutBriefing({
  context,
  recent_executions,
  generated_at = new Date()
}: GenerateScoutBriefingInput = {}): ScoutBriefing {
  const identity = context?.identity;
  const objectives = context?.objectives ?? [];
  const memories = context?.memories ?? [];
  const feedback = context?.feedback ?? [];
  const filters = context?.current_research?.filters;
  const founderFocused = context?.personality.traits.includes("founder-focused") ?? false;
  const executions = recent_executions ?? [];
  const activeObjective = objectives[0] ?? null;
  const latestExecution = executions[0] ?? null;
  const industry = filters?.industry ?? null;
  const priority = determinePriority(activeObjective !== null, latestExecution);
  const insights: ScoutBriefingInsight[] = [];
  const actions: ScoutBriefingRecommendedAction[] = [];

  if (activeObjective) {
    insights.push({
      title: "Current priority is clear",
      detail: `Your active objective is “${activeObjective.title}”. Scout will keep it at the center of the next research decision.`,
      priority: "high"
    });
    actions.push({
      title: "Review the active objective",
      detail: "Use it as the decision frame when you assess the next opportunity or investigation.",
      priority: "high"
    });
  }

  if (latestExecution) insights.push(executionInsight(latestExecution));

  if (industry) {
    insights.push({
      title: "Research focus is set",
      detail: `Scout is carrying your ${industry} market context into this workspace.`,
      priority: "medium"
    });
  }

  if (memories.length > 0 || feedback.length > 0) {
    insights.push({
      title: "Founder context is available",
      detail: `${memories.length} memory ${pluralize(memories.length, "signal")} and ${feedback.length} feedback ${pluralize(feedback.length, "signal")} will inform Scout’s next recommendation.`,
      priority: "medium"
    });
  } else {
    actions.push({
      title: "Share what matters most",
      detail: "A clear preference or reaction gives Scout stronger context for future recommendations.",
      priority: "low"
    });
  }

  if (!activeObjective && !latestExecution) {
    actions.push({
      title: "Start with a focused question",
      detail: "Give Scout a founder problem or market you want to understand first.",
      priority: "medium"
    });
  }

  const summary = activeObjective
    ? `I’m oriented around your active objective and the context already captured for your team.`
    : latestExecution
      ? `I’ve reviewed the most recent Scout activity and I’m ready to help decide what deserves attention next.`
      : `I’m ready to turn your market context into a focused next step whenever you are.`;

  return {
    greeting: `Good to see you${identity?.name ? ` — ${identity.name} is ready` : "."}`,
    summary: founderFocused ? `${summary} I’ll keep the next step founder-focused and evidence-led.` : summary,
    insights: insights.slice(0, MAX_INSIGHTS),
    recommended_actions: uniqueActions(actions).slice(0, MAX_ACTIONS),
    priority,
    generated_at: generated_at.toISOString()
  };
}

function executionInsight(execution: ScoutExecution): ScoutBriefingInsight {
  if (execution.status === "failed") return {
    title: "Recent execution needs attention",
    detail: "The latest Scout execution did not complete. Its objective remains available for review before the next run.",
    priority: "high"
  };

  if (execution.status === "active") return {
    title: "Scout is actively working",
    detail: `The latest execution is in progress with ${execution.steps_completed} completed ${pluralize(execution.steps_completed, "step")}.`,
    priority: "high"
  };

  return {
    title: "Recent Scout work completed",
    detail: `The latest execution completed ${execution.steps_completed} ${pluralize(execution.steps_completed, "step")} using ${execution.tools_used.length} ${pluralize(execution.tools_used.length, "tool")}.`,
    priority: "medium"
  };
}

function determinePriority(hasActiveObjective: boolean, execution: ScoutExecution | null): ScoutBriefingPriority {
  if (execution?.status === "failed" || execution?.status === "active") return "high";
  return hasActiveObjective ? "high" : "medium";
}

function uniqueActions(actions: ScoutBriefingRecommendedAction[]) {
  return actions.filter((action, index) => actions.findIndex((candidate) => candidate.title === action.title) === index);
}

function pluralize(count: number, singular: string) {
  return count === 1 ? singular : `${singular}s`;
}
