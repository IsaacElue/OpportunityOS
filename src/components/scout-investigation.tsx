"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { ScoutAvatar } from "@/components/scout-avatar";
import type { ScanProgress } from "@/lib/scans/getScanProgress";
import { cn } from "@/lib/utils";

const investigationSteps = [
  { id: "collecting", title: "Searching founder communities", detail: "Looking across startup conversations" },
  { id: "analyzing", title: "Reading discussions", detail: "Grouping similar founder complaints" },
  { id: "scoring", title: "Ranking opportunities", detail: "Scoring the most promising signals" },
  { id: "reporting", title: "Building your Founder Opportunity Report", detail: "Turning evidence into founder-ready briefs" }
] as const;

type InvestigationStage = "queued" | "collecting" | "analyzing" | "scoring" | "reporting" | "completed" | "failed";

function investigationStage(progress: ScanProgress | null): InvestigationStage {
  if (!progress || progress.status === "queued") return "queued";
  if (progress.status === "failed") return "failed";
  if (progress.status === "completed") return "completed";

  switch (progress.progressStage) {
    case "collecting_evidence": return "collecting";
    case "analyzing_evidence": return "analyzing";
    case "scoring": return "scoring";
    case "generating_reports": return "reporting";
    default: return "queued";
  }
}

function scoutMessage(stage: InvestigationStage, opportunityCount: number) {
  switch (stage) {
    case "queued": return "I’m getting everything ready.";
    case "collecting": return "I’m searching founder communities.";
    case "analyzing": return "I’m reading discussions.";
    case "scoring": return "I’m ranking opportunities.";
    case "reporting": return "I’m building your Founder Opportunity Report.";
    case "completed": return `I found ${opportunityCount} ${opportunityCount === 1 ? "opportunity" : "opportunities"}.`;
    case "failed": return "I hit a problem while investigating.";
  }
}

function activeStepIndex(stage: InvestigationStage) {
  if (stage === "collecting") return 0;
  if (stage === "analyzing") return 1;
  if (stage === "scoring") return 2;
  if (stage === "reporting") return 3;
  if (stage === "completed") return investigationSteps.length;
  return -1;
}

function progressPercentage(stage: InvestigationStage) {
  switch (stage) {
    case "queued": return 0;
    case "collecting": return 20;
    case "analyzing": return 50;
    case "scoring": return 75;
    case "reporting": return 90;
    case "completed": return 100;
    case "failed": return 0;
  }
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ScoutInvestigation({ progress, scanId }: { progress: ScanProgress | null; scanId: string }) {
  const router = useRouter();
  const executionTriggered = useRef(false);
  const hasScrolledToResults = useRef(false);
  const [stepTimestamps, setStepTimestamps] = useState<Record<string, string>>({});
  const stage = investigationStage(progress);
  const currentStepIndex = activeStepIndex(stage);
  const percentage = progressPercentage(stage);
  const isTerminal = stage === "completed" || stage === "failed";

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

  useEffect(() => {
    const completedCount = stage === "completed" ? investigationSteps.length : Math.max(currentStepIndex, 0);
    if (completedCount === 0) return;

    setStepTimestamps((timestamps) => {
      const recordedAt = progress?.completedAt ?? new Date().toISOString();
      let changed = false;
      const next = { ...timestamps };
      for (let index = 0; index < completedCount; index += 1) {
        const step = investigationSteps[index];
        if (!next[step.id]) {
          next[step.id] = recordedAt;
          changed = true;
        }
      }
      return changed ? next : timestamps;
    });
  }, [currentStepIndex, progress?.completedAt, stage]);

  useEffect(() => {
    if (stage !== "completed" || hasScrolledToResults.current) return;
    hasScrolledToResults.current = true;
    document.getElementById("opportunity-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  return <div aria-live="polite">
    <div className="flex items-start gap-3">
      <ScoutAvatar size="md" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Scout</p>
          <p className="text-xs text-muted">{percentage}% complete</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={stage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-2 text-sm leading-6 text-muted">
            {scoutMessage(stage, progress?.opportunityCount ?? 0)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>

    <ol className="mt-6 space-y-1">
      {investigationSteps.map((step, index) => {
        const isComplete = currentStepIndex > index;
        const isCurrent = currentStepIndex === index;
        const isFuture = !isComplete && !isCurrent;
        const timestamp = stepTimestamps[step.id];

        return <li key={step.id} className={cn("relative flex gap-3 pb-5 last:pb-0", isFuture && "opacity-35")}>
          {index < investigationSteps.length - 1 ? <span className={cn("absolute left-[17px] top-9 h-[calc(100%-18px)] w-px", isComplete ? "bg-brand/50" : "bg-white/10")} /> : null}
          <motion.span
            initial={false}
            animate={isCurrent ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={isCurrent ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
            className={cn(
              "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border",
              isComplete && "border-brand/30 bg-brand text-brand-ink",
              isCurrent && "border-brand/40 bg-brand/15 text-brand",
              isFuture && "border-white/10 bg-white/[0.03] text-muted"
            )}
          >
            {isComplete ? <Check className="size-4" /> : isCurrent ? <Loader2 className="size-4 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
          </motion.span>
          <div className="min-w-0 pt-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className={cn("text-sm font-medium", isCurrent && "text-brand")}>{step.title}</p>
              {isComplete && timestamp ? <motion.time initial={{ opacity: 0 }} animate={{ opacity: 1 }} dateTime={timestamp} className="text-xs text-brand/80">✓ {formatTimestamp(timestamp)}</motion.time> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">{step.detail}</p>
          </div>
        </li>;
      })}
    </ol>

    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-muted">
      <span>{progress?.progressMessage ?? "Preparing your investigation"}</span>
      <span>{percentage}% complete</span>
    </div>

    {stage === "completed" ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 p-3 text-sm text-brand">
      <Sparkles className="size-4" />Your opportunity results are ready below.
    </motion.div> : null}
  </div>;
}
