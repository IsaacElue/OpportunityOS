"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function ScoutPageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -4 }} transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
