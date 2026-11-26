// Kiem GIAO DIEN cac chuc nang chuyen dong moi (F-94..F-97): chuyen canh (o chon, do dai, dau hieu tren clip), xoay 3D, bieu do (them tu thanh tren,
// sua du lieu, kieu), kinh mo trong Thuoc tinh, hop thoai Mau dung san (chon, dien bien, them nhom clip).
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-motion.mjs   (can out/media/trA.png, trB.png)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const OUT = resolve('out/ui');
mkdirSync(OUT, { recursive: true });
let pass = 0,
  fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
};
const project = async () => (await call('GET', '/project')).data;
const waitFor = async (fn, ms = 8000, label = '') => {
  const t0 = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* thu lai */
    }
    if (Date.now() - t0 > ms) throw new Error('qua han cho: ' + label);
    await sleep(120);
  }
};
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1600, height: 950 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const T = (id) => page.locator(`[data-testid="${id}"]`);
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await call('POST', '/settings', { keymap: {} });
await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');
const imp = async (f) => (await call('POST', '/media_import', { path: resolve(f) })).data.mediaId;
const mA = await imp('out/media/trA.png');
const mB = await imp('out/media/trB.png');
await sleep(1200);
const clip = (id, mediaId, start) => ({ id, track: 'v1', src: { type: 'media', mediaId }, start, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} });
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: clip('A', mA, 0) }, { op: 'add_clip', clip: clip('B', mB, 3) }] });
await T('tab-props').click();

// ---- chuyen canh ----
await page.locator('.clip[data-clip="B"]').click({ position: { x: 30, y: 20 } });
await T('tn-kind').waitFor({ timeout: 4000 });
ok(await T('tn-dur').count() === 0, 'Chua co chuyen canh: o thoi luong an');
await T('tn-kind').selectOption('slideleft');
await waitFor(async () => (await project()).clips.find((c) => c.id === 'B').transition?.kind === 'slideleft', 3000, 'dat chuyen canh');
ok((await project()).clips.find((c) => c.id === 'B').transition.duration === 0.5, 'Chon kieu: clip co transition {slideleft, 0.5s}');
ok((await T('trn-mark').count()) === 1, 'Dau hieu chuyen canh hien tren dau clip');
await T('tn-dur').fill('1.2');
await T('tn-dur').press('Enter');
await waitFor(async () => (await project()).clips.find((c) => c.id === 'B').transition?.duration === 1.2, 3000, 'doi thoi luong');
ok(true, 'Doi thoi luong chuyen canh 1.2s');
await page.evaluate(() => window.__te.player.seek(3.6));
await sleep(500);
await page.screenshot({ path: `${OUT}/m1-transition.png` });
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await waitFor(async () => !(await project()).clips.find((c) => c.id === 'B').transition, 3000, 'hoan tac');
ok(true, 'Ctrl+Z hoan tac chuyen canh');
await page.locator('.clip[data-clip="B"]').click({ position: { x: 30, y: 20 } });
await T('tn-kind').selectOption('flip');
await waitFor(async () => (await project()).clips.find((c) => c.id === 'B').transition?.kind === 'flip', 3000, 'flip');
await T('tn-kind').selectOption('');
await waitFor(async () => !(await project()).clips.find((c) => c.id === 'B').transition, 3000, 'go chuyen canh');
ok((await T('trn-mark').count()) === 0, 'Chon "Khong": go chuyen canh, het dau hieu');

// ---- xoay 3D ----
ok((await T('f-persp').count()) === 0, 'Chua xoay 3D: o Phoi canh an');
await T('f-transform.rotY').fill('40');
await T('f-transform.rotY').press('Enter');
await waitFor(async () => (await project()).clips.find((c) => c.id === 'B').transform.rotY === 40, 3000, 'rotY');
await T('f-persp').waitFor({ timeout: 3000 });
await T('f-persp').fill('2');
await T('f-persp').press('Enter');
await waitFor(async () => (await project()).clips.find((c) => c.id === 'B').transform.persp === 2, 3000, 'persp');
ok(true, 'Xoay 3D doc 40 do + phoi canh 2: ghi vao clip');
await page.evaluate(() => window.__te.player.seek(4));
await sleep(500);
await page.screenshot({ path: `${OUT}/m2-rot3d.png` });
await T('f-transform.rotY').fill('0');
await T('f-transform.rotY').press('Enter');

