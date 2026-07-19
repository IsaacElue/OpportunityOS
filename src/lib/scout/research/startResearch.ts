import "server-only";

import { runScoutLoop } from "@/lib/scout/agent/loop";
import { buildScoutBrainContext, getScoutPersonality } from "@/lib/scout/brain/buildBrainContext";
import type { ScoutBrainContext } from "@/lib/scout/brain/types";
import { buildScoutContext } from "@/lib/scout/context";
import { scanStarted } from "@/lib/scout/messages";
import type { ScoutDecision } from "@/lib/scout/intelligence/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ScoutScanRequest,
  StartScoutResearchInput,
  StartScoutResearchResult
} from "@/lib/scout/research/types";
import type { ScoutScanFilters } from "@/lib/scout/types";

const defaultFilters: ScoutScanRequest = {
  industry: "General market",
  buyer_type: "Founder",
  geography: "Global",
  problem_hints: []
};

function cleanText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

/** Translate Scout's intent into the established scan filters without widening user scope. */
export function toScoutScanRequest(
  filters: ScoutScanFilters,
  goal: string,
  decision?: ScoutDecision
): ScoutScanRequest {
  const hints = (filters.problem_hints ?? [])
    .map((hint) => hint.trim())
    .filter(Boolean)
    .slice(0, 3);
  const normalizedGoal = goal.trim();

  if (hints.length === 0 && normalizedGoal) hints.push(normalizedGoal.slice(0, 500));
  if (hints.length === 0 && decision && decision.action !== "research_market") {
    hints.push(`Scout focus: ${decision.action.replaceAll("_", " ")}`);
  }

  return {
    industry: cleanText(filters.industry, defaultFilters.industry),
    buyer_type: cleanText(filters.buyer_type, defaultFilters.buyer_type),
    geography: cleanText(filters.geography, defaultFilters.geography),
    problem_hints: hints
  };
}

/** Start a queued scan from Scout intent; scan execution remains owned by the existing execute flow. */
export async function startScoutResearch({
  organizationId,
  requestedBy,
  goal,
  filters
}: StartScoutResearchInput): Promise<StartScoutResearchResult> {
  let context: ScoutBrainContext;
  try {
    context = await buildScoutBrainContext({ organization_id: organizationId, filters });
  } catch {
    const currentResearch = buildScoutContext({ filters });
    context = {
      identity: currentResearch.identity,
      personality: getScoutPersonality(),
      memories: currentResearch.memories,
      feedback: [],
      current_research: currentResearch,
      previous_scans: currentResearch.previous_scans
    };
  }

  let decision: ScoutDecision | undefined;
  try {
    decision = (await runScoutLoop({ context, goal })).decision;
  } catch {
    // A scan can still be created from the user's explicit brief when reasoning is unavailable.
  }

  const scanRequest = toScoutScanRequest(filters, goal, decision);
  const supabase = createAdminClient();
  const { data: scan, error } = await supabase
    .from("scans")
    .insert({
      organization_id: organizationId,
      requested_by: requestedBy,
      idempotency_key: crypto.randomUUID(),
      filters: scanRequest,
      status: "queued",
      stage: "brief_created",
      progress: 0
    })
    .select("id,status")
    .single();
  if (error) throw new Error(`Unable to create Scout research scan: ${error.message}`);

  return {
    scanId: scan.id as string,
    scoutMessage: scanStarted({
      industry: scanRequest.industry,
      geography: scanRequest.geography
    }),
    status: "queued"
  };
}
