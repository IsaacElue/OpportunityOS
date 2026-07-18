import "server-only";

import { buildScoutContext } from "@/lib/scout/context";
import { getScoutMemories } from "@/lib/scout/memory/getMemory";
import type { ScoutContext, ScoutScanFilters } from "@/lib/scout/types";

export type CreateScoutResearchContextInput = {
  organization_id: string;
  filters: ScoutScanFilters;
};

/** Build Scout's research context from a scan's filters and saved organization memory. */
export async function createScoutResearchContext({
  organization_id,
  filters
}: CreateScoutResearchContextInput): Promise<ScoutContext> {
  const memories = await getScoutMemories({ organization_id });

  return buildScoutContext({
    filters,
    memories,
    previousScans: []
  });
}
