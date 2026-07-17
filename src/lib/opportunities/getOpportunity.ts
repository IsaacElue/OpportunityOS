import "server-only";

import type { ScanOpportunity } from "@/lib/opportunities/getScanOpportunities";
import { createClient } from "@/lib/supabase/server";

export type OpportunityEvidence = {
  id: string;
  title: string | null;
  content: string;
  author: string | null;
  engagementScore: number;
  publishedAt: string | null;
  source: {
    type: string;
    platform: string | null;
    url: string | null;
  } | null;
};

export type Opportunity = Omit<ScanOpportunity, "evidenceCount"> & {
  evidence: OpportunityEvidence[];
};

type OpportunityDetailRow = {
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
  opportunity_evidence: Array<{
    evidence: EvidenceRow | EvidenceRow[] | null;
  }> | null;
};

type SourceRow = {
  type: string;
  platform: string | null;
  url: string | null;
};

type EvidenceRow = {
      id: string;
      title: string | null;
      content: string;
      author: string | null;
      engagement_score: number;
      published_at: string | null;
      sources: SourceRow | SourceRow[] | null;
};

/** Fetch an opportunity and the evidence records linked to it. */
export async function getOpportunity(opportunityId: string): Promise<Opportunity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("id,title,problem,persona,industry,description,opportunity_score,pain_score,frequency_score,intent_score,market_score,competition_gap_score,confidence_score,opportunity_evidence(evidence(id,title,content,author,engagement_score,published_at,sources(type,platform,url)))")
    .eq("id", opportunityId)
    .maybeSingle();
  if (error) throw new Error(`Unable to fetch opportunity: ${error.message}`);
  if (!data) return null;

  const opportunity = data as unknown as OpportunityDetailRow;
  const evidence = (opportunity.opportunity_evidence ?? []).flatMap(({ evidence: linkedEvidence }) => {
    if (!linkedEvidence) return [];
    return Array.isArray(linkedEvidence) ? linkedEvidence : [linkedEvidence];
  });

  return {
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
    evidence: evidence.map((linkedEvidence) => ({
      id: linkedEvidence.id,
      title: linkedEvidence.title,
      content: linkedEvidence.content,
      author: linkedEvidence.author,
      engagementScore: linkedEvidence.engagement_score,
      publishedAt: linkedEvidence.published_at,
      source: Array.isArray(linkedEvidence.sources) ? linkedEvidence.sources[0] ?? null : linkedEvidence.sources
    }))
  };
}
