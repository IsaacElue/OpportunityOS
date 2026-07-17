import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

/** Use only for trusted server-side pipeline work after request authorization. */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("OpportunityOS is missing SUPABASE_SERVICE_ROLE_KEY for server-side pipeline work.");

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
