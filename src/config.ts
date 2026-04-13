import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GogMcpConfig {
  account: string;
  gogPath: string;
  transport: "stdio" | "http";
  httpPort: number;
  enabledTools: string[];
  allowedTools: string[] | null;
  gmailDraftOnly: boolean;
  toolTimeoutMs: number;
}

const DEFAULT_CONFIG: GogMcpConfig = {
  account: "",
  gogPath: "gog",
  transport: "stdio",
  httpPort: 3100,
  enabledTools: ["calendar", "gmail", "contacts", "forms", "drive", "document"],
  allowedTools: null,
  gmailDraftOnly: true,
  toolTimeoutMs: 30000,
};

export function loadConfig(configPath?: string): GogMcpConfig {
  const paths = [
    configPath,
    process.env.GOG_MCP_CONFIG,
    join(process.cwd(), "config.json"),
    join(__dirname, "..", "config.json"),
    join(__dirname, "..", "..", "config.json"),
    join(process.env.HOME || "", ".config", "gog-cli-mcp", "config.json"),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, "utf-8");
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      } catch {}
    }
  }

  return DEFAULT_CONFIG;
}
