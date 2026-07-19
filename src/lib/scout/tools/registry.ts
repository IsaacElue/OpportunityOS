import "server-only";

import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { fetchRedditEvidence } from "@/lib/ingestion/reddit";
import type { EvidenceItem } from "@/lib/ingestion/types";
import { extractOpportunity } from "@/lib/intelligence/extractor";
import type { OpportunityExtraction } from "@/lib/intelligence/types";
import { getScoutMemories } from "@/lib/scout/memory/getMemory";
import { saveScoutMemory } from "@/lib/scout/memory/saveMemory";
import type { ScoutMemoryType } from "@/lib/scout/memory/types";
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

type SearchMemoryInput = {
  query?: unknown;
  organization_id?: unknown;
};

type SaveMemoryToolInput = {
  organization_id?: unknown;
  user_id?: unknown;
  type?: unknown;
  content?: unknown;
  metadata?: unknown;
};

type ListOpportunitiesInput = {
  organization_id?: unknown;
  limit?: unknown;
};

const scoutMemoryTypes = new Set<ScoutMemoryType>([
  "preference",
  "rejection",
  "interest",
  "goal",
  "feedback"
]);

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

function memorySearchFailure(startedAt: number, message: string): ToolResult {
  return {
    success: false,
    message,
    data: {
      memories: [],
      count: 0,
      execution_ms: durationSince(startedAt)
    }
  };
}

function memorySaveFailure(startedAt: number, message: string): ToolResult {
  return {
    success: false,
    message,
    data: {
      saved: false,
      execution_ms: durationSince(startedAt)
    }
  };
}

function isMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOpportunityLimit(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() ? Number(value) : 10;
  if (!Number.isFinite(parsed)) return 10;

  return Math.min(Math.max(Math.floor(parsed), 1), 25);
}

function opportunityListFailure(startedAt: number): ToolResult {
  return {
    success: false,
    message: "Scout could not list opportunities right now.",
    data: {
      opportunities: [],
      count: 0,
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

const searchMemoryTool: ScoutTool = {
  name: "search_memory",
  description: "Search an organization's Scout memories without modifying them.",
  async execute(input) {
    const startedAt = Date.now();
    if (!input || typeof input !== "object") {
      return memorySearchFailure(startedAt, "Scout memory search requires a query and organization identifier.");
    }

    const request = input as SearchMemoryInput;
    const query = asText(request.query).toLowerCase();
    const organizationId = asText(request.organization_id);
    if (!query || !organizationId) {
      return memorySearchFailure(startedAt, "Scout memory search requires a query and organization identifier.");
    }

    try {
      const memories = await getScoutMemories({ organization_id: organizationId });
      const matchingMemories = memories.filter((memory) => memory.content.toLowerCase().includes(query));

      return {
        success: true,
        message: matchingMemories.length === 0
          ? "Scout found no matching memories."
          : `Scout found ${matchingMemories.length} matching ${matchingMemories.length === 1 ? "memory" : "memories"}.`,
        data: {
          memories: matchingMemories,
          count: matchingMemories.length,
          execution_ms: durationSince(startedAt)
        }
      };
    } catch {
      return memorySearchFailure(startedAt, "Scout could not search memories right now.");
    }
  }
};

const saveMemoryTool: ScoutTool = {
  name: "save_memory",
  description: "Save a new organization-scoped Scout memory without changing existing memories.",
  async execute(input) {
    const startedAt = Date.now();
    if (!input || typeof input !== "object") {
      return memorySaveFailure(startedAt, "Scout memory saving requires organization and content details.");
    }

    const request = input as SaveMemoryToolInput;
    const organizationId = asText(request.organization_id);
    const userId = asText(request.user_id);
    const content = asText(request.content);
    const memoryType = asText(request.type);
    if (!organizationId || !content) {
      return memorySaveFailure(startedAt, "Scout memory saving requires an organization identifier and content.");
    }
    if (!userId) {
      return memorySaveFailure(startedAt, "Scout memory saving requires a trusted user identifier.");
    }
    if (!scoutMemoryTypes.has(memoryType as ScoutMemoryType)) {
      return memorySaveFailure(startedAt, "Scout memory saving requires a supported memory type.");
    }
    if (request.metadata !== undefined && !isMetadata(request.metadata)) {
      return memorySaveFailure(startedAt, "Scout memory metadata must be an object.");
    }

    try {
      const supabase = createAdminClient();
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError || !membership) {
        return memorySaveFailure(startedAt, "Scout could not save that memory.");
      }

      const memory = await saveScoutMemory({
        organization_id: organizationId,
        user_id: userId,
        memory_type: memoryType as ScoutMemoryType,
        content,
        metadata: request.metadata
      });

      return {
        success: true,
        message: "Scout saved that memory.",
        data: {
          memory_id: memory.id,
          saved: true,
          execution_ms: durationSince(startedAt)
        }
      };
    } catch {
      return memorySaveFailure(startedAt, "Scout could not save that memory.");
    }
  }
};

const listOpportunitiesTool: ScoutTool = {
  name: "list_opportunities",
  description: "List an organization's most recently discovered opportunities without modifying them.",
  async execute(input) {
    const startedAt = Date.now();
    if (!input || typeof input !== "object") return opportunityListFailure(startedAt);

    const request = input as ListOpportunitiesInput;
    const organizationId = asText(request.organization_id);
    if (!organizationId) return opportunityListFailure(startedAt);

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("opportunities")
        .select("id,title,problem,persona,industry,description,opportunity_score,pain_score,frequency_score,intent_score,market_score,competition_gap_score,confidence_score,created_at,scan_opportunities!inner(scans!inner(organization_id))")
        .eq("scan_opportunities.scans.organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(toOpportunityLimit(request.limit));
      if (error) return opportunityListFailure(startedAt);

      const opportunities = data ?? [];
      return {
        success: true,
        message: opportunities.length === 0
          ? "Scout found no opportunities yet."
          : `Scout found ${opportunities.length} ${opportunities.length === 1 ? "opportunity" : "opportunities"}.`,
        data: {
          opportunities,
          count: opportunities.length,
          execution_ms: durationSince(startedAt)
        }
      };
    } catch {
      return opportunityListFailure(startedAt);
    }
  }
};

const registeredTools: ScoutTool[] = [
  evidenceSearchTool,
  opportunityAnalysisTool,
  createResearchTool,
  getReportTool,
  searchMemoryTool,
  saveMemoryTool,
  listOpportunitiesTool
];

/** Return the tools Scout can call now or in future runtime integrations. */
export function getAvailableTools(): readonly ScoutTool[] {
  return registeredTools;
}

export function getScoutTool(toolName: string): ScoutTool | undefined {
  return registeredTools.find((tool) => tool.name === toolName);
}
