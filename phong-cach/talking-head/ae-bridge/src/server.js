#!/usr/bin/env node
// MCP server (stdio) exposing After Effects to Claude.
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runJsx, JOB_DIR, lastVia } from "./ae.js";
import { tools } from "./tools.js";

const server = new McpServer({ name: "after-effects", version: "0.2.0" });

const text = (v) => ({ content: [{ type: "text", text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });

async function waitForFile(p, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fs.existsSync(p) && fs.statSync(p).size > 0) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

for (const t of tools) {
  server.registerTool(t.name, { description: t.description, inputSchema: t.schema }, async (input) => {
    try {
      const opts = { timeoutMs: t.timeout ? t.timeout(input) : 60000, undoName: `Claude: ${t.name}` };
      if (t.raw) return text(await runJsx(input.code, input.args ?? {}, opts));

      if (t.image) {
        fs.mkdirSync(JOB_DIR, { recursive: true });
        input = { ...input, path: input.path ?? path.join(JOB_DIR, `frame-${Date.now()}.png`) };
      }
      const result = await runJsx(t.jsx, input, opts);
      if (t.image && !result?.dryRun) {
        // saveFrameToPng can finish after the script returns.
        if (!(await waitForFile(input.path, 15000))) return text(`AE chưa ghi xong ảnh: ${input.path}`);
        const data = fs.readFileSync(input.path).toString("base64");
        return { content: [{ type: "image", data, mimeType: "image/png" }, { type: "text", text: input.path }] };
      }
      if (t.name === "ae_status" && result && typeof result === "object") {
        return text({ ...result, bridge: lastVia === "panel" ? "panel Claude Bridge" : "AfterFX.exe -r (chưa mở panel)" });
      }
      return text(result);
    } catch (e) {
      return { ...text(String(e.message || e)), isError: true };
    }
  });
}

await server.connect(new StdioServerTransport());
