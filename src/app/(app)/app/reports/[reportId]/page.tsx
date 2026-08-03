import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";

import { FounderReportSections } from "@/components/founder-report-sections";
import { OpportunityEvidence } from "@/components/opportunity-evidence";
import { Card } from "@/components/ui/card";
import { getOpportunity } from "@/lib/opportunities/getOpportunity";
import { createClient } from "@/lib/supabase/server";

type ReportRow = {
  id: string;
  opportunity_id: string;
  problem: string | null;
  evidence_summary: string | null;
  buyer_profile: string | null;
  existing_workarounds: string | null;
  ai_advantage: string | null;
  mvp_suggestion: string | null;
  validation_experiment: string | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
  opportunities: { id: string; title: string | null; scan_opportunities: Array<{ scan_id: string; scans: { organization_id: string } | { organization_id: string }[] | null }> } | { id: string; title: string | null; scan_opportunities: Array<{ scan_id: string; scans: { organization_id: string } | { organization_id: string }[] | null }> }[] | null;
};

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) notFound();

  const { data, error } = await supabase
    .from("opportunity_reports")
    .select("id,opportunity_id,problem,evidence_summary,buyer_profile,existing_workarounds,ai_advantage,mvp_suggestion,validation_experiment,confidence_score,created_at,updated_at,opportunities!inner(id,title,scan_opportunities!inner(scan_id,scans!inner(organization_id)))")
    .eq("id", reportId)
    .eq("opportunities.scan_opportunities.scans.organization_id", membership.organization_id)
    .maybeSingle();
  if (error || !data) notFound();

  const report = data as unknown as ReportRow;
  const opportunity = Array.isArray(report.opportunities) ? report.opportunities[0] ?? null : report.opportunities;
  if (!opportunity) notFound();
  const scanId = opportunity.scan_opportunities[0]?.scan_id;
  const opportunityDetail = await getOpportunity(report.opportunity_id);

  return <>
    <Link href="/app/reports" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"><ArrowLeft className="size-4" />Back to reports</Link>
    <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-brand">Founder Opportunity Report</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{opportunity.title ?? "Opportunity analysis"}</h1>
        <p className="mt-2 text-sm text-muted">Updated {formatDate(report.updated_at)}</p>
      </div>
      <div className="flex items-center gap-2">
        {scanId ? <Link href={`/app/scans/${scanId}`} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-muted hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60">Open investigation <ArrowUpRight className="size-4" /></Link> : null}
        <span className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand"><FileText className="size-4" />{report.confidence_score ?? "-"} confidence</span>
      </div>
    </div>

    <Card className="mt-6 p-5 sm:p-6">
      <FounderReportSections report={report} />
      {opportunityDetail ? <OpportunityEvidence evidence={opportunityDetail.evidence} /> : null}
    </Card>
  </>;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}
