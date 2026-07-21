import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Bookmark } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type SavedFeedback = {
  id: string;
  created_at: string;
  note: string | null;
  opportunities: { title: string | null; problem: string | null; scan_opportunities: Array<{ scan_id: string }> } | Array<{ title: string | null; problem: string | null; scan_opportunities: Array<{ scan_id: string }> }> | null;
};

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).limit(1).single();
  const { data, error } = await supabase.from("scout_feedback").select("id,created_at,note,opportunities!inner(title,problem,scan_opportunities!inner(scan_id,scans!inner(organization_id)))").eq("organization_id", membership!.organization_id).eq("feedback_type", "saved").order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load saved opportunities: ${error.message}`);
  const saved = (data ?? []) as unknown as SavedFeedback[];

  return <><div><p className="text-sm font-medium text-brand">Saved research</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Keep only the hypotheses worth pursuing.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Saved opportunities reflect founder feedback already recorded in your Scout workspace.</p></div>
    {saved.length > 0 ? <div className="mt-8 grid gap-4">{saved.map((item) => <SavedCard key={item.id} item={item} />)}</div> : <Card className="mt-8 grid min-h-72 place-items-center border-dashed p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"><Bookmark className="size-5" /></span><h2 className="mt-5 font-semibold">No saved opportunities yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">When you save an opportunity, it will stay here for follow-up.</p><Link href={"/app/scout" as Route} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-[#c2ffda]">Explore with Scout <ArrowUpRight className="size-4" /></Link></div></Card>}
  </>;
}

function SavedCard({ item }: { item: SavedFeedback }) {
  const opportunity = Array.isArray(item.opportunities) ? item.opportunities[0] ?? null : item.opportunities;
  const scanId = opportunity?.scan_opportunities[0]?.scan_id;
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-brand">Saved opportunity</p><h2 className="mt-1 text-lg font-semibold">{opportunity?.title ?? "Opportunity analysis"}</h2></div><Bookmark className="size-5 text-brand" /></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{item.note ?? opportunity?.problem ?? "No note added yet."}</p>{scanId ? <Link href={`/app/scans/${scanId}`} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-[#c2ffda]">Open investigation <ArrowUpRight className="size-4" /></Link> : null}</Card>;
}
