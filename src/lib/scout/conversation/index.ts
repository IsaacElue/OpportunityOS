export { appendMessage, createConversation } from "@/lib/scout/conversation/conversation";
export {
  getConversation,
  getRecentMessages,
  listConversations
} from "@/lib/scout/conversation/history";
export type {
  AppendMessageInput,
  CreateConversationInput,
  GetConversationInput,
  GetRecentMessagesInput,
  ListConversationsInput,
  ScoutConversation,
  ScoutConversationMessage,
  ScoutConversationRole
} from "@/lib/scout/conversation/types";
