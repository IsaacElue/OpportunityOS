import "server-only";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { fetchHackerNewsEvidence } from "@/lib/ingestion/hackernews";
import { saveEvidence } from "@/lib/ingestion/saveEvidence";
import { createOpportunity } from "@/lib/intelligence/createOpportunity";
import { scoreOpportunity } from "@/lib/scoring/opportunityScore";
import { createClient } from "@/lib/supabase/server";

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

async function findEvidenceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  scanId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabase.from("scans").update(values).eq("id", scanId);
  if (error) throw new Error(`Unable to update scan status: ${error.message}`);
}

/** Execute ingestion, opportunity extraction, scoring, and scan linkage for one research brief. */
export async function runScan(scanId: string): Promise<ScanRunSummary> {
  const supabase = await createClient();

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

    await updateScan(supabase, scanId, { status: "queued", stage: "queued", progress: 0 });
    await updateScan(supabase, scanId, { status: "running", stage: "collecting_evidence", progress: 10 });

    const evidenceItems = await fetchHackerNewsEvidence(query);
    await saveEvidence(evidenceItems);

    // `analyzing` is represented by the stage because `scans.status` only
    // permits queued, running, completed, failed, and cancelled.
    await updateScan(supabase, scanId, { status: "running", stage: "analyzing", progress: 50 });

    let opportunitiesCreated = 0;
    for (const [index, evidence] of evidenceItems.entries()) {
      const evidenceId = await findEvidenceId(supabase, evidence);
      const created = await createOpportunity(evidence, evidenceId);

      if (created) {
        await scoreOpportunity({
          opportunityId: created.opportunityId,
          ...scoringInput(evidence, created.extraction.painScore)
        });

        const { error: linkError } = await supabase
          .from("scan_opportunities")
          .upsert({ scan_id: scanId, opportunity_id: created.opportunityId }, { onConflict: "scan_id,opportunity_id" });
        if (linkError) throw new Error(`Unable to link opportunity to scan: ${linkError.message}`);

        opportunitiesCreated += 1;
      }

      const progress = evidenceItems.length === 0 ? 90 : 50 + Math.round(((index + 1) / evidenceItems.length) * 40);
      await updateScan(supabase, scanId, { status: "running", stage: "analyzing", progress });
    }

    const completedAt = new Date();
    await updateScan(supabase, scanId, {
      status: "completed",
      stage: "completed",
      progress: 100,
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
    try {
      await updateScan(supabase, scanId, {
        status: "failed",
        stage: "failed",
        error_code: "scan_orchestration_failed",
        error_detail: errorMessage(error)
      });
    } catch {
      // Preserve the original workflow failure when status persistence also fails.
    }
    throw error;
  }
}
