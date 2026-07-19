import "server-only";

import { reasonWithScout } from "@/lib/scout/intelligence/reason";
import { executeScoutTool } from "@/lib/scout/tools/executeTool";
import type {
  RunScoutLoopInput,
  ScoutAgentRun
} from "@/lib/scout/agent/types";
import type { ToolResult } from "@/lib/scout/tools/types";

function observationFor(toolResult: ToolResult | undefined, action: string) {
  if (!toolResult) return `Scout decided to ${action.replaceAll("_", " ")} without using a tool.`;
  if (toolResult.success) return `Scout observed a successful tool result: ${toolResult.message}`;
  return `Scout observed that the requested tool could not complete: ${toolResult.message}`;
}

/** Run one reasoning-action-observation cycle without recursive agent execution. */
export async function runScoutLoop({ context, goal }: RunScoutLoopInput): Promise<ScoutAgentRun> {
  const decision = await reasonWithScout({ context, goal });
  let toolResult: ToolResult | undefined;

  if (decision.tool_needed) {
    toolResult = decision.suggested_tool
      ? await executeScoutTool(decision.suggested_tool, { context, goal, decision })
      : {
          success: false,
          message: "Scout requested a tool but did not specify one."
        };
  }

  return {
    goal,
    decision,
    ...(toolResult ? { tool_result: toolResult } : {}),
    observation: observationFor(toolResult, decision.action)
  };
}
