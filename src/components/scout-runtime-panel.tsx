"use client";

import { ChevronDown, Flag, Target } from "lucide-react";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { ScoutCurrentTask } from "@/components/scout-current-task";
import { ScoutMessageBubble } from "@/components/scout-message-bubble";
import { ScoutReasoningStatus } from "@/components/scout-reasoning-status";
import { ScoutStepCard, type ScoutRuntimeStep } from "@/components/scout-step-card";
import { ScoutToolBadge, type ScoutToolStatus } from "@/components/scout-tool-badge";
import { cn } from "@/lib/utils";

export type ScoutRuntimeTool = { name: string; status?: ScoutToolStatus; durationMs?: number | null; timestamp?: string | null };

export type ScoutRuntimeSnapshot = {
  goal: string;
  currentStep?: ScoutRuntimeStep | null;
  steps?: ScoutRuntimeStep[];
  currentTool?: ScoutRuntimeTool | null;
  completedTools?: ScoutRuntimeTool[];
  executionStage: string;
  finalResponse?: string | null;
  startedAt?: string | null;
};

export function ScoutRuntimePanel({ runtime, className }: { runtime?: ScoutRuntimeSnapshot | null; className?: string }) {
  const reduceMotion = useReducedMotion();
  if (!runtime) return <ScoutCurrentTask className={className} task={{ state: "idle", title: "Scout is ready", description: "No execution is currently active. Give Scout a goal when you are ready.", estimatedStage: "Waiting for a goal", stages: [{ label: "Ready", status: "current" }, { label: "Research", status: "upcoming" }, { label: "Report", status: "upcoming" }] }} />;

  const headingId = useId();
  const steps = runtime.steps ?? [];
  const currentStep = runtime.currentStep ?? steps.find((step) => step.status === "running") ?? null;
  const activeTask = currentStep ?? { id: "runtime-stage", title: runtime.executionStage, description: "Scout is progressing through the current execution stage.", status: "running" as const };
  return <section className={cn("scout-surface relative overflow-hidden rounded-3xl p-5 sm:p-6", className)} aria-labelledby={headingId}><div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-brand/10 blur-3xl" /><div className="relative"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="scout-eyebrow">Scout runtime</p><h2 id={headingId} className="scout-title mt-1">Live execution</h2></div><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted"><Flag className="size-3.5 text-brand" />{runtime.executionStage}</span></div>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><Target className="mt-0.5 size-4 shrink-0 text-brand" /><div><p className="scout-eyebrow">Current goal</p><p className="mt-1 text-sm leading-6 text-ink">{runtime.goal}</p></div></div>
    <div className="mt-4"><ScoutReasoningStatus title={activeTask.title} description={activeTask.description} status={activeTask.status === "queued" ? "idle" : activeTask.status === "running" ? "running" : activeTask.status === "completed" ? "completed" : "failed"} durationMs={activeTask.durationMs} /></div>
    {runtime.currentTool ? <div className="mt-4"><p className="scout-eyebrow">Current tool</p><ScoutToolBadge name={runtime.currentTool.name} status={runtime.currentTool.status ?? "current"} durationMs={runtime.currentTool.durationMs} timestamp={runtime.currentTool.timestamp} className="mt-2" /></div> : null}
    {steps.length > 0 ? <div className="mt-5 space-y-2"><p className="scout-eyebrow">Execution steps</p>{steps.map((step, index) => <ScoutStepCard key={step.id} step={step} index={index} />)}</div> : null}
    {runtime.completedTools && runtime.completedTools.length > 0 ? <details className="group mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand/60"><span>Completed tools ({runtime.completedTools.length})</span><ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" /></summary><div className="mt-3 flex flex-wrap gap-2">{runtime.completedTools.map((tool, index) => <ScoutToolBadge key={`${tool.name}-${index}`} name={tool.name} status={tool.status ?? "completed"} durationMs={tool.durationMs} timestamp={tool.timestamp} />)}</div></details> : null}
    {runtime.finalResponse ? <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.25 }} className="mt-5"><p className="scout-eyebrow">Final response</p><ScoutMessageBubble role="scout" className="mt-2"><p>{runtime.finalResponse}</p></ScoutMessageBubble></motion.div> : null}
    {runtime.startedAt ? <p className="mt-5 text-xs text-muted">Started {formatTimestamp(runtime.startedAt)}</p> : null}
  </div></section>;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
