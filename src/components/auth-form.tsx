"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, safeNextPath } from "@/lib/errors";

export function AuthForm({ nextPath, initialMessage }: { nextPath: string; initialMessage?: string }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const supabase = createClient();
      if (mode === "sign-up") {
        const displayName = String(form.get("displayName") ?? "").trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`, data: { display_name: displayName } }
        });
        if (error) setMessage(authErrorMessage(error.message));
        else if (data.session) window.location.assign("/onboarding");
        else setMessage("Check your email to confirm your account, then return here to continue.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(authErrorMessage(error.message));
        else window.location.assign(safeNextPath(nextPath, "/app"));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "sign-up" && <label className="block space-y-2 text-sm text-muted"><span>Name</span><Input name="displayName" required autoComplete="name" placeholder="Ada Lovelace" /></label>}
      <label className="block space-y-2 text-sm text-muted"><span>Work email</span><Input name="email" required type="email" autoComplete="email" placeholder="you@company.com" /></label>
      <label className="block space-y-2 text-sm text-muted"><span>Password</span><Input name="password" required minLength={8} type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} placeholder="At least 8 characters" /></label>
      {message && <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-muted" role="status">{message}</p>}
      <Button className="w-full" size="lg" type="submit" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />}{mode === "sign-in" ? "Sign in" : "Create account"}</Button>
      <p className="text-center text-sm text-muted">{mode === "sign-in" ? "New to OpportunityOS?" : "Already have an account?"} <button type="button" className="font-medium text-brand hover:text-[#c2ffda]" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(null); }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>
    </form>
  );
}
