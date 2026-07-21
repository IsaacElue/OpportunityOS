import { AlertTriangle, Check, Circle, Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type ScoutState = "idle" | "thinking" | "investigating" | "completed" | "failed";

const stateContent: Record<ScoutState, { label: string; icon: typeof Sparkles; className: string }> = {
  idle: { label: "Ready to help", icon: Circle, className: "border-white/15 bg-white/[0.05] text-muted" },
  thinking: { label: "Researching opportunities", icon: Sparkles, className: "border-brand/25 bg-brand/10 text-brand" },
  investigating: { label: "Scanning market signals", icon: Search, className: "border-[#c8f7ff]/25 bg-[#c8f7ff]/10 text-[#c8f7ff]" },
  completed: { label: "Research complete", icon: Check, className: "border-brand/25 bg-brand/10 text-brand" },
  failed: { label: "Needs attention", icon: AlertTriangle, className: "border-red-400/25 bg-red-400/10 text-red-200" }
};

export function ScoutStatusBadge({ state, label, className }: { state: ScoutState; label?: string; className?: string }) {
  const content = stateContent[state];
  const Icon = content.icon;
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", content.className, className)}><Icon className={cn("size-3.5", state === "thinking" || state === "investigating" ? "animate-pulse" : "")} aria-hidden="true" />{label ?? content.label}</span>;
}
