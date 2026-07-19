import "server-only";

import type {
  HandleScoutMessageInput,
  HandleScoutMessageResult
} from "@/lib/scout/chat/types";

const researchIntentPatterns = [
  /find opportunities/i,
  /\bresearch\b/i,
  /\bdiscover\b/i,
  /look for ideas/i,
  /look for opportunities/i,
  /analy[sz]e (?:the )?market/i
];

function scopeLabel({ context }: HandleScoutMessageInput) {
  const { industry, geography } = context.current_research.filters;
  return [industry, geography].filter(Boolean).join(" in ") || "this problem space";
}

/** Determine whether a founder's message should begin a queued Scout investigation. */
export function handleScoutMessage(input: HandleScoutMessageInput): HandleScoutMessageResult {
  const shouldResearch = researchIntentPatterns.some((pattern) => pattern.test(input.message));
  const scope = scopeLabel(input);
  const conversationPrefix = input.recentMessages?.length ? "Continuing our conversation, " : "";

  if (shouldResearch) {
    return {
      shouldResearch: true,
      response: `${conversationPrefix}I can investigate ${scope}. I will create a research brief and look for evidence-backed opportunities.`
    };
  }

  return {
    shouldResearch: false,
    response: `${conversationPrefix}I am Scout, your opportunity research teammate. Tell me what you want to explore in ${scope}, and I can investigate the market, evidence, and founder pain.`
  };
}
