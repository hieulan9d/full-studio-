// Tài khoản Gemini web (gemini.google.com) trên Brave/Chrome/Edge thật: mỗi tài khoản một profile riêng,
// người dùng TỰ đăng nhập một lần, profile được giữ lại để dùng sau. Tạo video bằng công cụ "Tạo video" của Gemini.
// Dùng chung cho app (main.js) và dòng lệnh:
//   node gemini-driver.js --status | --add "ten" | --open "ten|email|id" | --check
//   node gemini-driver.js --make-video --prompt-file canh.txt [--image a.png] --aspect 9:16 --name c01
//   node gemini-driver.js --fetch <địa chỉ cuộc trò chuyện> --name c01   (không tốn lượt)
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { saveOutput, outputDir } = require("./output-dir");
const { lockAccount } = require("./account-lock");
const { cleanTabs } = require("./clean-tabs");

const BASE_PORT = 9400; // mỗi tài khoản một cổng riêng (khác dải của Flow)
const HOME = "https://gemini.google.com/app?hl=vi";
const BROWSERS = [
  process.env.FLOW_BROWSER,
  path.join(process.env.LOCALAPPDATA || "", "BraveSoftware/Brave-Browser/Application/brave.exe"),
  "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

let dir = "";
let store = { accounts: [], active: "" }; // accounts: [{ id, name, email, profile, loggedIn, checkedAt }]
let queue = Promise.resolve();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = () => path.join(dir, "gemini-driver.json");
const load = () => { try { const raw = JSON.parse(fs.readFileSync(file(), "utf8")); if (Array.isArray(raw.accounts)) store = raw; } catch {} };
const save = () => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file(), JSON.stringify(store, null, 2)); };
const find = (key) => store.accounts.find((a) => [a.id, a.name, a.email].includes(key));
// nhiều tiến trình cùng ghi: đọc lại rồi chỉ sửa tài khoản của mình
const patch = (id, fields) => { load(); const a = find(id); if (a) { Object.assign(a, fields); save(); } return a; };
const portOf = (id) => {
  const a = find(id);
  if (!a.port) patch(a.id, { port: Math.max(BASE_PORT - 1, ...store.accounts.map((x) => x.port || 0)) + 1 });
  return find(id).port;
};
// app và dòng lệnh dùng chung tệp: luôn đọc lại, và chạy lần lượt
const inQueue = (fn) => { const p = queue.then(() => { load(); return fn(); }); queue = p.catch(() => {}); return p; };

async function debugInfo(port) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) }); return r.ok ? await r.json() : null; } catch { return null; }
}

async function connect(id) {
  const info = await debugInfo(portOf(id));
  if (!info) return null;
  const mod = await import("puppeteer-core");
  const puppeteer = mod.default && mod.default.connect ? mod.default : mod;
  return puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
}

async function closeBrowser(id) {
  const b = await connect(id).catch(() => null);
  await b?.close().catch(() => {});
  for (let i = 0; i < 20 && (await debugInfo(portOf(id))); i++) await sleep(300);
}

// Đọc trạng thái đăng nhập từ trang đang mở (không bấm gì). Cửa sổ chưa mở thì giữ trạng thái cũ.
async function check(id) {
  const b = find(id) && (await connect(id).catch(() => null));
  if (!b) return;
  try {
    const page = (await b.pages()).find((p) => p.url().startsWith("https://gemini.google.com/"));
    if (!page) return;
    const r = await page.evaluate(() => {
      const label = [...document.querySelectorAll("a[aria-label],button[aria-label]")].map((e) => e.getAttribute("aria-label")).find((l) => /^(Tài khoản Google|Google Account)/i.test(l));
      return { label: label || "", ready: !!document.querySelector('[role="textbox"]') };
    });
    if (!r.ready) return;
    const email = (r.label.match(/[\w.+-]+@[\w.-]+\.\w+/) || [])[0];
    const a = find(id);
    patch(a.id, { loggedIn: !!r.label, checkedAt: Date.now(), ...(email ? { email, ...(/^Gemini \d+$/.test(a.name) ? { name: email } : {}) } : {}) });
  } finally {
    b.disconnect();
  }
}

