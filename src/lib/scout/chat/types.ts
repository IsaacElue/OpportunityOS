import type { ScoutBrainContext } from "@/lib/scout/brain/types";

export type HandleScoutMessageInput = {
  context: ScoutBrainContext;
  message: string;
};

export type HandleScoutMessageResult = {
  response: string;
  shouldResearch: boolean;
};
