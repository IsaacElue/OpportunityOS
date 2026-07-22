import { Activity } from "lucide-react";

import { ScoutActivityItem as ScoutActivityEntry, type ScoutActivityRecord } from "@/components/scout-activity-item";
import { Card } from "@/components/ui/card";

export type ScoutActivityItem = {
  id: string;
  title: string;
  detail: string;
  occurredAt: string;
  kind: "execution" | "opportunity" | "objective" | "schedule" | "memory" | "feedback" | "research";
};

export function ScoutActivityFeed({ items }: { items: ScoutActivityItem[] }) {
  return <Card className="p-3.5 shadow-none">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted"><Activity className="size-3.5 text-brand" />Latest activity</div>
    {items.length > 0 ? <ol className="mt-4 space-y-3">{items.map((item, index) => <li key={item.id}><ScoutActivityEntry activity={toActivityRecord(item)} index={index} /></li>)}</ol> : <p className="mt-4 text-sm leading-6 text-muted">Scout activity will appear here as you research and refine opportunities.</p>}
  </Card>;
}

function toActivityRecord(item: ScoutActivityItem): ScoutActivityRecord {
  const type = item.kind === "research" ? "investigation" : item.kind;
  return { id: item.id, type, title: item.title, description: item.detail, occurredAt: item.occurredAt };
}
