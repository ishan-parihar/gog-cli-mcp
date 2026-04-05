import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import type { GogMcpConfig } from "../config.js";
import { runGog, runGogDry } from "../gog.js";
import { toolOk } from "../types.js";

export function registerGmailTools(server: McpServer, config: GogMcpConfig) {
  server.tool("gog_gmail_search",
    "Search email threads using Gmail query syntax",
    {
      query: z.string().describe("Gmail query (e.g. 'from:john subject:report newer:7d')"),
      max: z.number().optional(),
    },
    async ({ query, max }) => {
      const flags: Record<string, unknown> = {};
      if (max) flags.max = max;
      const r = await runGog(config, ["gmail", "search", query], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_get_message",
    "Get a specific email message",
    {
      messageId: z.string(),
      mode: z.enum(["full", "metadata", "raw"]).optional().default("metadata"),
    },
    async ({ messageId, mode }) => {
      const r = await runGog(config, ["gmail", "get", messageId], { mode });
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_get_thread",
    "Get a full email thread",
    { threadId: z.string() },
    async ({ threadId }) => {
      const r = await runGog(config, ["gmail", "thread", "get", threadId]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_download_attachment",
    "Download an email attachment",
    { messageId: z.string(), attachmentId: z.string(), outputPath: z.string().optional() },
    async ({ messageId, attachmentId, outputPath }) => {
      const flags: Record<string, unknown> = {};
      if (outputPath) flags.out = outputPath;
      const r = await runGog(config, ["gmail", "attachment", messageId, attachmentId], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_get_urls",
    "Get Gmail web URLs for threads",
    { threadIds: z.array(z.string()) },
    async ({ threadIds }) => {
      const r = await runGog(config, ["gmail", "url", ...threadIds]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_send",
    "Compose an email. Creates a draft by default for review. Set draft=false to send immediately.",
    {
      to: z.string(),
      cc: z.string().optional(),
      bcc: z.string().optional(),
      subject: z.string(),
      body: z.string().optional(),
      htmlBody: z.string().optional(),
      draft: z.boolean().optional().default(true).describe("If true, creates draft. If false, sends immediately."),
    },
    async ({ to, cc, bcc, subject, body, htmlBody, draft }) => {
      if (draft || config.gmailDraftOnly) {
        if (!draft && config.gmailDraftOnly) {
          const flags: Record<string, unknown> = { to, subject };
          if (cc) flags.cc = cc;
          if (bcc) flags.bcc = bcc;
          if (body) flags.body = body;
          if (htmlBody) flags.html = true;
          const r = await runGogDry(config, ["gmail", "send"], { ...flags, to: undefined });
          return {
            content: [{ type: "text" as const, text: `Direct sending disabled: ${r.error || "gmailDraftOnly=true"}. Set draft=false to send immediately, or update config to allow direct sends.` }],
            isError: true,
          };
        }
        const flags: Record<string, unknown> = { to, subject };
        if (cc) flags.cc = cc;
        if (bcc) flags.bcc = bcc;
        if (body) flags.body = body;
        if (htmlBody) {
          flags.html = true;
          flags.body = htmlBody;
        }
        const r = await runGog(config, ["gmail", "drafts", "create"], flags);
        return toolOk(r);
      }

      const flags: Record<string, unknown> = { to, subject };
      if (cc) flags.cc = cc;
      if (bcc) flags.bcc = bcc;
      if (htmlBody) { flags.body = htmlBody; flags.html = true; }
      else if (body) flags.body = body;
      const r = await runGog(config, ["gmail", "send"], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_list_drafts",
    "List email drafts",
    { maxResults: z.number().optional() },
    async ({ maxResults }) => {
      const flags: Record<string, unknown> = {};
      if (maxResults) flags.maxResults = maxResults;
      const r = await runGog(config, ["gmail", "drafts", "list"], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_get_draft",
    "Get a specific draft",
    { draftId: z.string() },
    async ({ draftId }) => {
      const r = await runGog(config, ["gmail", "drafts", "get", draftId]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_send_draft",
    "Send an existing draft",
    { draftId: z.string() },
    async ({ draftId }) => {
      const r = await runGog(config, ["gmail", "drafts", "send", draftId]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_delete_draft",
    "Delete a draft",
    { draftId: z.string() },
    async ({ draftId }) => {
      const r = await runGog(config, ["gmail", "drafts", "delete", draftId]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_archive",
    "Archive emails (remove from inbox)",
    { messageIds: z.array(z.string()) },
    async ({ messageIds }) => {
      const r = await runGog(config, ["gmail", "archive", ...messageIds]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_mark_read",
    "Mark emails as read",
    { messageIds: z.array(z.string()) },
    async ({ messageIds }) => {
      const r = await runGog(config, ["gmail", "mark-read", ...messageIds]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_mark_unread",
    "Mark emails as unread",
    { messageIds: z.array(z.string()) },
    async ({ messageIds }) => {
      const r = await runGog(config, ["gmail", "unread", ...messageIds]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_trash",
    "Move emails to trash",
    { messageIds: z.array(z.string()) },
    async ({ messageIds }) => {
      const r = await runGog(config, ["gmail", "trash", ...messageIds]);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_modify_thread",
    "Add or remove labels from a thread",
    {
      threadId: z.string(),
      addLabels: z.array(z.string()).optional(),
      removeLabels: z.array(z.string()).optional(),
    },
    async ({ threadId, addLabels, removeLabels }) => {
      const flags: Record<string, unknown> = {};
      if (addLabels?.length) flags.addLabels = addLabels.join(",");
      if (removeLabels?.length) flags.removeLabels = removeLabels.join(",");
      const r = await runGog(config, ["gmail", "thread", "modify", threadId], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_gmail_list_labels",
    "List all Gmail labels",
    {},
    async () => {
      const r = await runGog(config, ["gmail", "labels", "list"]);
      return toolOk(r);
    },
  );
}
