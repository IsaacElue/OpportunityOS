import { ScoutWorkspace } from "@/components/scout-workspace";
import type { ScoutWorkspaceStatusData } from "@/components/scout-workspace-status";
import { getRecentMessages, listConversations } from "@/lib/scout/conversation";
import { getScoutExecutions } from "@/lib/scout/executions";
import { getScoutMemories } from "@/lib/scout/memory";
import { getScoutObjectives } from "@/lib/scout/objectives";
import { createClient } from "@/lib/supabase/server";

type ScanRow = {
  id: string;
  status: string;
  filters: { industry?: string; buyer_type?: string } | null;
};

type OpportunityRow = {
  id: string;
  title: string | null;
  opportunity_score: number | null;
};

type ScheduleRow = {
  id: string;
  objective_id: string;
  frequency: string;
  next_run_at: string;
};

export default async function ScoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user!.id)
    .limit(1)
    .single();
  const organizationId = membership!.organization_id;

  const [preferencesResult, conversations, objectives, memories, executions, scansResult, opportunitiesResult, schedulesResult] = await Promise.all([
    supabase.from("founder_preferences").select("industries,buyer_types,geography").eq("organization_id", organizationId).maybeSingle(),
    listConversations({ organization_id: organizationId, user_id: user!.id, limit: 12 }),
    getScoutObjectives({ organization_id: organizationId }),
    getScoutMemories({ organization_id: organizationId }),
    getScoutExecutions({ organization_id: organizationId }),
    supabase.from("scans").select("id,status,filters").eq("organization_id", organizationId).in("status", ["queued", "running"]).order("requested_at", { ascending: false }).limit(1),
    supabase.from("opportunities").select("id,title,opportunity_score,scan_opportunities!inner(scans!inner(organization_id))").eq("scan_opportunities.scans.organization_id", organizationId).order("created_at", { ascending: false }).limit(3),
    supabase.from("scout_schedules").select("id,objective_id,frequency,next_run_at").eq("organization_id", organizationId).eq("enabled", true).order("next_run_at", { ascending: true }).limit(3)
  ]);

  const initialConversation = conversations[0] ?? null;
  const conversationHistory = await Promise.all(conversations.map(async (conversation) => [
    conversation.id,
    await getRecentMessages({ conversation_id: conversation.id, limit: 15 })
  ] as const));
  const conversationMessages = Object.fromEntries(conversationHistory.map(([conversationId, messages]) => [
    conversationId,
    messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at
    }))
  ]));
  const initialMessages = initialConversation ? conversationMessages[initialConversation.id] ?? [] : [];
  const activeObjective = objectives.find((objective) => objective.status === "active") ?? null;
  const activeScan = (scansResult.data?.[0] ?? null) as unknown as ScanRow | null;
  const opportunities = (opportunitiesResult.data ?? []) as unknown as OpportunityRow[];
  const schedules = (schedulesResult.data ?? []) as unknown as ScheduleRow[];
  const latestExecution = executions[0] ?? null;
  const objectiveTitles = new Map(objectives.map((objective) => [objective.id, objective.title]));
  const status: ScoutWorkspaceStatusData = {
    currentObjective: activeObjective ? { title: activeObjective.title, status: activeObjective.status } : null,
    activeResearch: activeScan ? {
      id: activeScan.id,
      status: activeScan.status,
      label: activeScan.filters?.industry ?? activeScan.filters?.buyer_type ?? "Scout investigation"
    } : null,
    recentOpportunities: opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title ?? "Untitled opportunity",
      score: opportunity.opportunity_score
    })),
    memoryCount: memories.length,
    latestExecution: latestExecution ? {
      status: latestExecution.status,
      completedAt: latestExecution.completed_at,
      toolsUsed: latestExecution.tools_used.length
    } : null,
    latestActivity: latestExecution
      ? `Last autonomous session ${latestExecution.status}.`
      : activeScan ? "Scout is preparing a research brief." : null,
    upcomingSchedules: schedules.map((schedule) => ({
      id: schedule.id,
      objectiveTitle: objectiveTitles.get(schedule.objective_id) ?? "Scout objective",
      frequency: schedule.frequency,
      nextRunAt: schedule.next_run_at
    }))
  };
  const preferences = preferencesResult.data;

  return <ScoutWorkspace
    conversations={conversations.map((conversation) => ({ id: conversation.id, title: conversation.title, updatedAt: conversation.updated_at }))}
    initialConversationId={initialConversation?.id ?? null}
    initialConversationTitle={initialConversation?.title ?? "New conversation"}
    initialMessages={initialMessages}
    conversationMessages={conversationMessages}
    defaults={{
      industry: preferences?.industries?.[0] ?? "General market",
      buyerType: preferences?.buyer_types?.[0] ?? "Founder",
      geography: preferences?.geography ?? "Global"
    }}
    status={status}
  />;
}
