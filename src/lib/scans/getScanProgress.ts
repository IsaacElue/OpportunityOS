import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ScanProgress = {
  status: string;
  progressStage: string | null;
  progressMessage: string | null;
  evidenceCount: number;
  opportunityCount: number;
  completedAt: string | null;
};

/** Fetch the observable execution state for a scan. */
export async function getScanProgress(scanId: string): Promise<ScanProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scans")
    .select("status,progress_stage,progress_message,evidence_count,opportunity_count,completed_at")
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw new Error(`Unable to fetch scan progress: ${error.message}`);
  if (!data) return null;

  return {
    status: data.status,
    progressStage: data.progress_stage,
    progressMessage: data.progress_message,
    evidenceCount: data.evidence_count,
    opportunityCount: data.opportunity_count,
    completedAt: data.completed_at
  };
}
