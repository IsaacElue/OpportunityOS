"use client";

import { BrainCircuit } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { ScoutStatusBadge, type ScoutState } from "@/components/scout-status-badge";
import { cn } from "@/lib/utils";

export type ScoutReasoningState = "idle" | "running" | "completed" | "failed";

export function ScoutReasoningStatus({ title, description, status, durationMs, className }: { title: string; description?: string | null; status: ScoutReasoningState; durationMs?: number | null; className?: string }) {
  const reduceMotion = useReducedMotion();
  const scoutState: ScoutState = status === "running" ? "thinking" : status === "completed" ? "completed" : status === "failed" ? "failed" : "idle";
  return <motion.div layout className={cn("scout-card flex items-start gap-3", className)} animate={status === "running" && !reduceMotion ? { borderColor: ["rgb(255 255 255 / 0.1)", "rgb(168 255 204 / 0.3)", "rgb(255 255 255 / 0.1)"] } : undefined} transition={{ duration: 2.4, repeat: status === "running" ? Infinity : 0, ease: "easeInOut" }}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><BrainCircuit className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-ink">{title}</p><ScoutStatusBadge state={scoutState} label={statusLabel(status)} /></div>{description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}{durationMs != null ? <p className="mt-2 text-xs text-muted">Duration {formatDuration(durationMs)}</p> : null}</div></motion.div>;
}

function statusLabel(status: ScoutReasoningState) {
  return status === "running" ? "In progress" : status === "completed" ? "Completed" : status === "failed" ? "Needs attention" : "Waiting";
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)}s`;
}
