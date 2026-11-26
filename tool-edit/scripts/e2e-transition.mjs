// Kiem chuyen canh (F-94) va xoay 3D / phoi canh (F-95) bang DIEM ANH THAT tren GPU: hai anh tinh (testsrc2 va smptebars) cat tai giay 3,
// moi kieu chuyen canh so voi dap an tinh duoc truoc; xoay 3D so voi hinh hoc phoi canh tinh bang cong thuc; xuat file khop xem truoc.
// Chay app voi TOOL_EDIT_DEV_API=1. Can out/media/trA.png va trB.png (lenh tao: xem CHUC-NANG.md F-94).
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const OUT = resolve('out/e2e-transition');
mkdirSync(OUT, { recursive: true });
let pass = 0,
  fail = 0;
const ok = (c, n, x = '') => {
  c ? pass++ : fail++;
  console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const ops = async (list) => {
  const r = await call('POST', '/ops', { source: 'human', ops: list });
  if (r.status !== 200) throw new Error('ops loi: ' + JSON.stringify(r.data));
};
const decode = (png) => spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 28 }).stdout;
const W = 270,
  H = 480;
const frame = async (t) => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=0.25`);
  if (r.status !== 200) throw new Error('preview_frame ' + JSON.stringify(r.data).slice(0, 200));
  return decode(r.data);
};
const px = (f, x, y) => [f[(y * W + x) * 3], f[(y * W + x) * 3 + 1], f[(y * W + x) * 3 + 2]];
/** Sai khac trung binh (0..255) giua hai khung, chi tren cac cot [x0,x1) va hang [y0,y1). */
const diff = (a, b, x0 = 0, x1 = W, y0 = 0, y1 = H) => {
  let s = 0,
    n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let c = 0; c < 3; c++) (s += Math.abs(a[(y * W + x) * 3 + c] - b[(y * W + x) * 3 + c])), n++;
  return s / n;
};
const lum = (f) => {
  let s = 0;
  for (let i = 0; i < f.length; i += 3) s += 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];
  return s / (f.length / 3);
};
const smooth = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const enc = (l) => 255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);

const colsSpan = (f) => { // cot dau/cuoi co it nhat 20% so diem sang tren hang giua
  const lit = (x) => { let n = 0; for (let y = 0; y < H; y++) if (px(f, x, y).reduce((a, b) => a + b, 0) > 30) n++; return n / H; };
  let a = 0, b = W - 1;
  while (a < W && lit(a) < 0.2) a++;
  while (b > 0 && lit(b) < 0.2) b--;
  return [a / W, b / W];
};
const rowsSpan = (f) => {
  const lit = (y) => { let n = 0; for (let x = 0; x < W; x++) if (px(f, x, y).reduce((a, b) => a + b, 0) > 30) n++; return n / W; };
  let a = 0, b = H - 1;
  while (a < H && lit(a) < 0.2) a++;
  while (b > 0 && lit(b) < 0.2) b--;
  return [a / H, b / H];
};
const geom = (rotX, rotY, persp = 1.2) => { // canh trai/phai/tren/duoi cua hinh chu nhat 1080x1920 giua khung, sau xoay + phoi canh (ty le khung)
  const Wf = 1080, Hf = 1920, Dd = persp * Math.max(Wf, Hf);
  const rx = (rotX * Math.PI) / 180, ry = (rotY * Math.PI) / 180;
  const pt = (x, y) => { const x1 = x * Math.cos(ry), z1 = x * Math.sin(ry), y2 = y * Math.cos(rx), z2 = z1 - y * Math.sin(rx); const w = (Dd + z2) / Dd; return [(Wf / 2 + x1 / w) / Wf, (Hf / 2 + y2 / w) / Hf]; };
  const c = [pt(-540, -960), pt(540, -960), pt(-540, 960), pt(540, 960)];
  return { l: Math.min(...c.map((p) => p[0])), r: Math.max(...c.map((p) => p[0])), t: Math.min(...c.map((p) => p[1])), b: Math.max(...c.map((p) => p[1])) };
};
await call('POST', '/project/new', {});
await sleep(1200);
const iA = (await call('POST', '/media_import', { path: resolve('out/media/trA.png') })).data.mediaId;
const iB = (await call('POST', '/media_import', { path: resolve('out/media/trB.png') })).data.mediaId;
await sleep(800);
const clip = (id, mediaId, start, extra = {}) => ({ id, track: 'v1', src: { type: 'media', mediaId }, start, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {}, ...extra });
await ops([{ op: 'add_clip', clip: clip('A', iA, 0) }, { op: 'add_clip', clip: clip('B', iB, 3) }]);
const D = 1;
const setTn = (kind, duration = D) => ops([{ op: 'set_transition', id: 'B', transition: kind ? { kind, duration } : null }]);
await setTn('dissolve');
await sleep(300);
const fA = await frame(2.5);
const fB = await frame(5.5);
ok(diff(fA, fB) > 30, 'Hai anh chuan khac nhau ro (testsrc2 va smptebars)', `${diff(fA, fB).toFixed(1)}`);
const fStart = await frame(3.0);
ok(diff(fStart, fA) < 3, 'Dau chuyen canh (p=0): khung = clip truoc (khong nhay)', `${diff(fStart, fA).toFixed(2)}`);
const fEnd = await frame(4.0);
ok(diff(fEnd, fB) < 3, 'Het chuyen canh (p=1): khung = clip sau, het chuyen canh thi khong con anh huong', `${diff(fEnd, fB).toFixed(2)}`);

// ---- hoa tan: p=0.5 (smooth(0.5)=0.5): tron TUYEN TINH 50/50
await setTn('dissolve');
let m = await frame(3.5);
let expect = new Uint8Array(fA.length);
for (let i = 0; i < expect.length; i++) expect[i] = Math.round(enc(0.5 * lin(fA[i]) + 0.5 * lin(fB[i])));
ok(diff(m, expect) < 4, 'Hoa tan o giua: khop 50/50 trong anh sang tuyen tinh', `${diff(m, expect).toFixed(2)}`);

// ---- truot trai: nua trai = nua phai cua A, nua phai = nua trai cua B
await setTn('slideleft');
m = await frame(3.5);
const half = W / 2;
const shiftDiff = (a, b, dx, x0, x1) => { // so m[x] voi a[x+dx] tren [x0,x1)
  let s = 0, n = 0;
  for (let y = 0; y < H; y += 2) for (let x = x0; x < x1; x++) for (let c = 0; c < 3; c++) (s += Math.abs(m[(y * W + x) * 3 + c] - a[(y * W + x + dx) * 3 + c])), n++;
  return s / n;
};
ok(shiftDiff(fA, null, half, 4, half - 4) < 6 && shiftDiff(fB, null, -half, half + 4, W - 4) < 6, 'Truot trai o giua: nua trai = nua phai cua clip truoc, nua phai = nua trai cua clip sau', `${shiftDiff(fA, null, half, 4, half - 4).toFixed(2)} / ${shiftDiff(fB, null, -half, half + 4, W - 4).toFixed(2)}`);

// ---- quet sang phai: ben trai la clip sau, ben phai la clip truoc
await setTn('wiperight');
m = await frame(3.5);
ok(diff(m, fB, 0, 100) < 4 && diff(m, fA, 170, W) < 4, 'Quet sang phai o giua: ben trai la clip sau, ben phai con clip truoc', `${diff(m, fB, 0, 100).toFixed(2)} / ${diff(m, fA, 170, W).toFixed(2)}`);
await setTn('wipeup');
m = await frame(3.5);
ok(diff(m, fB, 0, W, H - 150, H) < 4 && diff(m, fA, 0, W, 0, 150) < 4, 'Quet len o giua: phan duoi la clip sau, phan tren con clip truoc', `${diff(m, fB, 0, W, H - 150, H).toFixed(2)} / ${diff(m, fA, 0, W, 0, 150).toFixed(2)}`);

// ---- mo qua den: p=0.25 -> clip truoc do duc 0.5 (tuyen tinh); p=0.75 -> clip sau do duc 0.5
await setTn('fadeblack');
// tien do duoc lam muot: x = 0.4 -> p = smooth(0.4) = 0.256 -> clip truoc con do duc 1 - 2p ; x = 0.6 -> p = 0.744 -> clip sau do duc 2p - 1
m = await frame(3.4);
let eA = new Uint8Array(fA.length);
const oa = 1 - 2 * smooth(0.4);
for (let i = 0; i < eA.length; i++) eA[i] = Math.round(enc(oa * lin(fA[i])));
ok(diff(m, eA) < 4, `Mo qua den o 40%: clip truoc con ${(oa * 100).toFixed(0)}% do sang (tuyen tinh)`, `${diff(m, eA).toFixed(2)}`);
m = await frame(3.6);
let eB = new Uint8Array(fB.length);
const ob = 2 * smooth(0.6) - 1;
for (let i = 0; i < eB.length; i++) eB[i] = Math.round(enc(ob * lin(fB[i])));
ok(diff(m, eB) < 4, `Mo qua den o 60%: clip sau hien ${(ob * 100).toFixed(0)}% do sang`, `${diff(m, eB).toFixed(2)}`);

// ---- chop trang: giua chuyen canh sang hon ca hai clip
await setTn('fadewhite');
m = await frame(3.5);
ok(lum(m) > lum(fA) * 0.5 + lum(fB) * 0.5 + 20, 'Chop trang o giua: sang hon trung binh hai clip', `${lum(m).toFixed(0)} vs ${(lum(fA) * 0.5 + lum(fB) * 0.5).toFixed(0)}`);

// ---- lat 3D: x = 0.4 -> p = 0.256 -> clip truoc xoay 180p = 46 do quanh truc doc (canh trai/phai dung hinh hoc phoi canh); x = 0.6 -> clip sau con -46 do
await setTn('flip');
m = await frame(3.4);
let gg = geom(0, 180 * smooth(0.4));
let [fl, fr] = colsSpan(m);
ok(Math.abs(fl - gg.l) < 0.03 && Math.abs(fr - gg.r) < 0.03, 'Lat 3D o 40%: clip truoc xoay ~46 do, canh trai/phai dung hinh hoc phoi canh', `do ${fl.toFixed(3)}-${fr.toFixed(3)}, tinh ${gg.l.toFixed(3)}-${gg.r.toFixed(3)}`);
m = await frame(3.6);
gg = geom(0, -180 * (1 - smooth(0.6)));
[fl, fr] = colsSpan(m);
ok(Math.abs(fl - gg.l) < 0.03 && Math.abs(fr - gg.r) < 0.03, 'Lat 3D o 60%: clip sau dang xoay vao (-46 do), dung hinh hoc', `do ${fl.toFixed(3)}-${fr.toFixed(3)}, tinh ${gg.l.toFixed(3)}-${gg.r.toFixed(3)}`);

// ---- moi kieu: ve duoc, khac ca hai clip o p=0.35 (khong loi, khong bo trong)
const bad = [];
for (const k of ['dissolve', 'fadeblack', 'fadewhite', 'slideleft', 'slideright', 'slideup', 'slidedown', 'wipeleft', 'wiperight', 'wipeup', 'wipedown', 'zoomin', 'zoomout', 'blur', 'spin', 'flip', 'cube', 'glitch']) {
  await setTn(k);
  const f = await frame(3.35);
  if (!(f.length === fA.length && diff(f, fA) > 1.5 && diff(f, fB) > 1.5)) bad.push(k);
}
ok(bad.length === 0, 'Ca 18 kieu chuyen canh ve duoc va khac ca hai clip o 35%', bad.join(','));

// ---- vao tu nen: khong co clip truoc
await ops([{ op: 'set_transition', id: 'B', transition: null }, { op: 'set_clip', id: 'B', patch: { start: 4 } }]);
await setTn('dissolve');
const g0 = await frame(4.0);
ok(lum(g0) < 3, 'Khong co clip truoc: chuyen canh vao tu nen (p=0 la den)', `${lum(g0).toFixed(1)}`);
await ops([{ op: 'set_clip', id: 'B', patch: { start: 3 } }]);
await setTn('dissolve');

// ---- xuat khop xem truoc (hoa tan o giua)
await setTn('slideleft');
const outMp4 = resolve(OUT, `tn-${Date.now()}.mp4`);
const j = (await call('POST', '/render_start', { preset: '9:16', out: outMp4 })).data;
if (!j.job_id) console.log('render_start:', JSON.stringify(j));
for (;;) { const s = (await call('GET', `/jobs/${j.job_id}`)).data; if (s.state !== 'running') { ok(s.state === 'done', 'Xuat video co chuyen canh xong', s.error ?? ''); break; } await sleep(300); }
const ex = spawnSync('ffmpeg', ['-v', 'error', '-ss', '3.5', '-i', outMp4, '-frames:v', '1', '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: 1 << 28 }).stdout;
m = await frame(3.5);
ok(ex.length === m.length && diff(ex, m) < 8, 'Khung xuat o giua chuyen canh khop xem truoc', `${ex.length === m.length ? diff(ex, m).toFixed(2) : 'khac kich thuoc'}`);
await setTn(null);

// ================= 2.5D: xoay 3D + phoi canh, so voi hinh hoc tinh bang cong thuc =================
await ops([{ op: 'remove_clip', id: 'B' }, { op: 'set_clip', id: 'A', patch: { start: 0 } }]);
await ops([{ op: 'set_transform', id: 'A', patch: { rotY: 60 } }]);
let g = geom(0, 60);
let f3 = await frame(1);
let [cl, cr] = colsSpan(f3);
ok(Math.abs(cl - g.l) < 0.03 && Math.abs(cr - g.r) < 0.03, 'Xoay 3D doc 60 do: canh trai/phai dung hinh hoc phoi canh (canh gan to hon)', `do ${cl.toFixed(3)}-${cr.toFixed(3)}, tinh ${g.l.toFixed(3)}-${g.r.toFixed(3)}`);
await ops([{ op: 'set_transform', id: 'A', patch: { rotY: 0, rotX: 50 } }]);
g = geom(50, 0);
f3 = await frame(1);
let [ct, cb] = rowsSpan(f3);
ok(Math.abs(ct - g.t) < 0.03 && Math.abs(cb - g.b) < 0.04, 'Xoay 3D ngang 50 do: canh tren/duoi dung hinh hoc phoi canh', `do ${ct.toFixed(3)}-${cb.toFixed(3)}, tinh ${g.t.toFixed(3)}-${g.b.toFixed(3)}`);
await ops([{ op: 'set_transform', id: 'A', patch: { rotX: 0, rotY: 60, persp: 3 } }]);
g = geom(0, 60, 3);
[cl, cr] = colsSpan(await frame(1));
ok(Math.abs(cl - g.l) < 0.03 && Math.abs(cr - g.r) < 0.03, 'Phoi canh xa (persp 3): it meo hon, dung cong thuc', `do ${cl.toFixed(3)}-${cr.toFixed(3)}, tinh ${g.l.toFixed(3)}-${g.r.toFixed(3)}`);
// khong xoay: khung giong het ban cu (khong anh huong clip thuong)
await ops([{ op: 'set_transform', id: 'A', patch: { rotX: 0, rotY: 0 } }]);
ok(diff(await frame(1), fA) < 1.5, 'rotX = rotY = 0: giong het khong co 3D (khong anh huong clip thuong)');
// keyframe xoay 3D
await ops([{ op: 'set_keyframes', id: 'A', prop: 'transform.rotY', keys: [{ t: 0, v: 0, ease: { kind: 'linear' } }, { t: 2, v: 80, ease: { kind: 'linear' } }] }]);
const k0 = colsSpan(await frame(0.05)), k1 = colsSpan(await frame(1.9));
ok(k0[1] - k0[0] > 0.9 && k1[1] - k1[0] < 0.5, 'Keyframe xoay 3D: dau clip day khung, cuoi clip hep lai', `${(k0[1] - k0[0]).toFixed(2)} -> ${(k1[1] - k1[0]).toFixed(2)}`);

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
