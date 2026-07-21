"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export function ScoutTimelineMotion({ children, index, isActive, isComplete, className }: { children: ReactNode; index: number; isActive: boolean; isComplete: boolean; className?: string }) {
  const reduceMotion = useReducedMotion();
  return <motion.li layout initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, scale: isComplete && !reduceMotion ? [1, 1.008, 1] : 1 }} transition={{ duration: reduceMotion ? 0 : 0.24, delay: reduceMotion ? 0 : Math.min(index * 0.055, 0.22), ease: [0.22, 1, 0.36, 1] }} className={cn("relative flex gap-3 rounded-xl px-2 py-3 transition-colors", isActive ? "bg-brand/[0.035]" : "", className)}>{children}</motion.li>;
}
