import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");
  const { data: preferences } = await supabase.from("founder_preferences").select("onboarding_completed_at").eq("organization_id", membership.organization_id).maybeSingle();
  if (!preferences?.onboarding_completed_at) redirect("/onboarding");

  return <div className="min-h-screen bg-canvas md:flex"><AppNav email={user.email ?? "Account"} /><main className="min-w-0 flex-1"><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">{children}</div></main></div>;
}
