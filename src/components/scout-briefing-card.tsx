"use client";

import { Lightbulb, Sparkles } from "lucide-react";

import type { ScoutBriefing } from "@/lib/scout/briefing";
import { ScoutActionButton } from "@/components/scout-action-button";
import { ScoutInsightItem } from "@/components/scout-insight-item";
import { ScoutMessageAnimation } from "@/components/scout-message-animation";
import { ScoutMessageBubble } from "@/components/scout-message-bubble";
import { ScoutPresence } from "@/components/scout-presence";
import { ScoutStatusBadge, type ScoutState } from "@/components/scout-status-badge";
import { cn } from "@/lib/utils";

export function ScoutBriefingCard({ briefing, className }: { briefing: ScoutBriefing | null; className?: string }) {
  if (!briefing) return <section className={cn("scout-empty", className)}><div><span className="scout-empty-icon mx-auto"><Sparkles className="size-5" /></span><h2 className="scout-title mt-4">Scout is still learning your goals.</h2><p className="scout-body mt-2 max-w-sm">Share a focused research question or objective and Scout will bring a more tailored update next time.</p></div></section>;

  const state = stateForPriority(briefing.priority);
  return <section className={cn("scout-surface relative overflow-hidden rounded-3xl p-5 sm:p-6", className)} aria-labelledby="scout-briefing-heading"><div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-brand/10 blur-3xl" /><div className="relative"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="scout-eyebrow">AI teammate update</p><h2 id="scout-briefing-heading" className="scout-title mt-1">Scout briefing</h2></div><ScoutStatusBadge state={state} label={`${briefing.priority} priority`} /></div>
    <ScoutMessageAnimation index={0}><ScoutMessageBubble role="scout" state={state} className="mt-5"><p className="font-medium text-ink">{briefing.greeting}</p><p className="mt-2">{briefing.summary}</p></ScoutMessageBubble></ScoutMessageAnimation>
    <div className="mt-5 flex items-center justify-between gap-3"><ScoutPresence state={state} /><time className="text-xs text-muted" dateTime={briefing.generated_at}>Updated {formatTimestamp(briefing.generated_at)}</time></div>
    {briefing.insights.length > 0 ? <div className="mt-6"><div className="flex items-center gap-2"><Lightbulb className="size-4 text-brand" /><h3 className="text-sm font-semibold">What I&apos;m noticing</h3></div><div className="mt-3 grid gap-3">{briefing.insights.map((insight, index) => <ScoutInsightItem key={`${insight.title}-${index}`} insight={insight} index={index + 1} />)}</div></div> : null}
    {briefing.recommended_actions.length > 0 ? <div className="mt-6"><p className="scout-eyebrow">Recommended next steps</p><div className="mt-3 grid gap-2">{briefing.recommended_actions.map((action) => <ScoutActionButton key={action.title} action={action} />)}</div></div> : null}
  </div></section>;
}

function stateForPriority(priority: ScoutBriefing["priority"]): ScoutState {
  return priority === "high" ? "investigating" : priority === "medium" ? "thinking" : "idle";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