// ---- bieu do ----
await page.evaluate(() => window.__te.player.seek(0));
await T('add-chart').selectOption('bar');
await waitFor(async () => (await project()).clips.some((c) => c.src.type === 'chart'), 3000, 'them bieu do');
let ch = (await project()).clips.find((c) => c.src.type === 'chart');
ok(ch.src.chart.kind === 'bar' && ch.src.chart.data.length === 4, 'Them bieu do cot tu thanh tren: mac dinh 4 cot', ch.track);
await T('chart-kind').waitFor({ timeout: 3000 });
await T('chart-title').fill('Tang truong');
await T('chart-title').press('Enter');
await waitFor(async () => (await project()).clips.find((c) => c.id === ch.id).src.chart.title === 'Tang truong', 3000, 'tieu de');
await T('chart-data').fill('Thang 1: 1.250,5\nThang 2: 2000\nThang 3: 3.100');
await T('chart-data').blur();
await waitFor(async () => (await project()).clips.find((c) => c.id === ch.id).src.chart.data.length === 3, 3000, 'du lieu');
const dd = (await project()).clips.find((c) => c.id === ch.id).src.chart.data;
ok(dd[0].value === 1250.5 && dd[1].value === 2000 && dd[2].value === 3100 && dd[0].label === 'Thang 1', 'Sua du lieu: doc so kieu Viet (1.250,5 = 1250.5; 3.100 = 3100)', JSON.stringify(dd.map((d) => d.value)));
await T('chart-kind').selectOption('donut');
await waitFor(async () => (await project()).clips.find((c) => c.id === ch.id).src.chart.kind === 'donut', 3000, 'kieu');
await T('chart-palette').fill('#ff0000, #00ff00');
await T('chart-palette').blur();
await waitFor(async () => (await project()).clips.find((c) => c.id === ch.id).src.chart.palette.length === 2, 3000, 'bang mau');
ok(true, 'Doi kieu sang vanh khuyen va bang mau 2 mau');
await page.evaluate(() => window.__te.player.seek(2.5));
await sleep(500);
await page.screenshot({ path: `${OUT}/m3-chart.png` });
await T('add-chart').selectOption('number');
await waitFor(async () => (await project()).clips.filter((c) => c.src.type === 'chart').length === 2, 3000, 'so dem');
ok(true, 'Them so dem (number) tu thanh tren');

// ---- hop thoai mau ----
await page.evaluate(() => window.__te.store.set({ selection: [] }));
await T('open-templates').click();
await T('templates').waitFor({ timeout: 3000 });
await waitFor(async () => (await T('tpl-list').locator('canvas.tpl-thumb').count()) >= 6, 15000, 'anh xem truoc');
ok((await T('tpl-list').locator('.tpl-card').count()) === 8, 'Hop thoai Mau: 8 mau, moi mau co anh xem truoc', `${await T('tpl-list').locator('canvas.tpl-thumb').count()} anh`);
await page.screenshot({ path: `${OUT}/m4-templates.png` });
await T('tpl-glass-card').click();
await T('tv-title').fill('Xin chao Tool Edit');
await page.evaluate(() => window.__te.player.seek(5));
const nBefore = (await project()).clips.length;
await T('tpl-add').click();
await waitFor(async () => (await project()).clips.length === nBefore + 4, 4000, 'them mau');
const p2 = await project();
const tp = p2.clips.filter((c) => c.tag === 'tpl:glass-card');
ok(tp.length === 4 && new Set(tp.map((c) => c.group)).size === 1 && tp.some((c) => c.src.type === 'text' && c.src.text.content === 'Xin chao Tool Edit'), 'Them mau "The kinh": 4 clip cung mot nhom, chu thay bang bien da nhap');
ok(Math.abs(tp[0].start - 5) < 1e-6, 'Mau dat tai con tro (5s)');
ok(tp.some((c) => c.fx?.backdrop?.radius > 0), 'Mau co the kinh voi hieu ung kinh mo (backdrop)');
const sel = await page.evaluate(() => window.__te.store.get().selection);
ok(sel.length === 4 && (await T('templates').count()) === 0, 'Sau khi them: chon ca nhom, dong hop thoai', `${sel.length}`);
await page.evaluate(() => window.__te.player.seek(6.2));
await sleep(700);
await page.screenshot({ path: `${OUT}/m5-template-added.png` });
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips.length === nBefore, 3000, 'hoan tac mau');
ok(true, 'Ctrl+Z go ca mau (mot buoc)');
// kinh mo trong Thuoc tinh
await T('add-shape').selectOption('rect');
await waitFor(async () => (await project()).clips.some((c) => c.src.type === 'shape'), 3000, 'them hinh');
ok((await T('fx-pick').locator('option').allInnerTexts()).some((t) => /Kính mờ/.test(t)), 'Thuoc tinh > Hieu ung: co "Kinh mo (lam mo nen sau)" de them cho hinh');
ok(errs.length === 0, 'Khong co loi JS trong giao dien', errs.join(' | ').slice(0, 200));
console.log(`\n${pass} dat, ${fail} loi`);
await browser.close();
process.exit(fail ? 1 : 0);
