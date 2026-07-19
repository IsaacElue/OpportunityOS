import "server-only";

import type {
  AppendMessageInput,
  CreateConversationInput,
  ScoutConversation,
  ScoutConversationMessage
} from "@/lib/scout/conversation/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** Create a persistent conversation for a trusted organization member. */
export async function createConversation({
  organization_id,
  user_id,
  title = "Scout conversation"
}: CreateConversationInput): Promise<ScoutConversation> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_conversations")
    .insert({ organization_id, user_id, title })
    .select("id,organization_id,user_id,title,created_at,updated_at")
    .single();
  if (error) throw new Error(`Unable to create Scout conversation: ${error.message}`);

  return data as ScoutConversation;
}

/** Append a user or Scout message through trusted server-side persistence. */
export async function appendMessage({
  conversation_id,
  role,
  content,
  metadata = {}
}: AppendMessageInput): Promise<ScoutConversationMessage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_messages")
    .insert({ conversation_id, role, content, metadata })
    .select("id,conversation_id,role,content,metadata,created_at")
    .single();
  if (error) throw new Error(`Unable to append Scout message: ${error.message}`);

  const { error: touchError } = await supabase
    .from("scout_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation_id);
  if (touchError) throw new Error(`Unable to update Scout conversation: ${touchError.message}`);

  return data as ScoutConversationMessage;
}
