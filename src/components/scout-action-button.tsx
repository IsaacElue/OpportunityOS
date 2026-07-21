import { ArrowUpRight } from "lucide-react";

import type { ScoutBriefingRecommendedAction } from "@/lib/scout/briefing";
import { cn } from "@/lib/utils";

export function ScoutActionButton({ action, className }: { action: ScoutBriefingRecommendedAction; className?: string }) {
  return <div className={cn("scout-card flex items-start gap-3 bg-white/[0.025]", className)}><span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", action.priority === "high" ? "bg-brand/15 text-brand" : "bg-white/[0.06] text-muted")}><ArrowUpRight className="size-3.5" /></span><div className="min-w-0"><p className="text-sm font-medium text-ink">{action.title}</p><p className="mt-1 text-xs leading-5 text-muted">{action.detail}</p></div></div>;
}
