import "server-only";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { fetchRedditEvidence } from "@/lib/ingestion/reddit";
import { saveEvidence } from "@/lib/ingestion/saveEvidence";
import { createOpportunity } from "@/lib/intelligence/createOpportunity";
import { generateFounderOpportunityReport } from "@/lib/reports/generateReport";
import { saveReport } from "@/lib/reports/saveReport";
import type { FounderOpportunityReportInput, ReportEvidence } from "@/lib/reports/types";
import { scoreOpportunity } from "@/lib/scoring/opportunityScore";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordScanProgress } from "@/lib/scans/recordScanProgress";

type ScanFilters = {
  industry?: string;
  buyer_type?: string;
  geography?: string;
  problem_hints?: string[];
};

export type ScanRunSummary = {
  scanId: string;
  evidenceCollected: number;
  opportunitiesCreated: number;
  completedAt: Date;
};

type OpportunityReportRow = {
  id: string;
  title: string | null;
  problem: string | null;
  persona: string | null;
  industry: string | null;
  description: string | null;
  opportunity_score: number | null;
  opportunity_evidence: Array<{
    evidence: EvidenceReportRow | EvidenceReportRow[] | null;
  }> | null;
};

type EvidenceReportRow = {
  id: string;
  title: string | null;
  content: string;
  author: string | null;
  engagement_score: number;
  published_at: string | null;
  sources: SourceReportRow | SourceReportRow[] | null;
};

type SourceReportRow = {
  type: string;
  platform: string | null;
  url: string | null;
};

const MAX_SEARCH_QUERY_LENGTH = 140;

/**
 * Builds a search query for Reddit/Hacker News. Both search unstructured
 * keyword phrases rather than natural-language sentences, so terms are
 * deduplicated and the result capped: a long, repetitive, sentence-shaped
 * query (e.g. an industry name repeated inside a founder's raw message)
 * reliably returns zero hits on both sources.
 */
