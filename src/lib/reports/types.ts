export type ReportOpportunity = {
  id: string;
  title: string | null;
  problem: string | null;
  persona: string | null;
  industry: string | null;
  description: string | null;
};

export type ReportEvidence = {
  id: string;
  title: string | null;
  content: string;
  author: string | null;
  engagementScore: number;
  publishedAt: string | Date | null;
  source: {
    type: string;
    platform: string | null;
    url: string | null;
  } | null;
};

export type FounderOpportunityReport = {
  problem: string;
  evidence_summary: string;
  buyer_profile: string;
  existing_workarounds: string;
  ai_advantage: string;
  mvp_suggestion: string;
  validation_experiment: string;
  confidence_score: number;
};

export type FounderOpportunityReportInput = {
  opportunity: ReportOpportunity;
  evidence: ReportEvidence[];
  opportunityScore: number | null;
};
