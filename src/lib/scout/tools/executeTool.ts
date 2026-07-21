import "server-only";

import { getScoutTool } from "@/lib/scout/tools/registry";
import type { ToolResult } from "@/lib/scout/tools/types";

type ScoutLogContext = {
  organization_id: string | null;
  objective_id: string | null;
  execution_id: string | null;
};

function boundedIdentifier(value: unknown): string | null {
  return typeof value === "string" && value ? value.slice(0, 128) : null;
}

function logContextFrom(input: unknown): ScoutLogContext {
  const context = input && typeof input === "object"
    ? (input as { scout_log_context?: Record<string, unknown> }).scout_log_context
    : undefined;

  return {
    organization_id: boundedIdentifier(context?.organization_id),
    objective_id: boundedIdentifier(context?.objective_id),
    execution_id: boundedIdentifier(context?.execution_id)
  };
}

/** Run a registered Scout tool while keeping unknown or failed tools safe. */
export async function executeScoutTool(toolName: string, input: unknown): Promise<ToolResult> {
  const startedAt = Date.now();
  const logContext = logContextFrom(input);
  const tool_name = toolName.slice(0, 80);
  console.info("Scout tool execution started", {
    ...logContext,
    tool_name,
    duration_ms: 0,
    status: "running"
  });

  const tool = getScoutTool(toolName);
  if (!tool) {
    console.error("Scout tool execution failed", {
      ...logContext,
      tool_name,
      duration_ms: Date.now() - startedAt,
      status: "failed",
      error: "Requested tool is unavailable."
    });
    return {
      success: false,
      message: `Scout tool "${toolName}" is not available.`
    };
  }

  try {
    const result = await tool.execute(input);
    const log = result.success ? console.info : console.error;
    log(result.success ? "Scout tool execution completed" : "Scout tool execution failed", {
      ...logContext,
      tool_name,
      duration_ms: Date.now() - startedAt,
      status: result.success ? "completed" : "failed",
      ...(result.success ? {} : { error: "Tool returned an unsuccessful result." })
    });
    return result;
  } catch {
    console.error("Scout tool execution failed", {
      ...logContext,
      tool_name,
      duration_ms: Date.now() - startedAt,
      status: "failed",
      error: "Tool execution failed."
    });
    return {
      success: false,
      message: `Scout tool "${toolName}" could not be completed.`
    };
  }
}