function buildSearchQuery(filters: ScanFilters) {
  const seen = new Set<string>();
  const words = [
    filters.industry,
    filters.buyer_type,
    filters.geography,
    ...(filters.problem_hints ?? [])
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .flatMap((part) => part.trim().split(/\s+/))
    .filter((word) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return words.join(" ").slice(0, MAX_SEARCH_QUERY_LENGTH).trim();
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function scoringInput(evidence: EvidenceItem, painScore: number) {
  const engagementScore = clampScore(evidence.engagementScore ?? 0);
  const normalizedPainScore = clampScore(painScore * 10);

  return {
    painScore: normalizedPainScore,
    frequencyScore: engagementScore,
    intentScore: engagementScore,
    marketScore: 50,
    competitionGapScore: 50
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1000);
  return "The scan workflow failed unexpectedly.";
}

function reportErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  return "Report generation failed unexpectedly.";
}

async function recordProgressSafely(input: Parameters<typeof recordScanProgress>[0]) {
  try {
    await recordScanProgress(input);
  } catch (error) {
    console.error("Scan progress event failed", {
      scanId: input.scanId,
      stage: input.stage,
      error: errorMessage(error).slice(0, 300)
    });
  }
}

function deduplicateEvidence(items: EvidenceItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url?.trim().toLowerCase() || `${item.title.trim().toLowerCase()}|${item.content.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function collectEvidence(query: string): Promise<EvidenceItem[]> {
  const sources = [
    {
      name: "Hacker News",
      fetch: () => fetchHackerNewsEvidence(query, 25)
    },
    {
      name: "Reddit",
      fetch: () => fetchRedditEvidence(query, 25)
    }
  ];

  const results = await Promise.allSettled(sources.map((source) => source.fetch()));
  const evidenceItems: EvidenceItem[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      console.log("Evidence source succeeded", { source: sources[index].name, count: result.value.length, query });
      evidenceItems.push(...result.value);
      continue;
    }
    console.error("Evidence source failed", { source: sources[index].name, query, error: errorMessage(result.reason) });
  }

  if (results.every((result) => result.status === "rejected")) {
    throw new Error("All evidence sources failed.");
  }

  return evidenceItems;
}

async function findEvidenceId(
  supabase: ReturnType<typeof createAdminClient>,
  evidence: EvidenceItem
) {
  let sourceId: string | undefined;

  if (evidence.url) {
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("id")
      .eq("url", evidence.url)
      .limit(1)
      .maybeSingle();
    if (sourceError) throw new Error(`Unable to find saved evidence source: ${sourceError.message}`);
    sourceId = source?.id;
  }

  const query = supabase
    .from("evidence")
    .select("id")
    .eq("title", evidence.title)
    .eq("content", evidence.content)
    .limit(1);
  const { data: savedEvidence, error } = sourceId
    ? await query.eq("source_id", sourceId).maybeSingle()
    : await query.maybeSingle();
  if (error) throw new Error(`Unable to find saved evidence: ${error.message}`);
  if (!savedEvidence) throw new Error("Saved evidence could not be found for opportunity extraction.");

  return savedEvidence.id as string;
}

async function getReportInput(
  supabase: ReturnType<typeof createAdminClient>,
  opportunityId: string
): Promise<FounderOpportunityReportInput> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id,title,problem,persona,industry,description,opportunity_score,opportunity_evidence(evidence(id,title,content,author,engagement_score,published_at,sources(type,platform,url)))")
    .eq("id", opportunityId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load opportunity report input: ${error.message}`);
  if (!data) throw new Error("Opportunity could not be found for report generation.");

  const opportunity = data as unknown as OpportunityReportRow;
  const evidence = (opportunity.opportunity_evidence ?? []).flatMap(({ evidence: linkedEvidence }) => {
    if (!linkedEvidence) return [];
    return Array.isArray(linkedEvidence) ? linkedEvidence : [linkedEvidence];
  });

  return {
    opportunity: {
      id: opportunity.id,
      title: opportunity.title,
      problem: opportunity.problem,
      persona: opportunity.persona,
      industry: opportunity.industry,
      description: opportunity.description
    },
    evidence: evidence.map((linkedEvidence): ReportEvidence => ({
      id: linkedEvidence.id,
      title: linkedEvidence.title,
      content: linkedEvidence.content,
      author: linkedEvidence.author,
      engagementScore: linkedEvidence.engagement_score,
      publishedAt: linkedEvidence.published_at,
      source: Array.isArray(linkedEvidence.sources)
        ? linkedEvidence.sources[0] ?? null
        : linkedEvidence.sources
    })),
    opportunityScore: opportunity.opportunity_score
  };
}

async function updateScan(
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabase.from("scans").update(values).eq("id", scanId);
  if (error) throw new Error(`Unable to update scan status: ${error.message}`);
}

/** Execute ingestion, opportunity extraction, scoring, and scan linkage for one research brief. */
export async function runScan(scanId: string): Promise<ScanRunSummary> {
  const supabase = createAdminClient();

  try {
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("id,filters")
      .eq("id", scanId)
      .maybeSingle();
    if (scanError) throw new Error(`Unable to load scan: ${scanError.message}`);
    if (!scan) throw new Error("Scan not found.");

    const query = buildSearchQuery(scan.filters as ScanFilters);
    if (!query) throw new Error("Scan does not contain enough context to search for evidence.");

    await updateScan(supabase, scanId, {
      status: "running",
      stage: "initializing",
      progress: 5,
      progress_stage: "initializing",
      progress_message: "Initialising investigation",
      evidence_count: 0,
      opportunity_count: 0
    });
    await recordProgressSafely({ scanId, stage: "initializing", message: "Initialising investigation" });

    await updateScan(supabase, scanId, {
      status: "running",
      stage: "searching_sources",
      progress: 15,
      progress_stage: "searching_sources",
      progress_message: "Searching Reddit and Hacker News"
    });
    await recordProgressSafely({ scanId, stage: "searching_sources", message: "Searching Reddit and Hacker News" });

    const collectedEvidence = await collectEvidence(query);
    await updateScan(supabase, scanId, {
      status: "running",
      stage: "collecting_evidence",
      progress: 30,
      progress_stage: "collecting_evidence",
      progress_message: "Collecting evidence",
      evidence_count: collectedEvidence.length
    });
    await recordProgressSafely({
      scanId,
      stage: "collecting_evidence",
      message: "Collecting evidence",
      evidenceCount: collectedEvidence.length
    });

    const evidenceItems = deduplicateEvidence(collectedEvidence);
    await updateScan(supabase, scanId, {
      status: "running",
      stage: "deduplicating_evidence",
      progress: 38,
      progress_stage: "deduplicating_evidence",
      progress_message: "Removing duplicate evidence",
      evidence_count: evidenceItems.length
    });
    await recordProgressSafely({
      scanId,
      stage: "deduplicating_evidence",
      message: "Removing duplicate evidence",
      evidenceCount: evidenceItems.length
    });
    await saveEvidence(evidenceItems);

    await updateScan(supabase, scanId, {
      status: "running",
      stage: "analyzing",
      progress: 50,
      progress_stage: "analyzing_evidence",
      progress_message: "Extracting opportunities",
      evidence_count: evidenceItems.length
    });
    await recordProgressSafely({
      scanId,
      stage: "analyzing_evidence",
      message: "Extracting opportunities",
      evidenceCount: evidenceItems.length
    });

    let opportunitiesCreated = 0;
    let extractionFailures = 0;
    const opportunitiesToScore: Array<{ opportunityId: string; evidence: EvidenceItem; painScore: number }> = [];
    for (const [index, evidence] of evidenceItems.entries()) {
      let created: Awaited<ReturnType<typeof createOpportunity>> = null;
      try {
        const evidenceId = await findEvidenceId(supabase, evidence);
        created = await createOpportunity(evidence, evidenceId);
      } catch (error) {
        extractionFailures += 1;
        console.error("Evidence opportunity extraction failed", {
          scanId,
          evidenceTitle: evidence.title.slice(0, 160),
          error: errorMessage(error).slice(0, 500)
        });
      }

      if (created) {
        if (created.isNew) {
          opportunitiesToScore.push({
            opportunityId: created.opportunityId,
            evidence,
            painScore: created.extraction.painScore
          });
        }

        const { error: linkError } = await supabase
          .from("scan_opportunities")
          .upsert({ scan_id: scanId, opportunity_id: created.opportunityId }, { onConflict: "scan_id,opportunity_id" });
        if (linkError) throw new Error(`Unable to link opportunity to scan: ${linkError.message}`);

        if (created.isNew) opportunitiesCreated += 1;
      }

      const progress = evidenceItems.length === 0 ? 75 : 50 + Math.round(((index + 1) / evidenceItems.length) * 25);
      await updateScan(supabase, scanId, {
        status: "running",
        stage: "analyzing",
        progress,
        progress_stage: "analyzing_evidence",
        progress_message: "Extracting opportunities",
        opportunity_count: opportunitiesCreated
      });
    }

    await updateScan(supabase, scanId, {
      status: "running",
      stage: "scoring",
      progress: 75,
      progress_stage: "scoring",
      progress_message: "Ranking opportunities",
      evidence_count: evidenceItems.length,
      opportunity_count: opportunitiesCreated
    });
    await recordProgressSafely({
      scanId,
      stage: "scoring",
      message: "Ranking opportunities",
      evidenceCount: evidenceItems.length,
      opportunityCount: opportunitiesCreated
    });

    for (const [index, opportunity] of opportunitiesToScore.entries()) {
      await scoreOpportunity({
        opportunityId: opportunity.opportunityId,
        ...scoringInput(opportunity.evidence, opportunity.painScore)
      });

      const progress = opportunitiesToScore.length === 0 ? 90 : 75 + Math.round(((index + 1) / opportunitiesToScore.length) * 15);
      await updateScan(supabase, scanId, {
        status: "running",
        stage: "scoring",
        progress,
        progress_stage: "scoring",
        progress_message: "Ranking opportunities",
        opportunity_count: opportunitiesCreated
      });
    }

    await updateScan(supabase, scanId, {
      status: "running",
      stage: "reporting",
      progress: 90,
      progress_stage: "generating_reports",
      progress_message: "Preparing founder reports",
      opportunity_count: opportunitiesCreated
    });
    await recordProgressSafely({
      scanId,
      stage: "generating_reports",
      message: "Preparing founder reports",
      evidenceCount: evidenceItems.length,
      opportunityCount: opportunitiesCreated
    });

    for (const [index, opportunity] of opportunitiesToScore.entries()) {
      try {
        const reportInput = await getReportInput(supabase, opportunity.opportunityId);
        const report = await generateFounderOpportunityReport(reportInput);
        if (report) await saveReport(opportunity.opportunityId, report);
      } catch (error) {
        console.error("Opportunity report generation failed", {
          scanId,
          opportunityId: opportunity.opportunityId,
          error: reportErrorMessage(error)
        });
      }

      const progress = opportunitiesToScore.length === 0
        ? 99
        : 90 + Math.round(((index + 1) / opportunitiesToScore.length) * 9);
      await updateScan(supabase, scanId, {
        status: "running",
        stage: "reporting",
        progress,
        progress_stage: "generating_reports",
        progress_message: "Preparing founder reports",
        opportunity_count: opportunitiesCreated
      });
    }

    const completedAt = new Date();
    await updateScan(supabase, scanId, {
      status: "completed",
      stage: "completed",
      progress: 100,
      progress_stage: "complete",
      progress_message: extractionFailures > 0
        ? "Research complete with extraction warnings"
        : "Research complete",
      evidence_count: evidenceItems.length,
      opportunity_count: opportunitiesCreated,
      completed_at: completedAt.toISOString(),
      error_code: extractionFailures > 0 ? "opportunity_extraction_partial" : null,
      error_detail: extractionFailures > 0
        ? `${extractionFailures} evidence item${extractionFailures === 1 ? "" : "s"} could not be converted into opportunities.`
        : null
    });
    await recordProgressSafely({
      scanId,
      stage: "complete",
      message: extractionFailures > 0 ? "Research complete with extraction warnings" : "Research complete",
      status: "completed",
      evidenceCount: evidenceItems.length,
      opportunityCount: opportunitiesCreated
    });

    return {
      scanId,
      evidenceCollected: evidenceItems.length,
      opportunitiesCreated,
      completedAt
    };
  } catch (error) {
    const message = errorMessage(error);
    try {
      await updateScan(supabase, scanId, {
        status: "failed",
        stage: "failed",
        progress_stage: "failed",
        progress_message: message,
        error_code: "scan_orchestration_failed",
        error_detail: message
      });
      await recordProgressSafely({ scanId, stage: "failed", message, status: "failed" });
    } catch {
      // Preserve the original workflow failure when status persistence also fails.
    }
    throw error;
  }
}
