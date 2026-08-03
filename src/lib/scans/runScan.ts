import "server-only";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { buildSearchQuery as buildKeywordQuery } from "@/lib/ingestion/buildSearchQuery";
import { fetchGithubEvidence } from "@/lib/ingestion/github";
import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
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

/**
 * Cursor state carried between /execute invocations so a scan resumes where
 * it left off instead of re-running the whole pipeline in one request. Each
 * invocation processes one bounded batch (or, for scoring, one fast
 * deterministic pass) and returns quickly, well inside any serverless
 * function time limit - the OpenAI-bound extraction and report-generation
 * stages are the ones that previously ran 25+ sequential model calls inside
 * a single request and hit Vercel's timeout.
 */
type ScanState = {
  evidenceItems: EvidenceItem[];
  evidenceCursor: number;
  opportunitiesToScore: Array<{ opportunityId: string; evidence: EvidenceItem; painScore: number }>;
  opportunitiesCreated: number;
  extractionFailures: number;
  reportingCursor: number;
};

const EXTRACTION_BATCH_SIZE = 5;
const REPORT_BATCH_SIZE = 3;

export type ScanRunResult =
  | { scanId: string; status: "running" }
  | { scanId: string; status: "completed"; evidenceCollected: number; opportunitiesCreated: number; completedAt: Date }
  | { scanId: string; status: "failed" };

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

function buildSearchQuery(filters: ScanFilters) {
  return buildKeywordQuery([
    filters.industry,
    filters.buyer_type,
    filters.geography,
    ...(filters.problem_hints ?? [])
  ]);
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
      name: "GitHub",
      fetch: () => fetchGithubEvidence(query, 25)
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

/** jsonb round-trips Date fields as strings; restore them before reuse. */
function rehydrateEvidenceItem(evidence: EvidenceItem): EvidenceItem {
  if (!evidence.publishedAt || evidence.publishedAt instanceof Date) return evidence;
  const date = new Date(evidence.publishedAt as unknown as string);
  return { ...evidence, publishedAt: Number.isNaN(date.getTime()) ? undefined : date };
}

function rehydrateScanState(raw: unknown): ScanState | null {
  if (!raw || typeof raw !== "object") return null;
  const state = raw as Partial<ScanState>;
  if (!Array.isArray(state.evidenceItems)) return null;

  return {
    evidenceItems: state.evidenceItems.map(rehydrateEvidenceItem),
    evidenceCursor: state.evidenceCursor ?? 0,
    opportunitiesToScore: (state.opportunitiesToScore ?? []).map((entry) => ({
      ...entry,
      evidence: rehydrateEvidenceItem(entry.evidence)
    })),
    opportunitiesCreated: state.opportunitiesCreated ?? 0,
    extractionFailures: state.extractionFailures ?? 0,
    reportingCursor: state.reportingCursor ?? 0
  };
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

/** Stage 1 (single invocation): search, dedupe, and persist evidence, then hand off to extraction. */
async function runInitialStage(
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  filters: ScanFilters
): Promise<void> {
  const query = buildSearchQuery(filters);
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
    progress_message: "Searching Hacker News and GitHub"
  });
  await recordProgressSafely({ scanId, stage: "searching_sources", message: "Searching Hacker News and GitHub" });

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

  const state: ScanState = {
    evidenceItems,
    evidenceCursor: 0,
    opportunitiesToScore: [],
    opportunitiesCreated: 0,
    extractionFailures: 0,
    reportingCursor: 0
  };
  await updateScan(supabase, scanId, {
    status: "running",
    stage: "analyzing",
    progress: 50,
    progress_stage: "analyzing_evidence",
    progress_message: "Extracting opportunities",
    evidence_count: evidenceItems.length,
    scan_state: state
  });
  await recordProgressSafely({
    scanId,
    stage: "analyzing_evidence",
    message: "Extracting opportunities",
    evidenceCount: evidenceItems.length
  });
}

