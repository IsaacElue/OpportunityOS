import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ScanProgress = {
  status: string;
  progressStage: string | null;
  progressMessage: string | null;
  evidenceCount: number;
  opportunityCount: number;
  completedAt: string | null;
  requestedAt: string | null;
  errorCode: string | null;
  errorDetail: string | null;
  events: ScanProgressEvent[];
};

export type ScanProgressEvent = {
  id: string;
  stage: string;
  message: string;
  status: "running" | "completed" | "failed";
  evidenceCount: number;
  opportunityCount: number;
  createdAt: string;
};

/** Fetch the observable execution state for a scan. */
export async function getScanProgress(scanId: string): Promise<ScanProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scans")
    .select("status,progress_stage,progress_message,evidence_count,opportunity_count,completed_at,requested_at,error_code,error_detail")
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw new Error(`Unable to fetch scan progress: ${error.message}`);
  if (!data) return null;

  const { data: eventRows, error: eventError } = await supabase
    .from("scan_progress_events")
    .select("id,stage,message,status,evidence_count,opportunity_count,created_at")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true });
  if (eventError) throw new Error(`Unable to fetch scan progress events: ${eventError.message}`);

  return {
    status: data.status,
    progressStage: data.progress_stage,
    progressMessage: data.progress_message,
    evidenceCount: data.evidence_count,
    opportunityCount: data.opportunity_count,
    completedAt: data.completed_at,
    requestedAt: data.requested_at,
    errorCode: data.error_code,
    errorDetail: data.error_detail,
    events: (eventRows ?? []).map((event) => ({
      id: event.id,
      stage: event.stage,
      message: event.message,
      status: event.status as ScanProgressEvent["status"],
      evidenceCount: event.evidence_count ?? 0,
      opportunityCount: event.opportunity_count ?? 0,
      createdAt: event.created_at
    }))
  };
}
