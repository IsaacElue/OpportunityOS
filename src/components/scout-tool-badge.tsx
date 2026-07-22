"use client";

import { Check, Loader2, Wrench, X } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type ScoutToolStatus = "current" | "completed" | "failed";

export function ScoutToolBadge({ name, status = "completed", durationMs, timestamp, className }: { name: string; status?: ScoutToolStatus; durationMs?: number | null; timestamp?: string | null; className?: string }) {
  const reduceMotion = useReducedMotion();
  const Icon = status === "current" ? Loader2 : status === "failed" ? X : Check;
  return <div className={cn("inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs", className)}><Wrench className="size-3.5 shrink-0 text-brand" /><span className="truncate font-medium text-ink">{name}</span><Icon className={cn("size-3.5 shrink-0", status === "current" && !reduceMotion ? "animate-spin text-brand" : status === "failed" ? "text-red-300" : "text-brand")} aria-hidden="true" />{durationMs != null ? <span className="shrink-0 text-muted">{formatDuration(durationMs)}</span> : null}{timestamp ? <time className="shrink-0 text-muted/75" dateTime={timestamp}>{formatTime(timestamp)}</time> : null}</div>;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)}s`;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
