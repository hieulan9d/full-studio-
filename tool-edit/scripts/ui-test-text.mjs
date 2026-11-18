// Kiem GIAO DIEN chu + keyframe + graph editor bang Playwright qua CDP (dieu khien cua so Electron that).
// Chay app: TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1 npx electron .   roi: node scripts/ui-test-text.mjs
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
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
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
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
    await sleep(100);
  }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const rgb = (png, w, h) => spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 28 }).stdout;
const maxChannel = (buf) => { let m = 0; for (const v of buf) if (v > m) m = v; return m; };
const frameBuf = async (t) => rgb((await call('GET', `/preview_frame?t=${t}&scale=0.3`)).data);

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.TOOL_EDIT_CDP_PORT ?? 9333}`);
const page = browser.contexts()[0].pages()[0];
await page.setViewportSize({ width: 1500, height: 900 }).catch(() => {});
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'giao dien san sang');
const st = (fn, ...a) => page.evaluate(fn, ...a);
const seek = async (t) => {
  await st((x) => window.__te.player.seek(x), t);
  await waitFor(async () => near(await st(() => window.__te.store.get().playhead), t, 1e-6), 2000, 'seek');
};
const T = (id) => page.locator(`[data-testid="${id}"]`);
const clipOf = async (id) => (await project()).clips.find((c) => c.id === id);
const lastClip = async () => (await project()).clips.at(-1);

// ---- 0. du an moi + them chu tu preset trong thanh tren
await call('POST', '/project/new', {});
await waitFor(async () => (await project()).clips.length === 0, 3000, 'new');
await page.reload();
await waitFor(() => page.evaluate(() => !!window.__te), 15000, 'reload');
await T('add-preset').selectOption('keyword-gradient');
await waitFor(async () => (await project()).clips.length === 1, 4000, 'them chu tu preset');
let c = await lastClip();
ok(c.src.type === 'text' && c.src.text.fill.type === 'linear' && c.src.text.fill.stops[0].color === '#7563ff', 'Thanh tren: "+ Chu tu preset" tao clip chu voi kieu keyword-gradient');
ok(c.keyframes['transform.scale']?.length === 2 && c.keyframes['transform.opacity']?.length === 4, 'Preset kem keyframe (scale 2 khung, do duc 4 khung)');
await sleep(500);
const markers = await page.locator('.clip .kfm').count();
ok(markers >= 5, 'Timeline hien cac dau keyframe (hinh thoi vang) tren clip', `${markers} dau`);
ok((await st(() => window.__te.store.get().selection)).join() === c.id && (await T('f-content').inputValue()).includes('Từ khoá'), 'Clip moi duoc chon, bang thuoc tinh hien noi dung chu');

// ---- 1. noi dung + preview
await T('f-content').fill('Xin chào Việt Nam');
await T('f-content').blur();
await waitFor(async () => (await lastClip()).src.text.content === 'Xin chào Việt Nam', 3000, 'noi dung');
await seek(1);
await sleep(400);
const fb = await frameBuf(1);
ok(maxChannel(fb) > 150, 'Doi noi dung chu: preview ve chu moi (co pixel sang)');
await page.screenshot({ path: `${OUT}/t1-text-inspector.png` });

// ---- 2. font + canh bao tieng Viet
await waitFor(async () => (await page.locator('[data-testid="f-font"] option').count()) > 20, 20000, 'danh sach font');
const groups = await page.locator('[data-testid="f-font"] optgroup').evaluateAll((g) => g.map((x) => x.label));
ok(groups.includes('Đủ dấu tiếng Việt') && groups.includes('Thiếu dấu tiếng Việt'), 'Danh sach font chia 2 nhom: du dau / thieu dau tieng Viet', groups.join(' | '));
await T('f-font').selectOption('Impact');
await waitFor(async () => (await lastClip()).src.text.font === 'Impact', 3000, 'doi font');
await waitFor(() => T('warn-vn').count().then((n) => n === 1), 3000, 'canh bao');
ok(true, 'Chon font Impact (thieu dau) voi chu Viet: hien CANH BAO do trong bang thuoc tinh');
await T('f-font').selectOption('Segoe UI Black');
await waitFor(async () => (await T('warn-vn').count()) === 0, 3000, 'het canh bao');
ok(true, 'Doi sang Segoe UI Black: canh bao bien mat');

// ---- 3. co chu, fill gradient, stops, goc
await T('f-text.size').fill('180');
await T('f-text.size').press('Enter');
await waitFor(async () => (await lastClip()).src.text.size === 180, 3000, 'size');
ok(true, 'Co chu 180 -> project.text.size = 180');
await T('add-stop').click();
await waitFor(async () => (await lastClip()).src.text.fill.stops.length === 3, 3000, 'them diem mau');
await T('stop-pos-1').fill('30');
await T('stop-pos-1').press('Enter');
await waitFor(async () => near((await lastClip()).src.text.fill.stops[1].pos, 0.3, 1e-6), 3000, 'pos');
ok(true, 'Gradient: them diem mau thu 3, dat vi tri 30%');
await T('f-text.fill.angle').fill('45');
await T('f-text.fill.angle').press('Enter');
await waitFor(async () => (await lastClip()).src.text.fill.angle === 45, 3000, 'angle');
ok(true, 'Gradient: goc 45 do');
await T('f-filltype').selectOption('radial');
await waitFor(async () => (await lastClip()).src.text.fill.type === 'radial', 3000, 'radial');
await T('f-filltype').selectOption('solid');
await waitFor(async () => (await lastClip()).src.text.fill.type === 'solid', 3000, 'solid');
await T('f-fillcolor').fill('#ff0000');
await T('f-fillcolor').blur();
await waitFor(async () => (await lastClip()).src.text.fill.color === '#ff0000', 3000, 'mau');
ok(true, 'Doi kieu fill: radial -> solid, chon mau do #ff0000');
await sleep(400);
const redBuf = await frameBuf(1.5);
let reds = 0;
for (let i = 0; i < redBuf.length; i += 3) if (redBuf[i] > 180 && redBuf[i + 1] < 60 && redBuf[i + 2] < 60) reds++;
ok(reds > 300, 'Preview ve chu mau DO sau khi doi fill', `${reds} pixel do`);
await T('f-filltype').selectOption('linear');

// ---- 4. animator
await T('f-animpreset').selectOption('fade');
await T('f-animunit').selectOption('char');
await waitFor(async () => { const a = (await lastClip()).src.text.animator; return a.preset === 'fade' && a.unit === 'char'; }, 3000, 'animator');
await T('f-animstagger').fill('0.1');
await T('f-animstagger').press('Enter');
await waitFor(async () => near((await lastClip()).src.text.animator.stagger, 0.1, 1e-6), 3000, 'stagger');
ok(true, 'Animator: kieu fade, theo ky tu, cach nhau 0.1s');

// ---- 5. them chu thuong: tu tao track moi neu bi chiem
await seek(0);
await T('add-text').click();
await waitFor(async () => (await project()).clips.length === 2, 4000, 'them chu');
const pj = await project();
const c2 = pj.clips.at(-1);
ok(c2.track !== 'v1' && pj.tracks.filter((t) => t.kind === 'video').length === 2, '+ Chu khi track bi chiem: tu tao track video moi', `clip ${c2.id} tren ${c2.track}`);
ok((await st(() => window.__te.store.get().selection)).join() === c2.id, 'Clip chu moi duoc chon');

// ---- 6. keyframe CapCut: nut thoi
await seek(1);
await T('kf-transform.opacity').click();
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity']?.length === 1, 3000, 'kf them');
let k = (await clipOf(c2.id)).keyframes['transform.opacity'][0];
ok(near(k.t, 1, 1e-4) && k.v === 1, 'Bam ◇ tai t=1s: them keyframe do duc (t=1, v=1)', `t=${k.t} v=${k.v}`);
ok((await T('kf-transform.opacity').innerText()) === '◆', 'Nut thoi doi thanh ◆ khi dung tai keyframe');
await seek(2);
await T('f-transform.opacity').fill('20');
await T('f-transform.opacity').press('Enter');
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity']?.length === 2, 3000, 'kf tu dong');
const ks = (await clipOf(c2.id)).keyframes['transform.opacity'];
ok(near(ks[1].t, 2, 1e-4) && near(ks[1].v, 0.2, 1e-6), 'Sua gia tri khi thuoc tinh DA co keyframe: tu tao keyframe tai con tro (t=2, v=0.2)', `t=${ks[1].t} v=${ks[1].v}`);
await call('POST', '/ops', { source: 'human', ops: [{ op: 'remove_clip', id: c.id }] }); // go clip chu thu nhat de chi do clip dang kiem
await waitFor(async () => (await project()).clips.length === 1, 3000, 'go clip 1');
await seek(1.5);
await sleep(300);
const mid = Number(await T('f-transform.opacity').inputValue());
ok(near(mid, 60, 1.5), 'O so hien gia tri NOI SUY tai con tro: t=1.5 giua 100% va 20% = 60%', `${mid}`);
await sleep(300);
const half = await frameBuf(1.5);
ok(near(maxChannel(half), 203, 14), 'Preview tai t=1.5: chu trang do duc 60% (sang ~203)', `${maxChannel(half)}`);
await seek(0.5);
await page.locator('.kf[data-prop="transform.opacity"] .kfn').last().click();
await waitFor(async () => near(await st(() => window.__te.store.get().playhead), 1, 1e-3), 2000, 'next kf');
ok(true, 'Nut › nhay toi keyframe ke tiep (t=1)');
await T('kf-transform.opacity').click(); // dang dung tai keyframe -> xoa
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity']?.length === 1, 3000, 'kf xoa');
ok(true, 'Bam ◆ tai keyframe: xoa keyframe');
await page.keyboard.press('Control+z');
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity']?.length === 2, 3000, 'undo kf');
ok(true, 'Ctrl+Z hoan tac viec xoa keyframe');

// ---- 7. dau keyframe tren timeline
const kfm = page.locator(`.clip[data-clip="${c2.id}"] .kfm`).first();
const kt = Number(await kfm.getAttribute('data-kf'));
await kfm.click();
await waitFor(async () => near(await playhead(), c2.start + kt, 1e-3), 2000, 'click dau kf').catch(() => {});
async function playhead() { return st(() => window.__te.store.get().playhead); }
ok(near(await playhead(), c2.start + kt, 1e-3), 'Click dau hinh thoi tren timeline dua con tro toi keyframe', `t=${(await playhead()).toFixed(3)}`);

// ---- 8. graph editor
await T('tab-graph').click();
await T('graph-curve').waitFor({ timeout: 3000 });
const dots = await page.locator('[data-testid^="key-dot-"]').count();
ok(dots === 2, 'Graph editor: ve duong cong va 2 diem keyframe', `${dots} diem`);
const svg = await T('graph-svg').boundingBox();
// keo diem 1 (t=2, v=0.2) len tren
let d1 = await T('key-dot-1').boundingBox();
const v0 = (await clipOf(c2.id)).keyframes['transform.opacity'][1].v;
await page.mouse.move(d1.x + d1.width / 2, d1.y + d1.height / 2);
await page.mouse.down();
await page.mouse.move(d1.x + d1.width / 2, d1.y + d1.height / 2 - 40, { steps: 6 });
await page.mouse.up();
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity'][1].v > v0 + 0.05, 3000, 'keo gia tri');
ok(true, 'Keo diem keyframe len: gia tri tang', `${v0} -> ${(await clipOf(c2.id)).keyframes['transform.opacity'][1].v.toFixed(2)}`);
// keo ngang diem 1 de doi thoi gian
d1 = await T('key-dot-1').boundingBox();
const t0 = (await clipOf(c2.id)).keyframes['transform.opacity'][1].t;
await page.mouse.move(d1.x + d1.width / 2, d1.y + d1.height / 2);
await page.mouse.down();
await page.mouse.move(d1.x + d1.width / 2 + 25, d1.y + d1.height / 2, { steps: 6 });
await page.mouse.up();
await waitFor(async () => Math.abs((await clipOf(c2.id)).keyframes['transform.opacity'].at(-1).t - t0) > 0.05, 3000, 'keo thoi gian');
ok(true, 'Keo diem keyframe sang phai: thoi gian doi', `${t0} -> ${(await clipOf(c2.id)).keyframes['transform.opacity'].at(-1).t.toFixed(2)}`);
// chon diem 0, chinh ease
await T('key-dot-0').click();
await T('ease-select').waitFor({ timeout: 3000 });
ok((await T('ease-select').inputValue()) === 'ease-in-out', 'Chon keyframe: hien duong cong ease hien tai (ease-in-out)');
await T('ease-select').selectOption('snap');
await waitFor(async () => { const e = (await clipOf(c2.id)).keyframes['transform.opacity'][0].ease; return e.kind === 'bezier' && e.x1 === 0.1 && e.y1 === 0.9; }, 3000, 'ease snap');
ok(true, 'Chon preset ease "snap": cubic-bezier(0.1, 0.9, 0.2, 1)');
await page.screenshot({ path: `${OUT}/t2-graph.png` });
await T('ease-h1').scrollIntoViewIfNeeded(); // hop bezier nam duoi hang nut: cuon vao tam nhin nhu nguoi dung
await sleep(150);
const h1 = await T('ease-h1').boundingBox();
const easeBefore = (await clipOf(c2.id)).keyframes['transform.opacity'][0].ease;
await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2);
await page.mouse.down();
await page.mouse.move(h1.x + h1.width / 2 + 40, h1.y + h1.height / 2 + 30, { steps: 8 });
await page.mouse.up();
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity'][0].ease.x1 !== easeBefore.x1, 3000, 'keo tay nam');
const easeAfter = (await clipOf(c2.id)).keyframes['transform.opacity'][0].ease;
ok(easeAfter.kind === 'bezier' && easeAfter.x1 > easeBefore.x1 && easeAfter.y1 < easeBefore.y1 && (await T('ease-values').innerText()).includes(String(easeAfter.x1)), 'Keo tay nam bezier: duong cong doi (custom), so hien dung', `x1 ${easeBefore.x1} -> ${easeAfter.x1}, y1 ${easeBefore.y1} -> ${easeAfter.y1}`);
ok((await T('ease-select').inputValue()) === 'custom', 'Ten duong cong chuyen thanh "tuy chinh"');
// so lieu chinh xac
await T('key-v').fill('0.5');
await T('key-v').press('Enter');
await waitFor(async () => near((await clipOf(c2.id)).keyframes['transform.opacity'][0].v, 0.5, 1e-6), 3000, 'key-v');
ok(true, 'O "Gia tri" cua keyframe: sua so chinh xac = 0.5');
// copy / dan
const before = (await clipOf(c2.id)).keyframes['transform.opacity'].length;
await T('graph-copy').click();
await seek(c2.start + 2.5);
await T('graph-paste').click();
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity'].length === before + 1, 3000, 'dan');
const pasted = (await clipOf(c2.id)).keyframes['transform.opacity'].find((x) => near(x.t, 2.5, 1e-3));
ok(!!pasted && near(pasted.v, 0.5, 1e-6), 'Sao chep keyframe da chon roi Dan tai con tro (t=2.5, v=0.5)', pasted ? `t=${pasted.t} v=${pasted.v}` : '');
// xoa
await T('key-dot-0').click();
await T('key-delete').click();
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.opacity'].length === before, 3000, 'xoa key');
ok(true, 'Nut Xoa: xoa keyframe dang chon');
// them thuoc tinh moi vao graph
await T('graph-add-prop').selectOption('transform.scale');
await waitFor(async () => (await clipOf(c2.id)).keyframes['transform.scale']?.length === 1, 3000, 'them prop');
ok((await T('graph-prop').inputValue()) === 'transform.scale', 'Graph: "+ thuoc tinh" them keyframe cho ti le va chuyen sang thuoc tinh do');

// ---- 8b. nut Ease nhanh (Ease In / Ease Out / Easy Ease / Tuyen tinh)
await T('graph-prop').selectOption('transform.opacity');
await page.locator('[data-testid="graph-svg"]').click({ position: { x: 60, y: 5 } }); // bam nen: bo chon keyframe
await sleep(300);
const quick = async (id) => { await T(`ease-quick-${id}`).click(); await sleep(400); };
const eName = async (i) => { const e = (await clipOf(c2.id)).keyframes['transform.opacity'][i].ease; return JSON.stringify([e.kind, e.x1, e.y1, e.x2, e.y2]); };
const preset = (n) => JSON.stringify(n === 'linear' ? ['linear', 0, 0, 1, 1] : n === 'ease-in' ? ['bezier', 0.42, 0, 1, 1] : n === 'ease-out' ? ['bezier', 0, 0, 0.58, 1] : ['bezier', 0.42, 0, 0.58, 1]);
const nk = (await clipOf(c2.id)).keyframes['transform.opacity'].length;
await quick('ease-out');
let allOut = true;
for (let i = 0; i < nk - 1; i++) if ((await eName(i)) !== preset('ease-out')) allOut = false;
ok(allOut && nk >= 2, 'Nut "Ease Out" khi chua chon keyframe: ap cho MOI doan (cubic-bezier 0, 0, 0.58, 1)', `${nk} keyframe`);
await T('key-dot-0').click();
await quick('ease-in');
ok((await eName(0)) === preset('ease-in') && (nk < 3 || (await eName(1)) === preset('ease-out')), 'Nut "Ease In" khi chon keyframe 1: chi doi keyframe do (0.42, 0, 1, 1), keyframe khac giu nguyen');
await quick('ease-in-out');
ok((await eName(0)) === preset('ease-in-out'), 'Nut "Easy Ease": ease-in-out (0.42, 0, 0.58, 1)');
await quick('linear');
ok((await eName(0)) === preset('linear'), 'Nut "Tuyen tinh": chuyen ve noi suy deu');
// duong cong ease-in cham luc dau, ease-out nhanh luc dau (do tren du lieu that: gia tri o 25% doan)
await quick('ease-in');
{
  const keys = (await clipOf(c2.id)).keyframes['transform.opacity'];
  const k0 = keys[0], k1 = keys[1];
  const tq = k0.t + (k1.t - k0.t) * 0.25;
  await seek(c2.start + tq);
  await sleep(300);
  await T('tab-props').click();
  const vIn = Number(await T('f-transform.opacity').inputValue()) / 100;
  await T('tab-graph').click();
  await T('key-dot-0').click();
  await quick('ease-out');
  await T('tab-props').click();
  await sleep(200);
  const vOut = Number(await T('f-transform.opacity').inputValue()) / 100;
  await T('tab-graph').click();
  const lin25 = k0.v + (k1.v - k0.v) * 0.25;
  const dIn = Math.abs(vIn - k0.v), dOut = Math.abs(vOut - k0.v), dLin = Math.abs(lin25 - k0.v);
  ok(dIn < dLin * 0.8 && dOut > dLin * 1.2, 'Ease In = cham luc dau, Ease Out = nhanh luc dau (gia tri tai 25% doan so voi tuyen tinh)', `lech tu k0: in=${dIn.toFixed(3)} < tuyen tinh=${dLin.toFixed(3)} < out=${dOut.toFixed(3)}`);
}
await T('tab-props').click();

// ---- 9. neo vi tri, preset
await T('tab-props').click();
await T('f-anchorh').selectOption('left');
await T('f-anchorv').selectOption('top');
await T('f-margin').fill('10');
await T('f-margin').press('Enter');
await waitFor(async () => { const t = (await clipOf(c2.id)).transform; return t.anchorH === 'left' && t.anchorV === 'top' && near(t.margin, 0.1, 1e-6); }, 3000, 'neo');
ok(true, 'Neo vi tri: trai-tren, le 10%');
await T('preset-select').selectOption('neon-number');
page.once('dialog', (d) => void d.accept());
await T('preset-apply').click();
await waitFor(async () => (await clipOf(c2.id)).src.text.stroke.width === 12, 4000, 'preset');
const afterP = await clipOf(c2.id);
ok(afterP.src.text.stroke.color === '#8ff8ff' && afterP.keyframes['transform.rotation']?.length === 2, 'Ap dung preset "So neon" (hoi xac nhan vi se thay keyframe): vien #8ff8ff 12px + keyframe xoay');
await page.keyboard.press('Control+z');
await waitFor(async () => (await clipOf(c2.id)).src.text.stroke.width !== 12, 3000, 'undo preset');
ok(true, 'Ctrl+Z hoan tac viec ap dung preset');
await page.screenshot({ path: `${OUT}/t3-final.png` });

console.log(`\n${pass} dat, ${fail} that bai`);
await browser.close();
process.exitCode = fail ? 1 : 0;
