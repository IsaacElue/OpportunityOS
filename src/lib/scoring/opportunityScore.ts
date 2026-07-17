import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateScore } from "@/lib/scoring/calculateScore";
import type { OpportunityScoreInput, OpportunityScoreResult } from "@/lib/scoring/types";

export type ScoreOpportunityInput = OpportunityScoreInput & {
  opportunityId: string;
};

/** Calculate and persist the score dimensions for an opportunity. */
export async function scoreOpportunity(input: ScoreOpportunityInput): Promise<OpportunityScoreResult> {
  const result = calculateScore(input);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("opportunities")
    .update({
      opportunity_score: result.total,
      pain_score: input.painScore,
      frequency_score: input.frequencyScore,
      intent_score: input.intentScore,
      market_score: input.marketScore,
      competition_gap_score: input.competitionGapScore
    })
    .eq("id", input.opportunityId);
  if (error) throw new Error(`Unable to persist opportunity score: ${error.message}`);

  return result;
}
