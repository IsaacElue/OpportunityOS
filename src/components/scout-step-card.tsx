"use client";

import { ScoutActivityItem } from "@/components/scout-activity-item";
import { ScoutStatusBadge, type ScoutState } from "@/components/scout-status-badge";
import type { ScoutActivityRecord } from "@/components/scout-activity-item";

export type ScoutRuntimeStepStatus = "queued" | "running" | "completed" | "failed";

export type ScoutRuntimeStep = {
  id: string;
  title: string;
  description?: string | null;
  status: ScoutRuntimeStepStatus;
  timestamp?: string | null;
  durationMs?: number | null;
};

export function ScoutStepCard({ step, index = 0 }: { step: ScoutRuntimeStep; index?: number }) {
  const activity: ScoutActivityRecord = { id: step.id, type: "execution", title: step.title, description: step.description, occurredAt: step.timestamp, meta: step.durationMs != null ? formatDuration(step.durationMs) : null };
  return <div className="relative"><ScoutActivityItem activity={activity} index={index} className={step.status === "running" ? "border-brand/25 bg-brand/[0.04]" : step.status === "failed" ? "border-red-400/20" : undefined} /><div className="absolute right-3 top-3"><ScoutStatusBadge state={toScoutState(step.status)} label={step.status === "queued" ? "Upcoming" : undefined} /></div></div>;
}

function toScoutState(status: ScoutRuntimeStepStatus): ScoutState {
  return status === "running" ? "thinking" : status === "completed" ? "completed" : status === "failed" ? "failed" : "idle";
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)}s`;
}
