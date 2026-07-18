import "server-only";

import type { SaveScoutMemoryInput, ScoutMemory } from "@/lib/scout/memory/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Save a trusted server-side memory for Scout. */
export async function saveScoutMemory(input: SaveScoutMemoryInput): Promise<ScoutMemory> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_memory")
    .insert({
      organization_id: input.organization_id,
      user_id: input.user_id,
      memory_type: input.memory_type,
      content: input.content,
      metadata: input.metadata ?? {}
    })
    .select("id,organization_id,user_id,memory_type,content,metadata,created_at,updated_at")
    .single();
  if (error) throw new Error(`Unable to save Scout memory: ${error.message}`);

  return data as ScoutMemory;
}
