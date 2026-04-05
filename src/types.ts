export interface GogResult {
  success: boolean;
  data?: unknown;
  error?: string;
  exitCode?: number;
  stderr?: string;
}

export type ToolResult =
  | { content: { type: "text"; text: string }[]; isError?: boolean }
  | { content: { type: "text"; text: string }[]; structuredContent: Record<string, unknown>; isError?: boolean };

export function toolOk(r: GogResult): ToolResult {
  if (!r.success) {
    return { content: [{ type: "text" as const, text: `Error: ${r.error}` }], isError: true };
  }
  const d = r.data;
  const sc = typeof d === "object" && d !== null && !Array.isArray(d)
    ? d as Record<string, unknown>
    : Array.isArray(d)
      ? { items: d } as Record<string, unknown>
      : { output: d } as Record<string, unknown>;
  return {
    content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }],
    structuredContent: sc,
  };
}
