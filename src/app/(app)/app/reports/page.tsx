import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type ReportRow = {
  id: string;
  problem: string | null;
  confidence_score: number | null;
  created_at: string;
  opportunities: { title: string | null; scan_opportunities: Array<{ scan_id: string }> } | Array<{ title: string | null; scan_opportunities: Array<{ scan_id: string }> }> | null;
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).limit(1).single();
  const { data, error } = await supabase.from("opportunity_reports").select("id,problem,confidence_score,created_at,opportunities!inner(title,scan_opportunities!inner(scan_id,scans!inner(organization_id)))").eq("opportunities.scan_opportunities.scans.organization_id", membership!.organization_id).order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load opportunity reports: ${error.message}`);
  const reports = (data ?? []) as unknown as ReportRow[];

  return <><div><p className="text-sm font-medium text-brand">Founder Opportunity Reports</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Evidence-backed decisions, ready to review.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Every report is grounded in opportunities discovered during your Scout investigations.</p></div>
    {reports.length > 0 ? <div className="mt-8 grid gap-4">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div> : <Card className="mt-8 grid min-h-72 place-items-center border-dashed p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"><FileText className="size-5" /></span><h2 className="mt-5 font-semibold">No reports yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">Scout will add founder reports here after an investigation produces opportunities.</p><Link href={"/app/scout" as Route} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-[#c2ffda]">Ask Scout to investigate <ArrowUpRight className="size-4" /></Link></div></Card>}
  </>;
}

function ReportCard({ report }: { report: ReportRow }) {
  const opportunity = Array.isArray(report.opportunities) ? report.opportunities[0] ?? null : report.opportunities;
  const scanId = opportunity?.scan_opportunities[0]?.scan_id;
  return <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-brand">Founder Opportunity Report</p><Link href={`/app/reports/${report.id}` as Route} className="mt-1 block text-lg font-semibold hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">{opportunity?.title ?? "Opportunity analysis"}</Link></div><span className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand">{report.confidence_score ?? "-"}</span></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{report.problem ?? "Scout is still preparing the problem summary."}</p><div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4"><time className="text-xs text-muted" dateTime={report.created_at}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(report.created_at))}</time><div className="flex items-center gap-3">{scanId ? <Link href={`/app/scans/${scanId}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">Open investigation <ArrowUpRight className="size-4" /></Link> : null}<Link href={`/app/reports/${report.id}` as Route} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-[#c2ffda] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">Read report <ArrowUpRight className="size-4" /></Link></div></div></Card>;
}
