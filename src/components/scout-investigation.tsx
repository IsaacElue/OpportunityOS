"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Circle, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { ScoutAvatar } from "@/components/scout-avatar";
import { ScoutTimelineMotion } from "@/components/scout-timeline-motion";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ScanProgress, ScanProgressEvent } from "@/lib/scans/getScanProgress";

type ScoutInvestigationProps = {
  progress: ScanProgress | null;
  scanId: string;
  createdAt: string | null;
  reportCount?: number;
  children: ReactNode;
};

function messageFor(progress: ScanProgress | null) {
  if (!progress || progress.status === "queued") return "I’m preparing the investigation.";
  if (progress.status === "completed") return progress.progressMessage ?? "Research complete.";
  if (progress.status === "failed") return progress.progressMessage ?? "I encountered an issue during investigation.";
  return progress.progressMessage ?? "I’m working through the evidence.";
}

function formatTimestamp(value: string | null) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDuration(start: string | null, end: string | null, active: boolean) {
  if (!start) return "Unavailable";
  const startedAt = new Date(start).getTime();
  const endedAt = end ? new Date(end).getTime() : active ? Date.now() : Number.NaN;
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) return "Unavailable";
  const seconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function labelForStage(stage: string) {
  return stage.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function briefEvent(createdAt: string | null): ScanProgressEvent | null {
  if (!createdAt) return null;
  return {
    id: "brief-created",
    stage: "brief_created",
    message: "Research brief created",
    status: "completed",
    evidenceCount: 0,
    opportunityCount: 0,
    createdAt
  };
}

export function ScoutInvestigation({ progress, scanId, createdAt, reportCount = 0, children }: ScoutInvestigationProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const executionTriggered = useRef(false);
  const previousStage = useRef<string | null>(null);
  const [isTyping, setIsTyping] = useState(true);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const isComplete = progress?.status === "completed";
  const isTerminal = isComplete || progress?.status === "failed" || progress?.status === "cancelled";
  const events = progress?.events.length ? progress.events : [briefEvent(createdAt)].filter((event): event is ScanProgressEvent => Boolean(event));
  const activeEvent = !isTerminal ? events.at(-1) : null;

  async function triggerExecution() {
    if (executionTriggered.current) return;
    executionTriggered.current = true;
    setExecutionError(null);
    try {
      const response = await fetch(`/api/v1/scans/${scanId}/execute`, { method: "POST" });
      if (response.ok) return;
      const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      setExecutionError(body?.error?.message ?? "Scout could not start this investigation. Please try again.");
      executionTriggered.current = false;
    } catch {
      setExecutionError("Scout could not start this investigation. Please try again.");
      executionTriggered.current = false;
    }
  }

  useEffect(() => {
    if (progress?.status !== "queued") return;
    void triggerExecution();
  }, [progress?.status, scanId]);

  useEffect(() => {
    if (isTerminal) return;
    const intervalId = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(intervalId);
  }, [isTerminal, router]);

  useEffect(() => {
    const nextStage = progress?.status === "completed" || progress?.status === "failed"
      ? progress.status
      : activeEvent?.stage ?? "queued";
    if (previousStage.current === nextStage) return;
    previousStage.current = nextStage;
    setIsTyping(true);
    const timer = window.setTimeout(() => setIsTyping(false), 800);
    return () => window.clearTimeout(timer);
  }, [activeEvent?.stage, progress?.status]);

  return <>
    <Card className="relative mt-8 overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <ScoutAvatar size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{isComplete ? "Investigation complete" : progress?.status === "failed" ? "Investigation needs attention" : "Scout is investigating"}</h2>
            <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-xs font-medium capitalize text-brand">{progress?.status ?? "queued"}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${progress?.status ?? "queued"}-${progress?.progressStage ?? "queued"}`}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="mt-3 max-w-2xl rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 p-4 text-sm leading-6 text-muted"
            >
              {isComplete ? <><p className="font-medium text-ink">{messageFor(progress)}</p><p className="mt-1">Scout found {progress?.opportunityCount ?? 0} evidence-backed {progress?.opportunityCount === 1 ? "opportunity" : "opportunities"} and generated {reportCount} {reportCount === 1 ? "founder report" : "founder reports"}.</p></> : <p>{messageFor(progress)}</p>}
              {executionError ? <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"><span>{executionError}</span><Button type="button" size="sm" variant="secondary" onClick={() => void triggerExecution()}>Retry</Button></div> : null}
              {progress?.status === "completed" && progress.errorDetail ? <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">Partial completion: {progress.errorDetail}</p> : null}
              {isTyping && !isTerminal ? <div className="mt-3"><TypingIndicator /></div> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <dl className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-4">
        <Metric label="Started" value={formatTimestamp(progress?.requestedAt ?? createdAt)} />
        <Metric label="Duration" value={formatDuration(progress?.requestedAt ?? createdAt, progress?.completedAt ?? null, !isTerminal)} />
        <Metric label="Evidence" value={String(progress?.evidenceCount ?? 0)} />
        <Metric label="Reports" value={String(reportCount)} />
      </dl>

      <ol className="relative mt-7 space-y-1" aria-label="Investigation timeline">
        {events.map((item, index) => {
          const isActive = !isTerminal && index === events.length - 1;
          const isDone = !isActive;
          return <ScoutTimelineMotion key={item.id} index={index} isActive={isActive} isComplete={isDone}>
            {index < events.length - 1 ? <span className={"absolute bottom-0 left-[1.15rem] top-9 w-px " + (isDone ? "bg-brand/50" : "bg-white/10")} /> : null}
            <span className={"relative z-10 grid size-7 shrink-0 place-items-center rounded-full border " + (isDone ? "border-brand/30 bg-brand text-brand-ink" : isActive ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 bg-white/[0.04] text-muted")}>
              {item.status === "failed" ? <Circle className="size-3 text-red-200" /> : isDone ? <Check className="size-4" /> : <Loader2 className={reduceMotion ? "size-4" : "size-4 animate-spin"} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={isActive ? "font-medium text-ink" : "text-sm font-medium"}>{labelForStage(item.stage)}</p>
                <time dateTime={item.createdAt} className="text-xs text-muted">{formatTimestamp(item.createdAt)}</time>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Search className="size-3.5" />{item.message}</p>
              {item.evidenceCount > 0 || item.opportunityCount > 0 ? <p className="mt-1 text-xs text-muted/80">{item.evidenceCount} evidence · {item.opportunityCount} opportunities</p> : null}
            </div>
          </ScoutTimelineMotion>;
        })}
      </ol>
    </Card>

    <AnimatePresence initial={false}>
      {isComplete ? <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : 0.15 }}>{children}</motion.div> : null}
    </AnimatePresence>
  </>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 font-medium text-ink">{value}</dd></div>;
}
