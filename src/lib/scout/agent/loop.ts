import "server-only";

import { reasonWithScout } from "@/lib/scout/intelligence/reason";
import { executeScoutTool } from "@/lib/scout/tools/executeTool";
import type {
  RunScoutLoopInput,
  ScoutAgentStep,
  ScoutAgentRun
} from "@/lib/scout/agent/types";
import type { ToolResult } from "@/lib/scout/tools/types";

export const MAX_AGENT_STEPS = 5;

function observationFor(toolResult: ToolResult | undefined, action: string) {
  if (!toolResult) return `Scout decided to ${action.replaceAll("_", " ")} without using a tool.`;
  if (toolResult.success) return `Scout observed a successful tool result: ${toolResult.message}`;
  return `Scout observed that the requested tool could not complete: ${toolResult.message}`;
}

function reasoningGoal(goal: string, steps: ScoutAgentStep[]) {
  if (steps.length === 0) return goal;

  const observations = steps
    .map((step, index) => `${index + 1}. ${step.observation}`)
    .join("\n")
    .slice(0, 4_000);
  return `${goal}\n\nObservations from this Scout run:\n${observations}`;
}

function runResult(
  goal: string,
  steps: ScoutAgentStep[],
  finalResponse: string,
  completed: boolean
): ScoutAgentRun {
  const lastStep = steps.at(-1);
  if (!lastStep) {
    throw new Error("Scout agent loop completed without a reasoning step.");
  }

  return {
    goal,
    steps,
    final_response: finalResponse,
    completed,
    // Preserved for the existing research starter and other one-step consumers.
    decision: lastStep.decision,
    ...(lastStep.result ? { tool_result: lastStep.result } : {}),
    observation: lastStep.observation
  };
}

/** Run a bounded reasoning-action-observation workflow with at most five reasoning cycles. */
export async function runScoutLoop({ context, goal }: RunScoutLoopInput): Promise<ScoutAgentRun> {
  const steps: ScoutAgentStep[] = [];

  for (let stepNumber = 0; stepNumber < MAX_AGENT_STEPS; stepNumber += 1) {
    const decision = await reasonWithScout({
      context,
      goal: reasoningGoal(goal, steps)
    });

    if (!decision.tool_needed) {
      const observation = observationFor(undefined, decision.action);
      steps.push({ decision, observation });
      return runResult(goal, steps, decision.reasoning, true);
    }

    const tool = decision.suggested_tool;
    const result: ToolResult = tool
      ? await executeScoutTool(tool, { context, goal, decision })
      : {
          success: false,
          message: "Scout requested a tool but did not specify one."
        };
    const observation = observationFor(result, decision.action);
    steps.push({ decision, ...(tool ? { tool } : {}), result, observation });

    if (!result.success) {
      return runResult(goal, steps, "Scout stopped because a requested tool could not be completed.", false);
    }
  }

  return runResult(
    goal,
    steps,
    `Scout reached the ${MAX_AGENT_STEPS}-step safety limit before completing the goal.`,
    false
  );
}
