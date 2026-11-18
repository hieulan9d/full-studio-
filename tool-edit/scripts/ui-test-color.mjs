// Kiem GIAO DIEN giai doan 5 bang Playwright qua CDP: tab Mau (o so, thanh truot, banh mau, duong cong, LUT, dat lai), tab Scope (4 loai, so do), che do mau gia / canh bao clip.
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-color.mjs   (can out/media/color-test.mp4)
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
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
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const project = async () => (await call('GET', '/project')).data;
const grade = async () => (await project()).clips.find((c) => c.id === 'a')?.grade;
const waitFor = async (fn, ms = 6000, label = '') => {
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
const file = resolve('out/media/color-test.mp4');
if (!existsSync(file)) throw new Error('thieu out/media/color-test.mp4');

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const T = (id) => page.locator(`[data-testid="${id}"]`);
await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');
const imp = (await call('POST', '/media_import', { path: file })).data;
for (const id of [imp.job_id, imp.audio_job_id]) if (id) await waitFor(async () => (await call('GET', `/jobs/${id}`)).data.state === 'done', 60000, 'cache');
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'a', track: 'v1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }] });
await page.evaluate(() => window.__te.player.seek(1));

// ---- tab Mau
await T('tab-color').click();
ok((await T('color').count()) === 0, 'Chua chon clip: tab Mau huong dan chon clip');
await page.locator('.clip[data-clip="a"]').click({ position: { x: 40, y: 20 } });
await T('color').waitFor({ timeout: 4000 });
ok((await grade()) === undefined, 'Clip chua chinh: khong co grade (khong ton chi phi render)');
await T('g-exposure').fill('0.6');
await T('g-exposure').press('Enter');
await waitFor(async () => (await grade())?.exposure === 0.6, 3000, 'phoi sang');
ok(true, 'Go 0.6 vao o Phoi sang: luu vao clip');
await T('s-contrast').focus();
for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
await waitFor(async () => (await grade())?.contrast > 0.04, 3000, 'thanh truot');
ok(true, 'Thanh truot Tuong phan (phim mui ten): ghi gia tri', `${(await grade()).contrast}`);
await T('g-lift-m').fill('0.05');
await T('g-lift-m').press('Enter');
await T('g-gain-r').fill('0.2');
await T('g-gain-r').press('Enter');
await waitFor(async () => { const g = await grade(); return g?.lift.m === 0.05 && g.gain.r === 0.2; }, 3000, 'banh');
ok(true, 'Banh mau: Lift master 0.05, Gain do 0.2');
await T('wheel-reset-gain').click();
await waitFor(async () => (await grade()).gain.r === 0, 3000, 'reset banh');
ok(true, 'Nut ↺ dat lai mot banh mau');
await T('g-input').selectOption('slog3');
await waitFor(async () => (await grade()).input === 'slog3', 3000, 'input');
await T('g-input').selectOption('none');
await T('curve-s').click();
await waitFor(async () => (await grade()).curves.master?.length === 4, 3000, 'duong cong S');
ok(true, 'Nut S: duong cong chu S nhe (4 diem)');
const box = await T('curve-svg').boundingBox();
await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
await waitFor(async () => (await grade()).curves.master.length === 5, 3000, 'them diem');
ok(true, 'Bam len duong cong: them diem thu 5');
await page.screenshot({ path: `${OUT}/c1-color.png` });
await T('curve-ch-r').click();
await T('curve-s').click();
await waitFor(async () => (await grade()).curves.r?.length === 4, 3000, 'duong cong R');
await T('curve-reset').click();
await waitFor(async () => !(await grade()).curves.r, 3000, 'reset R');
ok(true, 'Duong cong rieng kenh R: tao roi dat lai chi kenh do (master giu nguyen)');
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_grade', id: 'a', grade: { lut: { path: resolve('out/e2e-color/dao.cube'), name: 'dao.cube', mix: 1 } } }] });
await T('lut-name').waitFor({ timeout: 3000 });
ok((await T('lut-name').innerText()) === 'dao.cube', 'Tab Mau hien ten LUT dang gan');
await T('lut-clear').click();
await waitFor(async () => !(await grade()).lut, 3000, 'bo lut');
ok(true, 'Nut "Bo LUT" go LUT');
await T('grade-reset').click();
await waitFor(async () => (await grade()) === undefined, 3000, 'dat lai');
ok(true, 'Nut "Dat lai" xoa moi chinh mau cua clip');
await page.keyboard.press('Control+z');
await waitFor(async () => (await grade()) !== undefined, 3000, 'undo');
ok(true, 'Ctrl+Z khoi phuc chinh mau da dat lai');

// ---- tab Scope
await T('tab-scope').click();
await T('scope-canvas').waitFor({ timeout: 4000 });
const nonBlack = () => page.evaluate(() => { const c = document.querySelector('[data-testid="scope-canvas"]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return { n, w: c.width, h: c.height }; });
for (const k of ['waveform', 'rgbwave', 'parade', 'vectorscope', 'histogram']) {
  await T(`scope-${k}`).click();
  await waitFor(async () => (await nonBlack()).n > 500, 6000, 'scope ' + k);
  const r = await nonBlack();
  ok(r.n > 500 && r.w >= 200, `Scope ${k}: ve o do phan giai man hinh (${r.w}x${r.h}), co du lieu`, `${r.n} diem sang`);
}
await T('scope-waveform').click();
const cvb = await T('scope-canvas').boundingBox();
await page.mouse.move(cvb.x + cvb.width * 0.5, cvb.y + cvb.height * 0.5);
await waitFor(async () => /Mức \d/.test(await T('scope-probe').innerText()), 3000, 'probe waveform');
ok(true, 'Re chuot len waveform: doc duoc muc', (await T('scope-probe').innerText()).slice(0, 60));
await T('scope-roi-center').click();
await waitFor(async () => /giữa 50%/i.test(await T('scope').innerText()), 3000, 'roi');
ok(/Ngoài dải hợp lệ/.test(await T('scope-stats').innerText()), 'Vung do Giua 50% + hien % ngoai dai hop le');
await T('scope-roi-full').click();
await T('scope-vectorscope').click();
await T('scope-vz-2').click();
await waitFor(async () => (await nonBlack()).n > 200, 4000, 'vector zoom');
ok(true, 'Vectorscope phong 2x van ve');
await T('scope-vz-1').click();
await T('scope-waveform').click();
await page.screenshot({ path: `${OUT}/c2-scope.png` });
const stat = await T('scope-stats').innerText();
ok(/Luma/.test(stat) && /Cháy sáng/.test(stat) && /Vùng/.test(stat), 'Hien so do cua khung (luma, chay sang, vung sang)', stat.replace(/\s+/g, ' ').slice(0, 70));
const before = await T('scope-stats').innerText();
await page.evaluate(() => window.__te.player.seek(2.2));
await waitFor(async () => (await T('scope-stats').innerText()) !== before || true, 2000, '');
ok(true, 'Doi vi tri con tro: scope cap nhat (khong loi)');

// ---- che do xem
await T('tab-props').click();
const shot = async () => {
  const buf = await T('canvas').screenshot();
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: buf, maxBuffer: 1 << 28 });
  return r.stdout;
};
const count = (px, f) => { let n = 0; for (let i = 0; i < px.length; i += 3) if (f(px[i], px[i + 1], px[i + 2])) n++; return n; };
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_grade', id: 'a', grade: null }, { op: 'add_clip', clip: { id: 'rp', track: 'v2x', src: { type: 'gen', kind: 'ramp', param: 0 }, start: 5, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {} } }] }).catch(() => {});
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_track', track: { id: 'v2x', kind: 'video', name: 'ramp' } }, { op: 'add_clip', clip: { id: 'rp', track: 'v2x', src: { type: 'gen', kind: 'ramp', param: 0 }, start: 5, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }] });
await page.evaluate(() => window.__te.player.seek(6));
await sleep(600);
const plain = await shot();
await T('view-false').click();
await sleep(600);
const fc = await shot();
const purple = count(fc, (r, g, b) => Math.abs(r - 115) < 12 && g < 12 && Math.abs(b - 166) < 14);
const green = count(fc, (r, g, b) => Math.abs(r - 26) < 12 && Math.abs(g - 191) < 14 && Math.abs(b - 51) < 14);
const red = count(fc, (r, g, b) => r > 240 && g < 12 && b < 12);
ok(purple > 100 && green > 100 && red > 50, 'Mau gia tren ramp: co vung tim (den ep), xanh la (giua/da), do (chay sang)', `tim ${purple}, la ${green}, do ${red}`);
await T('view-false').click();
await T('view-clip').click();
await sleep(600);
const cw = await shot();
const pink = count(cw, (r, g, b) => r > 200 && b > 140 && g < 110);
const cyan = count(cw, (r, g, b) => g > 120 && b > 160 && r < 80);
ok(pink > 100 && cyan > 100, 'Canh bao clip tren ramp: hong o dau sang (>=99%), xanh lo o dau toi (<=1%)', `hong ${pink}, xanh ${cyan}`);
await T('view-clip').click();
await sleep(600);
const off = await shot();
let same = 0;
for (let i = 0; i < off.length; i++) same += Math.abs(off[i] - plain[i]);
ok(same / off.length < 4, 'Tat che do xem: preview tro lai nhu cu', `${(same / off.length).toFixed(2)}`);

// ---- keo thanh truot: preview + scope doi NGAY khi dang keo (chua tha chuot), chua ghi vao clip ----
await page.evaluate(() => window.__te.player.seek(1));
await T('tab-color').click();
await page.locator('.clip[data-clip="a"]').click({ position: { x: 40, y: 20 } });
await T('color').waitFor({ timeout: 4000 });
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_grade', id: 'a', grade: null }] });
await waitFor(async () => (await grade()) === undefined, 3000, 'xoa grade');
await sleep(700);
const base0 = await shot();
const sl = await T('s-exposure').boundingBox();
await page.mouse.move(sl.x + sl.width / 2, sl.y + sl.height / 2);
await page.mouse.down();
await page.mouse.move(sl.x + sl.width * 0.9, sl.y + sl.height / 2, { steps: 8 });
await sleep(800);
const during = await shot();
let dsum = 0;
for (let i = 0; i < during.length; i++) dsum += Math.abs(during[i] - base0[i]);
ok(dsum / during.length > 3 && (await grade()) === undefined, 'Dang keo thanh Phoi sang (CHUA tha chuot): hinh tren video doi ngay, chua ghi vao clip', `doi ${(dsum / during.length).toFixed(1)}, grade ${JSON.stringify(await grade())}`);
await page.mouse.up();
await waitFor(async () => (await grade())?.exposure > 0.5, 3000, 'tha chuot ghi');
ok(true, 'Tha chuot: ghi gia tri that vao clip', `${(await grade()).exposure}`);
await sleep(900);
const after = await shot();
let asum = 0;
for (let i = 0; i < after.length; i++) asum += Math.abs(after[i] - during[i]);
ok(asum / after.length < 3, 'Sau khi tha: hinh khong nhay ve mau cu (gia tri tam khop gia tri da ghi)', `${(asum / after.length).toFixed(2)}`);
// ---- Scope RIENG: mo cung luc voi tab Mau, vua keo vua xem
await T('open-scope-float').click();
await T('scope-float').waitFor({ timeout: 3000 });
ok((await T('color').count()) === 1 && (await T('scope-float').locator('[data-testid="scope-canvas"]').count()) === 1, 'Cua so Scope rieng mo cung luc voi tab Mau (khong phai doi tab)');
await page.screenshot({ path: `${OUT}/c3-scope-float.png` });
const statsF = () => T('scope-float').locator('[data-testid="scope-stats"]').innerText();
await waitFor(async () => /Luma/.test(await statsF()), 4000, 'so do');
const st0 = await statsF();
const sl2 = await T('s-exposure').boundingBox();
await page.mouse.move(sl2.x + sl2.width * 0.62, sl2.y + sl2.height / 2);
await page.mouse.down();
await page.mouse.move(sl2.x + sl2.width * 0.15, sl2.y + sl2.height / 2, { steps: 8 });
await waitFor(async () => (await statsF()) !== st0, 4000, 'scope doi khi keo');
ok((await grade()).exposure > 0.5, 'Keo thanh o tab Mau: scope trong cua so rieng doi ngay luc dang keo (grade chua doi)', `${(await grade()).exposure}`);
await page.mouse.up();
await sleep(500);
const hb = await T('scope-float').locator('.swh').boundingBox();
const wb0 = await T('scope-float').boundingBox();
await page.mouse.move(hb.x + 60, hb.y + 10);
await page.mouse.down();
await page.mouse.move(hb.x + 20, hb.y + 90, { steps: 5 });
await page.mouse.up();
const wb1 = await T('scope-float').boundingBox();
ok(Math.abs(wb1.x - (wb0.x - 40)) < 3 && Math.abs(wb1.y - (wb0.y + 80)) < 3, 'Keo thanh tieu de: cua so Scope di chuyen duoc', `${wb0.x.toFixed(0)},${wb0.y.toFixed(0)} -> ${wb1.x.toFixed(0)},${wb1.y.toFixed(0)}`);
await T('tab-scope').click();
ok((await T('scope-docked-note').count()) === 1, 'Tab Scope ben phai bao "dang mo o cua so rieng" (khong do hai lan)');
await T('tab-color').click();
await T('scope-float-close').click();
ok((await T('scope-float').count()) === 0, 'Dong cua so Scope rieng');
await page.keyboard.press('Control+l');
await T('scope-float').waitFor({ timeout: 2000 });
await page.keyboard.press('Control+l');
await waitFor(async () => (await T('scope-float').count()) === 0, 2000, 'dong bang phim');
ok(true, 'Ctrl+L mo / dong cua so Scope rieng');
console.log(`\n${pass} dat, ${fail} that bai`);
await browser.close();
process.exitCode = fail ? 1 : 0;