// Mở cửa sổ của một tài khoản. detached: cửa sổ vẫn còn khi lệnh/app kết thúc.
async function openWindow(id) {
  const a = find(id);
  if (!a) throw new Error("Không có tài khoản Gemini: " + id);
  const port = portOf(a.id);
  if (await debugInfo(port)) {
    const b = await connect(a.id);
    const pages = await b.pages();
    const page = pages.find((p) => p.url().startsWith("https://gemini.google.com/")) || (await b.newPage());
    if (!page.url().startsWith("https://gemini.google.com/")) await page.goto(HOME).catch(() => {});
    await page.bringToFront().catch(() => {});
    b.disconnect();
    return;
  }
  const exe = BROWSERS.find((p) => fs.existsSync(p));
  if (!exe) throw new Error("Không tìm thấy Brave/Chrome/Edge (có thể đặt biến FLOW_BROWSER).");
  const profile = path.join(dir, find(a.id).profile);
  fs.mkdirSync(profile, { recursive: true });
  spawn(exe, [
    `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--window-size=1280,860",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion",
    HOME,
  ], { detached: true, stdio: "ignore" }).unref();
  for (let i = 0; i < 40 && !(await debugInfo(port)); i++) await sleep(500);
  if (!(await debugInfo(port))) throw new Error("Không mở được trình duyệt Gemini (cổng " + port + "). Nếu profile này đang mở sẵn, đóng cửa sổ đó rồi thử lại.");
  await cleanTabs(port, "https://gemini.google.com/");
}

// ───────── Tạo video ─────────
const visibleClick = (page, selector, text) => page.evaluate((selector, text) => {
  const el = [...document.querySelectorAll(selector)].find((e) => e.getBoundingClientRect().width && (!text || e.innerText.trim() === text));
  el?.click();
  return !!el;
}, selector, text);

async function waitClick(page, selector, text, what) {
  for (let i = 0; i < 20; i++) {
    if (await visibleClick(page, selector, text)) return sleep(1200);
    await sleep(500);
  }
  throw new Error("Gemini: không thấy " + what + " (giao diện có thể đã đổi).");
}

const MENU = ".cdk-overlay-container button, .cdk-overlay-container [role^=menuitem]";
const TOOLS = 'button[aria-label="Nội dung tải lên và công cụ"]';

// job: { prompt, aspect: "9:16"|"16:9", images: [đường dẫn tệp] }. Bấm gửi là tốn một lượt.
async function submit(job, id) {
  await openWindow(id);
  const b = await connect(id);
  try {
    const page = await b.newPage();
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    for (let i = 0; i < 40 && !(await page.$(TOOLS)); i++) await sleep(500);
    if (/accounts\.google\.com/.test(page.url()) || (await visibleClickable(page, "Đăng nhập"))) throw new Error("Cần đăng nhập Google trong cửa sổ Gemini.");
    await waitClick(page, TOOLS, "", "nút công cụ");
    await waitClick(page, MENU, "Tạo video", 'mục "Tạo video"');
    await sleep(2000);
    await visibleClick(page, "button", "Dùng thử"); // hộp giới thiệu tính năng, chỉ hiện lần đầu
    await sleep(1000);

    await waitClick(page, 'button[aria-label^="Tỷ lệ khung hình"]', "", "nút tỷ lệ khung hình");
    const ratio = job.aspect === "16:9" ? "16:9" : "9:16";
    if (!(await page.evaluate((r) => { const el = [...document.querySelectorAll("[role=menuitemradio]")].find((e) => e.innerText.includes(r)); el?.click(); return !!el; }, ratio))) throw new Error("Gemini: không chọn được tỷ lệ " + ratio);
    await sleep(800);

    if (job.images?.length) {
      await waitClick(page, TOOLS, "", "nút công cụ");
      const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 15000 }), waitClick(page, MENU, "Tải tệp lên", 'mục "Tải tệp lên"')]);
      await chooser.accept(job.images.map((p) => path.resolve(p)));
      await sleep(6000);
    }

    // chữ có lúc không vào ô (con trỏ mất khi menu vừa đóng): kiểm lại, chưa gửi nên gõ lại không tốn lượt
    const typed = () => page.evaluate(() => !!document.querySelector(".ql-editor")?.innerText.trim());
    for (let i = 0; i < 3 && !(await typed()); i++) {
      await page.bringToFront();
      const editor = await page.$(".ql-editor");
      if (!editor) throw new Error("Gemini: không thấy ô nhập.");
      await editor.click();
      await page.keyboard.sendCharacter(job.prompt);
      await sleep(1500);
    }
    if (!(await typed())) throw new Error("Gemini: không gõ được prompt vào ô nhập (chưa gửi, không tốn lượt).");
    const send = 'button[aria-label="Gửi tin nhắn"]';
    for (let i = 0; i < 40; i++) {
      if (await page.evaluate((s) => { const el = document.querySelector(s); return !!el && el.getAttribute("aria-disabled") !== "true" && !el.disabled; }, send)) break;
      await sleep(500);
    }
    const button = await page.$(send);
    if (!button) throw new Error("Gemini: không thấy nút gửi (chưa gửi, không tốn lượt).");
    await button.click();
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      if (/\/app\/[0-9a-f]+/.test(page.url())) return page.url().split("?")[0]; // địa chỉ cuộc trò chuyện: dùng để lấy video sau
    }
    const shown = await page.evaluate(() => (document.querySelector(".cdk-overlay-container")?.innerText || document.querySelector("input-container")?.innerText || "").replace(/\s+/g, " ").slice(0, 300)).catch(() => "");
    throw new Error("Gemini không nhận lệnh tạo. Trang đang hiện: " + shown);
  } finally {
    b.disconnect();
  }
}

const visibleClickable = (page, text) => page.evaluate((t) => [...document.querySelectorAll("a,button")].some((e) => e.getBoundingClientRect().width && e.innerText.trim() === t), text);

// Đợi video trong cuộc trò chuyện rồi tải về. Không gửi gì nên không tốn lượt.
const LIMIT = /hạn mức|giới hạn|hết lượt|limit|quota|try again tomorrow|quay lại vào ngày mai/i;

// máy chủ quá tải: không phải hết hạn mức, thử lại sau (không tự gửi lại)
const BUSY = /high traffic|full capacity|at capacity|quá tải/i;
const REFUSAL = /không thể tạo|can[’']?t (create|generate|make)|cannot (create|generate)|unable to (create|generate)|vi phạm|violat|chính sách|policy/i;

async function download(chatUrl, id, timeoutMin = 10) {
  if (!/^https:\/\/gemini\.google\.com\/app\/[0-9a-f]+$/.test(chatUrl)) throw new Error("Địa chỉ cuộc trò chuyện không hợp lệ: " + chatUrl);
  await openWindow(id);
  const b = await connect(id);
  if (!b) throw new Error("Cửa sổ Gemini chưa mở.");
  try {
    let page = (await b.pages()).find((p) => p.url().split("?")[0] === chatUrl);
    if (!page) { page = await b.newPage(); await page.goto(chatUrl, { waitUntil: "domcontentloaded" }); }
    await page.bringToFront();
    const end = Date.now() + timeoutMin * 60000;
    let text = "";
    while (Date.now() < end) {
      const r = await page.evaluate(() => {
        const last = [...document.querySelectorAll("model-response")].pop();
        const v = last?.querySelector("video");
        return { src: v ? v.currentSrc || v.src || v.querySelector("source")?.src || "" : "", text: (last?.innerText || "").replace(/\s+/g, " ").slice(0, 300) };
      });
      if (r.src) {
        const cookies = await page.cookies(r.src);
        const res = await fetch(r.src, { headers: { Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "), Referer: "https://gemini.google.com/", "User-Agent": await b.userAgent() } });
        const mime = res.headers.get("content-type") || "";
        if (!res.ok || !mime.startsWith("video/")) throw new Error(`Tải video thất bại (HTTP ${res.status}, ${mime}). Lấy lại bằng --fetch ${chatUrl}, đừng tạo lại.`);
        const data = Buffer.from(await res.arrayBuffer());
        await page.close().catch(() => {});
        return { data, mime };
      }
      text = r.text;
      if (LIMIT.test(text)) { const e = new Error("Gemini báo hết hạn mức: " + text); e.limit = true; throw e; }
      if (BUSY.test(text)) throw new Error("Gemini đang quá tải, thử lại sau: " + text);
      if (/encountering an error|đã xảy ra lỗi/i.test(text)) throw new Error("Gemini báo lỗi, không có video: " + text);
      if (REFUSAL.test(text)) throw new Error("Gemini từ chối (chính sách), sửa prompt hoặc ảnh: " + text);
      await sleep(5000);
    }
    throw new Error(`Hết giờ chờ video. Gemini đang hiện: "${text}". Lấy lại sau bằng --fetch ${chatUrl}`);
  } finally {
    b.disconnect();
  }
}

// Gửi rồi tải. Hết hạn mức: dừng tài khoản đó trong ngày, chuyển tài khoản khác. Lỗi khác KHÔNG tự tạo lại.
// GEMINI_ACCOUNT=id|tên|email: chỉ dùng đúng tài khoản đó (để chạy nhiều tài khoản song song).
async function generate(job) {
  const today = new Date().toDateString();
  const pin = process.env.GEMINI_ACCOUNT;
  const all = pin ? [find(pin)] : [find(store.active), ...store.accounts.filter((x) => x.id !== store.active)];
  let last = "";
  for (const a of all.filter((x) => x && x.limitedDay !== today && x.loggedIn !== false)) {
    let release;
    try { release = lockAccount(dir, a.id); } catch (e) { last = e.message; continue; }
    try {
      const chat = await submit(job, a.id);
      console.error("[gemini] đã gửi: " + chat);
      return { ...(await download(chat, a.id, job.timeoutMin)), chat };
    } catch (e) {
      if (!e.limit) throw e;
      last = e.message;
      patch(a.id, { limitedDay: today });
    } finally {
      release();
    }
  }
  throw new Error("Không còn tài khoản Gemini nào dùng được hôm nay (hết hạn mức, đang bận hoặc chưa đăng nhập). " + last);
}

const status = () => ({
  accounts: store.accounts.map((a) => ({ id: a.id, name: a.name, email: a.email || "", loggedIn: a.loggedIn ?? null, active: a.id === store.active, limitedToday: a.limitedDay === new Date().toDateString() })),
});

// Nút "Kiểm tra": cửa sổ đã đóng thì mở lại profile đang dùng, đợi trang tải xong rồi đọc.
async function verify() {
  const a = find(store.active);
  if (!a) throw new Error("Chưa có tài khoản Gemini. Bấm Thêm tài khoản.");
  await openWindow(a.id);
  const before = Date.now();
  for (let i = 0; i < 30; i++) {
    await check(a.id).catch(() => {});
    const now = find(a.id);
    if (now?.checkedAt >= before && (now.loggedIn || i >= 8)) return status(); // chưa thấy đăng nhập: đợi thêm vài giây cho trang tải hết
    await sleep(1000);
  }
  throw new Error("Không đọc được trang Gemini. Xem cửa sổ trình duyệt rồi bấm Kiểm tra lại.");
}

// job từ canvas: ảnh là {mime, base64}, ghi tạm ra đĩa rồi xoá
async function generateFromCanvas(job) {
  const tmp = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "gemini-ref-"));
  try {
    const images = (job.images || []).map((img, i) => {
      const target = path.join(tmp, `anh-${i + 1}.${/jpe?g/.test(img.mime) ? "jpg" : /webp/.test(img.mime) ? "webp" : "png"}`);
      fs.writeFileSync(target, Buffer.from(img.base64, "base64"));
      return target;
    });
    const r = await generate({ ...job, images });
    return { ok: true, data: r.data, mime: r.mime };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const api = {
  generateVideo: (job) => inQueue(() => generateFromCanvas(job)),
  fetchVideo: (chatUrl) => inQueue(() => download(chatUrl, process.env.GEMINI_ACCOUNT ? find(process.env.GEMINI_ACCOUNT)?.id : store.active)),
  generate: (job) => inQueue(() => generate(job)),
  setup(userData) { dir = userData; load(); },
  accounts: () => inQueue(async () => { for (const a of [...store.accounts]) await check(a.id).catch(() => {}); return status(); }),
  check: () => inQueue(async () => { await verify(); return status(); }),
  add: (name) => inQueue(async () => {
    const id = "g" + Date.now().toString(36);
    store.accounts.push({ id, name: String(name || "").trim() || "Gemini " + (store.accounts.length + 1), email: "", profile: "gemini-browser-profile-" + id });
    save();
    await openWindow(id);
    return status();
  }),
  open: (id) => inQueue(async () => { await openWindow(id); return status(); }),
  use: (id) => inQueue(() => { const a = find(id); if (a) { store.active = a.id; save(); } return status(); }),
  rename: (id, name) => inQueue(() => { const a = find(id); if (a && String(name || "").trim()) { a.name = String(name).trim(); save(); } return status(); }),
  // chỉ bỏ khỏi danh sách, không xoá thư mục profile (còn phiên đăng nhập)
  remove: (id) => inQueue(async () => {
    if (find(id)) await closeBrowser(id);
    load();
    store.accounts = store.accounts.filter((a) => a.id !== id);
    if (store.active === id) store.active = store.accounts[0]?.id || "";
    save();
    return status();
  }),
};
module.exports = api;

if (require.main === module) {
  const argv = process.argv.slice(2);
  const all = (flag) => argv.flatMap((x, i) => (x === flag && argv[i + 1] ? [argv[i + 1]] : []));
  const [flag, value] = argv;
  api.setup(process.env.FLOW_DATA || "D:\\infiniti canvas");
  const prompt = () => (all("--prompt-file")[0] ? fs.readFileSync(all("--prompt-file")[0], "utf8").replace(/^\uFEFF/, "") : all("--prompt")[0] || "").trim();
  const one = (flag, fallback) => all(flag)[0] ?? fallback;
  const saveVideo = ({ data, chat, mime }) => {
    if (argv.includes("--out")) console.error("Bỏ qua --out: mọi tệp lưu vào " + outputDir());
    const target = saveOutput(data, one("--name", "gemini-" + Date.now()), mime);
    return `Đã lưu: ${target} (${(data.length / 1048576).toFixed(1)} MB)${chat ? " | " + chat : ""}`;
  };
  const job = () => ({ prompt: prompt(), aspect: one("--aspect", "9:16"), images: all("--image"), timeoutMin: Number(one("--timeout", "10")) });
  const run = argv.includes("--make-video") ? (prompt() ? api.generate(job()).then(saveVideo) : Promise.reject(new Error("Thiếu --prompt hoặc --prompt-file")))
    : argv.includes("--fetch") ? api.fetchVideo(one("--fetch")).then(saveVideo)
    : flag === "--add" ? api.add(value) : flag === "--open" ? api.open(value) : flag === "--check" ? api.check() : api.accounts();
  run.then((r) => console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1))).catch((e) => { console.error("LỖI:", e.message || e); process.exitCode = 1; });
}
