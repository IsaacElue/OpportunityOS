import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

export function ScoutThinkingIndicator({ label, className }: { label?: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  const dotClass = reduceMotion ? "size-1.5 rounded-full bg-brand" : "size-1.5 animate-bounce rounded-full bg-brand";
  return <span className={cn("inline-flex items-center gap-1.5", className)} role="status" aria-label={label ?? "Scout is thinking"}>{label ? <span className="mr-1 text-xs text-muted">{label}</span> : null}<span className={cn(dotClass, "[animation-delay:-0.3s]")} /><span className={cn(dotClass, "[animation-delay:-0.15s]")} /><span className={dotClass} /></span>;
}
