import "server-only";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { fetchRedditEvidence } from "@/lib/ingestion/reddit";
import { saveEvidence } from "@/lib/ingestion/saveEvidence";
import { createOpportunity } from "@/lib/intelligence/createOpportunity";
import { scoreOpportunity } from "@/lib/scoring/opportunityScore";
import { createAdminClient } from "@/lib/supabase/admin";

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

function buildSearchQuery(filters: ScanFilters) {
  return [
    filters.industry,
    filters.buyer_type,
    filters.geography,
    ...(filters.problem_hints ?? [])
  ].filter((part): part is string => Boolean(part?.trim())).join(" ");
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

async function collectEvidence(query: string): Promise<EvidenceItem[]> {
  const sources = [
    { name: "Hacker News", fetch: () => fetchHackerNewsEvidence(query) },
    { name: "Reddit", fetch: () => fetchRedditEvidence(query) }
  ];
  const results = await Promise.allSettled(sources.map((source) => source.fetch()));
  const evidenceItems: EvidenceItem[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      evidenceItems.push(...result.value);
      continue;
    }
    console.error("Evidence source failed", { source: sources[index].name, error: result.reason });
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
      stage: "collecting_evidence",
      progress: 10,
      progress_stage: "collecting_evidence",
      progress_message: "Searching market signals",
      evidence_count: 0,
      opportunity_count: 0
    });

    const evidenceItems = await collectEvidence(query);
    await saveEvidence(evidenceItems);

    await updateScan(supabase, scanId, {
      status: "running",
      stage: "analyzing",
      progress: 50,
      progress_stage: "analyzing_evidence",
      progress_message: "Extracting opportunities",
      evidence_count: evidenceItems.length
    });

    let opportunitiesCreated = 0;
    const opportunitiesToScore: Array<{ opportunityId: string; evidence: EvidenceItem; painScore: number }> = [];
    for (const [index, evidence] of evidenceItems.entries()) {
      const evidenceId = await findEvidenceId(supabase, evidence);
      const created = await createOpportunity(evidence, evidenceId);

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

    const completedAt = new Date();
    await updateScan(supabase, scanId, {
      status: "completed",
      stage: "completed",
      progress: 100,
      progress_stage: "complete",
      progress_message: "Research complete",
      evidence_count: evidenceItems.length,
      opportunity_count: opportunitiesCreated,
      completed_at: completedAt.toISOString(),
      error_code: null,
      error_detail: null
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
    } catch {
      // Preserve the original workflow failure when status persistence also fails.
    }
    throw error;
  }
}
