import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import type { GogMcpConfig } from "../config.js";
import { runGog } from "../gog.js";
import { toolOk } from "../types.js";

export function registerFormsTools(server: McpServer, config: GogMcpConfig) {
  server.tool("gog_forms_get",
    "Get a Google Form's structure and questions",
    { formId: z.string() },
    async ({ formId }) => {
      const r = await runGog(config, ["forms", "get", formId]);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_create",
    "Create a new Google Form",
    { title: z.string(), description: z.string().optional() },
    async ({ title, description }) => {
      const flags: Record<string, unknown> = { title };
      if (description) flags.description = description;
      const r = await runGog(config, ["forms", "create"], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_update",
    "Update a form's title or description",
    { formId: z.string(), title: z.string().optional(), description: z.string().optional() },
    async ({ formId, title, description }) => {
      const flags: Record<string, unknown> = {};
      if (title) flags.title = title;
      if (description) flags.description = description;
      const r = await runGog(config, ["forms", "update", formId], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_add_question",
    "Add a question to a form",
    {
      formId: z.string(),
      title: z.string(),
      type: z.enum(["text", "paragraph", "multiple_choice", "checkbox", "dropdown", "linear_scale", "date", "time", "email"]),
      options: z.array(z.string()).optional().describe("Choices for multiple choice / checkbox / dropdown"),
      required: z.boolean().optional(),
    },
    async ({ formId, title, type, options, required }) => {
      const flags: Record<string, unknown> = { title, type };
      if (options?.length) flags.options = options.join(",");
      if (required) flags.required = true;
      const r = await runGog(config, ["forms", "add-question", formId], flags);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_delete_question",
    "Delete a question from a form by index",
    { formId: z.string(), questionIndex: z.number() },
    async ({ formId, questionIndex }) => {
      const r = await runGog(config, ["forms", "delete-question", formId, String(questionIndex)]);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_move_question",
    "Move a question to a different position",
    { formId: z.string(), oldIndex: z.number(), newIndex: z.number() },
    async ({ formId, oldIndex, newIndex }) => {
      const r = await runGog(config, ["forms", "move-question", formId, String(oldIndex), String(newIndex)]);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_list_responses",
    "List all responses to a form",
    { formId: z.string() },
    async ({ formId }) => {
      const r = await runGog(config, ["forms", "responses", "list", formId]);
      return toolOk(r);
    },
  );

  server.tool("gog_forms_get_response",
    "Get a specific form response",
    { formId: z.string(), responseId: z.string() },
    async ({ formId, responseId }) => {
      const r = await runGog(config, ["forms", "responses", "get", formId, responseId]);
      return toolOk(r);
    },
  );
}
