import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-white/10 bg-surface/75 shadow-glow backdrop-blur", className)} {...props} />;
}
