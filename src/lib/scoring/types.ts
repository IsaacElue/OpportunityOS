export type OpportunityScoreInput = {
  painScore: number;
  frequencyScore: number;
  intentScore: number;
  marketScore: number;
  competitionGapScore: number;
};

export type OpportunityScoreResult = {
  total: number;
  breakdown: {
    pain: number;
    frequency: number;
    intent: number;
    market: number;
    competitionGap: number;
  };
};
