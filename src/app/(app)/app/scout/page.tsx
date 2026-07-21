import { ScoutWorkspace } from "@/components/scout-workspace";
import type { ScoutActivityItem } from "@/components/scout-activity-feed";
import type { ScoutWorkspaceStatusData } from "@/components/scout-workspace-status";
import { getRecentMessages, listConversations } from "@/lib/scout/conversation";
import { getScoutExecutions } from "@/lib/scout/executions";
import { getScoutFeedback } from "@/lib/scout/feedback";
import { getScoutMemories } from "@/lib/scout/memory";
import { getScoutObjectives } from "@/lib/scout/objectives";
import { createClient } from "@/lib/supabase/server";

type ScanRow = {
  id: string;
  status: string;
  filters: { industry?: string; buyer_type?: string } | null;
  requested_at: string;
  progress_stage: string | null;
  progress_message: string | null;
  evidence_count: number | null;
  opportunity_count: number | null;
};

type OpportunityRow = { id: string; title: string | null; opportunity_score: number | null; created_at: string };
type ScheduleRow = { id: string; objective_id: string; frequency: string; next_run_at: string; created_at: string };

export default async function ScoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).limit(1).single();
  const organizationId = membership!.organization_id;

  const [preferencesResult, conversations, objectives, memories, feedback, executions, scansResult, opportunitiesResult, schedulesResult] = await Promise.all([
    supabase.from("founder_preferences").select("industries,buyer_types,geography").eq("organization_id", organizationId).maybeSingle(),
    listConversations({ organization_id: organizationId, user_id: user!.id, limit: 12 }),
    getScoutObjectives({ organization_id: organizationId }),
    getScoutMemories({ organization_id: organizationId }),
    getScoutFeedback({ organization_id: organizationId }),
    getScoutExecutions({ organization_id: organizationId }),
    supabase.from("scans").select("id,status,filters,requested_at,progress_stage,progress_message,evidence_count,opportunity_count").eq("organization_id", organizationId).in("status", ["queued", "running"]).order("requested_at", { ascending: false }).limit(4),
    supabase.from("opportunities").select("id,title,opportunity_score,created_at,scan_opportunities!inner(scans!inner(organization_id))").eq("scan_opportunities.scans.organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
    supabase.from("scout_schedules").select("id,objective_id,frequency,next_run_at,created_at").eq("organization_id", organizationId).eq("enabled", true).order("next_run_at", { ascending: true }).limit(5)
  ]);

  const conversationHistory = await Promise.all(conversations.map(async (conversation) => [
    conversation.id,
    await getRecentMessages({ conversation_id: conversation.id, limit: 15 })
  ] as const));
  const conversationMessages = Object.fromEntries(conversationHistory.map(([conversationId, messages]) => [conversationId, messages.map((message) => ({ id: message.id, role: message.role, content: message.content, createdAt: message.created_at }))]));
  const initialConversation = conversations[0] ?? null;
  const initialMessages = initialConversation ? conversationMessages[initialConversation.id] ?? [] : [];
  const scans = (scansResult.data ?? []) as unknown as ScanRow[];
  const opportunities = (opportunitiesResult.data ?? []) as unknown as OpportunityRow[];
  const schedules = (schedulesResult.data ?? []) as unknown as ScheduleRow[];
  const objectiveTitles = new Map(objectives.map((objective) => [objective.id, objective.title]));
  const activeObjectives = objectives.filter((objective) => objective.status === "active").slice(0, 3);
  const research = scans.map((scan) => ({
    id: scan.id,
    title: scan.filters?.industry ?? scan.filters?.buyer_type ?? "Scout investigation",
    status: scan.status,
    createdAt: scan.requested_at,
    progressStage: scan.progress_stage,
    progressMessage: scan.progress_message,
    evidenceCount: scan.evidence_count ?? 0,
    opportunityCount: scan.opportunity_count ?? 0
  }));
  const activity: ScoutActivityItem[] = [
    ...executions.slice(0, 4).map((execution) => ({ id: `execution-${execution.id}`, title: `Scout execution ${execution.status}`, detail: `${execution.steps_completed} steps completed with ${execution.tools_used.length} tools.`, occurredAt: execution.completed_at ?? execution.started_at, kind: "execution" as const })),
    ...opportunities.slice(0, 4).map((opportunity) => ({ id: `opportunity-${opportunity.id}`, title: "Scout discovered an opportunity", detail: opportunity.title ?? "Untitled opportunity", occurredAt: opportunity.created_at, kind: "opportunity" as const })),
    ...objectives.filter((objective) => objective.status === "completed").slice(0, 3).map((objective) => ({ id: `objective-${objective.id}`, title: "Objective completed", detail: objective.title, occurredAt: objective.updated_at, kind: "objective" as const })),
    ...schedules.slice(0, 3).map((schedule) => ({ id: `schedule-${schedule.id}`, title: "Scheduled research queued", detail: objectiveTitles.get(schedule.objective_id) ?? "Scout objective", occurredAt: schedule.created_at, kind: "schedule" as const })),
    ...memories.slice(0, 3).map((memory) => ({ id: `memory-${memory.id}`, title: "Memory stored", detail: memory.content, occurredAt: memory.created_at, kind: "memory" as const })),
    ...feedback.slice(0, 3).map((item) => ({ id: `feedback-${item.id}`, title: "Founder feedback recorded", detail: item.note ?? item.feedback_type, occurredAt: item.created_at, kind: "feedback" as const })),
    ...research.map((scan) => ({ id: `research-${scan.id}`, title: `Research ${scan.status}`, detail: scan.progressMessage ?? scan.title, occurredAt: scan.createdAt, kind: "research" as const }))
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 12);
  const status: ScoutWorkspaceStatusData = {
    activeObjectives: activeObjectives.map((objective) => ({ id: objective.id, title: objective.title, status: objective.status, updatedAt: objective.updated_at })),
    recentOpportunities: opportunities.slice(0, 3).map((opportunity) => ({ id: opportunity.id, title: opportunity.title ?? "Untitled opportunity", score: opportunity.opportunity_score })),
    memoryCount: memories.length,
    feedbackCount: feedback.length,
    recentExecutions: executions.slice(0, 3).map((execution) => ({ id: execution.id, status: execution.status, completedAt: execution.completed_at, toolsUsed: execution.tools_used.length, stepsCompleted: execution.steps_completed })),
    upcomingSchedules: schedules.map((schedule) => ({ id: schedule.id, objectiveTitle: objectiveTitles.get(schedule.objective_id) ?? "Scout objective", frequency: schedule.frequency, nextRunAt: schedule.next_run_at })),
    research,
    activity
  };
  const preferences = preferencesResult.data;

  return <ScoutWorkspace
    conversations={conversations.map((conversation) => ({ id: conversation.id, title: conversation.title, updatedAt: conversation.updated_at, preview: conversationMessages[conversation.id]?.at(-1)?.content ?? null }))}
    initialConversationId={initialConversation?.id ?? null}
    initialConversationTitle={initialConversation?.title ?? "New conversation"}
    initialMessages={initialMessages}
    conversationMessages={conversationMessages}
    defaults={{ industry: preferences?.industries?.[0] ?? "General market", buyerType: preferences?.buyer_types?.[0] ?? "Founder", geography: preferences?.geography ?? "Global" }}
    status={status}
  />;
}
