import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/errors";

const scanSchema = z.object({ scope: z.object({ industry: z.string().min(2).max(80), buyer_type: z.string().min(2).max(80), geography: z.string().min(2).max(64), problem_hints: z.array(z.string().min(1).max(500)).max(3).default([]) }) });

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) return errorResponse(400, "idempotency_key_required", "Please retry your research brief.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Please submit a valid research brief.");
  }
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "invalid_request", "Please provide a valid research brief.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse(401, "unauthorized", "Sign in to continue.");
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) return errorResponse(409, "organization_missing", "Your workspace is not ready yet.", true);
  const { data: existing } = await supabase.from("scans").select("id,status").eq("organization_id", membership.organization_id).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing) return NextResponse.json(existing, { status: 202 });
  const { data: scan, error } = await supabase.from("scans").insert({ organization_id: membership.organization_id, requested_by: user.id, idempotency_key: idempotencyKey, filters: parsed.data.scope, status: "queued", stage: "brief_created", progress: 0 }).select("id,status").single();
  if (error) return errorResponse(500, "scan_create_failed", "We could not create that research brief.", true);
  return NextResponse.json(scan, { status: 202 });
}
