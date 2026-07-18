import type { ScoutEvent, ScoutMessage, ScoutMessageVariables } from "@/lib/scout/types";

function location(variables: ScoutMessageVariables) {
  return [variables.industry, variables.geography].filter(Boolean).join(" in ");
}

function message(event: ScoutEvent, content: string, variables: ScoutMessageVariables): ScoutMessage {
  return { event, content, variables };
}

export function scanStarted(variables: ScoutMessageVariables): ScoutMessage {
  const scope = location(variables);
  return message(
    "scan_started",
    scope ? `I’m investigating ${scope}. I’ll look for real founder pain and repeat signals.` : "I’m investigating this problem space for real founder pain and repeat signals.",
    variables
  );
}

export function evidenceFound(variables: ScoutMessageVariables): ScoutMessage {
  const count = variables.evidenceCount ?? 0;
  return message(
    "evidence_found",
    `I found ${count} ${count === 1 ? "signal" : "signals"} worth reading more closely.`,
    variables
  );
}

export function analyzingPatterns(variables: ScoutMessageVariables): ScoutMessage {
  return message(
    "analyzing_patterns",
    "I’m comparing the conversations to identify repeated problems, not isolated complaints.",
    variables
  );
}

export function opportunityFound(variables: ScoutMessageVariables): ScoutMessage {
  const title = variables.opportunityTitle?.trim();
  return message(
    "opportunity_found",
    title ? `I found a promising opportunity: ${title}.` : "I found a promising opportunity worth exploring.",
    variables
  );
}

export function scanCompleted(variables: ScoutMessageVariables): ScoutMessage {
  const count = variables.opportunityCount ?? 0;
  return message(
    "scan_completed",
    `Investigation complete. I found ${count} evidence-backed ${count === 1 ? "opportunity" : "opportunities"} worth exploring.`,
    variables
  );
}

export function scanFailed(variables: ScoutMessageVariables): ScoutMessage {
  return message(
    "scan_failed",
    "I encountered an issue during the investigation. Your research brief is still saved and ready to retry.",
    variables
  );
}
