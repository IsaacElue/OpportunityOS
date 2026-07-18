import { ScoutChat } from "@/components/scout-chat";
import { createClient } from "@/lib/supabase/server";

export default async function ScanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).limit(1).single();
  const { data: preferences } = await supabase.from("founder_preferences").select("industries,buyer_types,geography").eq("organization_id", membership!.organization_id).single();
  return <><div className="mb-8"><p className="text-sm font-medium text-brand">Scout / Research teammate</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Assign Scout an investigation.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Give Scout a founder problem to explore and it will return with evidence-backed opportunities.</p></div><ScoutChat defaults={{ industry: preferences?.industries?.[0] ?? "Healthcare", buyerType: preferences?.buyer_types?.[0] ?? "Operations leader", geography: preferences?.geography ?? "US" }} /></>;
}
