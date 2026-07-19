import type { ScoutFeedback } from "@/lib/scout/feedback/types";
import type { ScoutMemory } from "@/lib/scout/memory/types";
import type { ScoutContext, ScoutIdentity, ScoutPreviousScan, ScoutScanFilters } from "@/lib/scout/types";

export type ScoutPersonality = {
  description: string;
  traits: readonly string[];
};

export type ScoutBrainContext = {
  identity: ScoutIdentity;
  personality: ScoutPersonality;
  memories: ScoutMemory[];
  feedback: ScoutFeedback[];
  current_research: ScoutContext;
  previous_scans: ScoutPreviousScan[];
};

export type BuildScoutBrainContextInput = {
  organization_id: string;
  filters: ScoutScanFilters;
};
