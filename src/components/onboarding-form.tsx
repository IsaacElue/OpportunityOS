"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const industries = ["Healthcare", "Finance", "Real estate", "Professional services", "Logistics", "Developer tools"];
const buyers = ["Operations leader", "Practice manager", "Finance leader", "IT leader", "Founder / owner"];

export function OnboardingForm() {
  const [industry, setIndustry] = useState("Healthcare");
  const [buyerType, setBuyerType] = useState("Operations leader");
  const [risk, setRisk] = useState("Medium");
  const [goal, setGoal] = useState("Find a workflow automation problem");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const response = await fetch("/api/v1/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ industries: [industry], buyer_types: [buyerType], geography: "US", risk_appetite: risk.toLowerCase(), goals: [goal] }) });
    if (!response.ok) { const data = await response.json().catch(() => null); setError(data?.error?.message ?? "We could not save your preferences. Please try again."); setLoading(false); return; }
    window.location.assign("/app/scan");
  }

  return <form onSubmit={submit} className="space-y-7">
    <ChoiceGroup title="Industry" description="Start where you have curiosity or access." value={industry} options={industries} onChange={setIndustry} />
    <ChoiceGroup title="Likely buyer" description="Who feels this problem and can fund a solution?" value={buyerType} options={buyers} onChange={setBuyerType} />
    <div className="grid gap-6 sm:grid-cols-2"><SelectField label="Geography" value="US" disabled options={["US"]} /><SelectField label="Risk appetite" value={risk} options={["Low", "Medium", "High"]} onChange={setRisk} /></div>
    <label className="block"><span className="text-sm font-medium">What do you want to find?</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand/70 focus:ring-2 focus:ring-brand/15" /></label>
    {error && <p className="text-sm text-red-300">{error}</p>}
    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : <>Start researching <ArrowRight className="size-4" /></>}</Button>
  </form>;
}

function ChoiceGroup({ title, description, value, options, onChange }: { title: string; description: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <fieldset><legend className="text-sm font-medium">{title}</legend><p className="mt-1 text-sm text-muted">{description}</p><div className="mt-3 flex flex-wrap gap-2">{options.map((option) => <motion.button whileTap={{ scale: 0.98 }} type="button" key={option} onClick={() => onChange(option)} className={`rounded-xl border px-3 py-2 text-sm transition ${value === option ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 bg-white/[0.03] text-muted hover:text-ink"}`}>{option}</motion.button>)}</div></fieldset>;
}

function SelectField({ label, value, options, onChange, disabled }: { label: string; value: string; options: string[]; onChange?: (value: string) => void; disabled?: boolean }) {
  return <label className="block"><span className="text-sm font-medium">{label}</span><select disabled={disabled} value={value} onChange={(event) => onChange?.(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 text-sm outline-none focus:border-brand/70 disabled:cursor-not-allowed disabled:opacity-60">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
