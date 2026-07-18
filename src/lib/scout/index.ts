export { buildScoutContext } from "@/lib/scout/context";
export { scoutIdentity } from "@/lib/scout/identity";
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
