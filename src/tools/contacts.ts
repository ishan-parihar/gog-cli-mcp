import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import type { GogMcpConfig } from "../config.js";
import { runGog, runGogDry } from "../gog.js";
import { toolOk } from "../types.js";

export function registerContactsTools(server: McpServer, config: GogMcpConfig) {
  server.tool("gog_contacts_search",
    "Search personal contacts by name, email, or phone",
    { query: z.string(), max: z.number().optional() },
    async ({ query, max }) => {
      const flags: Record<string, unknown> = {};
      if (max) flags.max = max;
      const r = await runGog(config, ["contacts", "search", query], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_contacts_list",
    "List all personal contacts",
    {},
    async () => {
      const r = await runGog(config, ["contacts", "list"]);
      return toolOk(r);
    },
  );

  server.tool("gog_contacts_get",
    "Get detailed info for a specific contact",
    { resourceName: z.string() },
    async ({ resourceName }) => {
      const r = await runGog(config, ["contacts", "get", resourceName]);
      return toolOk(r);
    },
  );

  server.tool("gog_contacts_create",
    "Create a new personal contact",
    {
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      organization: z.string().optional(),
      jobTitle: z.string().optional(),
      notes: z.string().optional(),
    },
    async ({ givenName, familyName, email, phone, organization, jobTitle, notes }) => {
      const flags: Record<string, unknown> = {};
      if (givenName) flags.givenName = givenName;
      if (familyName) flags.familyName = familyName;
      if (email) flags.email = email;
      if (phone) flags.phone = phone;
      if (organization) flags.organization = organization;
      if (jobTitle) flags.jobTitle = jobTitle;
      if (notes) flags.notes = notes;
      const r = await runGog(config, ["contacts", "create"], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_contacts_update",
    "Update an existing contact",
    {
      resourceName: z.string(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      organization: z.string().optional(),
      jobTitle: z.string().optional(),
      notes: z.string().optional(),
    },
    async ({ resourceName, givenName, familyName, email, phone, organization, jobTitle, notes }) => {
      const flags: Record<string, unknown> = {};
      if (givenName) flags.givenName = givenName;
      if (familyName) flags.familyName = familyName;
      if (email) flags.email = email;
      if (phone) flags.phone = phone;
      if (organization) flags.organization = organization;
      if (jobTitle) flags.jobTitle = jobTitle;
      if (notes) flags.notes = notes;
      const r = await runGog(config, ["contacts", "update", resourceName], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_contacts_delete",
    "Delete a contact (preview only — use confirm=true to execute)",
    { resourceName: z.string(), confirm: z.boolean().optional() },
    async ({ resourceName, confirm }) => {
      const r = confirm
        ? await runGog(config, ["contacts", "delete", resourceName])
        : await runGogDry(config, ["contacts", "delete", resourceName]);
      return toolOk(r);
    },
  );

  server.tool("gog_contacts_directory_search",
    "Search the Workspace directory (all org members)",
    { query: z.string() },
    async ({ query }) => {
      const r = await runGog(config, ["contacts", "directory", "search", query]);
      return toolOk(r);
    },
  );
}
