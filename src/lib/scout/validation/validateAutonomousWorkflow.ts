import "server-only";

import { buildScoutBrainContext } from "@/lib/scout/brain/buildBrainContext";
import { getScoutExecutions } from "@/lib/scout/executions/getExecutions";
import { getScoutObjective, getScoutObjectives } from "@/lib/scout/objectives/getObjectives";
import type { ScoutObjective } from "@/lib/scout/objectives/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ScoutAutonomousValidationResult,
  ScoutValidationCheck,
  ValidateScoutAutonomousWorkflowInput
} from "@/lib/scout/validation/types";

function check(name: string, passed: boolean, message: string): ScoutValidationCheck {
  return { name, passed, message };
}

function isExplicitOneTimeResearchObjective(objective: ScoutObjective) {
  if (objective.preferences.one_time === true || objective.preferences.task_type === "one_time_research") {
    return true;
  }

  const objectiveText = `${objective.title}\n${objective.goal}`;
  return /\b(one[- ]?time|one[- ]?off|once)\b/i.test(objectiveText)
    && /\b(research|investigat(?:e|ion))\b/i.test(objectiveText);
}

/** Read-only validation of the existing Scout autonomous workflow evidence for one organization. */
export async function validateScoutAutonomousWorkflow({
  organization_id,
  objective_id
}: ValidateScoutAutonomousWorkflowInput): Promise<ScoutAutonomousValidationResult> {
  const checks: ScoutValidationCheck[] = [];
  let objective: ScoutObjective | null = null;

  try {
    objective = objective_id
      ? await getScoutObjective({ organization_id, objective_id })
      : (await getScoutObjectives({ organization_id }))[0] ?? null;
  } catch {
    checks.push(check("Objective exists", false, "Scout could not load an objective for validation."));
  }

  if (!objective) {
    const unavailableChecks = [
      "Schedule exists",
      "Background runner executes",
      "Autonomous session starts",
      "Brain builds successfully",
      "Agent loop completes",
      "Tool planner executes",
      "Execution history created",
      "Objective lifecycle updates correctly"
    ];
    if (checks.length === 0) checks.push(check("Objective exists", false, "No objective exists for this organization."));
    checks.push(...unavailableChecks.map((name) => check(name, false, "Requires an existing Scout objective.")));

    return { passed: false, checks };
  }

  checks.push(check("Objective exists", true, `Objective "${objective.title}" is available for validation.`));

  try {
    const supabase = createAdminClient();
    const { data: schedule, error } = await supabase
      .from("scout_schedules")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("objective_id", objective.id)
      .limit(1)
      .maybeSingle();
    checks.push(check(
      "Schedule exists",
      !error && Boolean(schedule),
      !error && schedule
        ? "An organization-scoped schedule is linked to this objective."
        : "No organization-scoped schedule is linked to this objective."
    ));
  } catch {
    checks.push(check("Schedule exists", false, "Scout could not validate the linked schedule."));
  }

  try {
    await buildScoutBrainContext({
      organization_id,
      filters: { problem_hints: [objective.goal] }
    });
    checks.push(check("Brain builds successfully", true, "Scout brain context built successfully."));
  } catch {
    checks.push(check("Brain builds successfully", false, "Scout brain context could not be built."));
  }

  let execution = null;
  try {
    execution = (await getScoutExecutions({
      organization_id,
      objective_id: objective.id
    }))[0] ?? null;
  } catch {
    // The individual historical checks below report the bounded failure.
  }

  const hasExecution = Boolean(execution);
  checks.push(check(
    "Background runner executes",
    hasExecution,
    hasExecution
      ? "Existing execution history confirms the background/autonomous path has run."
      : "No execution history exists yet for this objective."
  ));
  checks.push(check(
    "Autonomous session starts",
    hasExecution,
    hasExecution
      ? "An autonomous execution record exists for this objective."
      : "No autonomous execution record exists yet for this objective."
  ));
  checks.push(check(
    "Agent loop completes",
    execution?.status === "completed" && execution.steps_completed > 0,
    execution?.status === "completed" && execution.steps_completed > 0
      ? "A completed execution recorded one or more agent-loop steps."
      : "No completed agent-loop execution is available for validation."
  ));
  checks.push(check(
    "Tool planner executes",
    execution?.status === "completed" && execution.steps_completed > 0,
    execution?.status === "completed" && execution.steps_completed > 0
      ? "Completed agent steps confirm the planner path ran before each tool decision."
      : "No completed planner-backed execution is available for validation."
  ));
  checks.push(check(
    "Execution history created",
    hasExecution,
    hasExecution
      ? "An execution-history record exists for the linked objective."
      : "No execution-history record exists yet for this objective."
  ));

  const expectedCompleted = Boolean(execution?.status === "completed" && isExplicitOneTimeResearchObjective(objective));
  const lifecycleValid = expectedCompleted
    ? objective.status === "completed"
    : objective.status === "active";
  checks.push(check(
    "Objective lifecycle updates correctly",
    lifecycleValid,
    lifecycleValid
      ? "The objective status matches the deterministic lifecycle rule."
      : "The objective status does not match the deterministic lifecycle rule."
  ));

  return {
    passed: checks.every((item) => item.passed),
    checks
  };
}
