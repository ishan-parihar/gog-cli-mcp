import { spawn } from "child_process";
import type { GogMcpConfig } from "./config.js";
import type { GogResult } from "./types.js";

export async function runGog(
  config: GogMcpConfig,
  command: string[],
  extraFlags: Record<string, unknown> = {},
): Promise<GogResult> {
  const args: string[] = ["-j", "--no-input"];

  const account = extraFlags.account || config.account;
  if (account) {
    args.push("-a", String(account));
  }

  args.push(...command);

  for (const [key, value] of Object.entries(extraFlags)) {
    if (key === "account") continue;
    if (value === undefined || value === null) continue;

    const flag = key.length === 1 ? `-${key}` : `--${key}`;
    if (typeof value === "boolean") {
      if (value) args.push(flag);
    } else {
      args.push(flag, String(value));
    }
  }

  return execGog(config.gogPath, args, config.toolTimeoutMs);
}

export async function runGogDry(
  config: GogMcpConfig,
  command: string[],
  extraFlags: Record<string, unknown> = {},
): Promise<GogResult> {
  return runGog(config, command, { ...extraFlags, dryRun: true });
}

async function execGog(
  gogPath: string,
  args: string[],
  timeoutMs: number,
): Promise<GogResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(gogPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to spawn gog: ${err.message}. Ensure gog is installed and in PATH.`,
      });
    });

    proc.on("close", (exitCode) => {
      if (exitCode === 0) {
        try {
          const trimmed = stdout.trim();
          if (!trimmed) {
            resolve({ success: true, data: null });
            return;
          }
          resolve({ success: true, data: JSON.parse(trimmed) });
        } catch {
          resolve({ success: true, data: stdout.trim() });
        }
      } else {
        resolve({
          success: false,
          error: parseGogError(exitCode, stderr, stdout),
          exitCode: exitCode ?? -1,
          stderr: stderr.trim(),
        });
      }
    });

    proc.on("timeout", () => {
      proc.kill("SIGTERM");
      resolve({
        success: false,
        error: `gog command timed out after ${timeoutMs}ms`,
      });
    });
  });
}

const EXIT_MESSAGES: Record<number, string> = {
  0: "OK",
  1: "General error",
  2: "Usage error",
  3: "No results found",
  4: "Authentication required — run 'gog login <email>' to authorize",
  5: "Resource not found",
  6: "Permission denied",
  7: "Rate limited — try again later",
  8: "Retryable error",
  10: "Configuration error",
  130: "Cancelled (user interrupt)",
};

function parseGogError(
  exitCode: number | null,
  stderr: string,
  stdout: string,
): string {
  const base = EXIT_MESSAGES[exitCode ?? 1] || `Unknown error (exit ${exitCode})`;
  const detail = stderr.trim() || stdout.trim();
  return detail ? `${base}: ${detail}` : base;
}
