import { type ReactNode } from "react";

import { ScoutAvatar } from "@/components/scout-avatar";
import { ScoutStatusBadge, type ScoutState } from "@/components/scout-status-badge";
import { cn } from "@/lib/utils";

export function ScoutMessageBubble({ role, children, state, className }: { role: "scout" | "user"; children: ReactNode; state?: ScoutState; className?: string }) {
  if (role === "user") return <div className={cn("ml-auto max-w-[85%] rounded-2xl rounded-tr-sm border border-brand/20 bg-brand/10 px-4 py-3 text-sm leading-6 text-ink", className)}>{children}</div>;
  return <div className={cn("flex max-w-[90%] items-start gap-3", className)}><ScoutAvatar size="sm" /><div className="min-w-0 rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 px-4 py-3 text-sm leading-6 text-muted">{state ? <ScoutStatusBadge state={state} className="mb-2" /> : null}{children}</div></div>;
}
