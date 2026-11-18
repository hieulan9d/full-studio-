// Kiem GIAO DIEN giai doan 6 bang Playwright qua CDP: them hinh, muc Hinh, hieu ung lop (them/sua/keyframe/go), che do tron, tom tat de xuat.
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-fx.mjs
import { chromium } from 'playwright-core';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
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
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const T = (id) => page.locator(`[data-testid="${id}"]`);
await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');

// 1. them hinh
await T('add-shape').selectOption('ellipse');
const sc = await waitFor(async () => (await project()).clips.find((c) => c.src.type === 'shape'), 4000, 'hinh');
ok(sc.src.shape.kind === 'ellipse' && T('shape-kind') !== null, 'Menu "+ Hinh": them elip tai con tro, chon san clip');
await T('shape-kind').waitFor({ timeout: 3000 });
ok((await T('shape-kind').inputValue()) === 'ellipse', 'Inspector co muc "Hinh" voi loai elip');
await T('shape-kind').selectOption('star');
await waitFor(async () => (await project()).clips[0].src.shape.kind === 'star', 3000, 'doi loai');
ok(true, 'Doi loai hinh sang sao');
await T('f-shape.w').fill('600');
await T('f-shape.w').press('Enter');
await waitFor(async () => (await project()).clips[0].src.shape.w === 600, 3000, 'rong');
ok(true, 'Sua rong hinh = 600 px');
// 2. hieu ung
const opts = await T('fx-pick').locator('option').allInnerTexts();
ok(!opts.some((o) => /Crop|Bo góc/.test(o)) && opts.some((o) => /Glow/.test(o)), 'Clip hinh khong co Crop/Bo goc trong danh sach hieu ung (chi clip video/anh)', opts.join(','));
await T('fx-pick').selectOption('glow');
await T('fx-add').click();
await waitFor(async () => (await project()).clips[0].fx?.glow, 3000, 'glow');
ok(true, 'Them hieu ung Phat sang (glow): co gia tri mac dinh');
await T('f-fx.glow.radius').fill('80');
await T('f-fx.glow.radius').press('Enter');
await waitFor(async () => (await project()).clips[0].fx.glow.radius === 80, 3000, 'glow radius');
ok(true, 'Sua ban kinh glow = 80');
await T('kf-fx.glow.intensity').click();
await waitFor(async () => (await project()).clips[0].keyframes['fx.glow.intensity']?.length === 1, 3000, 'keyframe');
ok(true, 'Nut thoi keyframe tren thong so hieu ung: tao keyframe fx.glow.intensity');
await T('fx-pick').selectOption('blur');
await T('fx-add').click();
await waitFor(async () => (await project()).clips[0].fx.blur, 3000, 'blur');
ok((await T('fx-blur').count()) === 1 && (await T('fx-glow').count()) === 1, 'Nhieu hieu ung cung luc: hien khoi rieng cho glow va blur');
// 3. blend
await T('f-blend').selectOption('screen');
await waitFor(async () => (await project()).clips[0].blend === 'screen', 3000, 'blend');
ok(true, 'Che do tron: chon Screen');
await T('f-blend').selectOption('normal');
await waitFor(async () => (await project()).clips[0].blend === undefined, 3000, 'blend normal');
ok(true, 'Che do tron Binh thuong go truong blend');
// 4. go
await T('fx-glow-off').click();
await waitFor(async () => { const c = (await project()).clips[0]; return !c.fx.glow && !c.keyframes['fx.glow.intensity']; }, 3000, 'go glow');
ok(true, 'Nut ✕ go glow, keyframe cua no cung bi go');
await page.keyboard.press('Control+z');
await waitFor(async () => (await project()).clips[0].fx?.glow && (await project()).clips[0].keyframes['fx.glow.intensity'], 3000, 'undo');
ok(true, 'Ctrl+Z khoi phuc ca glow va keyframe');
// 5. de xuat
await call('POST', '/propose', { ops: [{ op: 'set_fx', id: (await project()).clips[0].id, fx: { vignette: { amount: 0.5 } } }, { op: 'set_blend', id: (await project()).clips[0].id, blend: 'add' }], note: 'tt', source: 'ai:test' });
await T('tab-proposals').click();
await waitFor(async () => (await page.locator('[data-proposal]').count()) >= 1, 4000, 'the de xuat');
const txt = await page.locator('[data-proposal]').first().innerText();
ok(/hiệu ứng clip/.test(txt) && /chế độ trộn clip/.test(txt), 'The de xuat tom tat dung "hieu ung" va "che do tron"', txt.replace(/\s+/g, ' ').slice(0, 90));

console.log(`\n${pass} dat, ${fail} that bai`);
await browser.close();
process.exitCode = fail ? 1 : 0;
