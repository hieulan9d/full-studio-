// Khoi chay server MCP dung nhu mot client se lam tu file cau hinh (mcpServers), roi liet ke tool va goi app_status.
// Dung: node scripts/mcp-config-check.mjs [duong-dan-file-json]   (mac dinh: ../../.mcp.json)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const file = resolve(process.argv[2] ?? '../../.mcp.json');
const cfg = JSON.parse(readFileSync(file, 'utf8'));
const entry = cfg.mcpServers?.['tool-edit'];
if (!entry) {
  console.log('FAIL - khong co mcpServers["tool-edit"] trong', file);
  process.exit(1);
}
const script = entry.args?.[entry.args.length - 1];
console.log('cau hinh:', file);
console.log('lenh    :', entry.command, JSON.stringify(entry.args));
console.log(existsSync(script) ? 'ok   - file mcp.mjs ton tai' : 'FAIL - khong thay ' + script);
if (!existsSync(script)) process.exit(1);

const client = new Client({ name: 'config-check', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: entry.command, args: entry.args, env: { ...process.env, ...(entry.env ?? {}) }, cwd: dirname(file) }));
const { tools } = await client.listTools();
console.log(`ok   - khoi chay tu cau hinh, thay ${tools.length} tool: ${tools.map((t) => t.name).join(', ')}`);
const st = await client.callTool({ name: 'app_status', arguments: {} });
const txt = st.content[0].text;
console.log(st.isError ? `app chua chay (binh thuong neu chua mo): ${txt.slice(0, 90)}` : `ok   - app_status: ${txt.replace(/\s+/g, ' ').slice(0, 110)}`);
await client.close();
