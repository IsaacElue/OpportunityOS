import Link from "next/link";
import { ArrowUpRight, Radar } from "lucide-react";

import { Card } from "@/components/ui/card";

export type ScoutResearchCardItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  progressStage: string | null;
  progressMessage: string | null;
  evidenceCount: number;
  opportunityCount: number;
};

export function ScoutResearchCards({ items }: { items: ScoutResearchCardItem[] }) {
  return <Card className="p-3.5 shadow-none">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted"><Radar className="size-3.5 text-brand" />Active research</div>
    {items.length > 0 ? <div className="mt-4 space-y-3">{items.map((research) => <article key={research.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3 transition-colors hover:border-white/20"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-medium leading-5">{research.title}</p><span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-xs font-medium capitalize text-brand">{research.status}</span></div><p className="mt-2 text-xs leading-5 text-muted">{research.progressMessage ?? "Preparing investigation"}</p><p className="mt-1 text-xs text-muted">{research.progressStage ? formatStage(research.progressStage) : "Queued"} · {research.evidenceCount} evidence · {research.opportunityCount} opportunities</p><div className="mt-3 flex items-center justify-between gap-2"><time className="text-xs text-muted/75" dateTime={research.createdAt}>{formatRelativeTime(research.createdAt)}</time><Link href={`/app/scans/${research.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-[#c2ffda]">Open <ArrowUpRight className="size-3.5" /></Link></div></article>)}</div> : <p className="mt-4 text-sm leading-6 text-muted">No queued or running investigations.</p>}
  </Card>;
}

function formatStage(stage: string) {
  return stage.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";

  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
