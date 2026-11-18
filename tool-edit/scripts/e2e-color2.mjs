// Kiem GD5 bang DIEM ANH THAT: chinh mau tren GPU (LUT 3D) so voi cong thuc CPU, log input, LUT .cube, scope (compute shader) tren ramp/thanh mau
// co dap an biet truoc, analyze_frame, xuat khop xem truoc. Chay app voi TOOL_EDIT_DEV_API=1. Can out/media/color-test.mp4 (tao boi lenh trong CHUC-NANG.md muc 5).
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const OUT = resolve('out/e2e-color2');
rmSync(OUT, { recursive: true, force: true });
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
const project = async () => (await call('GET', '/project')).data;
const waitJob = async (id, ms = 240000) => {
  const t0 = Date.now();
  for (;;) {
    const j = (await call('GET', `/jobs/${id}`)).data;
    if (j.state !== 'running') return j;
    if (Date.now() - t0 > ms) throw new Error(`job ${id} qua han`);
    await sleep(300);
  }
};
const ops = async (list) => {
  const r = await call('POST', '/ops', { source: 'human', ops: list });
  if (r.status !== 200) throw new Error('ops loi: ' + JSON.stringify(r.data));
};
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { maxBuffer: 1 << 28, ...opt });
const decode = (png) => {
  const r = run('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png });
  return r.stdout;
};
const W = 270,
  H = 480;
const frame = async (t, extra = '') => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=0.25${extra}`);
  if (r.status !== 200) throw new Error('preview_frame ' + JSON.stringify(r.data).slice(0, 200));
  return decode(r.data);
};
const clamp = (x) => Math.min(255, Math.max(0, x));

// bien dich core/grade.ts ra de dung cung cong thuc CPU voi shader
const bundled = resolve(OUT, 'grade.mjs');
await build({ entryPoints: ['src/core/grade.ts'], bundle: true, format: 'esm', platform: 'node', outfile: bundled, logLevel: 'silent' });
const G = await import(pathToFileURL(bundled).href);

await call('POST', '/project/new', {});
await sleep(1500);
const imp = (await call('POST', '/media_import', { path: resolve('out/media/color-test.mp4') })).data;
for (const id of [imp.job_id, imp.audio_job_id]) if (id) await waitJob(id);
await ops([{ op: 'add_clip', clip: { id: 'c', track: 'v1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }]);
const T = 1.0;
const U = await frame(T); // chua chinh
const grid = [];
for (let y = 6; y < H - 6; y += 12) for (let x = 6; x < W - 6; x += 12) grid.push([x, y]);
const at = (img, x, y) => [img[(y * W + x) * 3], img[(y * W + x) * 3 + 1], img[(y * W + x) * 3 + 2]];

/** So sanh anh da chinh voi cong thuc CPU tren luoi diem. */
const compare = async (name, patch, tol = { mean: 2.5, max: 12 }, lutCube = null) => {
  await ops([{ op: 'set_grade', id: 'c', grade: null }]);
  await ops([{ op: 'set_grade', id: 'c', grade: patch }]);
  const grade = (await project()).clips[0].grade;
  const F = await frame(T);
  let sum = 0,
    mx = 0,
    n = 0,
    changed = 0;
  for (const [x, y] of grid) {
    const u = at(U, x, y),
      f = at(F, x, y);
    const e = G.gradePixel(grade, lutCube, u[0] / 255, u[1] / 255, u[2] / 255).map((v) => clamp(v * 255));
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(f[c] - e[c]);
      sum += d;
      mx = Math.max(mx, d);
      n++;
      if (Math.abs(f[c] - u[c]) > 3) changed++;
    }
  }
  const mean = sum / n;
  ok(mean <= tol.mean && mx <= tol.max, `GPU = cong thuc CPU: ${name}`, `sai so TB ${mean.toFixed(2)}, lon nhat ${mx.toFixed(0)} / 255; ${Math.round((100 * changed) / n)}% diem doi so voi goc`);
  return { changed: changed / n };
};


// ===== F-103..F-106: khong gian mau, tone-map, qualifier, log wheels, cua so, scope =====
// Cac bai 'log + gam rong' duoi day dung anh thu KHONG phai anh log: co diem cuc bao hoa ngoai gam (cat/nen gam), nen chi xet sai so TB;
// do chinh xac mau that nam o bai quay vong e2e-colorspace.mjs.
const ls = G.defaultGrade();
await compare('ACEScct + ACES tone-map', { input: 'acescct', tonemap: 'aces' }, { mean: 3, max: 16 });
await compare('ARRI LogC3 / AWG3 + phoi sang', { input: 'logc3_awg3', exposure: 0.4 }, { mean: 1, max: 255 });
await compare('DaVinci Intermediate / DWG', { input: 'davinci_dwg' }, { mean: 1, max: 255 });
await compare('Apple Log / Rec.2020 + ACES', { input: 'applelog', tonemap: 'aces' }, { mean: 3, max: 16 });
await compare('RED Log3G10 / RWG', { input: 'log3g10_rwg' }, { mean: 1, max: 255 });
await compare('S-Log3 / S-Gamut3.Cine + ACES', { input: 'slog3_sgamut3cine', tonemap: 'aces', saturation: 1.1 }, { mean: 1, max: 255 });
await compare('log wheels: toi +, sang do', { logw: { shadows: { m: 0.1 }, highlights: { r: 0.2 }, mids: { b: 0.1 } } }, { mean: 3, max: 16 });
const q1 = await compare('qualifier: xoay sac do vung do/cam, ep bao hoa', { qual: { hue: { center: 20, width: 40, soft: 30 }, adjust: { hue: 90, sat: 1.3 } } }, { mean: 3, max: 40 });
ok(q1.changed > 0.01 && q1.changed < 0.9, 'Qualifier chi doi MOT PHAN anh (khong doi het, khong doi it)', `${Math.round(q1.changed * 100)}%`);
await compare('qualifier xem mat na (canh mat na bi mem do LUT, chi xet TB)', { qual: { hue: { center: 20, width: 40, soft: 30 }, show: true } }, { mean: 6, max: 255 });
await compare('tong hop: ACES + logw + qualifier + curves', { input: 'acescct', tonemap: 'aces', logw: { shadows: { m: 0.05 } }, qual: { sat: { lo: 0.4, hi: 1, soft: 0.2 }, adjust: { sat: 1.2 } }, curves: { master: [[0, 0], [0.5, 0.45], [1, 1]] } }, { mean: 3, max: 40 });

// cua so: trong hinh = da chinh, ngoai hinh = goc
await ops([{ op: 'set_grade', id: 'c', grade: null }]);
await ops([{ op: 'set_grade', id: 'c', grade: { exposure: 1, win: { enabled: true, shape: 'ellipse', cx: 0.5, cy: 0.5, w: 0.5, h: 0.4, rot: 0, feather: 0.25, invert: false } } }]);
{
  const grade = (await project()).clips[0].grade;
  const F = await frame(T);
  let sum = 0, mx = 0, n = 0, inside = 0, outside = 0;
  for (const [x, y] of grid) {
    const u = at(U, x, y), f = at(F, x, y);
    const full = G.gradePixel({ ...grade, win: undefined }, null, u[0] / 255, u[1] / 255, u[2] / 255).map((v) => clamp(v * 255));
    const m = G.windowMask(grade.win, (x + 0.5) / W, (y + 0.5) / H, W, H);
    for (let c = 0; c < 3; c++) {
      const e = u[c] + (full[c] - u[c]) * m;
      const d = Math.abs(f[c] - e);
      sum += d; mx = Math.max(mx, d); n++;
    }
    if (m > 0.99) inside++;
    if (m < 0.01) outside++;
  }
  ok(inside > 10 && outside > 10, 'Cua so: co diem trong va ngoai hinh', `${inside} trong, ${outside} ngoai`);
  ok(sum / n < 3 && mx < 20, 'Cua so: GPU = cong thuc CPU (mat na + chinh mau)', `TB ${(sum / n).toFixed(2)}, max ${mx.toFixed(0)}`);
  await ops([{ op: 'set_grade', id: 'c', grade: { win: { invert: true } } }]);
  const F2 = await frame(T);
  let a = 0, b = 0, na = 0;
  for (const [x, y] of grid) {
    const m = G.windowMask(grade.win, (x + 0.5) / W, (y + 0.5) / H, W, H);
    const f = at(F, x, y), f2 = at(F2, x, y), u = at(U, x, y);
    if (m > 0.99) { a += Math.abs(f2[0] - u[0]); b += Math.abs(f[0] - u[0]); na++; }
  }
  ok(a / na < 2 && b / na > 6, 'Cua so dao nguoc: trong hinh giu mau goc, khong dao thi trong hinh da doi', `dao ${(a / na).toFixed(1)}, thuong ${(b / na).toFixed(1)}`);
}
await ops([{ op: 'set_grade', id: 'c', grade: null }]);

// scope: so sanh so do cua app voi tinh doc lap tu anh (khong dung code scope)
{
  await ops([{ op: 'set_grade', id: 'c', grade: { input: 'acescct', tonemap: 'aces', contrast: 0.2 } }]);
  const pr = await call('GET', '/preview_frame?t=1&scale=0.5');
  const rgb = decode(pr.data);
  const an = (await call('GET', '/analyze_frame?t=1&scale=0.5')).data;
  const N = rgb.length / 3;
  const mean = [0, 0, 0, 0], sq = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    const r = rgb[i * 3] / 255, g = rgb[i * 3 + 1] / 255, b = rgb[i * 3 + 2] / 255;
    const v = [r, g, b, 0.2126 * r + 0.7152 * g + 0.0722 * b];
    for (let k = 0; k < 4; k++) { mean[k] += v[k]; sq[k] += v[k] * v[k]; }
  }
  const names = ['r', 'g', 'b', 'luma'];
  let worst = 0, worstStd = 0;
  for (let k = 0; k < 4; k++) {
    const m = mean[k] / N, sd = Math.sqrt(Math.max(0, sq[k] / N - m * m));
    worst = Math.max(worst, Math.abs(m - an.channels[names[k]].mean));
    worstStd = Math.max(worstStd, Math.abs(sd - an.channels[names[k]].std));
  }
  ok(worst < 0.004 && worstStd < 0.006, 'Scope (analyze_frame) khop so do doc lap tu anh: TB va do lech R,G,B,luma', `lech TB ${worst.toFixed(4)}, lech std ${worstStd.toFixed(4)}`);
  const yc = await call('GET', '/scope_image?t=1&kind=ycbcr');
  ok(yc.status === 200 && Buffer.isBuffer(yc.data) && yc.data.length > 1000, 'scope_image kind=ycbcr tra anh', `${yc.status}`);
  const par = await call('GET', '/scope_image?t=1&kind=parade');
  ok(par.status === 200, 'scope_image parade van chay (6 kenh trong shader)', `${par.status}`);
}
await ops([{ op: 'set_grade', id: 'c', grade: null }]);
console.log(`\n${pass} dat, ${fail} that bai`);
process.exit(fail ? 1 : 0);
