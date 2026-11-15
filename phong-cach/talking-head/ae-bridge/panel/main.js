// Claude Bridge panel: a localhost HTTP endpoint inside After Effects.
//
// The MCP server (src/ae.js) POSTs a complete ExtendScript job to
// http://127.0.0.1:<port>/run with the token from %TEMP%\claude-ae-bridge\panel.json;
// the panel runs it with evalScript and sends back the JSON string the job returns.
// Without the panel the MCP server falls back to `AfterFX.exe -r`.
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");

const DIR = path.join(process.env.TEMP || os.tmpdir(), "claude-ae-bridge");
const INFO = path.join(DIR, "panel.json");
const PORT_FIRST = 47811, PORT_LAST = 47820;
const TOKEN = crypto.randomBytes(16).toString("hex");
const VERSION = "0.2.0";

const $ = (id) => document.getElementById(id);
const msg = (s) => { $("msg").textContent = s || ""; };

// ---- running ExtendScript, one job at a time ----
let queue = Promise.resolve();
let busy = 0;
function evalJsx(src) {
  return new Promise((resolve) => window.__adobe_cep__.evalScript(src, resolve));
}
function run(src) {
  const p = queue.then(() => evalJsx(src));
  queue = p.catch(() => {});
  return p;
}

// ---- log ----
const entries = [];
function addLog(name) {
  const e = { name, at: new Date(), state: "busy", ms: 0 };
  entries.unshift(e);
  entries.length = Math.min(entries.length, 40);
  busy++; drawLog(); setStatus();
  return e;
}
function endLog(e, ok, ms, detail) {
  e.state = ok ? "ok" : "err"; e.ms = ms; e.detail = detail;
  busy--; drawLog(); setStatus();
}
function drawLog() {
  $("log").innerHTML = "";
  for (const e of entries) {
    const li = document.createElement("li");
    const t = e.at.toTimeString().slice(0, 8);
    const mark = e.state === "busy" ? "…" : e.state === "ok" ? "✓" : "✗";
    li.innerHTML = `<span class="t"></span><span class="n"></span><span class="${e.state}"></span>`;
    li.children[0].textContent = t;
    li.children[1].textContent = e.name.replace(/^Claude: /, "");
    li.children[2].textContent = e.state === "busy" ? mark : `${mark} ${(e.ms / 1000).toFixed(1)}s`;
    if (e.detail) li.title = e.detail;
    $("log").appendChild(li);
  }
}

// ---- status ----
let port = null;
function setStatus(err) {
  const dot = $("dot");
  if (err || !port) { dot.className = ""; $("status").textContent = err || "Chưa mở được cổng"; return; }
  dot.className = busy ? "busy" : "ok";
  $("status").textContent = busy ? `Đang chạy ${busy} lệnh — cổng ${port}` : `Sẵn sàng — 127.0.0.1:${port}`;
}

// ---- HTTP endpoint ----
function handle(req, res) {
  if (req.method !== "POST" || req.url !== "/run" || req.headers["x-token"] !== TOKEN) {
    res.writeHead(403); res.end(); return;
  }
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (d) => { body += d; });
  req.on("end", async () => {
    const e = addLog(String(req.headers["x-tool"] || "script"));
    const t0 = Date.now();
    const out = await run(body);
    let ok = false, detail = "";
    try { const r = JSON.parse(out); ok = !!r.ok; detail = r.ok ? "" : String(r.error); } catch (_) { detail = String(out); }
    endLog(e, ok, Date.now() - t0, detail);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(out == null ? "" : String(out));
  });
}

function listen(p) {
  const srv = http.createServer(handle);
  srv.on("error", (err) => {
    if (err.code === "EADDRINUSE" && p < PORT_LAST) listen(p + 1);
    else setStatus(`Lỗi mở cổng: ${err.message}`);
  });
  srv.listen(p, "127.0.0.1", () => {
    port = p;
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(INFO, JSON.stringify({ port, token: TOKEN, version: VERSION, started: new Date().toISOString() }));
    setStatus();
  });
}

