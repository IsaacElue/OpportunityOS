import { NextResponse } from "next/server";

import { errorResponse, publicError } from "@/lib/errors";
import { runScan } from "@/lib/scans/runScan";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse(401, "unauthorized", "Sign in to continue.");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return errorResponse(409, "organization_missing", "Your workspace is not ready yet.", true);

  const { data: scan, error } = await supabase
    .from("scans")
    .select("id,status")
    .eq("id", scanId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (error) return errorResponse(500, "scan_lookup_failed", "We could not start that research brief.", true);
  if (!scan) return errorResponse(404, "scan_not_found", "That research brief does not exist.");

  if (scan.status === "completed" || scan.status === "running") {
    return NextResponse.json({ id: scan.id, status: scan.status });
  }
  if (scan.status !== "queued") {
    return errorResponse(409, "scan_not_executable", "This research brief cannot be started.");
  }

  try {
    const summary = await runScan(scan.id);
    return NextResponse.json({ id: summary.scanId, status: "completed" });
  } catch (executionError) {
    console.error("Scan execution failed", { scanId: scan.id, error: executionError });
    return NextResponse.json({
      error: {
        ...publicError("scan_execution_failed", "We could not complete that research brief.", true),
        detail: safeExecutionErrorMessage(executionError)
      }
    }, { status: 500 });
  }
}

function safeExecutionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "The scan workflow failed unexpectedly.";
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(api[_-]?key|service[_-]?role[_-]?key)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 500);
}
