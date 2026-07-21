"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Bot, Compass, Loader2, LogOut, type LucideIcon } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { authErrorMessage } from "@/lib/errors";

const navigation: Array<{ href: Route; label: string; icon: LucideIcon }> = [
  { href: "/app/scout" as Route, label: "Scout", icon: Bot },
  { href: "/app/reports" as Route, label: "Reports", icon: Compass },
  { href: "/app/saved", label: "Saved", icon: Bookmark }
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSignOutError(authErrorMessage(error.message));
      setSigningOut(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return <aside className="flex w-full flex-col border-b border-white/10 bg-[#0a0e14] px-5 py-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r md:px-4"><Brand href="/app" /><nav className="mt-6 flex gap-1 overflow-x-auto md:flex-col">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition", pathname.startsWith(href) ? "bg-white/[0.08] text-ink" : "text-muted hover:bg-white/[0.05] hover:text-ink")}><Icon className="size-4" />{label}</Link>)}</nav><div className="mt-6 hidden rounded-xl border border-brand/10 bg-brand/[0.04] p-3 text-xs leading-5 text-muted md:block"><p className="font-medium text-brand">Evidence standard</p><p className="mt-1">Reports cite their source signals and show uncertainty.</p></div><div className="mt-auto flex items-center justify-between gap-2 pt-5 text-xs text-muted md:block"><p className="truncate px-1">{email}</p>{signOutError && <p className="mt-2 px-1 text-xs text-red-300">{signOutError}</p>}<Button className="mt-2 w-full justify-start" variant="ghost" size="sm" onClick={signOut} disabled={signingOut}>{signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}Sign out</Button></div></aside>;
}
