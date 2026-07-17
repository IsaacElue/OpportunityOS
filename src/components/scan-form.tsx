"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ScanForm({ defaults }: { defaults: { industry: string; buyerType: string; geography: string } }) {
  const [industry, setIndustry] = useState(defaults.industry);
  const [buyerType, setBuyerType] = useState(defaults.buyerType);
  const [geography, setGeography] = useState(defaults.geography);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const response = await fetch("/api/v1/scans", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ scope: { industry, buyer_type: buyerType, geography, problem_hints: brief ? [brief] : [] } }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error?.message ?? "We could not create that research brief."); setLoading(false); return; }
    window.location.assign(`/app/scans/${data.id}`);
  }

  return <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="rounded-2xl border border-white/10 bg-surface/60 p-5 shadow-glow sm:p-6"><div className="flex items-center gap-2 text-sm font-medium text-brand"><Sparkles className="size-4" />Create a research brief</div><h2 className="mt-3 text-2xl font-semibold tracking-tight">What founder problem should we investigate?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Set a focused frame. The research engine is not enabled in this milestone, but your brief will be stored as a durable scan request.</p><div className="mt-7 grid gap-4 sm:grid-cols-3"><Field label="Industry" value={industry} onChange={setIndustry} /><Field label="Buyer" value={buyerType} onChange={setBuyerType} /><Field label="Geography" value={geography} onChange={setGeography} /></div><label className="mt-5 block text-sm font-medium">Optional context<textarea value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={500} placeholder="For example: recurring admin work that a small team can validate through customer interviews." className="mt-2 min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3.5 text-sm font-normal leading-6 text-ink outline-none placeholder:text-muted/70 focus:border-brand/70 focus:ring-2 focus:ring-brand/15" /></label>{error && <p className="mt-4 text-sm text-red-300">{error}</p>}<div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Evidence sources will be shown when research is enabled.</p><Button type="submit" size="lg" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <>Create brief <ArrowRight className="size-4" /></>}</Button></div></motion.form>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium">{label}<input value={value} onChange={(event) => onChange(event.target.value)} required maxLength={80} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm font-normal outline-none focus:border-brand/70 focus:ring-2 focus:ring-brand/15" /></label>;
}
