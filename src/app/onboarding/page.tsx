import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/components/onboarding-form";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <main className="min-h-screen px-6 py-7"><div className="mx-auto max-w-2xl"><Brand /><div className="mt-14"><p className="text-sm font-medium text-brand">Set your research frame</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Give OpportunityOS a useful starting point.</h1><p className="mt-4 max-w-xl leading-7 text-muted">These are constraints, not predictions. You can refine every research brief later.</p><Card className="mt-8 p-6 sm:p-8"><OnboardingForm /></Card></div></div></main>;
}
