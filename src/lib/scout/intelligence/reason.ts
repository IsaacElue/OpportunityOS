import "server-only";

import { z } from "zod";

import { formatScoutReasoningInput, SCOUT_REASONING_SYSTEM_PROMPT } from "@/lib/scout/intelligence/prompts";
import type { ReasonWithScoutInput, ScoutDecision } from "@/lib/scout/intelligence/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-5-mini";

const decisionSchema = z.object({
  action: z.enum([
    "research_market",
    "find_evidence",
    "analyze_problem",
    "compare_opportunities",
    "request_feedback",
    "summarize_findings"
  ]),
  reasoning: z.string().min(1),
  confidence: z.number().int().min(0).max(100),
  tool_needed: z.boolean(),
  suggested_tool: z.string().min(1).nullable()
});

type ResponsesApiPayload = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
};

function responseText(payload: ResponsesApiPayload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }

  return undefined;
}

function fallbackDecision({ context, goal }: ReasonWithScoutInput): ScoutDecision {
  const scope = [context.current_research.filters.industry, context.current_research.filters.geography]
    .filter(Boolean)
    .join(" in ") || "the current research brief";

  return {
    action: "research_market",
    reasoning: `Scout will begin by researching ${scope} because it could not complete an LLM decision for the goal: ${goal.trim() || "the current research goal"}.`,
    confidence: 0,
    tool_needed: false
  };
}

/** Use structured OpenAI reasoning for Scout, falling back safely when unavailable. */
export async function reasonWithScout(input: ReasonWithScoutInput): Promise<ScoutDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackDecision(input);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: SCOUT_REASONING_SYSTEM_PROMPT,
        input: formatScoutReasoningInput(input),
        text: {
          format: {
            type: "json_schema",
            name: "scout_decision",
            strict: true,
            schema: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: [
                    "research_market",
                    "find_evidence",
                    "analyze_problem",
                    "compare_opportunities",
                    "request_feedback",
                    "summarize_findings"
                  ]
                },
                reasoning: { type: "string" },
                confidence: { type: "integer", minimum: 0, maximum: 100 },
                tool_needed: { type: "boolean" },
                suggested_tool: { type: ["string", "null"] }
              },
              required: ["action", "reasoning", "confidence", "tool_needed", "suggested_tool"],
              additionalProperties: false
            }
          }
        }
      })
    });
    if (!response.ok) return fallbackDecision(input);

    const output = responseText(await response.json() as ResponsesApiPayload);
    if (!output) return fallbackDecision(input);

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(output);
    } catch {
      return fallbackDecision(input);
    }

    const parsed = decisionSchema.safeParse(parsedOutput);
    if (!parsed.success) return fallbackDecision(input);

    return {
      action: parsed.data.action,
      reasoning: parsed.data.reasoning,
      confidence: parsed.data.confidence,
      tool_needed: parsed.data.tool_needed,
      ...(parsed.data.tool_needed && parsed.data.suggested_tool
        ? { suggested_tool: parsed.data.suggested_tool }
        : {})
    };
  } catch {
    return fallbackDecision(input);
  }
}
