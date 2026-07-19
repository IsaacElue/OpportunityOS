import "server-only";

import type {
  GetConversationInput,
  GetRecentMessagesInput,
  ListConversationsInput,
  ScoutConversation,
  ScoutConversationMessage
} from "@/lib/scout/conversation/types";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_RECENT_MESSAGES = 15;

/** Load one conversation only when it belongs to the requesting organization and user. */
export async function getConversation({
  conversation_id,
  organization_id,
  user_id
}: GetConversationInput): Promise<ScoutConversation | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_conversations")
    .select("id,organization_id,user_id,title,created_at,updated_at")
    .eq("id", conversation_id)
    .eq("organization_id", organization_id)
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load Scout conversation: ${error.message}`);

  return data as ScoutConversation | null;
}

/** Load at most fifteen recent messages, oldest-first for prompt-friendly conversation order. */
export async function getRecentMessages({
  conversation_id,
  limit = MAX_RECENT_MESSAGES
}: GetRecentMessagesInput): Promise<ScoutConversationMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_messages")
    .select("id,conversation_id,role,content,metadata,created_at")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), MAX_RECENT_MESSAGES));
  if (error) throw new Error(`Unable to load recent Scout messages: ${error.message}`);

  return ((data ?? []) as ScoutConversationMessage[]).reverse();
}

/** List a member's most recently active Scout conversations. */
export async function listConversations({
  organization_id,
  user_id,
  limit = 20
}: ListConversationsInput): Promise<ScoutConversation[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scout_conversations")
    .select("id,organization_id,user_id,title,created_at,updated_at")
    .eq("organization_id", organization_id)
    .eq("user_id", user_id)
    .order("updated_at", { ascending: false })
    .limit(Math.max(limit, 1));
  if (error) throw new Error(`Unable to list Scout conversations: ${error.message}`);

  return (data ?? []) as ScoutConversation[];
}
