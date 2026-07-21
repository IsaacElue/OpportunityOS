import { Sparkles } from "lucide-react";

import type { ScoutBriefingInsight } from "@/lib/scout/briefing";
import { ScoutInsightCardMotion } from "@/components/scout-insight-card-motion";
import { ScoutMessageAnimation } from "@/components/scout-message-animation";

export function ScoutInsightItem({ insight, index }: { insight: ScoutBriefingInsight; index: number }) {
  return <ScoutMessageAnimation index={index}><ScoutInsightCardMotion eyebrow={insight.priority === "high" ? "Priority insight" : "Scout insight"} title={insight.title} icon={<Sparkles className="size-4" />}><p>{insight.detail}</p></ScoutInsightCardMotion></ScoutMessageAnimation>;
}
