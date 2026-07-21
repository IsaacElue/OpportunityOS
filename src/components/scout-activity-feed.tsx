import { Activity, CheckCircle2, Clock3, Lightbulb, MemoryStick } from "lucide-react";

import { Card } from "@/components/ui/card";

export type ScoutActivityItem = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  kind: "execution" | "opportunity" | "objective" | "schedule" | "memory" | "feedback" | "research";
};

export function ScoutActivityFeed({ items }: { items: ScoutActivityItem[] }) {
  return <Card className="p-3.5 shadow-none">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted"><Activity className="size-3.5 text-brand" />Latest activity</div>
    {items.length > 0 ? <ol className="mt-4 space-y-4">{items.map((item) => <li key={item.id} className="flex gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-brand"><ActivityIcon kind={item.kind} /></span><div className="min-w-0"><p className="text-sm font-medium leading-5">{item.title}</p><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{item.detail}</p><time className="mt-1 block text-xs text-muted/75" dateTime={item.occurredAt}>{formatRelativeTime(item.occurredAt)}</time></div></li>)}</ol> : <p className="mt-4 text-sm leading-6 text-muted">Scout activity will appear here as you research and refine opportunities.</p>}
  </Card>;
}

function ActivityIcon({ kind }: { kind: ScoutActivityItem["kind"] }) {
  const Icon = kind === "opportunity" ? Lightbulb : kind === "memory" || kind === "feedback" ? MemoryStick : kind === "objective" ? CheckCircle2 : Clock3;
  return <Icon className="size-3.5" />;
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";

  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
