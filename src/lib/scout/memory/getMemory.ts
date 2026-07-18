import "server-only";

import type { GetScoutMemoriesInput, ScoutMemory } from "@/lib/scout/memory/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Load an organization's newest Scout memories for trusted server-side use. */
export async function getScoutMemories({
  organization_id,
  memory_type
}: GetScoutMemoriesInput): Promise<ScoutMemory[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("scout_memory")
    .select("id,organization_id,user_id,memory_type,content,metadata,created_at,updated_at")
    .eq("organization_id", organization_id);
  if (memory_type) query = query.eq("memory_type", memory_type);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load Scout memories: ${error.message}`);

  return (data ?? []) as ScoutMemory[];
}
