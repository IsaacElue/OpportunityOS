export type ToolResult = {
  success: boolean;
  data?: unknown;
  message: string;
};

export type ScoutTool = {
  name: string;
  description: string;
  execute: (input: unknown) => Promise<ToolResult>;
};
