"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { ScoutAvatar } from "@/components/scout-avatar";
import { TypingIndicator } from "@/components/typing-indicator";
import { Card } from "@/components/ui/card";
import type { ScanProgress } from "@/lib/scans/getScanProgress";

type ScoutInvestigationProps = {
  progress: ScanProgress | null;
  scanId: string;
  createdAt: string | null;
  children: ReactNode;
};

type TimelineStage = "collecting_evidence" | "analyzing_evidence" | "scoring" | "generating_reports";

const timeline = [
  { id: "brief", label: "Brief created" },
  { id: "collecting_evidence", label: "Searching founder discussions" },
  { id: "analyzing_evidence", label: "Reading conversations" },
  { id: "scoring", label: "Ranking ideas" },
  { id: "generating_reports", label: "Building Founder Opportunity Report" }
] as const;

const stageMessages: Record<string, string> = {
  queued: "I’m preparing the investigation.",
  collecting_evidence: "I’m searching startup communities and evidence sources.",
  analyzing_evidence: "I’m reading conversations and identifying repeated problems.",
  scoring: "I’m ranking opportunities based on evidence.",
  generating_reports: "I found something interesting. I’m building the founder report.",
  completed: "I found promising opportunities.",
  failed: "I encountered an issue during investigation."
};

function currentStage(progress: ScanProgress | null): TimelineStage | null {
  if (!progress || progress.status === "queued") return null;
  if (progress.progressStage === "collecting_evidence") return "collecting_evidence";
  if (progress.progressStage === "analyzing_evidence") return "analyzing_evidence";
  if (progress.progressStage === "scoring") return "scoring";
  if (progress.progressStage === "generating_reports") return "generating_reports";
  return null;
}

function messageFor(progress: ScanProgress | null) {
  if (!progress) return stageMessages.queued;
  if (progress.status === "completed") return stageMessages.completed;
  if (progress.status === "failed") return stageMessages.failed;
  return stageMessages[progress.progressStage ?? progress.status] ?? progress.progressMessage ?? stageMessages.queued;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ScoutInvestigation({ progress, scanId, createdAt, children }: ScoutInvestigationProps) {
  const router = useRouter();
  const executionTriggered = useRef(false);
  const stage = currentStage(progress);
  const previousStage = useRef<string | null>(null);
  const [isTyping, setIsTyping] = useState(true);
  const [stageTimestamps, setStageTimestamps] = useState<Record<string, string>>(
    (): Record<string, string> => createdAt ? { brief: createdAt } : {}
  );
  const isComplete = progress?.status === "completed";
  const isTerminal = isComplete || progress?.status === "failed" || progress?.status === "cancelled";

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
    const nextStage = progress?.status === "completed" || progress?.status === "failed"
      ? progress.status
      : stage ?? "queued";
    if (previousStage.current === nextStage) return;

    previousStage.current = nextStage;
    setIsTyping(true);
    const timer = window.setTimeout(() => setIsTyping(false), 800);
    return () => window.clearTimeout(timer);
  }, [progress?.status, stage]);

  useEffect(() => {
    setStageTimestamps((timestamps) => {
      const recordedAt = progress?.completedAt ?? new Date().toISOString();
      const next = { ...timestamps };
      if (!next.brief) next.brief = createdAt ?? recordedAt;
      if (stage && !next[stage]) next[stage] = recordedAt;
      if (isComplete) {
        for (const item of timeline) {
          if (!next[item.id]) next[item.id] = recordedAt;
        }
      }
      return next;
    });
  }, [createdAt, isComplete, progress?.completedAt, stage]);

  const activeIndex = stage ? timeline.findIndex((item) => item.id === stage) : -1;

  return <>
    <Card className="relative mt-8 overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <ScoutAvatar size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Scout is investigating</h2>
            <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">Live research</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${progress?.status ?? "queued"}-${progress?.progressStage ?? "queued"}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-3 max-w-2xl rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 p-4 text-sm leading-6 text-muted"
            >
              {isComplete ? <><p className="font-medium text-ink">Investigation complete.</p><p className="mt-1">I found {progress?.opportunityCount ?? 0} evidence-backed {progress?.opportunityCount === 1 ? "opportunity" : "opportunities"} worth exploring.</p></> : <p>{messageFor(progress)}</p>}
              {isTyping && !isTerminal ? <div className="mt-3"><TypingIndicator /></div> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ol className="relative mt-7 space-y-1" aria-label="Investigation timeline">
        {timeline.map((item, index) => {
          const isBrief = item.id === "brief";
          const isDone = isComplete || isBrief || (activeIndex > index && activeIndex !== -1);
          const isActive = !isTerminal && activeIndex === index;
          const isFuture = !isDone && !isActive;
          const observedAt = stageTimestamps[item.id];
          const timestamp = observedAt
            ? formatTimestamp(observedAt)
            : isActive
              ? "Now"
              : isDone
                ? "Earlier"
                : "Upcoming";

          return <motion.li
            key={item.id}
            layout
            className={"relative flex gap-3 rounded-xl px-2 py-3 transition-colors " + (isFuture ? "opacity-45" : "")}
          >
            {index < timeline.length - 1 ? <span className={"absolute bottom-0 left-[1.15rem] top-9 w-px " + (isDone ? "bg-brand/50" : "bg-white/10")} /> : null}
            <span className={"relative z-10 grid size-7 shrink-0 place-items-center rounded-full border " + (isDone ? "border-brand/30 bg-brand text-brand-ink" : isActive ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 bg-white/[0.04] text-muted")}>
              {isDone ? <Check className="size-4" /> : isActive ? <Loader2 className="size-4 animate-spin" /> : <Circle className="size-3" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={isActive ? "font-medium text-ink" : "text-sm font-medium"}>{item.label}</p>
                <time dateTime={observedAt} className="text-xs text-muted">{timestamp}</time>
              </div>
              {isActive ? <p className="mt-1 flex items-center gap-1.5 text-sm text-brand"><Search className="size-3.5 animate-pulse" />{progress?.progressMessage ?? "Working through the evidence"}</p> : null}
            </div>
          </motion.li>;
        })}
      </ol>
    </Card>

    <AnimatePresence initial={false}>
      {isComplete ? <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
        {children}
      </motion.div> : null}
    </AnimatePresence>
  </>;
}
