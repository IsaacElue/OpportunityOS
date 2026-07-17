import "server-only";

import type { FounderOpportunityReport } from "@/lib/reports/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type SavedFounderOpportunityReport = FounderOpportunityReport & {
  id: string;
  opportunity_id: string;
  created_at: string;
  updated_at: string;
};

type ReportRow = SavedFounderOpportunityReport;

/** Persist a generated report, replacing the existing report for an opportunity when present. */
export async function saveReport(
  opportunityId: string,
  report: FounderOpportunityReport
): Promise<SavedFounderOpportunityReport> {
  const supabase = createAdminClient();
  const { data: existingReport, error: existingReportError } = await supabase
    .from("opportunity_reports")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingReportError) {
    throw new Error(`Unable to find existing opportunity report: ${existingReportError.message}`);
  }

  const reportData = {
    problem: report.problem,
    evidence_summary: report.evidence_summary,
    buyer_profile: report.buyer_profile,
    existing_workarounds: report.existing_workarounds,
    ai_advantage: report.ai_advantage,
    mvp_suggestion: report.mvp_suggestion,
    validation_experiment: report.validation_experiment,
    confidence_score: report.confidence_score
  };

  const query = existingReport
    ? supabase.from("opportunity_reports").update(reportData).eq("id", existingReport.id)
    : supabase.from("opportunity_reports").insert({ opportunity_id: opportunityId, ...reportData });
  const { data, error } = await query
    .select("id,opportunity_id,problem,evidence_summary,buyer_profile,existing_workarounds,ai_advantage,mvp_suggestion,validation_experiment,confidence_score,created_at,updated_at")
    .single();
  if (error) throw new Error(`Unable to save opportunity report: ${error.message}`);

  return data as ReportRow;
}