/** Stage 2 (one batch per invocation): extract opportunities from the next slice of evidence. */
async function runAnalyzingBatch(
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  state: ScanState
): Promise<void> {
  const batch = state.evidenceItems.slice(state.evidenceCursor, state.evidenceCursor + EXTRACTION_BATCH_SIZE);

  const results = await Promise.allSettled(batch.map(async (evidence) => {
    const evidenceId = await findEvidenceId(supabase, evidence);
    const created = await createOpportunity(evidence, evidenceId);
    return { evidence, created };
  }));

  for (const result of results) {
    if (result.status === "rejected") {
      state.extractionFailures += 1;
      console.error("Evidence opportunity extraction failed", {
        scanId,
        error: errorMessage(result.reason).slice(0, 500)
      });
      continue;
    }

    const { evidence, created } = result.value;
    if (!created) continue;

    if (created.isNew) {
      state.opportunitiesToScore.push({
        opportunityId: created.opportunityId,
        evidence,
        painScore: created.extraction.painScore
      });
      state.opportunitiesCreated += 1;
    }

    const { error: linkError } = await supabase
      .from("scan_opportunities")
      .upsert({ scan_id: scanId, opportunity_id: created.opportunityId }, { onConflict: "scan_id,opportunity_id" });
    if (linkError) throw new Error(`Unable to link opportunity to scan: ${linkError.message}`);
  }

  state.evidenceCursor += batch.length;
  const total = state.evidenceItems.length;
  const isDone = state.evidenceCursor >= total;
  const progress = total === 0 ? 75 : 50 + Math.round((state.evidenceCursor / total) * 25);

  if (!isDone) {
    await updateScan(supabase, scanId, {
      status: "running",
      stage: "analyzing",
      progress,
      progress_stage: "analyzing_evidence",
      progress_message: "Extracting opportunities",
      opportunity_count: state.opportunitiesCreated,
      scan_state: state
    });
    return;
  }

  await updateScan(supabase, scanId, {
    status: "running",
    stage: "scoring",
    progress: 75,
    progress_stage: "scoring",
    progress_message: "Ranking opportunities",
    evidence_count: total,
    opportunity_count: state.opportunitiesCreated,
    scan_state: state
  });
  await recordProgressSafely({
    scanId,
    stage: "scoring",
    message: "Ranking opportunities",
    evidenceCount: total,
    opportunityCount: state.opportunitiesCreated
  });
}

/** Stage 3 (single invocation): score every new opportunity. Deterministic math, no model calls. */
async function runScoringStage(
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  state: ScanState
): Promise<void> {
  for (const [index, opportunity] of state.opportunitiesToScore.entries()) {
    await scoreOpportunity({
      opportunityId: opportunity.opportunityId,
      ...scoringInput(opportunity.evidence, opportunity.painScore)
    });

    const progress = state.opportunitiesToScore.length === 0
      ? 90
      : 75 + Math.round(((index + 1) / state.opportunitiesToScore.length) * 15);
    await updateScan(supabase, scanId, {
      status: "running",
      stage: "scoring",
      progress,
      progress_stage: "scoring",
      progress_message: "Ranking opportunities",
      opportunity_count: state.opportunitiesCreated
    });
  }

  await updateScan(supabase, scanId, {
    status: "running",
    stage: "reporting",
    progress: 90,
    progress_stage: "generating_reports",
    progress_message: "Preparing founder reports",
    opportunity_count: state.opportunitiesCreated,
    scan_state: state
  });
  await recordProgressSafely({
    scanId,
    stage: "generating_reports",
    message: "Preparing founder reports",
    opportunityCount: state.opportunitiesCreated
  });
}

