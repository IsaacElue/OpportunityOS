export { buildScoutContext } from "@/lib/scout/context";
export { createScoutResearchContext } from "@/lib/scout/buildContext";
export { executeScoutPlan, planScoutAction, runScoutAgent, runScoutLoop } from "@/lib/scout/agent";
export {
  buildScoutBrainContext,
  createScoutBrainContext,
  getScoutInstructions,
  getScoutPersonality
} from "@/lib/scout/brain";
export { scoutIdentity } from "@/lib/scout/identity";
export { getScoutFeedback, saveScoutFeedback } from "@/lib/scout/feedback";
export { getScoutMemories, saveScoutMemory } from "@/lib/scout/memory";
export { getScoutObjective, getScoutObjectives, saveScoutObjective } from "@/lib/scout/objectives";
export { executeScoutTool, getAvailableTools } from "@/lib/scout/tools";
export { planScoutTool } from "@/lib/scout/toolPlanning";
export { reasonWithScout } from "@/lib/scout/intelligence";
export { startScoutResearch, toScoutScanRequest } from "@/lib/scout/research";
export {
  appendMessage,
  createConversation,
  getConversation,
  getRecentMessages,
  listConversations
} from "@/lib/scout/conversation";
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
  RunScoutAgentInput,
  ScoutAgentAction,
  ScoutAgentExecution,
  ScoutAgentPlan,
  ScoutAgentPlanRun,
  ScoutAgentRun,
  RunScoutLoopInput
} from "@/lib/scout/agent";
export type {
  BuildScoutBrainContextInput,
  ScoutBrainContext,
  ScoutPersonality
} from "@/lib/scout/brain";
export type {
  GetScoutFeedbackInput,
  SaveScoutFeedbackInput,
  ScoutFeedback,
  ScoutFeedbackType
} from "@/lib/scout/feedback";
export type {
  GetScoutMemoriesInput,
  SaveScoutMemoryInput,
  ScoutMemory,
  ScoutMemoryType
} from "@/lib/scout/memory";
export type {
  GetScoutObjectiveInput,
  GetScoutObjectivesInput,
  SaveScoutObjectiveInput,
  ScoutObjective,
  ScoutObjectiveStatus
} from "@/lib/scout/objectives";
export type { ScoutTool, ToolResult } from "@/lib/scout/tools";
export type { PlanScoutToolInput, ScoutToolPlan } from "@/lib/scout/toolPlanning";
export type { ReasonWithScoutInput, ScoutDecision } from "@/lib/scout/intelligence";
export type {
  ScoutScanRequest,
  StartScoutResearchInput,
  StartScoutResearchResult
} from "@/lib/scout/research";
export type {
  AppendMessageInput,
  CreateConversationInput,
  GetConversationInput,
  GetRecentMessagesInput,
  ListConversationsInput,
  ScoutConversation,
  ScoutConversationMessage,
  ScoutConversationRole
} from "@/lib/scout/conversation";
