import "server-only";

import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { fetchRedditEvidence } from "@/lib/ingestion/reddit";
import type { EvidenceItem } from "@/lib/ingestion/types";
import { extractOpportunity } from "@/lib/intelligence/extractor";
import type { OpportunityExtraction } from "@/lib/intelligence/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { startScoutResearch } from "@/lib/scout/research/startResearch";
import type { ScoutTool, ToolResult } from "@/lib/scout/tools/types";

type EvidenceSearchInput = {
  industry?: unknown;
  geography?: unknown;
  buyer_type?: unknown;
  problem_hints?: unknown;
};

type CreateResearchInput = EvidenceSearchInput & {
  goal?: unknown;
  organizationId?: unknown;
  organization_id?: unknown;
  requestedBy?: unknown;
  requested_by?: unknown;
};

type GetReportInput = {
  report_id?: unknown;
  organizationId?: unknown;
  organization_id?: unknown;
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

function createResearchFailure(message: string): ToolResult {
  return {
    success: false,
    message
  };
}

function reportFailure(startedAt: number, message: string): ToolResult {
  return {
    success: false,
    message,
    data: {
      report: null,
      found: false,
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

const createResearchTool: ScoutTool = {
  name: "create_research",
  description: "Create a queued OpportunityOS research scan without executing it.",
  async execute(input) {
    if (!input || typeof input !== "object") {
      return createResearchFailure("Scout research requires a goal and research filters.");
    }

    const request = input as CreateResearchInput;
    const goal = asText(request.goal);
    const organizationId = asText(request.organizationId) || asText(request.organization_id);
    const requestedBy = asText(request.requestedBy) || asText(request.requested_by);
    if (!goal) return createResearchFailure("Scout research requires a clear goal.");
    if (!organizationId || !requestedBy) {
      return createResearchFailure("Scout research requires trusted organization and requester identifiers.");
    }

    try {
      const research = await startScoutResearch({
        organizationId,
        requestedBy,
        goal,
        filters: {
          industry: asText(request.industry) || null,
          geography: asText(request.geography) || null,
          buyer_type: asText(request.buyer_type) || null,
          problem_hints: Array.isArray(request.problem_hints)
            ? request.problem_hints.map(asText).filter(Boolean).slice(0, 3)
            : []
        }
      });

      return {
        success: true,
        message: research.scoutMessage.content,
        data: {
          scan_id: research.scanId,
          status: research.status,
          scout_message: research.scoutMessage.content,
          created_at: new Date().toISOString()
        }
      };
    } catch {
      return createResearchFailure("Scout could not create that research brief.");
    }
  }
};

const getReportTool: ScoutTool = {
  name: "get_report",
  description: "Retrieve one completed Founder Opportunity Report for a trusted organization.",
  async execute(input) {
    const startedAt = Date.now();
    if (!input || typeof input !== "object") {
      return reportFailure(startedAt, "Scout report lookup requires a report identifier.");
    }

    const request = input as GetReportInput;
    const reportId = asText(request.report_id);
    const organizationId = asText(request.organizationId) || asText(request.organization_id);
    if (!reportId || !organizationId) {
      return reportFailure(startedAt, "Scout report lookup requires trusted report and organization identifiers.");
    }

    try {
      const supabase = createAdminClient();
      const { data: report, error: reportError } = await supabase
        .from("opportunity_reports")
        .select("id,opportunity_id,problem,evidence_summary,buyer_profile,existing_workarounds,ai_advantage,mvp_suggestion,validation_experiment,confidence_score,created_at,updated_at")
        .eq("id", reportId)
        .maybeSingle();
      if (reportError || !report) return reportFailure(startedAt, "Scout could not find that report.");

      const { data: scanLink, error: ownershipError } = await supabase
        .from("scan_opportunities")
        .select("scan_id,scans!inner(organization_id)")
        .eq("opportunity_id", report.opportunity_id)
        .eq("scans.organization_id", organizationId)
        .limit(1)
        .maybeSingle();
      if (ownershipError || !scanLink) return reportFailure(startedAt, "Scout could not find that report.");

      return {
        success: true,
        message: "Scout retrieved the requested report.",
        data: {
          report,
          found: true,
          execution_ms: durationSince(startedAt)
        }
      };
    } catch {
      return reportFailure(startedAt, "Scout could not retrieve that report.");
    }
  }
};

const registeredTools: ScoutTool[] = [evidenceSearchTool, opportunityAnalysisTool, createResearchTool, getReportTool];

/** Return the tools Scout can call now or in future runtime integrations. */
export function getAvailableTools(): readonly ScoutTool[] {
  return registeredTools;
}

export function getScoutTool(toolName: string): ScoutTool | undefined {
  return registeredTools.find((tool) => tool.name === toolName);
}
