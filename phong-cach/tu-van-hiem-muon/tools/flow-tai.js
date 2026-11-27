// node flow-tai.js <thu_muc> <so_video> [projectId]: tai cac o video moi nhat bang nut Tai xuong cua Flow (khong tao gi)
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const ROOT = "E:/antigravyti/full studio/canvas/desktop";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const [out, count, project] = process.argv.slice(2);
  const mod = await import(require("node:url").pathToFileURL(require("node:module").createRequire(ROOT + "/x.js").resolve("puppeteer-core")).href);
  const puppeteer = mod.default?.connect ? mod.default : mod;
  const info = await (await fetch("http://127.0.0.1:9333/json/version")).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const page = (await browser.pages()).find((p) => p.url().includes("/project/" + (project || "")));
  if (!page) throw new Error("Khong thay tab project Flow tren cong 9333");
  const home = page.url().replace(/\/edit\/.*$/, "");
  await page.bringToFront();
  const cdp = await browser.target().createCDPSession();
  for (let n = 0; n < +count; n++) {
    await page.goto(home, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForSelector("flow-video-tile", { timeout: 40000 });
    await sleep(3000);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-dl-"));
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir });
    await page.evaluate((i) => { const t = [...document.querySelectorAll("flow-video-tile")].filter((x) => x.querySelector("img.thumbnail, video"))[i]; (t.querySelector("img.thumbnail") || t.querySelector("video")).click(); }, n);   // bo qua o dang tao
    const dl = 'button[aria-label="Tải nội dung nghe nhìn xuống"]';
    await page.waitForSelector(dl, { timeout: 30000 });
    await page.evaluate((s) => document.querySelector(s).click(), dl);
    await sleep(1200);
    await page.evaluate(() => {
      const items = [...document.querySelectorAll("flow-menu-item")].filter((x) => x.getBoundingClientRect().width);
      const t = (x) => String(x.innerText).normalize("NFC");
      const it = items.find((x) => /gốc|original/i.test(t(x))) || items.find((x) => !/GIF|tăng|upscal/i.test(t(x)));
      (it.querySelector("button") || it).click();
    });
    let got = false;
    for (let i = 0; i < 240 && !got; i++) {
      await sleep(500);
      const all = fs.readdirSync(dir);
      if (all.length && !all.some((x) => x.endsWith(".crdownload"))) { await sleep(500); fs.copyFileSync(path.join(dir, all[0]), `${out}/v${n}.mp4`); got = true; }
    }
    console.log(n, got ? "XONG" : "LOI");
  }
  await cdp.send("Browser.setDownloadBehavior", { behavior: "default" });
  await page.goto(home, { waitUntil: "domcontentloaded" }).catch(() => {});
  await browser.disconnect();
})().catch((e) => { console.log("LOI", e.message); process.exit(1); });
