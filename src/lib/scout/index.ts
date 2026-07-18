export { buildScoutContext } from "@/lib/scout/context";
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
  ScoutMessage,
  ScoutMessageVariables,
  ScoutPreviousScan,
  ScoutScanFilters
} from "@/lib/scout/types";
export type {
  GetScoutMemoriesInput,
  SaveScoutMemoryInput,
  ScoutMemory,
  ScoutMemoryType
} from "@/lib/scout/memory";
