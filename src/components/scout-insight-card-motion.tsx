"use client";

import { type ComponentProps } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { ScoutInsightCard } from "@/components/scout-insight-card";

export function ScoutInsightCardMotion(props: ComponentProps<typeof ScoutInsightCard>) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.99 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}><ScoutInsightCard {...props} /></motion.div>;
}
