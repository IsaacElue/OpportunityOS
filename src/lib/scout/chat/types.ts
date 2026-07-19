import type { ScoutBrainContext } from "@/lib/scout/brain/types";
import type { ScoutConversationMessage } from "@/lib/scout/conversation/types";

export type HandleScoutMessageInput = {
  context: ScoutBrainContext;
  message: string;
  recentMessages?: ScoutConversationMessage[];
};

export type HandleScoutMessageResult = {
  response: string;
  shouldResearch: boolean;
};
