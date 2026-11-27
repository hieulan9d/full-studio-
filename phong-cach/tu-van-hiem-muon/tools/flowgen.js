// node flowgen.js dry|go <job.json>   - dieu khien tab project Flow dang mo (ke ca URL /u/N/) qua cong 9333
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const ROOT = "E:/antigravyti/full studio/canvas/desktop";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const [mode, jobFile] = process.argv.slice(2);
  const cfg = JSON.parse(fs.readFileSync(jobFile, "utf8"));
  const mod = await import(require("node:url").pathToFileURL(require("node:module").createRequire(ROOT + "/x.js").resolve("puppeteer-core")).href);
  const puppeteer = mod.default?.connect ? mod.default : mod;
  const info = await (await fetch("http://127.0.0.1:9333/json/version")).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const page = (await browser.pages()).find((p) => p.url().includes("/project/" + cfg.projectId));
  if (!page) throw new Error("Khong thay tab project");
  const home = page.url().replace(/\/edit\/.*$/, "");
  await page.bringToFront();
  // tai lai trang de dong bang chon con mo tu lan truoc
  await page.goto(home, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForSelector(".ProseMirror", { timeout: 40000 });
  await sleep(3000);
  const inject = () => page.evaluate(fs.readFileSync(ROOT + "/flow-page-driver.js", "utf8"));
  await inject();
  const job = {
    ...cfg.job,
    prompt: fs.readFileSync(cfg.promptFile, "utf8").trim(),
    images: (cfg.images || []).map((p) => ({ name: path.basename(p), mime: "image/jpeg", base64: fs.readFileSync(p).toString("base64") })),
    kind: cfg.job.kind || "video", trustedClick: true, dryRun: mode === "dry",
  };
  const sub = await page.evaluate(`window.__flowUi.submit(${JSON.stringify(job)}).catch((e) => ({ error: String(e.message || e), log: window.__flowUi.log.slice(-15) }))`);
  await sleep(800);
  await page.screenshot({ path: cfg.shot });
  if (sub.error) { console.log("LOI", sub.error, sub.log); process.exit(1); }
  if (mode === "dry") { console.log("DRY OK, anh:", cfg.shot); process.exit(0); }
  await page.mouse.click(sub.clickAt.x, sub.clickAt.y);
  const t0 = Date.now(); sub.t0 = t0;
  console.log("da bam tao");
  for (;;) {
    await sleep(5000);
    if (Date.now() - t0 > 600000) throw new Error("Het gio cho");
    await inject().catch(() => {});
    const st = await page.evaluate(`window.__flowUi.poll(${JSON.stringify({ baseline: sub.baseline, expect: 1, t0, kind: job.kind })})`).catch(() => null);
    if (!st) continue;
    if (st.state === "failed") { await page.screenshot({ path: cfg.shot }); console.log("FLOW LOI:", st.error); process.exit(1); }
    if (st.state === "done") break;
  }
  if (job.kind === "image") {
    await sleep(3000);
    const st2 = await page.evaluate(`window.__flowUi.poll(${JSON.stringify({ baseline: sub.baseline, expect: 1, t0, kind: "image" })})`);
    const raw = st2.videos[0].url; const url = raw.split("?")[0].replace(/=[\w,-]*$/, "") + "=s0" + (raw.includes("?") ? "?" + raw.split("?")[1] : ""); console.log("duoi url:", (raw.split("?")[0].match(/=[\w,-]*$/) || [""])[0]);
    const cookies = await page.cookies(url);
    const res = await fetch(url, { headers: { Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "), Referer: "https://flow.google.com/", "User-Agent": await browser.userAgent() } });
    if (!res.ok) throw new Error("tai anh loi " + res.status);
    fs.writeFileSync(cfg.out, Buffer.from(await res.arrayBuffer()));
    console.log("XONG:", cfg.out);
    await browser.disconnect(); return;
  }
  // tai ban goc bang nut "Tai xuong" cua Flow
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-dl-"));
  const cdp = await browser.target().createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir });
  await page.evaluate(() => { const t = document.querySelector("flow-video-tile"); (t.querySelector("img.thumbnail") || t.querySelector("video")).click(); });
  const dl = 'button[aria-label="Tải nội dung nghe nhìn xuống"]';
  await page.waitForSelector(dl, { timeout: 30000 });
  await page.evaluate((s) => document.querySelector(s).click(), dl);
  await sleep(1200);
  await page.evaluate(() => {
    const n = (x) => String(x.innerText).normalize("NFC");
    const items = [...document.querySelectorAll("flow-menu-item")].filter((x) => x.getBoundingClientRect().width);
    const it = items.find((x) => /gốc|original/i.test(n(x))) || items.find((x) => !/GIF|tăng|upscal/i.test(n(x)));
    (it.querySelector("button") || it).click();
  });
  for (let i = 0; i < 240; i++) {
    await sleep(500);
    const all = fs.readdirSync(dir);
    if (all.length && !all.some((x) => x.endsWith(".crdownload"))) {
      await sleep(500);
      fs.copyFileSync(path.join(dir, all[0]), cfg.out);
      console.log("XONG:", cfg.out);
      break;
    }
  }
  await cdp.send("Browser.setDownloadBehavior", { behavior: "default" });
  await page.goto(home, { waitUntil: "domcontentloaded" }).catch(() => {});
  process.exit(fs.existsSync(cfg.out) ? 0 : 1);
})().catch((e) => { console.error("LOI", e.message || e); process.exit(1); });
