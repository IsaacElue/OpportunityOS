import "server-only";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { extractOpportunity } from "@/lib/intelligence/extractor";
import type { OpportunityExtraction } from "@/lib/intelligence/types";
import { createClient } from "@/lib/supabase/server";

export type CreatedOpportunity = {
  opportunityId: string;
  extraction: OpportunityExtraction;
};

/**
 * Extract an opportunity from a persisted evidence item, then link the new
 * opportunity to that evidence record. Returns null when no opportunity is
 * sufficiently supported by the evidence.
 */
export async function createOpportunity(
  evidence: EvidenceItem,
  evidenceId: string
): Promise<CreatedOpportunity | null> {
  const extraction = await extractOpportunity(evidence);
  if (!extraction) return null;

  const supabase = await createClient();
  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .insert({
      title: extraction.title,
      problem: extraction.problem,
      persona: extraction.persona,
      industry: extraction.industry,
      description: extraction.description,
      opportunity_score: extraction.painScore
    })
    .select("id")
    .single();
  if (opportunityError) throw new Error(`Unable to create opportunity: ${opportunityError.message}`);

  const { error: relationshipError } = await supabase
    .from("opportunity_evidence")
    .insert({ opportunity_id: opportunity.id, evidence_id: evidenceId });
  if (relationshipError) {
    await supabase.from("opportunities").delete().eq("id", opportunity.id);
    throw new Error(`Unable to link opportunity evidence: ${relationshipError.message}`);
  }

  return { opportunityId: opportunity.id, extraction };
}
