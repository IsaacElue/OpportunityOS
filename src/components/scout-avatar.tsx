import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const avatarSizes = {
  sm: "size-9 rounded-xl",
  md: "size-11 rounded-2xl",
  lg: "size-16 rounded-3xl"
};

export function ScoutAvatar({ size = "md", className }: { size?: keyof typeof avatarSizes; className?: string }) {
  return <div className={cn(
    "grid shrink-0 place-items-center bg-gradient-to-br from-brand via-[#c8f7ff] to-[#9e8cff] text-[#062315] shadow-[0_12px_30px_rgb(168_255_204/25%)]",
    avatarSizes[size],
    className
  )}>
    <Sparkles className={size === "lg" ? "size-7" : "size-5"} aria-hidden="true" />
  </div>;
}
