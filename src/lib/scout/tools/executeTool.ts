import "server-only";

import { getScoutTool } from "@/lib/scout/tools/registry";
import type { ToolResult } from "@/lib/scout/tools/types";

/** Run a registered Scout tool while keeping unknown or failed tools safe. */
export async function executeScoutTool(toolName: string, input: unknown): Promise<ToolResult> {
  const tool = getScoutTool(toolName);
  if (!tool) {
    return {
      success: false,
      message: `Scout tool "${toolName}" is not available.`
    };
  }

  try {
    return await tool.execute(input);
  } catch {
    return {
      success: false,
      message: `Scout tool "${toolName}" could not be completed.`
    };
  }
}
