export type ScoutConversationRole = "user" | "assistant";

export type ScoutConversation = {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ScoutConversationMessage = {
  id: string;
  conversation_id: string;
  role: ScoutConversationRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreateConversationInput = {
  organization_id: string;
  user_id: string;
  title?: string;
};

export type AppendMessageInput = {
  conversation_id: string;
  role: ScoutConversationRole;
  content: string;
  metadata?: Record<string, unknown>;
};

export type GetConversationInput = {
  conversation_id: string;
  organization_id: string;
  user_id: string;
};

export type GetRecentMessagesInput = {
  conversation_id: string;
  limit?: number;
};

export type ListConversationsInput = {
  organization_id: string;
  user_id: string;
  limit?: number;
};
