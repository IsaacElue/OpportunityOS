"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

import { ScoutStatusBadge, type ScoutState } from "@/components/scout-status-badge";

export function ScoutPresence({ state = "idle", label, className }: { state?: ScoutState; label?: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  const isActive = state === "thinking" || state === "investigating";
  return <div className={cn("inline-flex items-center gap-2", className)}><span className={cn("size-2 rounded-full", state === "failed" ? "bg-red-300" : state === "completed" ? "bg-brand" : isActive && !reduceMotion ? "animate-pulse bg-[#c8f7ff]" : isActive ? "bg-[#c8f7ff]" : "bg-muted")} aria-hidden="true" /><ScoutStatusBadge state={state} label={label} /></div>;
}
