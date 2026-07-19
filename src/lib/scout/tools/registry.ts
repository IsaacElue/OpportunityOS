import "server-only";

import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { fetchRedditEvidence } from "@/lib/ingestion/reddit";
import type { EvidenceItem } from "@/lib/ingestion/types";
import { extractOpportunity } from "@/lib/intelligence/extractor";
import type { OpportunityExtraction } from "@/lib/intelligence/types";
import type { ScoutTool, ToolResult } from "@/lib/scout/tools/types";

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

function isEvidenceItem(value: unknown): value is EvidenceItem {
  if (!value || typeof value !== "object") return false;

  const evidence = value as Partial<EvidenceItem>;
  return typeof evidence.title === "string"
    && typeof evidence.content === "string"
    && typeof evidence.sourceType === "string"
    && typeof evidence.platform === "string"
    && (evidence.url === undefined || typeof evidence.url === "string")
    && (evidence.author === undefined || typeof evidence.author === "string")
    && (evidence.engagementScore === undefined || typeof evidence.engagementScore === "number")
    && (evidence.publishedAt === undefined || evidence.publishedAt instanceof Date);
}

function analysisFailure(startedAt: number): ToolResult {
  return {
    success: false,
    message: "Opportunity analysis could not be completed.",
    data: {
      opportunities: [],
      extracted_count: 0,
      execution_ms: durationSince(startedAt)
    }
  };
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
  description: "Extract evidence-supported opportunities without persisting, scoring, or deduplicating them.",
  async execute(input) {
    const startedAt = Date.now();
    const evidence = input && typeof input === "object" && Array.isArray((input as { evidence?: unknown }).evidence)
      ? (input as { evidence: unknown[] }).evidence
      : null;
    if (!evidence || !evidence.every(isEvidenceItem)) return analysisFailure(startedAt);

    try {
      const extracted = await Promise.all(evidence.map((item) => extractOpportunity(item)));
      const opportunities: OpportunityExtraction[] = extracted.flatMap((opportunity) => opportunity ? [opportunity] : []);

      return {
        success: true,
        message: `Extracted ${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"}.`,
        data: {
          opportunities,
          extracted_count: opportunities.length,
          execution_ms: durationSince(startedAt)
        }
      };
    } catch {
      return analysisFailure(startedAt);
    }
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
