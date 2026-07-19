import "server-only";

import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { fetchRedditEvidence } from "@/lib/ingestion/reddit";
import type { EvidenceItem } from "@/lib/ingestion/types";
import type { ScoutTool, ToolResult } from "@/lib/scout/tools/types";

function mockResult(message: string): ToolResult {
  return {
    success: true,
    message,
    data: { status: "mock" }
  };
}

type EvidenceSearchInput = {
  industry?: unknown;
  geography?: unknown;
  buyer_type?: unknown;
  problem_hints?: unknown;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildEvidenceQuery(input: unknown) {
  if (!input || typeof input !== "object") return "";

  const filters = input as EvidenceSearchInput;
  const hints = Array.isArray(filters.problem_hints)
    ? filters.problem_hints.map(asText).filter(Boolean)
    : [];

  return [
    asText(filters.industry),
    asText(filters.buyer_type),
    asText(filters.geography),
    ...hints
  ].filter(Boolean).join(" ");
}

function durationSince(startedAt: number) {
  return Date.now() - startedAt;
}

const evidenceSearchTool: ScoutTool = {
  name: "evidence_search",
  description: "Search Hacker News and Reddit for current market evidence without persisting it.",
  async execute(input) {
    const startedAt = Date.now();
    const query = buildEvidenceQuery(input);
    if (!query) {
      return {
        success: false,
        message: "Evidence search requires industry, geography, buyer type, or problem hints.",
        data: {
          evidence: [],
          total_results: 0,
          sources_used: [],
          execution_ms: durationSince(startedAt)
        }
      };
    }

    const sources = [
      { name: "hacker_news", search: () => fetchHackerNewsEvidence(query) },
      { name: "reddit", search: () => fetchRedditEvidence(query) }
    ];
    const results = await Promise.allSettled(sources.map((source) => source.search()));
    const evidence: EvidenceItem[] = [];
    const sourcesUsed: string[] = [];

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        evidence.push(...result.value);
        sourcesUsed.push(sources[index].name);
        continue;
      }

      const error = result.reason instanceof Error
        ? result.reason.message.slice(0, 500)
        : "Unknown source failure";
      console.error("Scout evidence source failed", { source: sources[index].name, error });
    }

    const data = {
      evidence,
      total_results: evidence.length,
      sources_used: sourcesUsed,
      execution_ms: durationSince(startedAt)
    };
    if (sourcesUsed.length === 0) {
      return {
        success: false,
        message: "All evidence sources failed.",
        data
      };
    }

    return {
      success: true,
      message: `Found ${evidence.length} evidence ${evidence.length === 1 ? "item" : "items"}.`,
      data
    };
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
