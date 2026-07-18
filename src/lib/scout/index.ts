export { buildScoutContext } from "@/lib/scout/context";
export { createScoutResearchContext } from "@/lib/scout/buildContext";
export { scoutIdentity } from "@/lib/scout/identity";
export { getScoutMemories, saveScoutMemory } from "@/lib/scout/memory";
export {
  analyzingPatterns,
  evidenceFound,
  opportunityFound,
  scanCompleted,
  scanFailed,
  scanStarted
} from "@/lib/scout/messages";
export type {
  ScoutContext,
  ScoutEvent,
  ScoutIdentity,
  ScoutMessage,
  ScoutMessageVariables,
  ScoutPreviousScan,
  ScoutScanFilters
} from "@/lib/scout/types";
export type { BuildScoutContextInput } from "@/lib/scout/context";
export type { CreateScoutResearchContextInput } from "@/lib/scout/buildContext";
export type {
  GetScoutMemoriesInput,
  SaveScoutMemoryInput,
  ScoutMemory,
  ScoutMemoryType
} from "@/lib/scout/memory";
