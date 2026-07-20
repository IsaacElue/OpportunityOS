import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/errors";
import { runScoutBackgroundCycle } from "@/lib/scout/background";
import { createClient } from "@/lib/supabase/server";

/** Protected execution entrypoint for future Scout cron providers. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse(401, "unauthorized", "Sign in to continue.");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return errorResponse(409, "organization_missing", "Your workspace is not ready yet.", true);
  }

  try {
    const cycle = await runScoutBackgroundCycle({
      organization_id: membership.organization_id
    });

    return NextResponse.json({
      success: true,
      ...cycle
    });
  } catch {
    return errorResponse(500, "scout_background_failed", "Scout background execution could not complete.");
  }
}
