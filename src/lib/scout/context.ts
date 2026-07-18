import type { ScoutContext, ScoutPreviousScan, ScoutScanFilters } from "@/lib/scout/types";

type BuildScoutContextInput = {
  filters: ScoutScanFilters;
  founderPersona?: string | null;
  previousScanHistory?: ScoutPreviousScan[];
};

/** Builds the non-persistent context Scout can use to frame an investigation. */
export function buildScoutContext({
  filters,
  founderPersona,
  previousScanHistory = []
}: BuildScoutContextInput): ScoutContext {
  return {
    filters: {
      industry: filters.industry ?? null,
      geography: filters.geography ?? null,
      problemHints: filters.problem_hints?.filter((hint) => Boolean(hint.trim())) ?? []
    },
    founderPersona: founderPersona ?? filters.buyer_type ?? null,
    previousScanHistory
  };
}
