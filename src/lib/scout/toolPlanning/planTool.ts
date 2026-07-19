import "server-only";

import type { ScoutAgentAction } from "@/lib/scout/agent/types";
import type { ScoutTool } from "@/lib/scout/tools/types";
import { getAvailableTools } from "@/lib/scout/tools/registry";
import type { PlanScoutToolInput, ScoutToolPlan } from "@/lib/scout/toolPlanning/types";

const actionTools: Record<ScoutAgentAction, readonly string[]> = {
  research_market: ["evidence_search"],
  find_evidence: ["evidence_search"],
  analyze_problem: ["opportunity_analysis"],
  compare_opportunities: ["list_opportunities"],
  request_feedback: [],
  summarize_findings: []
};

function supportsSequence(toolName: string, calledTools: readonly string[]) {
  if (toolName === "opportunity_analysis") return calledTools.includes("evidence_search");
  return true;
}

function noToolPlan(reason: string, expectedResult: string, confidence: number): ScoutToolPlan {
  return {
    next_tool: null,
    reason,
    expected_result: expectedResult,
    confidence
  };
}

function expectedResult(tool: ScoutTool) {
  return tool.description;
}

/** Plan one safe, non-duplicate tool call from Scout's registered capabilities. */
export function planScoutTool({ decision, called_tools = [] }: PlanScoutToolInput): ScoutToolPlan {
  if (!decision.tool_needed) {
    return noToolPlan(
      "Scout's reasoning does not require an external tool.",
      "Scout can complete the current response from the available context.",
      decision.confidence
    );
  }

  const availableByName = new Map(getAvailableTools().map((tool) => [tool.name, tool]));
  const candidates = actionTools[decision.action]
    .map((toolName) => availableByName.get(toolName))
    .filter((tool): tool is ScoutTool => Boolean(tool))
    .filter((tool) => !called_tools.includes(tool.name))
    .filter((tool) => supportsSequence(tool.name, called_tools));

  if (candidates.length === 0) {
    return noToolPlan(
      `No safe unused tool is available for Scout's ${decision.action.replaceAll("_", " ")} action.`,
      "Scout should stop tool planning and respond only from the information already gathered.",
      Math.min(decision.confidence, 75)
    );
  }

  const suggestedTool = decision.suggested_tool
    ? candidates.find((tool) => tool.name === decision.suggested_tool)
    : undefined;
  const nextTool = suggestedTool ?? candidates[0];

  return {
    next_tool: nextTool.name,
    reason: suggestedTool
      ? `Scout selected the reasoning engine's compatible suggested tool: ${nextTool.name}.`
      : `Scout selected ${nextTool.name} as the next compatible registered tool for this action.`,
    expected_result: expectedResult(nextTool),
    confidence: suggestedTool ? decision.confidence : Math.min(decision.confidence, 80)
  };
}
