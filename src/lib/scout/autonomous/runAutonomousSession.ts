import "server-only";

import { runScoutLoop } from "@/lib/scout/agent/loop";
import { buildScoutBrainContext } from "@/lib/scout/brain/buildBrainContext";
import { createScoutExecution } from "@/lib/scout/executions/createExecution";
import { updateScoutExecutionStatus } from "@/lib/scout/executions/updateExecutionStatus";
import { getScoutObjective, getScoutObjectives } from "@/lib/scout/objectives/getObjectives";
import { updateScoutObjectiveStatus } from "@/lib/scout/objectives/updateObjectiveStatus";
import type { ScoutObjective, ScoutObjectiveStatus } from "@/lib/scout/objectives/types";
import type {
  RunScoutAutonomousSessionInput,
  ScoutAutonomousExecutionStatus,
  ScoutAutonomousExecutionSummary,
  ScoutObjectiveStatusChange
} from "@/lib/scout/autonomous/types";
import type { ScoutAgentRun } from "@/lib/scout/agent/types";
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
    objective_status_change: null,
    started_at: startedAt,
    completed_at: new Date().toISOString()
  };
}

function persistedSummary(finalResponse: string) {
  return {
    final_response: finalResponse.slice(0, 4_000)
  };
}

function hasProducedOpportunities(agentRun: ScoutAgentRun) {
  return agentRun.steps.some((step) => {
    if (!step.result?.success || !step.result.data || typeof step.result.data !== "object") return false;

    const opportunities = (step.result.data as { opportunities?: unknown }).opportunities;
    return Array.isArray(opportunities) && opportunities.length > 0;
  });
}

function isExplicitOneTimeResearchObjective(objective: ScoutObjective) {
  const preferences = objective.preferences;
  if (preferences.one_time === true || preferences.task_type === "one_time_research") return true;

  const objectiveText = `${objective.title}\n${objective.goal}`;
  return /\b(one[- ]?time|one[- ]?off|once)\b/i.test(objectiveText)
    && /\b(research|investigat(?:e|ion))\b/i.test(objectiveText);
}

function nextObjectiveStatus(objective: ScoutObjective, agentRun: ScoutAgentRun): ScoutObjectiveStatus {
  if (!agentRun.completed) return objective.status;
  if (isExplicitOneTimeResearchObjective(objective)) return "completed";
  if (hasProducedOpportunities(agentRun)) return "active";
  return "active";
}

async function updateObjectiveLifecycle(
  organizationId: string,
  objective: ScoutObjective,
  agentRun: ScoutAgentRun
): Promise<ScoutObjectiveStatusChange | null> {
  const status = nextObjectiveStatus(objective, agentRun);
  if (status === objective.status) return null;

  try {
    const updatedObjective = await updateScoutObjectiveStatus({
      organization_id: organizationId,
      objective_id: objective.id,
      status
    });
    if (!updatedObjective) return null;

    return {
      previous_status: objective.status,
      current_status: updatedObjective.status
    };
  } catch {
    return null;
  }
}

/** Run one bounded Scout session for the next active objective and persist only execution metadata. */
export async function runScoutAutonomousSession({
  organization_id,
  objective_id
}: RunScoutAutonomousSessionInput): Promise<ScoutAutonomousExecutionSummary> {
  const startedAt = new Date().toISOString();
  let objective: ScoutObjective | undefined;
  let executionId: string | undefined;

  try {
    if (objective_id) {
      objective = await getScoutObjective({ organization_id, objective_id }) ?? undefined;
      if (objective?.status !== "active") objective = undefined;
    } else {
      const objectives = await getScoutObjectives({ organization_id, status: "active" });
      objective = objectives[0];
    }
    if (!objective) {
      return summary(startedAt, "no_active_objective", "Scout found no active objectives to work on.");
    }

    const execution = await createScoutExecution({
      organization_id,
      objective_id: objective.id,
      started_at: startedAt
    });
    executionId = execution.id;

    const context = await buildScoutBrainContext({
      organization_id,
      filters: filtersForObjective(objective)
    });
    const agentRun = await runScoutLoop({
      context,
      goal: `Objective: ${objective.title}\n\n${objective.goal}`
    });
    const completedAt = new Date().toISOString();
    const status = agentRun.completed ? "completed" : "failed";
    const savedExecution = await updateScoutExecutionStatus({
      organization_id,
      execution_id: execution.id,
      status,
      completed_at: completedAt,
      summary: persistedSummary(agentRun.final_response),
      steps_completed: agentRun.steps.length,
      tools_used: agentRun.steps.flatMap((step) => step.tool ? [step.tool] : [])
    });
    if (!savedExecution) throw new Error("Scout execution record could not be finalized.");
    const objectiveStatusChange = await updateObjectiveLifecycle(organization_id, objective, agentRun);

    return {
      objective_id: objective.id,
      objective_title: objective.title,
      status: agentRun.completed ? "completed" : "stopped",
      steps_completed: agentRun.steps.length,
      tools_used: agentRun.steps.flatMap((step) => step.tool ? [step.tool] : []),
      final_response: agentRun.final_response,
      objective_status_change: objectiveStatusChange,
      started_at: startedAt,
      completed_at: completedAt
    };
  } catch {
    if (executionId) {
      try {
        await updateScoutExecutionStatus({
          organization_id,
          execution_id: executionId,
          status: "failed",
          completed_at: new Date().toISOString(),
          summary: persistedSummary("Scout could not complete the autonomous objective session."),
          steps_completed: 0,
          tools_used: []
        });
      } catch {
        // Preserve the existing response shape even when persistence recovery is unavailable.
      }
    }

    return summary(
      startedAt,
      "failed",
      "Scout could not complete the autonomous objective session.",
      objective
    );
  }
}
