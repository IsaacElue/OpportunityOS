import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ScanOpportunity = {
  id: string;
  title: string | null;
  problem: string | null;
  persona: string | null;
  industry: string | null;
  description: string | null;
  opportunityScore: number | null;
  painScore: number | null;
  frequencyScore: number | null;
  intentScore: number | null;
  marketScore: number | null;
  competitionGapScore: number | null;
  confidenceScore: number | null;
  evidenceCount: number;
};

type OpportunityRow = {
  id: string;
  title: string | null;
  problem: string | null;
  persona: string | null;
  industry: string | null;
  description: string | null;
  opportunity_score: number | null;
  pain_score: number | null;
  frequency_score: number | null;
  intent_score: number | null;
  market_score: number | null;
  competition_gap_score: number | null;
  confidence_score: number | null;
  opportunity_evidence: Array<{ count: number }> | null;
};

/** Fetch scored opportunities linked to a scan, including their evidence count. */
export async function getScanOpportunities(scanId: string): Promise<ScanOpportunity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("id,title,problem,persona,industry,description,opportunity_score,pain_score,frequency_score,intent_score,market_score,competition_gap_score,confidence_score,opportunity_evidence(count),scan_opportunities!inner(scan_id)")
    .eq("scan_opportunities.scan_id", scanId)
    .order("opportunity_score", { ascending: false });
  if (error) throw new Error(`Unable to fetch scan opportunities: ${error.message}`);
  return ((data ?? []) as OpportunityRow[]).map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    problem: opportunity.problem,
    persona: opportunity.persona,
    industry: opportunity.industry,
    description: opportunity.description,
    opportunityScore: opportunity.opportunity_score,
    painScore: opportunity.pain_score,
    frequencyScore: opportunity.frequency_score,
    intentScore: opportunity.intent_score,
    marketScore: opportunity.market_score,
    competitionGapScore: opportunity.competition_gap_score,
    confidenceScore: opportunity.confidence_score,
    evidenceCount: opportunity.opportunity_evidence?.[0]?.count ?? 0
  }));
}
