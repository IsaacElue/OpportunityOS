"use client";

import { Wrench } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { ScoutStatusBadge, type ScoutState } from "@/components/scout-status-badge";
import { ScoutThinkingIndicator } from "@/components/scout-thinking-indicator";
import { cn } from "@/lib/utils";

export type ScoutTaskStageStatus = "complete" | "current" | "upcoming";

export type ScoutTaskStage = {
  label: string;
  status: ScoutTaskStageStatus;
};

export type ScoutCurrentTaskState = "idle" | "thinking" | "researching" | "analysing" | "completed" | "failed";

export type ScoutCurrentTaskData = {
  state: ScoutCurrentTaskState;
  title: string;
  description: string;
  estimatedStage: string;
  currentTool?: string | null;
  stages?: ScoutTaskStage[];
};

export function ScoutCurrentTask({ task, className }: { task: ScoutCurrentTaskData; className?: string }) {
  const reduceMotion = useReducedMotion();
  const isActive = task.state === "thinking" || task.state === "researching" || task.state === "analysing";
  const statusState: ScoutState = task.state === "researching" || task.state === "analysing" ? "investigating" : task.state;

  return <section className={cn("scout-surface relative overflow-hidden rounded-3xl p-5 sm:p-6", className)} aria-labelledby="scout-current-task-heading">
    <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-brand/10 blur-3xl" />
    <div className="relative">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="scout-eyebrow">Current task</p>
          <h2 id="scout-current-task-heading" className="scout-title mt-1">{task.title}</h2>
        </div>
        <ScoutStatusBadge state={statusState} />
      </div>

      <div className="mt-5 flex items-start gap-3">
        <motion.span className={cn("mt-1 grid size-8 shrink-0 place-items-center rounded-full", isActive ? "bg-brand/15" : "bg-white/[0.06]")} animate={isActive && !reduceMotion ? { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] } : { scale: 1, opacity: 1 }} transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: "easeInOut" }} aria-hidden="true"><span className={cn("size-2.5 rounded-full", isActive ? "bg-brand" : task.state === "failed" ? "bg-red-300" : "bg-muted")} /></motion.span>
        <div className="min-w-0"><p className="scout-body">{task.description}</p><p className="mt-2 text-xs text-muted"><span className="font-medium text-ink">Estimated stage:</span> {task.estimatedStage}</p>{task.currentTool ? <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted"><Wrench className="size-3.5 text-brand" />{task.currentTool}</p> : null}</div>
      </div>

      {task.stages && task.stages.length > 0 ? <div className="mt-6" aria-label="Task progress stages"><div className="flex items-center gap-1.5">{task.stages.map((stage, index) => <span key={`${stage.label}-${index}`} className="flex min-w-0 flex-1 items-center gap-1.5"><motion.span className={cn("h-1.5 flex-1 rounded-full", stage.status === "complete" ? "bg-brand" : stage.status === "current" ? "bg-brand/55" : "bg-white/10")} initial={reduceMotion ? false : { scaleX: 0, opacity: 0.5 }} animate={{ scaleX: 1, opacity: stage.status === "upcoming" ? 0.65 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : index * 0.05, ease: "easeOut" }} style={{ originX: 0 }} /><span className="sr-only">{stage.label}: {stage.status}</span></span>)}</div><div className="mt-2 flex justify-between gap-2 text-[0.6875rem] text-muted">{task.stages.map((stage, index) => <span key={`${stage.label}-label-${index}`} className={cn("truncate", stage.status === "current" && "font-medium text-brand")}>{stage.label}</span>)}</div></div> : null}

      {isActive ? <ScoutThinkingIndicator label={task.state === "researching" ? "Scanning market signals" : task.state === "analysing" ? "Analysing evidence" : "Working through the next step"} className="mt-5" /> : null}
    </div>
  </section>;
}
