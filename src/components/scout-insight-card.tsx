import { type ReactNode } from "react";
import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

export function ScoutInsightCard({ eyebrow = "Scout insight", title, children, icon, className }: { eyebrow?: string; title: string; children: ReactNode; icon?: ReactNode; className?: string }) {
  return <article className={cn("scout-card", className)}><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">{icon ?? <Lightbulb className="size-4" />}</span><div className="min-w-0"><p className="scout-eyebrow">{eyebrow}</p><h3 className="scout-title mt-1">{title}</h3></div></div><div className="scout-body mt-4">{children}</div></article>;
}
