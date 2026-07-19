import "server-only";

import type { GetScoutFeedbackInput, ScoutFeedback } from "@/lib/scout/feedback/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Load an organization's newest Scout feedback for trusted server-side use. */
export async function getScoutFeedback({
  organization_id,
  opportunity_id
}: GetScoutFeedbackInput): Promise<ScoutFeedback[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("scout_feedback")
    .select("id,organization_id,user_id,opportunity_id,feedback_type,note,created_at")
    .eq("organization_id", organization_id);
  if (opportunity_id) query = query.eq("opportunity_id", opportunity_id);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load Scout feedback: ${error.message}`);

  return (data ?? []) as ScoutFeedback[];
}
