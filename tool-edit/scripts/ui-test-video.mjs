// Kiem GIAO DIEN giai doan 4 bang Playwright qua CDP: toc do / speed ramp (o so, preset, nut thoi, duong cong), tach nen RVM that,
// chi hien nguoi (muc den/trang/lam mem), chu sau lung nguoi, media matte bi an khoi kho.
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-video.mjs   (can e2e-video.mjs da tao out/media/ramp-lin.mp4 va aroll6.mp4)
import { chromium } from 'playwright-core';
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
const lin = resolve('out/media/ramp-lin.mp4');
const aroll6 = resolve('out/media/aroll6.mp4');
if (!existsSync(lin) || !existsSync(aroll6)) throw new Error('thieu out/media/ramp-lin.mp4 hoac aroll6.mp4: chay scripts/e2e-video.mjs truoc');

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const T = (id) => page.locator(`[data-testid="${id}"]`);

await call('POST', '/project/new', {});
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');
const importOne = async (f) => {
  const r = (await call('POST', '/media_import', { path: f })).data;
  for (const id of [r.job_id, r.audio_job_id]) if (id) await waitFor(async () => (await call('GET', `/jobs/${id}`)).data.state === 'done', 90000, 'cache');
  return r.mediaId;
};
const mLin = await importOne(lin);
const mAr = await importOne(aroll6);
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'a', track: 'v1', src: { type: 'media', mediaId: mLin }, start: 0, duration: 4, in: 0, volume: 1, transform: {}, keyframes: {} } }] });
await T('tab-props').click();
await page.locator('.clip[data-clip="a"]').click({ position: { x: 40, y: 20 } });

// ---- 1. toc do
ok((await T('f-speed').count()) === 1, 'Inspector clip media co muc "Toc do" voi o so');
await T('f-speed').fill('2');
await T('f-speed').press('Enter');
await waitFor(async () => (await project()).clips[0].speed === 2, 3000, 'toc do 2');
ok(true, 'Go 2 vao o Toc do: clip co speed = 2');
await page.screenshot({ path: `${OUT}/v1-speed.png` });
await T('f-speed').fill('2.4');
await T('f-speed').press('Enter');
await waitFor(async () => (await project()).clips[0].speed === 2.4, 3000, 'toc do 2.4');
await T('f-speed').fill('9');
await T('f-speed').press('Enter');
await sleep(500);
ok((await project()).clips[0].speed === 2.4, 'Toc do 9x: clip 4 giay can 36 giay nguon, vuot nguon 10s -> bi tu choi, giu 2.4x');
await T('speed-preset').selectOption('hero-time');
await T('speed-apply').click();
await waitFor(async () => (await project()).clips[0].keyframes.speed?.length === 4, 3000, 'preset');
let c = (await project()).clips[0];
ok(c.speed === undefined && c.keyframes.speed[1].v === 0.25 && Math.abs(c.keyframes.speed[1].t - 1.4) < 1e-6, 'Preset hero-time: 4 keyframe toc do co gian theo do dai clip, bo toc do co dinh', `t1=${c.keyframes.speed[1].t}`);
ok((await T('kf-speed').innerText()).length > 0 && (await page.locator('.kf[data-prop="speed"] .kfd.some, .kf[data-prop="speed"] .kfd.on').count()) === 1, 'Nut thoi keyframe cua Toc do hien trang thai co keyframe');
await T('tab-graph').click();
await page.waitForTimeout(300);
const graphTxt = await page.locator('[data-testid="graph"], .graph').first().innerText().catch(() => '');
ok(/Tốc độ/.test(graphTxt) || (await page.locator('text=Tốc độ').count()) > 0, 'Tab Duong cong liet ke "Toc do" de chinh bezier');
await T('tab-props').click();
await T('speed-clear').click();
await waitFor(async () => !(await project()).clips[0].keyframes.speed, 3000, 'xoa ramp');
ok(true, 'Dat lai toc do 1x: xoa speed ramp');

