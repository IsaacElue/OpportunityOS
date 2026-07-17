import "server-only";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { deduplicateOpportunity } from "@/lib/intelligence/deduplicate";
import { extractOpportunity } from "@/lib/intelligence/extractor";
import type { OpportunityExtraction } from "@/lib/intelligence/types";
import { createClient } from "@/lib/supabase/server";

export type CreatedOpportunity = {
  opportunityId: string;
  extraction: OpportunityExtraction;
  isNew: boolean;
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

  const duplicate = await deduplicateOpportunity(extraction);
  const supabase = await createClient();
  if (duplicate.isDuplicate && duplicate.existingOpportunityId) {
    const { error: relationshipError } = await supabase
      .from("opportunity_evidence")
      .upsert({ opportunity_id: duplicate.existingOpportunityId, evidence_id: evidenceId }, { onConflict: "opportunity_id,evidence_id" });
    if (relationshipError) throw new Error(`Unable to link duplicate opportunity evidence: ${relationshipError.message}`);

    return { opportunityId: duplicate.existingOpportunityId, extraction, isNew: false };
  }

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

  return { opportunityId: opportunity.id, extraction, isNew: true };
}
