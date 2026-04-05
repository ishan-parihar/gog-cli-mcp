import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function matchGlob(pattern: string, name: string): boolean {
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___DOUBLESTAR___")
    .replace(/\*/g, "[^]*")
    .replace(/___DOUBLESTAR___/g, ".*");
  return new RegExp(`^${regexStr}$`).test(name);
}

function matchesAny(name: string, patterns: string[]): boolean {
  return patterns.some((p) => matchGlob(p, name));
}

export function createFilteredServer(
  serverInfo: { name: string; version: string },
  options: { capabilities?: Record<string, unknown> } = {},
  allowedTools: string[] | null = null,
): McpServer {
  const server = new McpServer(serverInfo, options);

  if (!allowedTools || allowedTools.length === 0) {
    return server;
  }

  const _originalTool = server.tool.bind(server);
  const _originalRegisterTool = server.registerTool.bind(server);

  (server as any).tool = (...args: any[]) => {
    const toolName = args[0] as string;
    if (!matchesAny(toolName, allowedTools)) return undefined as any;
    return (_originalTool as any)(...args);
  };

  (server as any).registerTool = (...args: any[]) => {
    const toolName = args[0] as string;
    if (!matchesAny(toolName, allowedTools)) return undefined as any;
    return (_originalRegisterTool as any)(...args);
  };

  return server;
}

export { matchesAny };
