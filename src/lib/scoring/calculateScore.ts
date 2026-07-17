import type { OpportunityScoreInput, OpportunityScoreResult } from "@/lib/scoring/types";

const SCORE_WEIGHTS = {
  pain: 0.30,
  frequency: 0.25,
  intent: 0.20,
  market: 0.15,
  competitionGap: 0.10
} as const;

function validateScore(name: string, score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new RangeError(`${name} must be a whole number between 0 and 100.`);
  }
}

/** Calculate a deterministic 0-100 weighted opportunity score. */
export function calculateScore(input: OpportunityScoreInput): OpportunityScoreResult {
  validateScore("painScore", input.painScore);
  validateScore("frequencyScore", input.frequencyScore);
  validateScore("intentScore", input.intentScore);
  validateScore("marketScore", input.marketScore);
  validateScore("competitionGapScore", input.competitionGapScore);

  const breakdown = {
    pain: input.painScore * SCORE_WEIGHTS.pain,
    frequency: input.frequencyScore * SCORE_WEIGHTS.frequency,
    intent: input.intentScore * SCORE_WEIGHTS.intent,
    market: input.marketScore * SCORE_WEIGHTS.market,
    competitionGap: input.competitionGapScore * SCORE_WEIGHTS.competitionGap
  };

  return {
    total: Math.round(breakdown.pain + breakdown.frequency + breakdown.intent + breakdown.market + breakdown.competitionGap),
    breakdown
  };
}
