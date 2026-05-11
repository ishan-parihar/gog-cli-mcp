# gog-cli-mcp

[![CI](https://github.com/ishanp/gog-cli-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ishanp/gog-cli-mcp/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.12-orange)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Google Workspace as MCP tools** — 53 tools for Calendar, Gmail, Contacts, Forms, Drive, and Document generation. Built on the [gog CLI](https://github.com/jaydson/gog), designed for AI agents.

## Why

AI agents need structured, reliable access to Google Workspace. The `gog` CLI provides the API layer — this wraps it in the [Model Context Protocol](https://modelcontextprotocol.io/) so any MCP-compatible client (Claude Desktop, Cursor, OpenCode, custom agents) can call Google Workspace operations as native tools.

## Quick Start

```bash
git clone https://github.com/ishanp/gog-cli-mcp.git
cd gog-cli-mcp
npm install
npx tsc
cp config.example.json config.json  # edit with your account
```

Requires [`gog`](https://github.com/jaydson/gog) CLI authenticated:
```bash
gog auth login ishan.parihar.official@gmail.com
```

## Tools (53 total)

| Module | Count | Key Capabilities |
|--------|-------|-----------------|
| **Calendar** | 14 | List calendars, events CRUD, freebusy, conflicts, search, focus-time, OOO, working-location, respond to invites, color management |
| **Gmail** | 16 | Search threads, read messages/threads/attachments, get shareable URLs, send/draft emails, draft management, archive, label operations, trash |
| **Contacts** | 7 | Search, list, get, create, update, delete contacts + Workspace directory search |
| **Forms** | 8 | Get/create/update forms, manage questions (add/move/delete), list/get responses |
| **Drive** | 7 | List/search files, metadata, shareable URLs, download, permissions, shared drives (read-only by default) |
| **Document** | 1 | Generate professional .docx from markdown with templates (report, briefing, memo, blank) |

### Example Tool Calls

```
Check my calendar for today → gog_calendar_events(from: "today", to: "today")
Search emails from John → gog_gmail_search(query: "from:john")
Find a contact → gog_contacts_search(query: "john doe")
List Drive files → gog_drive_list(max: 20)
Create a briefing doc → gog_document_generate(title: "Q1 Briefing", content: "# Q1 Review\n...", template: "briefing")
```

## Configuration

```json
{
  "account": "your-email@gmail.com",
  "gogPath": "gog",
  "transport": "stdio",
  "enabledTools": ["calendar", "gmail", "contacts", "forms", "drive", "document"],
  "gmailDraftOnly": true,
  "toolTimeoutMs": 30000
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `account` | — | Default Google account for API calls |
| `gogPath` | `gog` | Path to gog binary |
| `transport` | `stdio` | `stdio` for local agents, `http` for remote |
| `enabledTools` | all | Modules to expose. Remove any to disable. |
| `allowedTools` | `null` | Glob patterns to restrict tool registration. `null` = all tools. See below. |
| `gmailDraftOnly` | `true` | `gog_gmail_send` creates a draft instead of sending |
| `toolTimeoutMs` | `30000` | Timeout per gog command (ms) |

### Tool Scoping

Use `allowedTools` to restrict which tools the server registers. Supports glob patterns (`*`, `**`):

```json
{
  "enabledTools": ["calendar", "gmail", "drive"],
  "allowedTools": [
    "gog_calendar_*",
    "gog_gmail_search",
    "gog_gmail_get_*",
    "gog_drive_*"
  ]
}
```

When `allowedTools` is `null` or absent, all tools from enabled modules are registered. When present, only matching tools are registered — non-matching tools are silently skipped.

#### Per-Agent Scoping (Strategos)

Create one config per agent role, each with its own `allowedTools`:

```
config.ceo.json      → CEO: 34 tools (full calendar, read gmail/drive, contacts, forms, docs)
config.coo.json      → COO: 28 tools (full calendar, read gmail/drive)
config.cfo.json      → CFO: 10 tools (calendar events + freebusy, drive read)
config.cro.json      → CRO: 26 tools (gmail drafts, contacts full, forms full, freebusy)
config.cmo.json      → CMO: 25 tools (gmail drafts, drive read, forms full, docs)
config.minimal.json  → CPO/CIO/Physician: 2 tools (freebusy + calendars only)
```

Each agent gets its own MCP server instance pointing to the appropriate config. See [`examples/strategos-bridge.yaml`](examples/strategos-bridge.yaml) for the full mapping.

## Integration

### Claude Desktop / Cursor / OpenCode

```json
{
  "mcpServers": {
    "gog-cli-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/gog-cli-mcp/dist/index.js"],
      "env": {
        "GOG_MCP_CONFIG": "/absolute/path/to/gog-cli-mcp/config.json"
      }
    }
  }
}
```

See [`examples/mcp-clients.json`](examples/mcp-clients.json) for a ready-to-use template.

### Per-Agent Scoping (Strategos)

When used with [Strategos](https://github.com/ishanp/strategos), scope tool access per agent:

```yaml
# See examples/strategos-bridge.yaml for full config
coo:
  mcp_tools:
    gog-cli-mcp: ["calendar.*", "drive.*", "gmail.search"]
cro:
  mcp_tools:
    gog-cli-mcp: ["gmail.*", "contacts.*", "forms.*"]
ceo:
  mcp_tools:
    gog-cli-mcp: ["*"]
```

### HTTP Transport (Remote Clients)

```json
{ "transport": "http", "httpPort": 3100 }
```

```bash
node dist/index.js  # Listens on :3100
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────────┐
│ MCP Client  │────▶│ gog-cli-mcp  │────▶│   gog    │────▶│ Google APIs │
│ (Claude,    │◀────│ (MCP Server) │◀────│  (CLI)   │◀────│ (Workspace) │
│  Cursor)    │     │  53 tools    │     │          │     │             │
└─────────────┘     └──────────────┘     └──────────┘     └─────────────┘
```

- **Transport**: stdio (default) or HTTP/SSE
- **Validation**: Zod schemas for all tool inputs
- **Error handling**: Maps gog exit codes to actionable messages (auth, rate limit, permissions)
- **Safety**: Gmail draft-first by default, contact delete requires explicit confirmation

## Development

```bash
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emitting
npm start            # Run with current config
npm run test         # Run integration tests
```

### Adding a New Tool Module

1. Create `src/tools/<module>.ts` with your tool registrations
2. Export a function: `export function register<Module>Tools(server: McpServer, config: GogMcpConfig)`
3. Add module name to `MODULES` map in `src/index.ts`
4. Update `enabledTools` in config schema

## Tech Stack

- **TypeScript 5.7** — Type-safe MCP server
- **@modelcontextprotocol/sdk 1.12** — Official MCP SDK
- **Zod** — Runtime input validation
- **docx** — Professional .docx generation
- **gog CLI** — Google Workspace API wrapper

## License

MIT — see [LICENSE](LICENSE).

---

Developed by [Ishan Parihar](https://github.com/ishanparihar) — If you find this useful, [consider supporting](https://rzp.io/rzp/ishan-parihar)
