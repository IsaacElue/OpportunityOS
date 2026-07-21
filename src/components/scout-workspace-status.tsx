import { Activity, Brain, CalendarClock, Compass, Lightbulb, Radar, Sparkles, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export type ScoutWorkspaceStatusData = {
  currentObjective: { title: string; status: string } | null;
  activeResearch: { id: string; status: string; label: string } | null;
  recentOpportunities: Array<{ id: string; title: string; score: number | null }>;
  memoryCount: number;
  latestExecution: { status: string; completedAt: string | null; toolsUsed: number } | null;
  latestActivity: string | null;
  upcomingSchedules: Array<{ id: string; objectiveTitle: string; frequency: string; nextRunAt: string }>;
};

export function ScoutWorkspaceStatus({ data }: { data: ScoutWorkspaceStatusData }) {
  return <aside className="space-y-4 border-t border-white/10 bg-[#0b1119]/65 p-4 lg:border-l lg:border-t-0">
    <div className="flex items-center gap-2 px-1">
      <span className="grid size-8 place-items-center rounded-xl bg-brand/10 text-brand"><Sparkles className="size-4" /></span>
      <div>
        <p className="text-sm font-semibold">Scout status</p>
        <p className="text-xs text-muted">Live workspace context</p>
      </div>
    </div>

    <StatusCard icon={Compass} label="Current objective">
      {data.currentObjective ? <><p className="font-medium leading-5">{data.currentObjective.title}</p><p className="mt-1 text-xs capitalize text-brand">{data.currentObjective.status}</p></> : <Empty copy="No active objective yet." />}
    </StatusCard>

    <StatusCard icon={Radar} label="Active research">
      {data.activeResearch ? <><p className="truncate font-medium">{data.activeResearch.label}</p><p className="mt-1 text-xs capitalize text-brand">{data.activeResearch.status}</p></> : <Empty copy="Nothing is running right now." />}
    </StatusCard>

    <StatusCard icon={Lightbulb} label="Recent opportunities">
      {data.recentOpportunities.length > 0 ? <div className="space-y-2">{data.recentOpportunities.map((opportunity) => <div key={opportunity.id} className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm leading-5">{opportunity.title}</p><span className="shrink-0 rounded-md bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">{opportunity.score ?? "-"}</span></div>)}</div> : <Empty copy="New findings will appear here." />}
    </StatusCard>

    <StatusCard icon={Brain} label="Memory count">
      <p className="text-2xl font-semibold text-ink">{data.memoryCount}</p><p className="mt-1 text-xs text-muted">Founder signals remembered</p>
    </StatusCard>

    <StatusCard icon={Activity} label="Execution status">
      {data.latestExecution ? <><p className="font-medium capitalize">{data.latestExecution.status}</p><p className="mt-1 text-xs text-muted">{data.latestExecution.toolsUsed} tools used{data.latestExecution.completedAt ? ` · ${formatDate(data.latestExecution.completedAt)}` : ""}</p></> : <Empty copy="No autonomous activity yet." />}
    </StatusCard>

    <StatusCard icon={Activity} label="Latest activity">
      <p className="text-sm leading-5 text-muted">{data.latestActivity ?? "Scout is ready when you are."}</p>
    </StatusCard>

    <StatusCard icon={CalendarClock} label="Upcoming research">
      {data.upcomingSchedules.length > 0 ? <div className="space-y-2">{data.upcomingSchedules.map((schedule) => <div key={schedule.id}><p className="truncate text-sm font-medium">{schedule.objectiveTitle}</p><p className="mt-0.5 text-xs text-muted">{schedule.frequency} · {formatDate(schedule.nextRunAt)}</p></div>)}</div> : <Empty copy="No scheduled research yet." />}
    </StatusCard>
  </aside>;
}

function StatusCard({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return <Card className="p-3.5 shadow-none transition-colors hover:border-white/20">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted"><Icon className="size-3.5 text-brand" />{label}</div>
    <div className="mt-3">{children}</div>
  </Card>;
}

function Empty({ copy }: { copy: string }) {
  return <p className="text-sm leading-5 text-muted">{copy}</p>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Soon";

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
