# Changelog

## [0.1.0] — 2026-04-05

### Added
- 53 MCP tools across 6 modules: Calendar (14), Gmail (16), Contacts (7), Forms (8), Drive (7), Document (1)
- Dual transport: stdio (local agents) and HTTP (remote clients)
- Per-module enable/disable via config
- Gmail draft-first safety pattern (`gmailDraftOnly` config)
- Document generation (.docx from markdown with templates: report, briefing, memo, blank)
- Configurable account, timeout, and gog binary path
- Graceful error handling for gog exit codes (auth, rate limit, not found, etc.)

### Architecture
- Standalone MCP server — reusable across any MCP-compatible client
- Flag ordering: global flags → subcommand → tool-specific flags
- Zod-validated input schemas for all tools
- Structured content return for machine-readable responses
