import "server-only";

import type { ScoutTool, ToolResult } from "@/lib/scout/tools/types";

function mockResult(message: string): ToolResult {
  return {
    success: true,
    message,
    data: { status: "mock" }
  };
}

const evidenceSearchTool: ScoutTool = {
  name: "evidence_search",
  description: "Search future evidence sources such as Hacker News, Reddit, web search, and external APIs.",
  async execute() {
    return mockResult("Evidence search tool ready");
  }
};

const opportunityAnalysisTool: ScoutTool = {
  name: "opportunity_analysis",
  description: "Analyze, score, compare, and validate future opportunity data.",
  async execute() {
    return mockResult("Opportunity analysis tool ready");
  }
};

const registeredTools: ScoutTool[] = [evidenceSearchTool, opportunityAnalysisTool];

/** Return the tools Scout can call now or in future runtime integrations. */
export function getAvailableTools(): readonly ScoutTool[] {
  return registeredTools;
}

export function getScoutTool(toolName: string): ScoutTool | undefined {
  return registeredTools.find((tool) => tool.name === toolName);
}
