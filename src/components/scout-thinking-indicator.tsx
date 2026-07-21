import { cn } from "@/lib/utils";

export function ScoutThinkingIndicator({ label, className }: { label?: string; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5", className)} role="status" aria-label={label ?? "Scout is thinking"}>{label ? <span className="mr-1 text-xs text-muted">{label}</span> : null}<span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" /><span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.15s]" /><span className="size-1.5 animate-bounce rounded-full bg-brand" /></span>;
}
