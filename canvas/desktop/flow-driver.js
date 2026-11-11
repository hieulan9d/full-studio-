// Điều khiển Google Flow bằng Brave/Chrome/Edge THẬT (profile riêng, đăng nhập một lần) qua cổng debug.
// Google chặn đăng nhập trong cửa sổ Electron nên không dùng được BrowserWindow.
// Không dùng FlowKit/Python/extension: main process nạp flow-page-driver.js vào trang Flow,
// điền prompt/ảnh/cài đặt, bấm tạo, đợi video rồi tải về cho canvas.
const { ipcMain, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DEBUG_PORT = 9333;
const HOME = "https://flow.google.com/";
const BROWSERS = [
  process.env.FLOW_BROWSER,
  path.join(process.env.LOCALAPPDATA || "", "BraveSoftware/Brave-Browser/Application/brave.exe"),
  "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

let userData = "";
let configPath = "";
// Nhiều tài khoản Google: mỗi tài khoản có profile trình duyệt riêng (đăng nhập riêng) và project Flow riêng.
// store = { accounts: [{ id, name, profile, projectId }], active: id }
let store = { accounts: [], active: "" };
let onChange = () => {};
const acct = () => store.accounts.find((a) => a.id === store.active) || store.accounts[0];
// config.projectId luôn là project của tài khoản đang dùng
const config = {
  get projectId() { return acct()?.projectId || ""; },
  set projectId(v) { if (acct()) acct().projectId = v; },
};
let child = null;
let browser = null; // puppeteer Browser
let queue = Promise.resolve();
let pageDriverSrc = "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const loadConfig = () => {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch {}
  if (Array.isArray(raw.accounts) && raw.accounts.length) store = { accounts: raw.accounts, active: raw.active, minCredits: raw.minCredits };
  else store = { accounts: [{ id: "a1", name: "Tài khoản 1", profile: "flow-browser-profile", projectId: raw.projectId || "" }], active: "a1", minCredits: raw.minCredits }; // bản cũ: một tài khoản
  if (!acct() || acct().id !== store.active) store.active = store.accounts[0].id;
};
const saveConfig = () => { try { fs.writeFileSync(configPath, JSON.stringify(store, null, 2)); } catch {} };

async function debugAlive() {
  try { const r = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`, { signal: AbortSignal.timeout(1500) }); return r.ok ? await r.json() : null; } catch { return null; }
}

// Trình duyệt do app mở là cửa sổ thật (profile riêng đã đăng nhập). Chế độ headless bị Flow từ chối nên không dùng mặc định.
let mode = null; // "headless" | "visible" | null (trình duyệt không do app mở)
let browserAccount = null; // tài khoản của trình duyệt do app mở

async function stopOwnBrowser() {
  try { await browser?.close(); } catch {}
  browser = null;
  if (child) { try { child.kill(); } catch {} child = null; }
  for (let i = 0; i < 20 && (await debugAlive()); i++) await sleep(300);
  mode = null;
}

async function launchBrowser(visible) {
  const exe = BROWSERS.find((p) => fs.existsSync(p));
  if (!exe) throw new Error("Không tìm thấy Brave/Chrome/Edge. Cài một trình duyệt Chromium hoặc đặt biến FLOW_BROWSER trỏ tới chrome.exe.");
  const profile = path.join(userData, acct().profile);
  browserAccount = acct().id;
  fs.mkdirSync(profile, { recursive: true });
  const start = config.projectId ? `${HOME}project/${config.projectId}` : HOME;
  child = spawn(exe, [
    `--remote-debugging-port=${DEBUG_PORT}`, "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--window-size=1280,860",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion",
    ...(visible ? [] : ["--headless=new", "--disable-gpu", "--mute-audio"]),
    start,
  ], { detached: false, stdio: "ignore" });
  const me = child;
  me.on("exit", () => { if (child === me) { child = null; browser = null; mode = null; } });
  mode = visible ? "visible" : "headless";
  let info = null;
  for (let i = 0; i < 40 && !(info = await debugAlive()); i++) await sleep(500);
  if (!info) throw new Error("Không mở được trình duyệt Flow (cổng debug " + DEBUG_PORT + ").");
  return info;
}

async function ensureBrowser({ visible = true } = {}) {
  if (child && browserAccount && browserAccount !== acct().id) await stopOwnBrowser(); // đã đổi tài khoản: mở trình duyệt với profile của tài khoản đó
  // Flow từ chối trình duyệt ẩn (coi là hoạt động bất thường) → luôn dùng cửa sổ thật; bạn có thể thu nhỏ nó.
  if (visible && mode === "headless") await stopOwnBrowser(); // đổi sang cửa sổ thật để đăng nhập
  if (browser && browser.connected) return browser;
  let info = await debugAlive();
  if (!info) info = await launchBrowser(visible);
  const mod = await import("puppeteer-core"); // ES Module: không dùng được require()
  const puppeteer = mod.default && mod.default.connect ? mod.default : mod;
  browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  browser.on("disconnected", () => { browser = null; });
  // nhớ project ngay khi bạn mở một project trong cửa sổ Flow (không cần đợi lần tạo tiếp theo)
  browser.on("targetchanged", (t) => {
    const id = projectOf(t.url());
    if (id && id !== config.projectId) { config.projectId = id; saveConfig(); }
  });
  return browser;
}

const uaFixed = new WeakSet();
async function fixHeadlessUA(page) {
  if (mode !== "headless" || uaFixed.has(page)) return;
  uaFixed.add(page);
  try { await page.setUserAgent((await page.browser().userAgent()).replace("HeadlessChrome", "Chrome")); } catch {}
}

const projectOf = (url) => (String(url).match(/flow\.google\.com\/project\/([0-9a-f-]{36})/) || [])[1];

async function flowPage(create, opts) {
  const b = await ensureBrowser(opts);
  const pages = await b.pages();
  let page = pages.find((p) => projectOf(p.url()) && (!config.projectId || projectOf(p.url()) === config.projectId))
    || pages.find((p) => /flow\.google\.com/.test(p.url()));
  if (!page && create) { page = await b.newPage(); await fixHeadlessUA(page); await page.goto(config.projectId ? `${HOME}project/${config.projectId}` : HOME).catch(() => {}); }
  if (page) await fixHeadlessUA(page);
  const id = page && projectOf(page.url());
  if (id && id !== config.projectId) { config.projectId = id; saveConfig(); }
  return page || null;
}

// mở cửa sổ thật (để đăng nhập Google / chọn project)
async function show() {
  const page = await flowPage(true, { visible: true });
  await page.bringToFront();
  return true;
}

async function ensureProjectPage() {
  let page = await flowPage(false);
  if (!config.projectId && !(page && projectOf(page.url()))) {
    await show().catch(() => {});
    throw new Error("Chưa chọn project Flow: trong cửa sổ Chrome vừa mở, đăng nhập Google rồi mở một project, sau đó tạo lại.");
  }
  if (!page) page = await flowPage(true);
  const target = `${HOME}project/${config.projectId}`;
  if (!page.url().startsWith(target) || /\/edit\//.test(page.url())) await page.goto(target, { waitUntil: "domcontentloaded" }).catch(() => {});
  for (let i = 0; i < 60; i++) {
    if (/accounts\.google\.com/.test(page.url())) { await show().catch(() => {}); throw new Error("Cần đăng nhập Google trong cửa sổ trình duyệt vừa hiện ra, rồi tạo lại."); }
    if (await page.evaluate(`!!document.querySelector('.ProseMirror')`).catch(() => false)) return page;
    await sleep(500);
  }
  await show().catch(() => {});
  throw new Error("Trang Flow không có ô nhập prompt (kiểm tra project/đăng nhập trong cửa sổ trình duyệt vừa hiện ra).");
}

async function inject(page) {
  pageDriverSrc = fs.readFileSync(path.join(__dirname, "flow-page-driver.js"), "utf8"); // đọc lại mỗi lần: sửa driver không cần mở lại app
  await page.evaluate(pageDriverSrc);
}

// link video là flow.google.com/asb/... cần cookie phiên; fetch trong trang bị chặn nên tải từ Node kèm cookie của trình duyệt
async function downloadVideo(page, url) {
  const cookies = await page.cookies(url);
  const res = await fetch(url, {
    headers: { Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "), Referer: HOME, "User-Agent": await page.browser().userAgent() },
  });
  if (!res.ok) throw new Error("Tải video thất bại: HTTP " + res.status);
  return { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") || "video/mp4" };
}

// Ảnh thu nhỏ của ô video chỉ là JPEG, không phải video. Lấy mp4 thật bằng nút "Tải xuống" của Flow (chọn 720p/kích thước gốc),
// như người dùng bấm tay: mở video → Tải xuống → chọn chất lượng → đợi tệp về thư mục tạm.
async function downloadVideoViaUi(page, key, baseline = []) {
  const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "flow-dl-"));
  const cdp = await browser.target().createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir });
  try {
    const opened = await page.evaluate(`(() => {
      const k = (x) => String(x.querySelector('img.thumbnail')?.src || '').split('?')[0];
      const tiles = [...document.querySelectorAll('flow-video-tile')].filter((x) => k(x) && !/\\b\\d{1,3}%/.test(x.innerText));
      const base = ${JSON.stringify(baseline.map((u) => String(u).split("?")[0]))};
      // địa chỉ ảnh thu nhỏ có thể đổi sau khi phát hiện: nếu không khớp thì lấy ô mới nhất chưa có từ trước
      const t = tiles.find((x) => k(x) === ${JSON.stringify(key)}) || tiles.find((x) => !base.includes(k(x))) || tiles[0];
      const i = t && t.querySelector('img.thumbnail'); if (!i) return false; i.click(); return true; })()`);
    if (!opened) throw new Error("Không tìm thấy ô video vừa tạo trên trang Flow.");
    for (let i = 0; i < 40 && !/\/edit\//.test(page.url()); i++) await sleep(500);
    const dlBtn = `button[aria-label="Tải nội dung nghe nhìn xuống"]`;
    for (let i = 0; i < 40 && !(await page.evaluate(`!!document.querySelector('${dlBtn}')`)); i++) await sleep(500);
    await page.evaluate(`document.querySelector('${dlBtn}').click()`);
    await sleep(1200);
    const picked = await page.evaluate(`(() => {
      // chọn đúng bản GỐC (đúng độ phân giải đã tạo): so khớp chữ sau khi chuẩn hóa Unicode; bỏ ảnh GIF và bản "đã tăng độ phân giải"
      const n = (x) => String(x.innerText).normalize('NFC');
      const items = [...document.querySelectorAll('flow-menu-item')].filter((x) => x.getBoundingClientRect().width);
      const it = items.find((x) => /gốc|original/i.test(n(x))) || items.find((x) => !/GIF|tăng|upscal/i.test(n(x)));
      const b = it && (it.querySelector('button') || it); if (!b) return false; b.click(); return true; })()`);
    if (!picked) throw new Error("Không thấy lựa chọn chất lượng khi tải video từ Flow.");
    for (let i = 0; i < 240; i++) {
      await sleep(500);
      const f = fs.readdirSync(dir).filter((n) => !n.endsWith(".crdownload"));
      if (f.length && !fs.readdirSync(dir).some((n) => n.endsWith(".crdownload"))) {
        await sleep(300);
        return { data: fs.readFileSync(path.join(dir, f[0])), mime: "video/mp4" };
      }
    }
    throw new Error("Hết thời gian chờ tải video từ Flow.");
  } finally {
    try { await cdp.detach(); } catch {}
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    await page.goto(`${HOME}project/${config.projectId}`, { waitUntil: "domcontentloaded" }).catch(() => {}); // về trang project cho lần tạo sau
  }
}

async function generate(job, onProgress) {
  const tag = `[flow] ${job.kind}`;
  console.log(`${tag}: bắt đầu`);
  const page = await pickAccountWithCredits(job); // kiểm tra điểm, thiếu thì tự đổi tài khoản
  console.log(`${tag}: đã vào trang project (${mode || "trình duyệt có sẵn"})`);
  await page.bringToFront().catch(() => {}); // cửa sổ bị thu nhỏ/che thì trang Flow ở trạng thái "ẩn" và bỏ qua cú bấm tạo
  await closeAccountMenu(page); // chắc chắn không còn menu nào phủ lên trang
  await inject(page);
  const sub = await page.evaluate(`window.__flowUi.submit(${JSON.stringify({ ...job, trustedClick: true })}).catch((e) => ({ error: String(e.message || e), log: window.__flowUi.log.slice(-15) }))`);
  if (sub.error) { console.log(`${tag}: lỗi khi điền form: ${sub.error}`); throw new Error(sub.error + (sub.log?.length ? "\n" + sub.log.join("\n") : "")); }
  if (sub.clickAt) {
    await page.bringToFront().catch(() => {});
    await page.mouse.click(sub.clickAt.x, sub.clickAt.y); // chuột thật: Flow mới nhận
    sub.t0 = Date.now();
    // Flow nhận lệnh khi ô nhập được xóa hoặc xuất hiện ô đang chạy (NN%). Chờ tới 12 giây, bấm lại một lần nếu sau 6 giây vẫn chưa có gì.
    const probe = `(() => {
      const e = document.querySelector('.ProseMirror');
      const filled = !!(e && e.innerText.trim());
      const running = [...document.querySelectorAll('flow-video-tile, cdk-virtual-scroll-viewport')].some((t) => /\\b\\d{1,3}%/.test(t.innerText || ''));
      const dialog = (document.querySelector('.cdk-overlay-container')?.innerText || '').trim().slice(0, 200);
      return { filled, running, dialog };
    })()`;
    let accepted = false, last = null, reclicked = false;
    for (let i = 0; i < 24 && !accepted; i++) {
      await sleep(500);
      last = await page.evaluate(probe).catch(() => null);
      if (last && (!last.filled || last.running)) accepted = true;
      else if (i === 11 && !reclicked && last?.filled) { reclicked = true; await page.mouse.click(sub.clickAt.x, sub.clickAt.y); }
    }
    if (!accepted) throw new Error("Flow không nhận lệnh tạo (ô nhập vẫn còn nội dung sau khi bấm). Kiểm tra credit/giới hạn của Flow." + (last?.dialog ? " Flow hiện: " + last.dialog.replace(/\s+/g, " ") : ""));
  }
  console.log(`${tag}: đã bấm tạo, đang đợi Flow`);
  const timeoutMs = (job.timeoutMin || 10) * 60 * 1000;
  const t0 = Date.now();
  for (;;) {
    await sleep(5000);
    if (Date.now() - t0 > timeoutMs) throw new Error("Hết thời gian chờ video từ Flow.");
    await inject(page).catch(() => {}); // trang có thể đã tải lại
    const st = await page.evaluate(`window.__flowUi.poll(${JSON.stringify({ baseline: sub.baseline, expect: sub.expect, t0: sub.t0, kind: sub.kind })})`).catch(() => null);
    if (!st) continue;
    onProgress?.(st);
    if (st.state === "failed") throw new Error("Flow báo lỗi: " + (st.error || "không rõ"));
    if (st.state === "done") {
      if (job.kind === "image") await sleep(2500); // để ảnh tải đủ độ phân giải trước khi lấy
      console.log(`${tag}: xong, tải ${Math.min(st.videos.length, job.count || 1)} tệp`);
      const out = [];
      for (const v of st.videos.slice(0, job.count || 1)) out.push(job.kind === "image" ? await downloadVideo(page, v.url) : await downloadVideoViaUi(page, v.id, sub.baseline));
      refreshCredits(page).catch(() => {}); // cập nhật điểm còn lại (hiện trên menu)
      return out; // [{data, mime}]
    }
  }
}

function setup(app) {
  userData = app.getPath("userData");
  configPath = path.join(userData, "flow-driver.json");
  loadConfig();

  ipcMain.handle("flow:status", async () => {
    const alive = !!(await debugAlive());
    const page = alive ? await flowPage(false).catch(() => null) : null;
    return { account: acct().name, accounts: store.accounts.map((a) => ({ id: a.id, name: a.name, email: a.email || "", credits: a.credits ?? null, creditsAt: a.creditsAt || null, active: a.id === store.active, hasProject: !!a.projectId })), projectId: config.projectId || "", browserOpen: alive, onFlow: !!page, loggedIn: page ? !/accounts\.google\.com/.test(page.url()) : null };
  });
  ipcMain.handle("flow:accounts", () => status());
  ipcMain.handle("flow:switch-account", (_e, id) => switchAccount(id).then(status));
  ipcMain.handle("flow:add-account", () => addAccount().then(status));
  ipcMain.handle("flow:remove-account", (_e, id) => removeAccount(id).then(status));
  ipcMain.handle("flow:rename-account", (_e, id, name) => { renameAccount(id, name); return status(); });
  ipcMain.handle("flow:open-account", (_e, id) => openAccount(id).then(status));
  ipcMain.handle("flow:refresh-credits", () => refreshAllCredits().then(status));
  ipcMain.handle("flow:set-min-credits", (_e, n) => { setMinCredits(n); return status(); });
  ipcMain.handle("flow:show", () => show().catch((e) => { dialog.showErrorBox("Flow", String(e.message || e)); return false; }));
  // job: {prompt, model, mode, aspect, resolution, seconds, count, images:[{base64,mime,name}]}
  const enqueue = (kind) => (_e, job) => {
    const p = queue.then(() => generate({ ...job, kind }));
    queue = p.catch(() => {});
    return p.then((items) => ({ ok: true, items, data: items[0].data, mime: items[0].mime }), (e) => ({ ok: false, error: String(e.message || e) }));
  };
  ipcMain.handle("flow:generate-video", enqueue("video"));
  // job: {prompt, model, ratio, quality, count, images:[{base64,mime,name}]} -> items:[{data,mime}]
  ipcMain.handle("flow:generate-image", enqueue("image"));
}

// ───────── Điểm (tín dụng) của tài khoản ─────────
// Điểm nằm trong menu tài khoản Google ở góc phải Flow ("1.038 tín dụng Google Flow").
// Menu tài khoản mà để mở sẽ phủ lên trang và nuốt cú bấm nút tạo: phải đóng hẳn (nút "close"; Escape không đủ)
async function closeAccountMenu(page) {
  const isOpen = () => page.evaluate(() => /Đăng xuất khỏi mọi tài khoản|Sign out of all accounts|Quản lý gói thuê bao|Manage subscription/.test(document.body.innerText)).catch(() => false);
  for (let i = 0; i < 5 && (await isOpen()); i++) {
    await page.evaluate(() => {
      const c = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "close" || /^(Đóng|Close)$/i.test(x.getAttribute("aria-label") || ""));
      if (c) c.click();
    }).catch(() => {});
    await sleep(500);
    if (await isOpen()) await page.keyboard.press("Escape").catch(() => {});
  }
}

async function readCreditsOnPage(page) {
  const label = await page.evaluate(() => {
    const b = [...document.querySelectorAll("a,button")].find((x) => /^(Tài khoản Google|Google Account)/i.test(x.getAttribute("aria-label") || ""));
    if (!b) return null;
    b.click();
    return b.getAttribute("aria-label");
  }).catch(() => null);
  if (!label) return null;
  let m = null;
  for (let i = 0; i < 12 && !m; i++) {
    await sleep(400);
    const t = await page.evaluate(() => document.body.innerText).catch(() => "");
    m = t.match(/(\d[\d.,]*)\s*(?:tín dụng|credits?)/i);
  }
  await closeAccountMenu(page);
  if (!m) return null;
  return { credits: parseInt(m[1].replace(/[.,]/g, ""), 10), email: (label.match(/\(([^)\s]+@[^)\s]+)\)/) || [])[1] || "" };
}

// đọc điểm của tài khoản đang dùng và lưu lại (hiện trên menu); không có nút tài khoản ở trang hiện tại thì ghé trang chủ Flow rồi quay lại
async function refreshCredits(page) {
  try {
    let r = await readCreditsOnPage(page);
    if (!r) {
      const back = page.url();
      await page.goto(HOME, { waitUntil: "domcontentloaded" }).catch(() => {});
      await sleep(4000);
      r = await readCreditsOnPage(page);
      if (back && back !== page.url()) await page.goto(back, { waitUntil: "domcontentloaded" }).catch(() => {});
    }
    if (!r) return null;
    const a = acct();
    a.credits = r.credits; a.creditsAt = Date.now();
    if (r.email) { a.email = r.email; if (/^Tài khoản \d+$/.test(a.name)) a.name = r.email; } // đặt tên theo email để dễ nhận ra
    saveConfig(); onChange();
    console.log(`[flow] điểm ${a.name}: ${r.credits}`);
    return r.credits;
  } catch (e) { console.log("[flow] không đọc được điểm: " + (e.message || e)); return null; }
}

// tài khoản còn dưới 50 điểm thì bỏ qua, tự đổi sang tài khoản khác (chỉnh trong flow-driver.json: "minCredits": { "image": 50, "video": 50 })
const minCredits = (kind) => ({ image: 50, video: 50, ...(store.minCredits || {}) })[kind] ?? 50;

// chọn tài khoản còn đủ điểm: thử tài khoản đang dùng trước, thiếu điểm thì lần lượt đổi sang tài khoản khác đã có project
async function pickAccountWithCredits(job) {
  const need = minCredits(job.kind);
  const original = store.active;
  const order = [original, ...store.accounts.map((a) => a.id).filter((id) => id !== original)];
  const notes = [];
  for (const id of order) {
    const a = store.accounts.find((x) => x.id === id);
    if (id !== store.active) {
      if (!a.projectId) { notes.push(`${a.name}: chưa chọn project`); continue; }
      store.active = id; saveConfig();
      await stopOwnBrowser();
      onChange();
      console.log(`[flow] đổi sang ${a.name}`);
    }
    const page = await ensureProjectPage();
    const credits = await refreshCredits(page);
    if (credits == null || credits >= need) return await ensureProjectPage(); // đọc không được thì cứ chạy, nếu hết điểm Flow sẽ tự báo. Đọc điểm có thể đã chuyển trang: đợi ô nhập sẵn sàng
    notes.push(`${a.name}: còn ${credits} điểm`);
  }
  store.active = original; saveConfig(); onChange();
  throw new Error(`Tất cả tài khoản Flow đều không đủ điểm (cần ≥ ${need}). ${notes.join("; ")}`);
}

// ───────── Nhiều tài khoản ─────────
// Chạy trong hàng đợi tạo để không đổi tài khoản giữa lúc đang tạo.
const inQueue = (fn) => { const p = queue.then(fn); queue = p.catch(() => {}); return p; };
const fail = (e) => dialog.showErrorBox("Flow", String(e.message || e));

function switchAccount(id) {
  return inQueue(async () => {
    if (!store.accounts.some((a) => a.id === id) || id === store.active) return;
    store.active = id; saveConfig();
    await stopOwnBrowser(); // lần tạo sau sẽ mở trình duyệt với profile của tài khoản này
    onChange();
  });
}

// đọc điểm của mọi tài khoản đã có project (lần lượt đổi qua từng tài khoản), xong quay về tài khoản đang dùng
function refreshAllCredits() {
  return inQueue(async () => {
    const original = store.active;
    for (const a of [...store.accounts]) {
      if (!a.projectId) continue;
      if (a.id !== store.active) { store.active = a.id; await stopOwnBrowser(); }
      try { await refreshCredits(await ensureProjectPage()); } catch (e) { console.log(`[flow] ${a.name}: ${e.message || e}`); }
    }
    if (store.active !== original) { store.active = original; saveConfig(); await stopOwnBrowser(); }
    onChange();
  });
}

function addAccount() {
  return inQueue(async () => {
    const n = store.accounts.length + 1;
    const id = "a" + Date.now().toString(36);
    store.accounts.push({ id, name: "Tài khoản " + n, profile: "flow-browser-profile-" + id, projectId: "" });
    store.active = id; saveConfig();
    await stopOwnBrowser();
    onChange();
    await show(); // mở cửa sổ thật để đăng nhập Google rồi mở/tạo project
  });
}

function removeAccount(id) {
  return inQueue(async () => {
    if (store.accounts.length <= 1 || !store.accounts.some((a) => a.id === id)) return;
    const wasActive = id === store.active;
    store.accounts = store.accounts.filter((x) => x.id !== id);
    if (wasActive) { store.active = store.accounts[0].id; await stopOwnBrowser(); }
    saveConfig();
    onChange();
  });
}

function renameAccount(id, name) {
  const a = store.accounts.find((x) => x.id === id);
  if (a && String(name || "").trim()) { a.name = String(name).trim(); saveConfig(); onChange(); }
}

// mở cửa sổ Flow của một tài khoản (đổi sang tài khoản đó trước) để đăng nhập / chọn project
function openAccount(id) {
  return inQueue(async () => {
    if (!store.accounts.some((a) => a.id === id)) return;
    if (id !== store.active) { store.active = id; saveConfig(); await stopOwnBrowser(); onChange(); }
    await show();
  });
}

function status() {
  return {
    minCredits: { image: minCredits("image"), video: minCredits("video") },
    accounts: store.accounts.map((a) => ({ id: a.id, name: a.name, email: a.email || "", credits: a.credits ?? null, creditsAt: a.creditsAt || null, active: a.id === store.active, hasProject: !!a.projectId })),
  };
}

function setMinCredits(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  store.minCredits = { image: v, video: v };
  saveConfig();
}


function destroy() {
  // trình duyệt ẩn do app mở phải tắt theo app, kẻo chạy ngầm không ai thấy
  if (mode === "headless" && child) { try { child.kill(); } catch {} }
  try { browser?.disconnect(); } catch {}
  // không đóng Chrome của Flow: người dùng có thể đang dùng; phiên đăng nhập nằm trong profile riêng
}

module.exports = { setup, destroy };
