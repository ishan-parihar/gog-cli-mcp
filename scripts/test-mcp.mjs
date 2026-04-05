import { spawn } from "child_process";

const TOOLS_TO_TEST = [
  { id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } } },
  { id: 2, method: "tools/list", params: {} },
  { id: 3, method: "tools/call", params: { name: "gog_calendar_calendars", arguments: {} } },
  { id: 4, method: "tools/call", params: { name: "gog_calendar_events", arguments: { max: 3 } } },
  { id: 5, method: "tools/call", params: { name: "gog_calendar_freebusy", arguments: { from: "2026-04-05T00:00:00Z", to: "2026-04-06T00:00:00Z" } } },
  { id: 6, method: "tools/call", params: { name: "gog_contacts_list", arguments: {} } },
  { id: 7, method: "tools/call", params: { name: "gog_contacts_search", arguments: { query: "test" } } },
  { id: 8, method: "tools/call", params: { name: "gog_drive_list", arguments: { max: 5 } } },
  { id: 9, method: "tools/call", params: { name: "gog_gmail_search", arguments: { query: "test", max: 3 } } },
  { id: 10, method: "tools/call", params: { name: "gog_forms_get", arguments: { formId: "nonexistent" } } },
  { id: 11, method: "tools/call", params: { name: "gog_calendar_colors", arguments: {} } },
  { id: 12, method: "tools/call", params: { name: "gog_calendar_search", arguments: { query: "meeting" } } },
  { id: 13, method: "tools/call", params: { name: "gog_drive_shared_drives", arguments: {} } },
  { id: 14, method: "tools/call", params: { name: "gog_contacts_directory_search", arguments: { query: "admin" } } },
  { id: 15, method: "tools/call", params: { name: "gog_document_generate", arguments: { title: "Test Doc", content: "# Test\nBody", format: "docx", template: "blank" } } },
];

const proc = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "pipe"] });

let buffer = "";
const responses = [];

proc.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (line.startsWith("{")) {
      try { responses.push(JSON.parse(line)); } catch {}
    }
  }
});

proc.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

for (const req of TOOLS_TO_TEST) {
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...req }) + "\n");
}

proc.stdin.end();

proc.on("close", () => {
  const tests = {
    2: { name: "Tools Listed", check: (r) => { const t = r.result.tools || []; return `OK: ${t.length} tools`; }},
    3: { name: "Calendar: List Calendars", check: (r) => checkTool(r) },
    4: { name: "Calendar: List Events", check: (r) => checkTool(r) },
    5: { name: "Calendar: Freebusy", check: (r) => checkTool(r) },
    6: { name: "Contacts: List", check: (r) => checkTool(r) },
    7: { name: "Contacts: Search", check: (r) => checkTool(r) },
    8: { name: "Drive: List", check: (r) => checkTool(r) },
    9: { name: "Gmail: Search", check: (r) => checkTool(r) },
    10: { name: "Forms: Get (bad ID)", check: (r) => r.result.isError ? "PASS (expected error)" : "FAIL: should have errored" },
    11: { name: "Calendar: Colors", check: (r) => checkTool(r) },
    12: { name: "Calendar: Search Events", check: (r) => checkTool(r) },
    13: { name: "Drive: Shared Drives", check: (r) => checkTool(r) },
    14: { name: "Contacts: Directory Search", check: (r) => {
      if (r.result.isError) {
        const text = r.result.content?.[0]?.text || "";
        if (text.includes("G Suite")) return "SKIP (requires G Suite domain)";
        return `ERROR: ${text.slice(0, 80)}`;
      }
      return checkTool(r);
    }},
    15: { name: "Document: Generate .docx", check: (r) => checkTool(r) },
  };

  let passed = 0, failed = 0, skipped = 0;
  const failedTests = [];

  for (const resp of responses) {
    const id = resp.id;
    if (!tests[id]) continue;
    const { name, check } = tests[id];
    const result = check(resp);
    const status = result.startsWith("OK") || result.startsWith("PASS") ? "PASS" : result.startsWith("SKIP") ? "SKIP" : "FAIL";
    if (status === "PASS") passed++;
    else if (status === "SKIP") skipped++;
    else { failed++; failedTests.push(name); }
    console.log(`  [${status}] ${name}: ${result}`);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped of ${Object.keys(tests).length} tested`);
  if (failedTests.length) console.log(`Failed: ${failedTests.join(", ")}`);
  process.exit(failed > 0 ? 1 : 0);
});

function checkTool(r) {
  if (r.result?.isError) {
    const text = r.result.content?.[0]?.text?.slice(0, 120) || "unknown error";
    return `ERROR: ${text}`;
  }
  const text = r.result.content?.[0]?.text || "";
  return `OK (${text.length}b)`;
}
