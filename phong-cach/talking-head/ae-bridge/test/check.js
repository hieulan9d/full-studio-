// Offline check (no After Effects needed): builds every tool's job and
// parses it as JavaScript, then starts the MCP server and lists its tools.
import vm from "node:vm";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildJob } from "../src/ae.js";
import { tools } from "../src/tools.js";

let failed = 0;
for (const t of tools) {
  const body = t.raw ? "return app.version;" : t.jsx;
  const sample = { sample: "Tiếng Việt có dấu", path: "D:\\dự án\\a.mp4" };
  try {
    // File mode (AfterFX.exe -r) and return mode (panel).
    for (const jsx of [buildJob(body, sample, "C:\\tmp\\out.json"), buildJob(body, sample, null)]) {
      new vm.Script(jsx, { filename: `${t.name}.jsx` });
      if (/[^\x00-\x7f]/.test(jsx.replace(/^\/\/.*$/gm, ""))) throw new Error("job is not pure ASCII");
    }
    console.log(`ok   ${t.name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${t.name}: ${e.message}`);
  }
}

// MCP handshake over stdio.
const here = path.dirname(fileURLToPath(import.meta.url));
const proc = spawn(process.execPath, [path.join(here, "..", "src", "server.js")], { stdio: ["pipe", "pipe", "inherit"] });
let buf = "";
const got = new Promise((resolve, reject) => {
  proc.stdout.on("data", (d) => {
    buf += d;
    for (const line of buf.split("\n")) {
      try { const m = JSON.parse(line); if (m.id === 2) resolve(m); } catch {}
    }
  });
  setTimeout(() => reject(new Error("no tools/list reply")), 10000);
});
const send = (m) => proc.stdin.write(JSON.stringify(m) + "\n");
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check", version: "0" } } });
send({ jsonrpc: "2.0", method: "notifications/initialized" });
send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
try {
  const m = await got;
  console.log(`MCP: ${m.result.tools.length} tools — ${m.result.tools.map((x) => x.name).join(", ")}`);
} catch (e) { failed++; console.log(`FAIL MCP: ${e.message}`); }
proc.kill();
process.exit(failed ? 1 : 0);
