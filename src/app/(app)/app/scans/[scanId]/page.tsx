import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock3, FileText } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function ScanDetailPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).limit(1).single();
  const { data: scan } = await supabase.from("scans").select("id,status,stage,filters,requested_at").eq("id", scanId).eq("organization_id", membership!.organization_id).maybeSingle();
  if (!scan) notFound();
  const filters = scan.filters as { industry?: string; buyer_type?: string; geography?: string; problem_hints?: string[] };
  return <><Link href="/app/scan" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" />New research</Link><div className="mt-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-brand">Research brief</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{filters.industry ?? "Founder"} · {filters.buyer_type ?? "B2B SaaS"}</h1><p className="mt-2 text-sm text-muted">{filters.geography ?? "US"}{filters.problem_hints?.[0] ? ` · ${filters.problem_hints[0]}` : ""}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-muted"><Clock3 className="size-4" />Brief created</span></div><Card className="mt-8 p-6 sm:p-8"><h2 className="text-lg font-semibold">Research status</h2><p className="mt-2 text-sm leading-6 text-muted">Your brief has been stored. The evidence ingestion and report-generation pipeline is intentionally not active in this milestone.</p><ol className="mt-7 space-y-4 text-sm"><Step complete label="Research brief saved" /><Step label="Collect permitted source evidence" /><Step label="Qualify opportunity hypotheses" /><Step label="Publish verified Founder Opportunity Reports" /></ol></Card><Card className="mt-5 border-dashed p-6"><div className="flex gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><FileText className="size-5" /></div><div><h2 className="font-semibold">Founder Opportunity Report</h2><p className="mt-1 text-sm leading-6 text-muted">This is where a source-linked report will appear: problem, evidence, buyer, workaround, AI advantage, MVP suggestion, validation experiment, and confidence.</p><Link className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4")} href="/app/reports/placeholder">Preview report structure</Link></div></div></Card></>;
}

function Step({ label, complete = false }: { label: string; complete?: boolean }) { return <li className="flex items-center gap-3 text-muted">{complete ? <CheckCircle2 className="size-5 text-brand" /> : <Circle className="size-5 text-white/25" />}{label}</li>; }
