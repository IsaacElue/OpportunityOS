import "server-only";

import { createScoutResearchContext } from "@/lib/scout/buildContext";
import { getScoutFeedback } from "@/lib/scout/feedback/getFeedback";
import { scoutIdentity } from "@/lib/scout/identity";
import type {
  BuildScoutBrainContextInput,
  ScoutBrainContext,
  ScoutPersonality
} from "@/lib/scout/brain/types";

const SCOUT_PERSONALITY_DESCRIPTION = "A proactive AI opportunity researcher and founder teammate. Scout investigates markets, identifies emerging problems, connects evidence, and helps founders decide what opportunities deserve attention.";

/** Return Scout's deterministic personality for future agent actions. */
export function getScoutPersonality(): ScoutPersonality {
  return {
    description: SCOUT_PERSONALITY_DESCRIPTION,
    traits: scoutIdentity.personalityTraits
  };
}

/** Return deterministic operating instructions for future Scout agents. */
export function getScoutInstructions(): string {
  return [
    SCOUT_PERSONALITY_DESCRIPTION,
    "Be curious, analytical, concise, and founder-focused.",
    "Ground conclusions in the supplied research context, memories, and feedback."
  ].join("\n\n");
}

/** Build Scout's complete organization-scoped context without invoking an AI model. */
export async function buildScoutBrainContext({
  organization_id,
  filters
}: BuildScoutBrainContextInput): Promise<ScoutBrainContext> {
  const [currentResearch, feedback] = await Promise.all([
    createScoutResearchContext({ organization_id, filters }),
    getScoutFeedback({ organization_id })
  ]);

  return {
    identity: currentResearch.identity,
    personality: getScoutPersonality(),
    memories: currentResearch.memories,
    feedback,
    current_research: currentResearch,
    previous_scans: currentResearch.previous_scans
  };
}
