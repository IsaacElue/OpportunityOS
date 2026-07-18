"use client";

import { type FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Send } from "lucide-react";

import { ScoutAvatar } from "@/components/scout-avatar";
import { TypingIndicator } from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ScoutChatProps = {
  defaults: {
    industry: string;
    buyerType: string;
    geography: string;
  };
};

export function ScoutChat({ defaults }: ScoutChatProps) {
  const [industry, setIndustry] = useState(defaults.industry);
  const [buyerType, setBuyerType] = useState(defaults.buyerType);
  const [geography, setGeography] = useState(defaults.geography);
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmittedPrompt(prompt);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const response = await fetch("/api/v1/scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify({
          scope: {
            industry,
            buyer_type: buyerType,
            geography,
            problem_hints: [prompt, context].filter(Boolean)
          }
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error?.message ?? "We could not create that research brief.");
        setSubmitting(false);
        return;
      }

      window.location.assign(`/app/scans/${data.id}`);
    } catch {
      setError("We could not create that research brief.");
      setSubmitting(false);
    }
  }

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-surface via-surface/95 to-[#121d28] p-4 shadow-glow sm:p-6">
    <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-brand/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-[#8f7aff]/10 blur-3xl" />

    <div className="relative">
      <div className="flex items-start gap-4">
        <ScoutAvatar size="lg" />
        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Scout</h2>
            <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">AI research teammate</span>
          </div>
          <div className="mt-3 max-w-2xl rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 p-4 text-sm leading-6 text-muted backdrop-blur">
            <p>I&apos;m constantly watching startup conversations.</p>
            <p className="mt-3">Tell me something you&apos;re curious about.</p>
            <p className="mt-3">I&apos;ll investigate founders, communities, Hacker News, Reddit and other sources to find opportunities.</p>
          </div>
        </div>
      </div>

      {submittedPrompt ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-auto mt-6 max-w-xl rounded-2xl rounded-tr-sm border border-brand/20 bg-brand/10 p-4 text-sm leading-6 text-ink">
        {submittedPrompt}
      </motion.div> : null}

      {submitting ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start gap-3">
        <ScoutAvatar size="sm" />
        <div className="max-w-xl rounded-2xl rounded-tl-sm border border-white/10 bg-black/15 p-4 text-sm leading-6 text-muted backdrop-blur">
          <p className="font-medium text-ink">Got it.</p>
          <p className="mt-1">I&apos;m searching discussions across startup communities now.</p>
          <p className="mt-1">I&apos;ll come back with evidence-backed opportunities.</p>
          <div className="mt-3"><TypingIndicator /></div>
        </div>
      </motion.div> : null}

      <Card className="mt-7 bg-black/15 p-4 backdrop-blur sm:p-5">
        <form onSubmit={submit}>
          <label className="block text-sm font-medium">
            What should Scout investigate?
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
              maxLength={500}
              placeholder="What problem should I investigate?"
              className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-base font-normal leading-7 text-ink outline-none placeholder:text-muted/70 focus:border-brand/70 focus:ring-2 focus:ring-brand/15"
            />
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="Industry" value={industry} onChange={setIndustry} />
            <Field label="Buyer" value={buyerType} onChange={setBuyerType} />
            <Field label="Geography" value={geography} onChange={setGeography} />
          </div>

          <label className="mt-5 block text-sm font-medium">
            Optional Context
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={500}
              placeholder="For example: recurring admin work that a small team can validate through customer interviews."
              className="mt-2 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-sm font-normal leading-6 text-ink outline-none placeholder:text-muted/70 focus:border-brand/70 focus:ring-2 focus:ring-brand/15"
            />
          </label>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-muted"><Send className="size-3.5 text-brand" />Scout will turn this into a focused research brief.</p>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" />Starting investigation</> : <>Start Investigation <ArrowRight className="size-4" /></>}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </motion.div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium">
    {label}
    <input value={value} onChange={(event) => onChange(event.target.value)} required maxLength={80} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-normal text-ink outline-none focus:border-brand/70 focus:ring-2 focus:ring-brand/15" />
  </label>;
}
