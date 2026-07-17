import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/app");
  const { next, error } = await searchParams as { next?: string; error?: string };
  const nextPath = safeNextPath(next, "/app");
  const initialMessage = error === "confirmation_failed"
    ? "That confirmation link is invalid or has expired. Request a new one and try again."
    : error === "missing_code"
      ? "The confirmation link was incomplete. Request a new one and try again."
      : undefined;

  return <main className="grid min-h-screen place-items-center px-6 py-10"><div className="w-full max-w-md"><Brand /><Card className="mt-8 p-6 sm:p-8"><p className="text-sm font-medium text-brand">Founder research, grounded in evidence</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome to OpportunityOS</h1><p className="mt-3 text-sm leading-6 text-muted">Start with a narrow research brief. We’ll help you turn evidence into a validation-ready opportunity report.</p><div className="mt-7"><AuthForm nextPath={nextPath} initialMessage={initialMessage} /></div></Card><p className="mt-5 text-center text-xs text-muted">By continuing, you agree to use reports as research hypotheses—not investment or business advice. <Link className="underline hover:text-ink" href="/">Back home</Link></p></div></main>;
}
