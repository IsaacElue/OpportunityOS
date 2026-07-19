import type { ScoutMessage, ScoutScanFilters } from "@/lib/scout/types";

export type StartScoutResearchInput = {
  organizationId: string;
  requestedBy: string;
  goal: string;
  filters: ScoutScanFilters;
};

export type ScoutScanRequest = {
  industry: string;
  buyer_type: string;
  geography: string;
  problem_hints: string[];
};

export type StartScoutResearchResult = {
  scanId: string;
  scoutMessage: ScoutMessage;
  status: "queued";
};
