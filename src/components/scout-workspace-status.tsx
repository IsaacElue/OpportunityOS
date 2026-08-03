import { Activity, Brain, CalendarClock, Compass, Lightbulb, Sparkles, type LucideIcon } from "lucide-react";

import { ScoutActivityFeed, type ScoutActivityItem } from "@/components/scout-activity-feed";
import { ScoutResearchCards, type ScoutResearchCardItem } from "@/components/scout-research-cards";
import { LocalDateTime } from "@/components/time-display";
import { Card } from "@/components/ui/card";

export type ScoutWorkspaceStatusData = {
  activeObjectives: Array<{ id: string; title: string; status: string; updatedAt: string }>;
  recentOpportunities: Array<{ id: string; title: string; score: number | null }>;
  memoryCount: number;
  feedbackCount: number;
  recentExecutions: Array<{ id: string; status: string; completedAt: string | null; toolsUsed: number; stepsCompleted: number }>;
  upcomingSchedules: Array<{ id: string; objectiveTitle: string; frequency: string; nextRunAt: string; state: "due" | "scheduled" | "paused"; lastRunAt: string | null }>;
  research: ScoutResearchCardItem[];
  activity: ScoutActivityItem[];
};

export function ScoutWorkspaceStatus({ data }: { data: ScoutWorkspaceStatusData }) {
  return <aside className="space-y-4 border-t border-white/10 bg-[#0b1119]/65 p-4 lg:border-l lg:border-t-0">
    <div className="flex items-center gap-2 px-1">
      <span className="grid size-8 place-items-center rounded-xl bg-brand/10 text-brand"><Sparkles className="size-4" /></span>
      <div><p className="text-sm font-semibold">Scout status</p><p className="text-xs text-muted">Live workspace context</p></div>
    </div>

    <StatusCard icon={Compass} label="Active objectives">
      {data.activeObjectives.length > 0 ? <div className="space-y-2">{data.activeObjectives.map((objective) => <div key={objective.id}><p className="line-clamp-2 text-sm font-medium leading-5">{objective.title}</p><p className="mt-0.5 text-xs text-brand">Updated <LocalDateTime value={objective.updatedAt} fallback="Soon" /></p></div>)}</div> : <Empty copy="No active objectives yet." />}
    </StatusCard>

    <StatusCard icon={Lightbulb} label="Recent opportunities">
      {data.recentOpportunities.length > 0 ? <div className="space-y-2">{data.recentOpportunities.map((opportunity) => <div key={opportunity.id} className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm leading-5">{opportunity.title}</p><span className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">{opportunity.score ?? "-"}</span></div>)}</div> : <Empty copy="New findings will appear here." />}
    </StatusCard>

    <div className="grid grid-cols-2 gap-3">
      <StatusCard icon={Brain} label="Memories"><p className="text-2xl font-semibold text-ink">{data.memoryCount}</p></StatusCard>
      <StatusCard icon={Brain} label="Feedback"><p className="text-2xl font-semibold text-ink">{data.feedbackCount}</p></StatusCard>
    </div>

    <StatusCard icon={Activity} label="Recent executions">
      {data.recentExecutions.length > 0 ? <div className="space-y-2">{data.recentExecutions.map((execution) => <div key={execution.id}><p className="text-sm font-medium capitalize">{execution.status}</p><p className="mt-0.5 text-xs text-muted">{execution.stepsCompleted} steps · {execution.toolsUsed} tools{execution.completedAt ? <> · <LocalDateTime value={execution.completedAt} fallback="Soon" /></> : null}</p></div>)}</div> : <Empty copy="No autonomous activity yet." />}
    </StatusCard>

    <StatusCard icon={CalendarClock} label="Scheduled research">
      {data.upcomingSchedules.length > 0 ? <div className="space-y-2">{data.upcomingSchedules.map((schedule) => <div key={schedule.id}><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{schedule.objectiveTitle}</p><span className="shrink-0 text-xs font-medium capitalize text-brand">{schedule.state === "scheduled" ? "Upcoming" : schedule.state}</span></div><p className="mt-0.5 text-xs text-muted">{schedule.frequency} · {schedule.state === "due" ? "Due now" : <LocalDateTime value={schedule.nextRunAt} fallback="Soon" />}</p>{schedule.lastRunAt ? <p className="mt-0.5 text-xs text-muted/75">Last completed <LocalDateTime value={schedule.lastRunAt} fallback="Soon" /></p> : null}</div>)}</div> : <Empty copy="No scheduled research yet." />}
    </StatusCard>

    <ScoutResearchCards items={data.research} />
    <ScoutActivityFeed items={data.activity} />
  </aside>;
}

function StatusCard({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return <Card className="p-3.5 shadow-none transition-colors hover:border-white/20"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted"><Icon className="size-3.5 text-brand" />{label}</div><div className="mt-3">{children}</div></Card>;
}

function Empty({ copy }: { copy: string }) {
  return <p className="text-sm leading-5 text-muted">{copy}</p>;
}