window.addEventListener("unload", () => {
  try {
    const cur = JSON.parse(fs.readFileSync(INFO, "utf8"));
    if (cur.token === TOKEN) fs.unlinkSync(INFO);
  } catch (_) {}
});

// ---- buttons ----
const jsStr = (s) => JSON.stringify(s).replace(/[\u007f-￿]/g,
  (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

$("btnShot").onclick = async () => {
  const file = path.join(DIR, "panel-frame.png");
  const t0 = Date.now();
  const e = addLog("Chụp");
  const out = await run(`(function(){
    var c = app.project.activeItem;
    if (!(c instanceof CompItem)) return "NOCOMP";
    c.saveFrameToPng(c.time, new File(${jsStr(file.replace(/\\/g, "/"))}));
    return "OK|" + c.name + "|" + c.time;
  })()`);
  if (out !== "OK" && !String(out).startsWith("OK|")) {
    endLog(e, false, Date.now() - t0, out);
    msg(out === "NOCOMP" ? "Chưa mở comp nào (bấm vào timeline của comp trước)." : `Lỗi: ${out}`);
    return;
  }
  // saveFrameToPng may finish after the script returns.
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { const st = fs.statSync(file); if (st.size > 0 && st.mtimeMs >= t0 - 1000) break; } catch (_) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  endLog(e, true, Date.now() - t0);
  const [, name, time] = String(out).split("|");
  const img = $("shot");
  img.src = "file:///" + file.replace(/\\/g, "/") + "?" + Date.now();
  img.style.display = "block";
  msg(`${name} @ ${Number(time).toFixed(2)}s\n${file}`);
};

const EFFECTS = ["ADBE Box Blur2", "ADBE Gaussian Blur 2", "ADBE Wave Warp", "ADBE Turbulent Displace", "ADBE WRPMESH",
  "ADBE Geometry2", "ADBE Ramp", "ADBE 4ColorGradient", "ADBE Tint", "ADBE HUE SATURATION", "ADBE Linear Wipe",
  "ADBE Displacement Map", "ADBE Brightness & Contrast 2", "ADBE Drop Shadow", "ADBE Glo2", "ADBE Roughen Edges"];

$("btnTest").onclick = async () => {
  const t0 = Date.now();
  const e = addLog("Self test");
  const out = await run(`(function(){
    var want = ${jsStr(EFFECTS)}, have = {}, miss = [];
    for (var i = 0; i < app.effects.length; i++) have[app.effects[i].matchName] = 1;
    for (var j = 0; j < want.length; j++) if (!have[want[j]]) miss.push(want[j]);
    var fa = "?";
    try { fa = app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY"); } catch (e) {}
    return app.version + "|" + fa + "|" + (want.length - miss.length) + "/" + want.length + "|" + miss.join(", ");
  })()`);
  const parts = String(out).split("|");
  if (parts.length < 4) { endLog(e, false, Date.now() - t0, out); msg(`Lỗi: ${out}`); return; }
  const [ver, fa, found, missing] = parts;
  const lines = [
    `AE ${ver}`,
    `Cổng: ${port ? "127.0.0.1:" + port + " ✓" : "chưa mở ✗"}`,
    `File panel.json: ${fs.existsSync(INFO) ? "có ✓" : "không có ✗"}`,
    `Cho script ghi file: ${fa === "1" ? "bật ✓" : fa === "0" ? "TẮT ✗ (cần cho nút Chụp và ae_preview_frame)" : "không đọc được"}`,
    `Hiệu ứng: ${found}${missing ? " — thiếu: " + missing : " ✓"}`,
  ];
  endLog(e, !missing && fa !== "0" && !!port, Date.now() - t0);
  msg(lines.join("\n"));
};

$("btnDir").onclick = () => {
  fs.mkdirSync(DIR, { recursive: true });
  exec(`explorer "${DIR}"`);
};

listen(PORT_FIRST);
