import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { LiveScanProgress } from "@/components/live-scan-progress";
import { getScanOpportunities, type ScanOpportunity } from "@/lib/opportunities/getScanOpportunities";
import { getScanProgress } from "@/lib/scans/getScanProgress";
import { createClient } from "@/lib/supabase/server";

type ScanReport = {
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
  opportunities: { title: string | null } | { title: string | null }[] | null;
};

export default async function ScanDetailPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user!.id)
    .limit(1)
    .single();
  const { data: scan } = await supabase
    .from("scans")
    .select("id,status,stage,filters,requested_at")
    .eq("id", scanId)
    .eq("organization_id", membership!.organization_id)
    .maybeSingle();
  if (!scan) notFound();

  const [opportunities, progress, reportResult] = await Promise.all([
    getScanOpportunities(scan.id),
    getScanProgress(scan.id),
    supabase
      .from("opportunity_reports")
      .select("id,opportunity_id,problem,evidence_summary,buyer_profile,existing_workarounds,ai_advantage,mvp_suggestion,validation_experiment,confidence_score,opportunities!inner(title,scan_opportunities!inner(scan_id))")
      .eq("opportunities.scan_opportunities.scan_id", scan.id)
      .order("created_at", { ascending: false })
  ]);
  if (reportResult.error) throw new Error(`Unable to fetch opportunity reports: ${reportResult.error.message}`);
  const reports = (reportResult.data ?? []) as unknown as ScanReport[];
  const filters = scan.filters as {
    industry?: string;
    buyer_type?: string;
    geography?: string;
    problem_hints?: string[];
  };

  return <>
    <Link href="/app/scan" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
      <ArrowLeft className="size-4" />New research
    </Link>

    <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-brand">Research brief</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {filters.industry ?? "Founder"} / {filters.buyer_type ?? "B2B SaaS"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {filters.geography ?? "US"}{filters.problem_hints?.[0] ? ` / ${filters.problem_hints[0]}` : ""}
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-muted">
        <Clock3 className="size-4" />Brief created
      </span>
    </div>

    <Card className="mt-8 p-6 sm:p-8">
      <LiveScanProgress progress={progress} scanId={scan.id} />
    </Card>

    <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">Discovery results</p>
          <h2 className="mt-1 text-xl font-semibold">Evidence-backed opportunities</h2>
        </div>
        <p className="text-sm text-muted">
          {opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"}
        </p>
      </div>

      {opportunities.length > 0 ? <div className="mt-4 grid gap-4">
        {opportunities.map((opportunity) => <OpportunityResult key={opportunity.id} opportunity={opportunity} />)}
      </div> : <Card className="mt-4 border-dashed p-6">
        <p className="font-medium">No opportunities discovered yet</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Results will appear here after evidence has been analyzed for this research brief.
        </p>
      </Card>}
    </section>

    <section className="mt-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <FileText className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-brand">Founder Opportunity Report</p>
          <h2 className="mt-1 text-xl font-semibold">Founder-ready opportunity analysis</h2>
        </div>
      </div>

      {reports.length > 0 ? <div className="mt-4 grid gap-4">
        {reports.map((report) => <FounderOpportunityReportCard key={report.id} report={report} />)}
      </div> : <Card className="mt-4 border-dashed p-6">
        <p className="font-medium">Report generation in progress</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Evidence-backed founder reports will appear here once opportunity analysis is complete.
        </p>
      </Card>}
    </section>
  </>;
}

function OpportunityResult({ opportunity }: { opportunity: ScanOpportunity }) {
  return <Card className="p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-brand">{opportunity.industry ?? "Uncategorised"}</p>
        <h3 className="mt-1 text-lg font-semibold">{opportunity.title ?? "Untitled opportunity"}</h3>
      </div>
      <div className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-right">
        <p className="text-xs text-muted">Opportunity score</p>
        <p className="text-xl font-semibold text-brand">{opportunity.opportunityScore ?? "-"}</p>
      </div>
    </div>

    <p className="mt-4 text-sm leading-6 text-muted">
      {opportunity.problem ?? opportunity.description ?? "No problem statement available yet."}
    </p>

    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">Persona</dt>
        <dd className="mt-1">{opportunity.persona ?? "Not specified"}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted">Evidence</dt>
        <dd className="mt-1">
          {opportunity.evidenceCount} {opportunity.evidenceCount === 1 ? "linked source" : "linked sources"}
        </dd>
      </div>
    </dl>

    <div className="mt-5 border-t border-white/10 pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Score breakdown</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        <Score label="Pain" value={opportunity.painScore} />
        <Score label="Frequency" value={opportunity.frequencyScore} />
        <Score label="Intent" value={opportunity.intentScore} />
        <Score label="Market" value={opportunity.marketScore} />
        <Score label="Competition gap" value={opportunity.competitionGapScore} />
      </dl>
    </div>
  </Card>;
}

function Score({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-lg bg-white/[0.04] px-3 py-2">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="mt-0.5 font-medium">{value ?? "-"}</dd>
  </div>;
}

function FounderOpportunityReportCard({ report }: { report: ScanReport }) {
  const opportunity = Array.isArray(report.opportunities) ? report.opportunities[0] ?? null : report.opportunities;

  return <Card className="p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-brand">Founder Opportunity Report</p>
        <h3 className="mt-1 text-lg font-semibold">{opportunity?.title ?? "Opportunity analysis"}</h3>
      </div>
      <div className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-right">
        <p className="text-xs text-muted">Confidence score</p>
        <p className="text-xl font-semibold text-brand">{report.confidence_score ?? "-"}</p>
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <ReportSection label="Problem" content={report.problem} />
      <ReportSection label="Evidence Summary" content={report.evidence_summary} />
      <ReportSection label="Buyer Profile" content={report.buyer_profile} />
      <ReportSection label="Existing Workarounds" content={report.existing_workarounds} />
      <ReportSection label="AI Advantage" content={report.ai_advantage} />
      <ReportSection label="MVP Suggestion" content={report.mvp_suggestion} />
      <ReportSection label="Validation Experiment" content={report.validation_experiment} />
      <ReportSection label="Confidence Score" content={report.confidence_score?.toString() ?? null} />
    </div>
  </Card>;
}

function ReportSection({ label, content }: { label: string; content: string | null }) {
  return <div className="rounded-lg bg-white/[0.04] p-4">
    <h4 className="text-xs font-medium uppercase tracking-wide text-muted">{label}</h4>
    <p className="mt-2 text-sm leading-6">{content ?? "Not available"}</p>
  </div>;
}
