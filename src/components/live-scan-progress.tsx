"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import type { ScanProgress } from "@/lib/scans/getScanProgress";

function stageLabel(stage: string | null) {
  return stage?.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") ?? "Preparing scan";
}

export function LiveScanProgress({ progress, scanId }: { progress: ScanProgress | null; scanId: string }) {
  const router = useRouter();
  const executionTriggered = useRef(false);
  const isTerminal = progress?.status === "completed" || progress?.status === "failed" || progress?.status === "cancelled";

  useEffect(() => {
    if (progress?.status !== "queued" || executionTriggered.current) return;
    executionTriggered.current = true;
    void fetch(`/api/v1/scans/${scanId}/execute`, { method: "POST" })
      .catch((error) => console.error("Unable to trigger scan execution", { scanId, error }));
  }, [progress?.status, scanId]);

  useEffect(() => {
    if (isTerminal) return;
    const intervalId = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(intervalId);
  }, [isTerminal, router]);

  if (!progress || progress.status === "queued") {
    return <><h2 className="text-lg font-semibold">Research queued</h2><p className="mt-2 text-sm leading-6 text-muted">Your research brief is waiting to begin.</p></>;
  }

  if (progress.status === "failed") {
    return <><h2 className="text-lg font-semibold">Research could not be completed</h2><p className="mt-2 text-sm leading-6 text-muted">You can start a new research brief to try again.</p></>;
  }

  if (progress.status === "completed") {
    return <><h2 className="text-lg font-semibold">Research complete</h2><p className="mt-2 text-sm leading-6 text-muted">Your evidence-backed opportunities are ready below.</p></>;
  }

  return <div aria-live="polite">
    <div className="flex items-center gap-2 text-brand"><Loader2 className="size-4 animate-spin" /><p className="text-sm font-medium">Researching opportunities...</p></div>
    <h2 className="mt-3 text-lg font-semibold">{stageLabel(progress.progressStage)}</h2>
    <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-muted"><CheckCircle2 className="size-4 shrink-0 text-brand" />{progress.progressMessage ?? "Working through your research brief"}</p>
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><dt className="text-xs font-medium uppercase tracking-wide text-muted">Evidence collected</dt><dd className="mt-1 text-xl font-semibold">{progress.evidenceCount}</dd></div><div className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><dt className="text-xs font-medium uppercase tracking-wide text-muted">Opportunities found</dt><dd className="mt-1 text-xl font-semibold">{progress.opportunityCount}</dd></div></dl>
  </div>;
}
