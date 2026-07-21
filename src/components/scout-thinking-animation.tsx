"use client";

import { motion, useReducedMotion } from "framer-motion";

import { ScoutAvatar } from "@/components/scout-avatar";
import { ScoutPresence } from "@/components/scout-presence";
import type { ScoutState } from "@/components/scout-status-badge";
import { ScoutThinkingIndicator } from "@/components/scout-thinking-indicator";
import { cn } from "@/lib/utils";

export type ScoutThinkingState = "idle" | "thinking" | "researching" | "analysing" | "completed" | "failed";

const content: Record<ScoutThinkingState, { state: ScoutState; heading: string; detail: string }> = {
  idle: { state: "idle", heading: "Ready to help", detail: "Scout is ready for your next question." },
  thinking: { state: "thinking", heading: "Thinking through the next step", detail: "Scout is considering the strongest research direction." },
  researching: { state: "investigating", heading: "Researching opportunities", detail: "Scout is gathering evidence across market signals." },
  analysing: { state: "thinking", heading: "Analysing patterns", detail: "Scout is connecting repeated founder pain." },
  completed: { state: "completed", heading: "Research complete", detail: "Scout has finished the current investigation." },
  failed: { state: "failed", heading: "Needs attention", detail: "Scout could not complete the current step." }
};

export function ScoutThinkingAnimation({ state, className }: { state: ScoutThinkingState; className?: string }) {
  const reduceMotion = useReducedMotion();
  const current = content[state];
  const active = state === "thinking" || state === "researching" || state === "analysing";
  return <motion.div layout className={cn("flex items-start gap-3", className)} transition={{ duration: reduceMotion ? 0 : 0.2 }}><motion.div animate={active && !reduceMotion ? { scale: [1, 1.035, 1] } : { scale: 1 }} transition={{ duration: 2.2, repeat: active ? Infinity : 0, ease: "easeInOut" }}><ScoutAvatar size="sm" /></motion.div><div className="min-w-0 rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 px-4 py-3"><ScoutPresence state={current.state} label={current.heading} /><p className="mt-2 text-sm leading-6 text-muted">{current.detail}</p>{active ? <ScoutThinkingIndicator label={state === "researching" ? "Scanning market signals" : state === "analysing" ? "Analysing evidence" : "Thinking"} className="mt-2" /> : null}</div></motion.div>;
}
