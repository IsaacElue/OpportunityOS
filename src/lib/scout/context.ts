import { scoutIdentity } from "@/lib/scout/identity";
import type { ScoutMemory } from "@/lib/scout/memory/types";
import type { ScoutContext, ScoutPreviousScan, ScoutScanFilters } from "@/lib/scout/types";

export type BuildScoutContextInput = {
  filters: ScoutScanFilters;
  founderPersona?: string | null;
  memories?: ScoutMemory[];
  previousScans?: ScoutPreviousScan[];
  /** @deprecated Use previousScans for new Scout context consumers. */
  previousScanHistory?: ScoutPreviousScan[];
};

/** Builds the non-persistent context Scout can use to frame an investigation. */
export function buildScoutContext({
  filters,
  founderPersona,
  memories = [],
  previousScans,
  previousScanHistory
}: BuildScoutContextInput): ScoutContext {
  const scanHistory = previousScans ?? previousScanHistory ?? [];

  return {
    identity: scoutIdentity,
    filters: {
      industry: filters.industry ?? null,
      geography: filters.geography ?? null,
      problemHints: filters.problem_hints?.filter((hint) => Boolean(hint.trim())) ?? []
    },
    memories,
    previous_scans: scanHistory,
    founderPersona: founderPersona ?? filters.buyer_type ?? null,
    previousScanHistory: scanHistory
  };
}
