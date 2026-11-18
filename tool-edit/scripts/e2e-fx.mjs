// Kiem GD6 (phan engine) bang DIEM ANH THAT: hinh vector, blur, glow, bong, bo goc, vignette, wipe, che do tron (add/screen/multiply) so voi cong thuc,
// keyframe fx. Chay app voi TOOL_EDIT_DEV_API=1. Can out/media/color-test.mp4.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
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
const tryOps = async (list) => (await call('POST', '/ops', { source: 'human', ops: list })).status === 200;
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { maxBuffer: 1 << 28, ...opt });
const W = 270,
  H = 480;
const frame = async (t = 1, extra = '') => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=0.25${extra}`);
  if (r.status !== 200) throw new Error('preview_frame ' + JSON.stringify(r.data).slice(0, 200));
  return run('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: r.data }).stdout;
};
const px = (img, x, y) => [img[(y * W + x) * 3], img[(y * W + x) * 3 + 1], img[(y * W + x) * 3 + 2]];
const near = (a, b, t) => Math.abs(a - b) <= t;
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const enc = (l) => 255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(Math.max(l, 0), 1 / 2.4) - 0.055);
const lumSum = (img) => { let s = 0; for (let i = 0; i < img.length; i += 3) s += lin(img[i]) + lin(img[i + 1]) + lin(img[i + 2]); return s; }; // anh sang TUYEN TINH (blur tron trong khong gian tuyen tinh)
const clipOf = (id, track, src, extra = {}) => ({ id, track, src, start: 0, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {}, ...extra });
const shape = (extra = {}) => ({ type: 'shape', shape: { kind: 'rect', w: 400, h: 240, fill: '#ffffff', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 }, radius: 24, points: 5, inner: 0.45, trim: 1, ...extra } });
const reset = async () => {
  await call('POST', '/project/new', {});
  await sleep(1500);
};

await reset();
// 1. hinh chu nhat
await ops([{ op: 'add_clip', clip: clipOf('s', 'v1', shape()) }]);
let img = await frame();
ok(px(img, 135, 240)[0] > 245 && px(img, 10, 10)[0] < 8, 'Hinh chu nhat trang giua khung, ngoai khung den');
let area = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px(img, x, y)[0] > 128) area++;
ok(near(area, (400 / 4) * (240 / 4) * 0.99, 200), 'Dien tich hinh = 400x240 px @1080 (o 1/4 ti le: 100x60)', `${area} diem (ky vong ~5900)`);
// 2. ellipse / star / ring + trim
await ops([{ op: 'set_shape', id: 's', patch: { kind: 'ellipse', w: 300, h: 300 } }]);
img = await frame();
ok(px(img, 135, 240)[0] > 245 && px(img, 135 - 36, 240 - 36)[0] < 8, 'Ellipse: tam trang, goc hop bao den');
await ops([{ op: 'set_shape', id: 's', patch: { kind: 'star', w: 400, h: 400, points: 5, inner: 0.4 } }]);
img = await frame();
ok(px(img, 135, 240)[0] > 245 && px(img, 135 + 45, 240 - 45)[0] < 8, 'Sao 5 canh: tam trang, vung giua cac canh den');
await ops([{ op: 'set_shape', id: 's', patch: { kind: 'ring', w: 400, h: 400, fill: '', stroke: { color: '#ff0000', width: 40 }, trim: 1 } }]);
img = await frame();
const ringAt = (a) => px(img, Math.round(135 + 50 * Math.sin(a)), Math.round(240 - 50 * Math.cos(a)));
ok(ringAt(0)[0] > 240 && ringAt(Math.PI / 2)[0] > 240 && px(img, 135, 240)[0] < 8, 'Ring vien do day 40: co vong, ruot trong suot');
await ops([{ op: 'set_shape', id: 's', patch: { trim: 0.5 } }]);
img = await frame();
ok(ringAt(Math.PI / 2)[0] > 240 && ringAt((3 * Math.PI) / 2)[0] < 8, 'Ring trim 0.5: ve nua vong tu dinh theo chieu kim dong ho (ben phai co, ben trai khong)');
// keyframe trim
await ops([{ op: 'set_keyframes', id: 's', prop: 'shape.trim', keys: [{ t: 0, v: 0, ease: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 } }, { t: 2, v: 1, ease: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 } }] }]);
img = await frame(1.0);
const half = ringAt(Math.PI / 2)[0] > 240 && ringAt((3 * Math.PI) / 2)[0] < 8;
img = await frame(1.95);
ok(half && ringAt((3 * Math.PI) / 2)[0] > 200, 'Keyframe shape.trim 0 -> 1: vien tu ve dan (giay 1: nua vong, gan 2: gan het)');

// 3. blur
await reset();
await ops([{ op: 'add_clip', clip: clipOf('s', 'v1', shape({ w: 300, h: 300 })) }]);
const sharp = await frame();
await ops([{ op: 'set_fx', id: 's', fx: { blur: { radius: 40 } } }]);
const blurred = await frame();
const edgeS = px(sharp, 135 + 36, 240)[0],
  edgeB = px(blurred, 135 + 38, 240)[0];
ok(edgeS > 240 && edgeB > 60 && edgeB < 200, 'Blur 40: mep hinh bi mo thanh dai chuyen tiep (so voi mep sac)', `mep ${edgeS} -> ${edgeB}`);
ok(near(lumSum(blurred) / lumSum(sharp), 1, 0.04), 'Blur giu nguyen tong anh sang tuyen tinh (+-4%)', `${(lumSum(blurred) / lumSum(sharp)).toFixed(3)}`);
ok(px(blurred, 135, 240)[0] > 230, 'Blur: tam hinh van sang');
// 4. shadow
await ops([{ op: 'set_fx', id: 's', fx: { blur: null } }, { op: 'set_shape', id: 's', patch: { w: 200, h: 200 } }, { op: 'set_fx', id: 's', fx: { shadow: { x: 0, y: 120, blur: 0, opacity: 1, color: '#ff0000' } } }]);
img = await frame();
ok(px(img, 135, 240 + 38)[0] > 200 && px(img, 135, 240 + 38)[1] < 40, 'Bong do mau do lech xuong 120px: hien duoi hinh, dung mau', `${px(img, 135, 278)}`);
ok(px(img, 135, 240)[1] > 240, 'Bong nam DUOI hinh (hinh van trang)');
// 5. glow
await ops([{ op: 'set_fx', id: 's', fx: { shadow: null } }]);
const noGlow = await frame();
await ops([{ op: 'set_fx', id: 's', fx: { glow: { radius: 60, intensity: 1.5, color: '#00ffff', threshold: 0.2 } } }]);
const glowed = await frame();
const gx = px(glowed, 135 + 38, 240),
  gn = px(noGlow, 135 + 38, 240);
ok(gn[0] < 8 && gx[1] > 40 && gx[0] < gx[1], 'Glow cyan: vung ngoai mep hinh sang len mau cyan (tu den)', `${gn} -> ${gx}`);
// 6. bo goc tren video
await reset();
const imp = (await call('POST', '/media_import', { path: resolve('out/media/color-test.mp4') })).data;
for (let i = 0; i < 100; i++) { const j = (await call('GET', `/jobs/${imp.job_id}`)).data; if (j.state !== 'running') break; await sleep(200); }
await ops([{ op: 'add_clip', clip: clipOf('v', 'v1', { type: 'media', mediaId: imp.mediaId }, { transform: { fit: 'cover' } }) }]);
const sq = await frame();
await ops([{ op: 'set_fx', id: 'v', fx: { round: { radius: 0.3 } } }]);
const rd = await frame();
ok(px(sq, 2, 2).some((v) => v > 20) && px(rd, 2, 2).every((v) => v < 8) && px(rd, 135, 240).some((v) => v > 20), 'Bo goc 0.3 tren video: goc khung trong suot (den), giua van co hinh', `${px(sq, 2, 2)} -> ${px(rd, 2, 2)}`);
// 7. vignette
await reset();
await ops([{ op: 'add_clip', clip: clipOf('f', 'v1', shape({ w: 1080, h: 1920 }), { transform: { fit: 'cover' } }) }, { op: 'set_fx', id: 'f', fx: { vignette: { amount: 0.9, softness: 0.6 } } }]);
img = await frame();
ok(px(img, 135, 240)[0] > 240 && px(img, 3, 3)[0] < 110, 'Vignette 0.9 (nhan trong anh sang tuyen tinh): giua sang, goc toi ~10%', `${px(img, 135, 240)[0]} vs ${px(img, 3, 3)[0]}`);
// 8. wipe
await ops([{ op: 'set_fx', id: 'f', fx: { vignette: null, wipe: { progress: 0.5, angle: 0, feather: 0.02 } } }]);
img = await frame();
ok(px(img, 40, 240)[0] > 240 && px(img, 230, 240)[0] < 8, 'Wipe 50% goc 0: nua trai hien, nua phai an');
await ops([{ op: 'set_fx', id: 'f', fx: { wipe: { progress: 0.5, angle: 90 } } }]);
img = await frame();
ok(px(img, 135, 60)[0] > 240 && px(img, 135, 420)[0] < 8, 'Wipe 50% goc 90: nua tren hien, nua duoi an');
await ops([{ op: 'set_keyframes', id: 'f', prop: 'fx.wipe.progress', keys: [{ t: 0, v: 0, ease: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 } }, { t: 2, v: 1, ease: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 } }] }, { op: 'set_fx', id: 'f', fx: { wipe: { angle: 0 } } }]);
const w1 = await frame(0.5),
  w2 = await frame(1.5);
let v1 = 0, v2 = 0;
for (let x = 0; x < W; x++) { if (px(w1, x, 240)[0] > 128) v1++; if (px(w2, x, 240)[0] > 128) v2++; }
ok(near(v1, W * 0.25, 12) && near(v2, W * 0.75, 12), 'Keyframe fx.wipe.progress 0 -> 1: hien 25% o giay 0.5 va 75% o giay 1.5', `${v1}, ${v2} / ${W}`);
ok(await tryOps([{ op: 'set_fx', id: 'f', fx: { wipe: null } }]) && !(await call('GET', '/project')).data.clips[0].keyframes['fx.wipe.progress'], 'Go hieu ung wipe cung go keyframe cua no');
ok(!(await tryOps([{ op: 'set_keyframes', id: 'f', prop: 'fx.blur.radius', keys: [{ t: 0, v: 1, ease: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 } }] }])), 'Keyframe fx.blur.radius khi chua co hieu ung blur bi tu choi');
const r999 = await tryOps([{ op: 'set_fx', id: 'f', fx: { blur: { radius: 999 } } }]);
const rname = await tryOps([{ op: 'set_fx', id: 'f', fx: { khong: { x: 1 } } }]);
ok(!r999 && !rname, 'fx ngoai khoang / ten khong co bi tu choi', `radius999:${r999} ten-la:${rname}`);

// 9. blend: nen thanh mau gen + hinh xam 50% len tren
await reset();
await ops([{ op: 'add_clip', clip: clipOf('bg', 'v1', { type: 'gen', kind: 'bars', param: 0 }, { transform: { fit: 'cover' } }) }]);
const base = await frame(); // chi nen
await ops([{ op: 'add_track', track: { id: 'v2', kind: 'video', name: 'ov' } }, { op: 'add_clip', clip: clipOf('ov', 'v2', shape({ w: 1080, h: 1920, fill: '#808080' }), { transform: { fit: 'cover' } }) }]);
const bp = px(base, 20, 240).slice(); // vach mau dau (trang 75%)
const bq = px(base, 100, 240).slice(); // vach mau khac
const S = lin(128);
for (const [mode, f] of [['add', (b) => b + S], ['screen', (b) => 1 - (1 - b) * (1 - S)], ['multiply', (b) => b * S]]) {
  await ops([{ op: 'set_blend', id: 'ov', blend: mode }]);
  img = await frame();
  const got = px(img, 100, 240);
  const exp = bq.map((c) => Math.min(255, enc(f(lin(c)))));
  ok(got.every((c, i) => near(c, exp[i], 5)), `Blend ${mode}: ket qua = cong thuc tren anh sang tuyen tinh`, `${got} vs ${exp.map(Math.round)}`);
}
await ops([{ op: 'set_blend', id: 'ov', blend: 'normal' }]);
img = await frame();
ok(near(px(img, 100, 240)[0], 128, 3), 'Blend normal tro lai: hinh xam che nen');
void bp;

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
