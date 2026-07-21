"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function ScoutMessageAnimation({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.18), ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