// ---- 2. tach nen that
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_track', track: { id: 'v9', kind: 'video', name: 'Nguoi noi' } }, { op: 'add_clip', clip: { id: 'p', track: 'v9', src: { type: 'media', mediaId: mAr }, start: 10, duration: 6, in: 0, volume: 1, transform: {}, keyframes: {} } }] });
await page.locator('.clip[data-clip="p"]').click({ position: { x: 20, y: 20 } });
ok((await T('matte-run').count()) === 1 && (await T('matte-on').count()) === 0, 'Clip video chua tach nen: co nut "Tach nen", chua co cong tac "Chi hien nguoi"');
await T('matte-run').click();
// lan dau: job chay that (co thanh tien do); lan sau matte da co trong cache nen xong ngay (dung lai)
const seen = await Promise.race([T('matte-progress').waitFor({ timeout: 6000 }).then(() => 'progress'), T('matte-on').waitFor({ timeout: 6000 }).then(() => 'reuse')]).catch(() => 'none');
ok(seen !== 'none', 'Bam Tach nen: hien thanh tien do (job chay nen) hoac dung lai matte da co', seen);
if (seen === 'progress') ok(/Tách nền/.test(await page.locator('body').innerText()), 'Thanh tren hien nhan cong viec "Tach nen"');
await waitFor(async () => (await project()).media.find((m) => m.id === mAr)?.matte, 120000, 'matte xong');
await waitFor(async () => (await project()).media.find((m) => m.role === 'matte')?.cache?.status === 'ready', 60000, 'cache matte');
await T('matte-on').waitFor({ timeout: 8000 });
ok(true, 'Tach nen xong: co cong tac "Chi hien nguoi" va muc chinh matte');
const nPool = await page.locator('[data-media]').count();
ok(nPool === 2 && (await project()).media.length === 3, 'Kho media chi hien 2 media goc (matte la media phu, bi an)', `${nPool}/${(await project()).media.length}`);
await T('matte-on').check();
await waitFor(async () => (await project()).clips.find((x) => x.id === 'p').matte, 3000, 'matte on');
await T('matte-lo').fill('0.3');
await T('matte-lo').press('Enter');
await T('matte-feather').fill('3');
await T('matte-feather').press('Enter');
await waitFor(async () => { const m = (await project()).clips.find((x) => x.id === 'p').matte; return m.lo === 0.3 && m.feather === 3; }, 3000, 'matte opts');
ok(true, 'Chinh muc den 0.3 va lam mem 3: luu vao clip');
await page.screenshot({ path: `${OUT}/v2-matte.png` });

// ---- 3. chu sau lung nguoi
await T('behind-text').fill('SAU LUNG');
await T('behind-run').click();
await waitFor(async () => (await project()).clips.some((x) => x.tag === 'cutout:p'), 4000, 'cutout');
const pj = await project();
const ov = pj.clips.find((x) => x.tag === 'cutout:p');
const tx = pj.clips.find((x) => x.src.type === 'text' && x.src.text.content === 'SAU LUNG');
const order = pj.tracks.map((t) => t.id);
ok(ov && tx && ov.volume === 0 && ov.matte && order.indexOf('v9') < order.indexOf(tx.track) && order.indexOf(tx.track) < order.indexOf(ov.track), 'Nut "Chu sau nguoi": video goc < chu < lop nguoi tach nen (tren cung, tat tieng)', order.join('>'));
ok(Math.abs(tx.start - 10) < 1e-6 && Math.abs(tx.duration - 6) < 1e-6, 'Chu phu dung do dai clip nguoi noi');
await page.keyboard.press('Control+z');
await waitFor(async () => !(await project()).clips.some((x) => x.tag === 'cutout:p'), 3000, 'undo');
ok(true, 'Ctrl+Z hoan tac mot buoc ca track chu, track nguoi va clip');

// ---- 4. de xuat cua AI hien dung
const pr = (await call('POST', '/propose', { ops: [{ op: 'set_speed', id: 'a', speed: 2 }, { op: 'set_clip_matte', id: 'p', matte: null }], note: 'thu', source: 'ai:test' })).data;
await T('tab-proposals').click();
await waitFor(async () => (await page.locator('[data-proposal]').count()) >= 1, 4000, 'the de xuat');
const txt = await page.locator('[data-proposal]').first().innerText();
ok(/tốc độ clip a: 2x/.test(txt) && /gỡ matte clip p/.test(txt), 'The de xuat tom tat dung "toc do" va "go matte"', txt.replace(/\s+/g, ' ').slice(0, 90));
void pr;

console.log(`\n${pass} dat, ${fail} that bai`);
await browser.close();
process.exitCode = fail ? 1 : 0;
