import "server-only";

import { z } from "zod";

import { formatReportGenerationInput, FOUNDER_OPPORTUNITY_REPORT_PROMPT } from "@/lib/reports/prompts";
import type { FounderOpportunityReport, FounderOpportunityReportInput } from "@/lib/reports/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-5-mini";

const reportResponseSchema = z.object({
  sufficientEvidence: z.boolean(),
  problem: z.string(),
  evidence_summary: z.string(),
  buyer_profile: z.string(),
  existing_workarounds: z.string(),
  ai_advantage: z.string(),
  mvp_suggestion: z.string(),
  validation_experiment: z.string(),
  confidence_score: z.number().int().min(0).max(100)
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

export class FounderOpportunityReportGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FounderOpportunityReportGenerationError";
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

function hasUsableEvidence(input: FounderOpportunityReportInput) {
  return input.evidence.some((evidence) => evidence.content.trim().length > 0);
}

function hasCompleteReport(report: FounderOpportunityReport) {
  return Object.entries(report)
    .filter(([key]) => key !== "confidence_score")
    .every(([, value]) => typeof value === "string" && value.trim().length > 0)
    && report.confidence_score > 0;
}

/**
 * Generates a founder report from one opportunity and its linked evidence.
 * A null result means the available evidence cannot substantiate a report.
 */
export async function generateFounderOpportunityReport(
  input: FounderOpportunityReportInput
): Promise<FounderOpportunityReport | null> {
  if (!hasUsableEvidence(input)) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new FounderOpportunityReportGenerationError("OpenAI report generation is not configured.");

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: FOUNDER_OPPORTUNITY_REPORT_PROMPT,
        input: formatReportGenerationInput(input),
        text: {
          format: {
            type: "json_schema",
            name: "founder_opportunity_report",
            strict: true,
            schema: {
              type: "object",
              properties: {
                sufficientEvidence: { type: "boolean" },
                problem: { type: "string" },
                evidence_summary: { type: "string" },
                buyer_profile: { type: "string" },
                existing_workarounds: { type: "string" },
                ai_advantage: { type: "string" },
                mvp_suggestion: { type: "string" },
                validation_experiment: { type: "string" },
                confidence_score: { type: "integer", minimum: 0, maximum: 100 }
              },
              required: [
                "sufficientEvidence",
                "problem",
                "evidence_summary",
                "buyer_profile",
                "existing_workarounds",
                "ai_advantage",
                "mvp_suggestion",
                "validation_experiment",
                "confidence_score"
              ],
              additionalProperties: false
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new FounderOpportunityReportGenerationError(
        `OpenAI report generation failed with status ${response.status}.`
      );
    }

    const output = responseText(await response.json() as ResponsesApiPayload);
    if (!output) throw new FounderOpportunityReportGenerationError("OpenAI report generation returned no structured output.");

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(output);
    } catch (cause) {
      throw new FounderOpportunityReportGenerationError("OpenAI report generation returned invalid JSON.", { cause });
    }

    const parsed = reportResponseSchema.safeParse(parsedOutput);
    if (!parsed.success) {
      throw new FounderOpportunityReportGenerationError("OpenAI report generation did not match the expected structure.");
    }
    if (!parsed.data.sufficientEvidence) return null;

    const report: FounderOpportunityReport = {
      problem: parsed.data.problem,
      evidence_summary: parsed.data.evidence_summary,
      buyer_profile: parsed.data.buyer_profile,
      existing_workarounds: parsed.data.existing_workarounds,
      ai_advantage: parsed.data.ai_advantage,
      mvp_suggestion: parsed.data.mvp_suggestion,
      validation_experiment: parsed.data.validation_experiment,
      confidence_score: parsed.data.confidence_score
    };

    if (!hasCompleteReport(report)) return null;
    return report;
  } catch (error) {
    if (error instanceof FounderOpportunityReportGenerationError) throw error;
    throw new FounderOpportunityReportGenerationError("OpenAI report generation could not be completed.", { cause: error });
  }
}
