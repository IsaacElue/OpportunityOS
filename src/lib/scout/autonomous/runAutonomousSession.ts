import "server-only";

import { runScoutLoop } from "@/lib/scout/agent/loop";
import { buildScoutBrainContext } from "@/lib/scout/brain/buildBrainContext";
import { getScoutObjectives } from "@/lib/scout/objectives/getObjectives";
import type { ScoutObjective } from "@/lib/scout/objectives/types";
import type {
  RunScoutAutonomousSessionInput,
  ScoutAutonomousExecutionStatus,
  ScoutAutonomousExecutionSummary
} from "@/lib/scout/autonomous/types";
import type { ScoutScanFilters } from "@/lib/scout/types";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter((item): item is string => Boolean(item)) : [];
}

function filtersForObjective(objective: ScoutObjective): ScoutScanFilters {
  const preferences = objective.preferences;
  const problemHints = [
    ...asTextList(preferences.problem_hints),
    objective.goal
  ].slice(0, 3);

  return {
    industry: asText(preferences.industry),
    buyer_type: asText(preferences.buyer_type) ?? asText(preferences.buyer),
    geography: asText(preferences.geography),
    problem_hints: problemHints
  };
}

function summary(
  startedAt: string,
  status: ScoutAutonomousExecutionStatus,
  finalResponse: string,
  objective?: ScoutObjective
): ScoutAutonomousExecutionSummary {
  return {
    objective_id: objective?.id ?? null,
    objective_title: objective?.title ?? null,
    status,
    steps_completed: 0,
    tools_used: [],
    final_response: finalResponse,
    started_at: startedAt,
    completed_at: new Date().toISOString()
  };
}

/** Run one bounded Scout session for the next active objective without persisting execution history. */
export async function runScoutAutonomousSession({
  organization_id
}: RunScoutAutonomousSessionInput): Promise<ScoutAutonomousExecutionSummary> {
  const startedAt = new Date().toISOString();
  let objective: ScoutObjective | undefined;

  try {
    const objectives = await getScoutObjectives({ organization_id, status: "active" });
    objective = objectives[0];
    if (!objective) {
      return summary(startedAt, "no_active_objective", "Scout found no active objectives to work on.");
    }

    const context = await buildScoutBrainContext({
      organization_id,
      filters: filtersForObjective(objective)
    });
    const agentRun = await runScoutLoop({
      context,
      goal: `Objective: ${objective.title}\n\n${objective.goal}`
    });

    return {
      objective_id: objective.id,
      objective_title: objective.title,
      status: agentRun.completed ? "completed" : "stopped",
      steps_completed: agentRun.steps.length,
      tools_used: agentRun.steps.flatMap((step) => step.tool ? [step.tool] : []),
      final_response: agentRun.final_response,
      started_at: startedAt,
      completed_at: new Date().toISOString()
    };
  } catch {
    return summary(
      startedAt,
      "failed",
      "Scout could not complete the autonomous objective session.",
      objective
    );
  }
}
