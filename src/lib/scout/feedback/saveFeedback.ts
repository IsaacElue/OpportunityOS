import "server-only";

import type { SaveScoutFeedbackInput, ScoutFeedback } from "@/lib/scout/feedback/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Save trusted server-side founder feedback for Scout's future learning. */
export async function saveScoutFeedback(input: SaveScoutFeedbackInput): Promise<ScoutFeedback> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_feedback")
    .insert({
      organization_id: input.organization_id,
      user_id: input.user_id,
      opportunity_id: input.opportunity_id,
      feedback_type: input.feedback_type,
      note: input.note ?? null
    })
    .select("id,organization_id,user_id,opportunity_id,feedback_type,note,created_at")
    .single();
  if (error) throw new Error(`Unable to save Scout feedback: ${error.message}`);

  return data as ScoutFeedback;
}
