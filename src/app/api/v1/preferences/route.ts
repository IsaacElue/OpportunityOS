import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/errors";

const preferencesSchema = z.object({ industries: z.array(z.string().min(1)).min(1).max(3), buyer_types: z.array(z.string().min(1)).min(1).max(3), geography: z.string().min(2).max(64), risk_appetite: z.enum(["low", "medium", "high"]), goals: z.array(z.string().min(1).max(240)).min(1).max(3) });

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Please submit valid founder preferences.");
  }
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "invalid_request", "Please check your research preferences.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse(401, "unauthorized", "Sign in to continue.");
  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError) return errorResponse(500, "organization_lookup_failed", "We could not load your workspace.", true);
  if (!membership) return errorResponse(409, "organization_missing", "Your workspace is not ready yet. Please sign out and try again.", true);
  const { error } = await supabase.from("founder_preferences").upsert({ organization_id: membership.organization_id, ...parsed.data, onboarding_completed_at: new Date().toISOString() }, { onConflict: "organization_id" });
  if (error) return errorResponse(500, "preferences_save_failed", "We could not save your preferences.", true);
  return NextResponse.json({ ok: true });
}
