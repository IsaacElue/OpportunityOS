import { ScanForm } from "@/components/scan-form";
import { createClient } from "@/lib/supabase/server";

export default async function ScanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).limit(1).single();
  const { data: preferences } = await supabase.from("founder_preferences").select("industries,buyer_types,geography").eq("organization_id", membership!.organization_id).single();
  return <><div className="mb-8"><p className="text-sm font-medium text-brand">Research workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Start from a problem space, not a prediction.</h1><p className="mt-3 max-w-2xl leading-7 text-muted">OpportunityOS will eventually assemble evidence-backed Founder Opportunity Reports. Begin by creating a specific, founder-relevant research brief.</p></div><ScanForm defaults={{ industry: preferences?.industries?.[0] ?? "Healthcare", buyerType: preferences?.buyer_types?.[0] ?? "Operations leader", geography: preferences?.geography ?? "US" }} /></>;
}
