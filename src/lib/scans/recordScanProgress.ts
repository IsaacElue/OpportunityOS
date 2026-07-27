import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type RecordScanProgressInput = {
  scanId: string;
  stage: string;
  message: string;
  status?: "running" | "completed" | "failed";
  evidenceCount?: number;
  opportunityCount?: number;
};

/** Record a real runner transition for the investigation timeline. */
export async function recordScanProgress({
  scanId,
  stage,
  message,
  status = "running",
  evidenceCount = 0,
  opportunityCount = 0
}: RecordScanProgressInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("scan_progress_events").insert({
    scan_id: scanId,
    stage,
    message,
    status,
    evidence_count: Math.max(0, evidenceCount),
    opportunity_count: Math.max(0, opportunityCount)
  });
  if (error) throw new Error(`Unable to record scan progress: ${error.message}`);
}
