"use client";

import { CheckCircle2, Clock3, Compass, Lightbulb, MemoryStick, Search, Wrench } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type ScoutActivityType = "investigation" | "opportunity" | "memory" | "objective" | "schedule" | "tool" | "execution" | "feedback";

export type ScoutActivityRecord = {
  id: string;
  type: ScoutActivityType;
  title: string;
  description?: string | null;
  occurredAt?: string | null;
  meta?: string | null;
};

export function ScoutActivityItem({ activity, index = 0, className }: { activity: ScoutActivityRecord; index?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  return <motion.article initial={reduceMotion ? false : { opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.18), ease: [0.22, 1, 0.36, 1] }} whileHover={reduceMotion ? undefined : { y: -1 }} className={cn("scout-card scout-card-interactive flex items-start gap-3", className)}>
    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-brand"><ActivityIcon type={activity.type} /></span>
    <div className="min-w-0"><p className="text-sm font-medium leading-5 text-ink">{activity.title}</p>{activity.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{activity.description}</p> : null}<div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted/75">{activity.occurredAt ? <time dateTime={activity.occurredAt}>{formatRelativeTime(activity.occurredAt)}</time> : null}{activity.meta ? <span>{activity.meta}</span> : null}</div></div>
  </motion.article>;
}

function ActivityIcon({ type }: { type: ScoutActivityType }) {
  const Icon = type === "opportunity" ? Lightbulb : type === "memory" || type === "feedback" ? MemoryStick : type === "investigation" ? Search : type === "objective" ? CheckCircle2 : type === "tool" ? Wrench : type === "schedule" ? Clock3 : Compass;
  return <Icon className="size-3.5" />;
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