/** Stage 4 (one batch per invocation): generate founder reports for the next slice of opportunities. */
async function runReportingBatch(
  supabase: ReturnType<typeof createAdminClient>,
  scanId: string,
  state: ScanState
): Promise<ScanRunResult> {
  const batch = state.opportunitiesToScore.slice(state.reportingCursor, state.reportingCursor + REPORT_BATCH_SIZE);

  await Promise.allSettled(batch.map(async (opportunity) => {
    const reportInput = await getReportInput(supabase, opportunity.opportunityId);
    const report = await generateFounderOpportunityReport(reportInput);
    if (report) await saveReport(opportunity.opportunityId, report);
  })).then((results) => {
    results.forEach((result, index) => {
      if (result.status !== "rejected") return;
      console.error("Opportunity report generation failed", {
        scanId,
        opportunityId: batch[index]?.opportunityId,
        error: reportErrorMessage(result.reason)
      });
    });
  });

  state.reportingCursor += batch.length;
  const total = state.opportunitiesToScore.length;
  const isDone = state.reportingCursor >= total;
  const progress = total === 0 ? 99 : 90 + Math.round((state.reportingCursor / total) * 9);

  if (!isDone) {
    await updateScan(supabase, scanId, {
      status: "running",
      stage: "reporting",
      progress,
      progress_stage: "generating_reports",
      progress_message: "Preparing founder reports",
      opportunity_count: state.opportunitiesCreated,
      scan_state: state
    });
    return { scanId, status: "running" };
  }

  const completedAt = new Date();
  const evidenceCollected = state.evidenceItems.length;
  await updateScan(supabase, scanId, {
    status: "completed",
    stage: "completed",
    progress: 100,
    progress_stage: "complete",
    progress_message: state.extractionFailures > 0
      ? "Research complete with extraction warnings"
      : "Research complete",
    evidence_count: evidenceCollected,
    opportunity_count: state.opportunitiesCreated,
    completed_at: completedAt.toISOString(),
    error_code: state.extractionFailures > 0 ? "opportunity_extraction_partial" : null,
    error_detail: state.extractionFailures > 0
      ? `${state.extractionFailures} evidence item${state.extractionFailures === 1 ? "" : "s"} could not be converted into opportunities.`
      : null,
    scan_state: null
  });
  await recordProgressSafely({
    scanId,
    stage: "complete",
    message: state.extractionFailures > 0 ? "Research complete with extraction warnings" : "Research complete",
    status: "completed",
    evidenceCount: evidenceCollected,
    opportunityCount: state.opportunitiesCreated
  });

  return { scanId, status: "completed", evidenceCollected, opportunitiesCreated: state.opportunitiesCreated, completedAt };
}

/**
 * Advance one bounded step of a scan's pipeline and return. A scan resumes
 * across many short-lived invocations of this function - driven by the
 * client's existing progress poll - rather than one invocation running the
 * entire ingest-through-report pipeline, which previously made 25+
 * sequential OpenAI calls inside a single HTTP request and hit the
 * platform's function timeout.
 */
export async function runScan(scanId: string): Promise<ScanRunResult> {
  const supabase = createAdminClient();

  try {
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("id,filters,status,stage,scan_state,evidence_count,opportunity_count,completed_at")
      .eq("id", scanId)
      .maybeSingle();
    if (scanError) throw new Error(`Unable to load scan: ${scanError.message}`);
    if (!scan) throw new Error("Scan not found.");

    if (scan.status === "completed") {
      return {
        scanId,
        status: "completed",
        evidenceCollected: scan.evidence_count ?? 0,
        opportunitiesCreated: scan.opportunity_count ?? 0,
        completedAt: scan.completed_at ? new Date(scan.completed_at) : new Date()
      };
    }
    if (scan.status === "failed" || scan.status === "cancelled") {
      return { scanId, status: "failed" };
    }

    switch (scan.stage) {
      case "analyzing": {
        const state = rehydrateScanState(scan.scan_state);
        if (!state) throw new Error("Scan is missing its in-progress evidence state.");
        await runAnalyzingBatch(supabase, scanId, state);
        return { scanId, status: "running" };
      }
      case "scoring": {
        const state = rehydrateScanState(scan.scan_state);
        if (!state) throw new Error("Scan is missing its in-progress evidence state.");
        await runScoringStage(supabase, scanId, state);
        return { scanId, status: "running" };
      }
      case "reporting": {
        const state = rehydrateScanState(scan.scan_state);
        if (!state) throw new Error("Scan is missing its in-progress evidence state.");
        return await runReportingBatch(supabase, scanId, state);
      }
      default: {
        await runInitialStage(supabase, scanId, scan.filters as ScanFilters);
        return { scanId, status: "running" };
      }
    }
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
