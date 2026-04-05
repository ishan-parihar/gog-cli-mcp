import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import type { GogMcpConfig } from "../config.js";
import { runGog } from "../gog.js";
import { toolOk } from "../types.js";

export function registerDriveTools(server: McpServer, config: GogMcpConfig) {
  server.tool("gog_drive_list",
    "List files in a Drive folder (defaults to root)",
    { folderId: z.string().optional(), max: z.number().optional(), page: z.string().optional() },
    async ({ folderId, max, page }) => {
      const cmd = ["drive", "ls"];
      const flags: Record<string, unknown> = {};
      if (folderId) flags.parent = folderId;
      if (max) flags.max = max;
      if (page) flags.page = page;
      const r = await runGog(config, cmd, flags);
      return toolOk(r);
    },
  );

  server.tool("gog_drive_search",
    "Search Drive files by name or content",
    { query: z.string(), max: z.number().optional() },
    async ({ query, max }) => {
      const flags: Record<string, unknown> = {};
      if (max) flags.max = max;
      const r = await runGog(config, ["drive", "search", query], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_drive_get",
    "Get file metadata",
    { fileId: z.string() },
    async ({ fileId }) => {
      const r = await runGog(config, ["drive", "get", fileId]);
      return toolOk(r);
    },
  );

  server.tool("gog_drive_get_urls",
    "Get web URLs for Drive files",
    { fileIds: z.array(z.string()) },
    async ({ fileIds }) => {
      const r = await runGog(config, ["drive", "url", ...fileIds]);
      return toolOk(r);
    },
  );

  server.tool("gog_drive_download",
    "Download a Drive file to local filesystem",
    { fileId: z.string(), outputPath: z.string().optional(), mimeType: z.string().optional() },
    async ({ fileId, outputPath, mimeType }) => {
      const flags: Record<string, unknown> = {};
      if (outputPath) flags.out = outputPath;
      if (mimeType) flags.mimeType = mimeType;
      const r = await runGog(config, ["drive", "download", fileId], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_drive_permissions",
    "List sharing permissions on a file",
    { fileId: z.string() },
    async ({ fileId }) => {
      const r = await runGog(config, ["drive", "permissions", fileId]);
      return toolOk(r);
    },
  );

  server.tool("gog_drive_shared_drives",
    "List shared drives (Team Drives)",
    {},
    async () => {
      const r = await runGog(config, ["drive", "drives"]);
      return toolOk(r);
    },
  );
}
