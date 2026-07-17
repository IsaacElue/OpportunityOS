import Link from "next/link";
import { ArrowUpRight, Layers3, ShieldCheck, Sparkles } from "lucide-react";

import { Brand } from "@/components/brand";
import { LandingHero } from "@/components/landing-hero";

const principles = [
  ["Grounded", "Direct sources, dated evidence, and transparent gaps—never opaque recommendations.", ShieldCheck],
  ["Focused", "A concise Founder Opportunity Report, not another analytics dashboard.", Layers3],
  ["Actionable", "Every research output ends in the smallest credible validation experiment.", Sparkles]
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Brand /><nav className="flex items-center gap-4 text-sm"><a href="#how-it-works" className="hidden text-muted transition hover:text-ink sm:block">How it works</a><Link href="/auth" className="rounded-lg border border-white/10 px-3 py-2 text-ink transition hover:bg-white/[0.06]">Sign in</Link></nav></header>
      <LandingHero />
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-20"><div className="grid gap-4 border-t border-white/10 pt-10 md:grid-cols-3">{principles.map(([title, text, Icon]) => <article key={title as string} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><Icon className="size-5 text-brand" /><h2 className="mt-6 font-semibold">{title as string}</h2><p className="mt-2 text-sm leading-6 text-muted">{text as string}</p></article>)}</div><div className="mt-10 text-center"><Link href="/auth" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-[#c2ffda]">Build from evidence, not instinct <ArrowUpRight className="size-4" /></Link></div></section>
    </main>
  );
}
