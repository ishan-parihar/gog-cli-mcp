import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";
import type { GogMcpConfig } from "../config.js";
import { runGog, runGogDry } from "../gog.js";
import { toolOk } from "../types.js";

export function registerCalendarTools(server: McpServer, config: GogMcpConfig) {
  server.registerTool("gog_calendar_calendars", {
    title: "List Calendars",
    description: "List all Google Calendars",
  }, async () => toolOk(await runGog(config, ["cal", "calendars"])));

  server.registerTool("gog_calendar_events", {
    title: "List Events",
    description: "List events from calendars. calendarId is positional (default: primary). from/to accept RFC3339, date, or relative (today, tomorrow, monday). max limits results.",
    inputSchema: {
      calendarId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      max: z.number().optional(),
      query: z.string().optional(),
    },
  }, async ({ calendarId, from, to, max, query }) => {
    const cmd = ["cal", "events"];
    if (calendarId) cmd.push(calendarId);
    const flags: Record<string, unknown> = {};
    if (from) flags.from = from;
    if (to) flags.to = to;
    if (max) flags.max = max;
    if (query) flags.query = query;
    return toolOk(await runGog(config, cmd, flags));
  });

  server.registerTool("gog_calendar_get_event", {
    title: "Get Event",
    description: "Get a single calendar event",
    inputSchema: { calendarId: z.string(), eventId: z.string() },
  }, async ({ calendarId, eventId }) =>
    toolOk(await runGog(config, ["cal", "event", calendarId, eventId])));

  server.registerTool("gog_calendar_create_event", {
    title: "Create Event",
    description: "Create a calendar event",
    inputSchema: {
      calendarId: z.string(),
      title: z.string(),
      from: z.string(),
      to: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      attendees: z.string().optional(),
      allDay: z.boolean().optional(),
    },
  }, async ({ calendarId, title, from, to, description, location, attendees, allDay }) => {
    const flags: Record<string, string | number | boolean> = { title, from, to };
    if (description) flags.description = description;
    if (location) flags.location = location;
    if (attendees) flags.attendees = attendees;
    if (allDay) flags.allDay = true;
    return toolOk(await runGog(config, ["cal", "create", calendarId], flags));
  });

  server.registerTool("gog_calendar_update_event", {
    title: "Update Event",
    description: "Update a calendar event",
    inputSchema: {
      calendarId: z.string(),
      eventId: z.string(),
      title: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
    },
  }, async ({ calendarId, eventId, title, from, to, description, location }) => {
    const flags: Record<string, string | number | boolean> = {};
    if (title) flags.title = title;
    if (from) flags.from = from;
    if (to) flags.to = to;
    if (description) flags.description = description;
    if (location) flags.location = location;
    return toolOk(await runGog(config, ["cal", "update", calendarId, eventId], flags));
  });

  server.registerTool("gog_calendar_delete_event", {
    title: "Delete Event",
    description: "Delete a calendar event (preview only unless confirm=true)",
    inputSchema: { calendarId: z.string(), eventId: z.string(), confirm: z.boolean().optional() },
  }, async ({ calendarId, eventId, confirm }) => {
    const r = confirm
      ? await runGog(config, ["cal", "delete", calendarId, eventId], { force: true })
      : await runGogDry(config, ["cal", "delete", calendarId, eventId]);
    return toolOk(r);
  });

  server.registerTool("gog_calendar_freebusy", {
    title: "Free/Busy Check",
    description: "Check free/busy availability",
    inputSchema: { from: z.string(), to: z.string(), calendars: z.string().optional() },
  }, async ({ from, to, calendars }) => {
    const cmd = ["cal", "freebusy"];
    if (calendars) for (const c of calendars.split(",")) cmd.push(c.trim());
    return toolOk(await runGog(config, cmd, { from, to }));
  });

  server.registerTool("gog_calendar_conflicts", {
    title: "Find Conflicts",
    description: "Find scheduling conflicts",
    inputSchema: { from: z.string().optional(), to: z.string().optional() },
  }, async ({ from, to }) => {
    const flags: Record<string, string | number | boolean> = {};
    if (from) flags.from = from;
    if (to) flags.to = to;
    return toolOk(await runGog(config, ["cal", "conflicts"], flags));
  });

  server.registerTool("gog_calendar_search", {
    title: "Search Events",
    description: "Search calendar events",
    inputSchema: { query: z.string(), maxResults: z.number().optional() },
  }, async ({ query, maxResults }) => {
    const flags: Record<string, string | number | boolean> = {};
    if (maxResults) flags.maxResults = maxResults;
    return toolOk(await runGog(config, ["cal", "search", query], flags));
  });

  server.registerTool("gog_calendar_focus_time", {
    title: "Focus Time",
    description: "Create a Focus Time block",
    inputSchema: { calendarId: z.string(), from: z.string(), to: z.string(), title: z.string().optional() },
  }, async ({ calendarId, from, to, title }) => {
    const flags: Record<string, string | number | boolean> = { from, to };
    if (title) flags.title = title;
    return toolOk(await runGog(config, ["cal", "focus-time", calendarId], flags));
  });

  server.registerTool("gog_calendar_out_of_office", {
    title: "Out of Office",
    description: "Create an Out of Office event",
    inputSchema: { calendarId: z.string(), from: z.string(), to: z.string(), title: z.string().optional() },
  }, async ({ calendarId, from, to, title }) => {
    const flags: Record<string, string | number | boolean> = { from, to };
    if (title) flags.title = title;
    return toolOk(await runGog(config, ["cal", "out-of-office", calendarId], flags));
  });

  server.registerTool("gog_calendar_working_location", {
    title: "Working Location",
    description: "Set working location on calendar",
    inputSchema: { calendarId: z.string(), from: z.string(), to: z.string(), type: z.enum(["home", "office", "custom"]) },
  }, async ({ calendarId, from, to, type }) =>
    toolOk(await runGog(config, ["cal", "working-location", calendarId], { from, to, type })));

  server.registerTool("gog_calendar_respond", {
    title: "Respond to Event",
    description: "Respond to a calendar event invitation",
    inputSchema: { calendarId: z.string(), eventId: z.string(), response: z.enum(["accepted", "tentative", "declined", "needsAction"]) },
  }, async ({ calendarId, eventId, response }) =>
    toolOk(await runGog(config, ["cal", "respond", calendarId, eventId], { response })));

  server.registerTool("gog_calendar_colors", {
    title: "Calendar Colors",
    description: "Show available calendar colors",
  }, async () => toolOk(await runGog(config, ["cal", "colors"])));
}
