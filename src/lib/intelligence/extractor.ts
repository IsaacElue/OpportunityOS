import "server-only";

import { z } from "zod";

import type { EvidenceItem } from "@/lib/ingestion/types";
import { formatEvidenceForExtraction, OPPORTUNITY_EXTRACTION_PROMPT } from "@/lib/intelligence/prompts";
import type { OpportunityExtraction } from "@/lib/intelligence/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-5-mini";

const extractionResponseSchema = z.object({
  found: z.boolean(),
  title: z.string(),
  problem: z.string(),
  persona: z.string(),
  industry: z.string(),
  description: z.string(),
  painScore: z.number().int().min(1).max(10)
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

export class OpportunityExtractionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OpportunityExtractionError";
  }
}

function responseText(payload: ResponsesApiPayload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }

  return undefined;
}

/**
 * Extracts one evidence-supported opportunity. A null result means the model
 * found that the evidence did not substantiate a specific opportunity.
 */
export async function extractOpportunity(evidence: EvidenceItem): Promise<OpportunityExtraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpportunityExtractionError("OpenAI extraction is not configured.");

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: OPPORTUNITY_EXTRACTION_PROMPT,
        input: formatEvidenceForExtraction(evidence),
        text: {
          format: {
            type: "json_schema",
            name: "opportunity_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                found: { type: "boolean" },
                title: { type: "string" },
                problem: { type: "string" },
                persona: { type: "string" },
                industry: { type: "string" },
                description: { type: "string" },
                painScore: { type: "integer", minimum: 1, maximum: 10 }
              },
              required: ["found", "title", "problem", "persona", "industry", "description", "painScore"],
              additionalProperties: false
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new OpportunityExtractionError(`OpenAI extraction failed with status ${response.status}.`);
    }

    const output = responseText(await response.json() as ResponsesApiPayload);
    if (!output) throw new OpportunityExtractionError("OpenAI extraction returned no structured output.");

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(output);
    } catch (cause) {
      throw new OpportunityExtractionError("OpenAI extraction returned invalid JSON.", { cause });
    }

    const parsed = extractionResponseSchema.safeParse(parsedOutput);
    if (!parsed.success) throw new OpportunityExtractionError("OpenAI extraction did not match the expected structure.");
    if (!parsed.data.found) return null;

    return {
      title: parsed.data.title,
      problem: parsed.data.problem,
      persona: parsed.data.persona,
      industry: parsed.data.industry,
      description: parsed.data.description,
      painScore: parsed.data.painScore
    };
  } catch (error) {
    if (error instanceof OpportunityExtractionError) throw error;
    throw new OpportunityExtractionError("OpenAI extraction could not be completed.", { cause: error });
  }
}
