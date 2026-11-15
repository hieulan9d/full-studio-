// Runs ExtendScript inside After Effects and reads the result back.
//
// Each job is a .jsx file in %TEMP%\claude-ae-bridge, handed to AE with
// `AfterFX.exe -r <file>` (forwarded to the running instance, or starts AE).
// The job writes its result as JSON next to itself; we poll for that file.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const LIB = fs.readFileSync(path.join(here, "..", "jsx", "lib.jsx"), "utf8");
export const JOB_DIR = path.join(os.tmpdir(), "claude-ae-bridge");

// JSON with every non-ASCII char escaped, so the .jsx file is pure ASCII and
// Vietnamese paths/text survive ExtendScript's file-encoding guesswork.
export function asciiJson(v) {
  return JSON.stringify(v ?? null).replace(/[\u007f-\uffff]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

export function findAfterFx() {
  if (process.env.AE_EXE) return process.env.AE_EXE;
  const roots = [process.env.ProgramFiles, process.env["ProgramW6432"], "C:\\Program Files"]
    .filter(Boolean).map((r) => path.join(r, "Adobe"));
  for (const root of [...new Set(roots)]) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((d) => /^Adobe After Effects/i.test(d)).sort().reverse();
    for (const d of dirs) {
      const exe = path.join(root, d, "Support Files", "AfterFX.exe");
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

export function buildJob(body, args, outPath, undoName = "Claude") {
  return `${LIB}
(function () {
  var __out = ${outPath ? `new File(${asciiJson(outPath.replace(/\\/g, "/"))})` : "null"};
  var __res;
  app.beginUndoGroup(${asciiJson(undoName)});
  try {
    var __v = (function (args) {
${body}
    })(${asciiJson(args)});
    __res = { ok: true, result: __v };
  } catch (e) {
    __res = { ok: false, error: String(e), line: e.line || null };
  }
  try { app.endUndoGroup(); } catch (e2) {}
  if (__out === null) return __ae.stringify(__res);
  var __tmp = new File(__out.fsName + ".tmp");
  __tmp.encoding = "UTF-8";
  __tmp.open("w");
  __tmp.write(__ae.stringify(__res));
  __tmp.close();
  __tmp.rename(__out.name);
})();
`;
}

let queue = Promise.resolve();

// Jobs run one at a time: AE executes scripts serially anyway.
export function runJsx(body, args = {}, { timeoutMs = 60000, undoName } = {}) {
  const job = queue.then(() => runOne(body, args, timeoutMs, undoName));
  queue = job.catch(() => {});
  return job;
}

// How the last job reached AE: "panel" (Claude Bridge panel) or "cli" (AfterFX.exe -r).
export let lastVia = null;

const PANEL_INFO = path.join(JOB_DIR, "panel.json");

function readPanel() {
  try { return JSON.parse(fs.readFileSync(PANEL_INFO, "utf8")); } catch { return null; }
}

// Sends the job to the panel. Throws { panelDown: true } when the panel is not
// listening (closed, AE restarted, stale panel.json) so the caller can fall back.
async function viaPanel(panel, body, args, timeoutMs, undoName) {
  const down = (why) => Object.assign(new Error(why), { panelDown: true });
  let res;
  try {
    res = await fetch(`http://127.0.0.1:${panel.port}/run`, {
      method: "POST",
      headers: { "content-type": "text/plain", "x-token": panel.token, "x-tool": undoName },
      body: buildJob(body, args, null, undoName),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      throw new Error(
        `Panel Claude Bridge đã nhận lệnh nhưng AE chưa chạy xong sau ${Math.round(timeoutMs / 1000)}s. ` +
        `AE có thể đang vướng hộp thoại hoặc đang bận (render, tải project) — xem cửa sổ AE.`);
    }
    throw down(String(e.cause?.code || e.message));
  }
  if (res.status === 403) throw down("token cũ");
  const out = await res.text();
  let r;
  try { r = JSON.parse(out); } catch { throw new Error(`After Effects: ${out || "(không trả gì — script lỗi cú pháp?)"}`); }
  lastVia = "panel";
  if (!r.ok) throw new Error(`After Effects: ${r.error}${r.line ? ` (dòng ${r.line})` : ""}`);
  return r.result;
}

async function runOne(body, args, timeoutMs, undoName) {
  fs.mkdirSync(JOB_DIR, { recursive: true });
  if (!process.env.AE_DRY_RUN && !process.env.AE_NO_PANEL) {
    const panel = readPanel();
    if (panel) {
      try { return await viaPanel(panel, body, args, timeoutMs, undoName); }
      catch (e) { if (!e.panelDown) throw e; }
    }
  }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const jsxPath = path.join(JOB_DIR, `job-${id}.jsx`);
  const outPath = path.join(JOB_DIR, `job-${id}.json`);
  fs.writeFileSync(jsxPath, buildJob(body, args, outPath, undoName), "ascii");

  if (process.env.AE_DRY_RUN) return { dryRun: true, jsx: jsxPath };

  const exe = findAfterFx();
  if (!exe || !fs.existsSync(exe)) {
    throw new Error(`Không tìm thấy AfterFX.exe${exe ? ` tại ${exe}` : ""}. ` +
      `Mở panel Claude Bridge trong AE, hoặc đặt biến môi trường AE_EXE trỏ tới ...\\Support Files\\AfterFX.exe`);
  }
  const child = spawn(exe, ["-r", jsxPath], { detached: true, stdio: "ignore", windowsHide: true });
  child.on("error", () => {}); // a failed spawn must not take the MCP server down
  child.unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(outPath)) {
      const res = JSON.parse(fs.readFileSync(outPath, "utf8"));
      fs.rmSync(outPath, { force: true });
      fs.rmSync(jsxPath, { force: true });
      lastVia = "cli";
      if (!res.ok) throw new Error(`After Effects: ${res.error}${res.line ? ` (dòng ${res.line})` : ""}`);
      return res.result;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `After Effects không trả kết quả sau ${Math.round(timeoutMs / 1000)}s. Kiểm tra: AE đã mở và không vướng hộp thoại; ` +
    `đã bật Edit > Preferences > Scripting & Expressions > "Allow Scripts to Write Files and Access Network". Job: ${jsxPath}`);
}
