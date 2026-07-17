"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import { gsap } from "gsap";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo("[data-hero-copy]", { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.75, ease: "power3.out" });
      gsap.fromTo("[data-hero-card]", { y: 28, opacity: 0, rotateX: -4 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.9, delay: 0.25, ease: "power3.out" });
    }, heroRef);
    return () => context.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
      <div className="page-grid pointer-events-none absolute inset-x-0 top-0 h-[580px]" />
      <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <p data-hero-copy className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand"><span className="size-1.5 rounded-full bg-brand" />Evidence-backed founder research</p>
          <h1 data-hero-copy className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-ink sm:text-6xl">Find the problem worth validating next.</h1>
          <p data-hero-copy className="mt-6 max-w-xl text-lg leading-8 text-muted">OpportunityOS turns scattered founder signals into concise, source-linked opportunity reports for early-stage B2B SaaS founders.</p>
          <div data-hero-copy className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className={cn(buttonVariants({ size: "lg" }))}>Start researching <ArrowRight className="size-4" /></Link>
            <a href="#how-it-works" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>How it works</a>
          </div>
          <p data-hero-copy className="mt-5 text-sm text-muted">Not predictions. Evidence, uncertainty, and a clear next experiment.</p>
        </div>
        <div data-hero-card className="perspective-[900px] rounded-3xl border border-white/10 bg-[#0e141d]/95 p-3 shadow-[0_32px_120px_rgb(0_0_0/55%)]">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2 text-sm text-muted"><Search className="size-4" />Founder Opportunity Report</div><span className="rounded-full bg-amber-200/10 px-2.5 py-1 text-xs font-medium text-amber-200">Medium confidence</span></div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight">AI intake workflow for independent dental practices</h2>
            <div className="mt-5 space-y-4 text-sm leading-6"><ReportLine label="Problem" text="Manual intake and compliance paperwork is costly, repetitive, and error-prone." /><ReportLine label="Evidence" text="6 source-linked signals across founder and developer communities." /><ReportLine label="Next validation" text="Interview 10 practice managers; validate time lost per new patient." /></div>
            <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-muted"><CheckCircle2 className="size-4 text-brand" />Every claim is linked to its evidence.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportLine({ label, text }: { label: string; text: string }) {
  return <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-brand">{label}</p><p className="text-muted">{text}</p></div>;
}
