export type ScoutEvent =
  | "scan_started"
  | "evidence_found"
  | "analyzing_patterns"
  | "opportunity_found"
  | "scan_completed"
  | "scan_failed";

export type ScoutMessageVariables = {
  industry?: string | null;
  geography?: string | null;
  evidenceCount?: number;
  opportunityCount?: number;
  opportunityTitle?: string | null;
};

export type ScoutMessage = {
  event: ScoutEvent;
  content: string;
  variables: ScoutMessageVariables;
};

export type ScoutScanFilters = {
  industry?: string | null;
  buyer_type?: string | null;
  geography?: string | null;
  problem_hints?: string[] | null;
};

export type ScoutPreviousScan = {
  scanId: string;
  industry: string | null;
  completedAt: string | null;
  opportunityCount: number;
};

export type ScoutContext = {
  filters: {
    industry: string | null;
    geography: string | null;
    problemHints: string[];
  };
  founderPersona: string | null;
  previousScanHistory: ScoutPreviousScan[];
};
