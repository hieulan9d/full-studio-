// Kiem QUAY VONG khong gian mau tren GPU that: tao anh log gia (cac o mau da biet, trong gam Rec.709), ma hoa vao tung duong cong + gam mau,
// roi cho Tool Edit giai ma (input = khong gian do) va so voi mau sRGB ky vong. Day la bai kiem do chinh xac mau (khong dung anh khong phai log).
// Chay app voi TOOL_EDIT_DEV_API=1 (cong TOOL_EDIT_PORT, mac dinh 17480). Can ffmpeg.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const OUT = resolve('out/e2e-colorspace');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, n, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} - ${n}${x ? '  [' + x + ']' : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { maxBuffer: 1 << 28, ...opt });
const waitJob = async (id) => { for (;;) { const j = (await call('GET', `/jobs/${id}`)).data; if (j.state !== 'running') return j; await sleep(300); } };
const ops = async (list) => { const r = await call('POST', '/ops', { source: 'human', ops: list }); if (r.status !== 200) throw new Error('ops loi: ' + JSON.stringify(r.data)); };

const bundled = resolve(OUT, 'cs.mjs');
await build({ entryPoints: ['src/core/colorspace.ts'], bundle: true, format: 'esm', platform: 'node', outfile: bundled, logLevel: 'silent' });
const CS = await import(pathToFileURL(bundled).href);

const srgbOetf = (l) => { l = Math.min(1, Math.max(0, l)); return l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; };
const invert = (f, v) => {
  if (v <= f(0)) return 0;
  if (v >= f(1)) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; f(m) < v ? (lo = m) : (hi = m); }
  return (lo + hi) / 2;
};
// o thu (tuyen tinh Rec.709, trong gam)
const PATCHES = [
  ['xam 0.02', [0.02, 0.02, 0.02]], ['xam 0.05', [0.05, 0.05, 0.05]], ['xam 0.09', [0.09, 0.09, 0.09]], ['xam 18%', [0.18, 0.18, 0.18]],
  ['xam 0.30', [0.3, 0.3, 0.3]], ['xam 0.50', [0.5, 0.5, 0.5]], ['xam 0.70', [0.7, 0.7, 0.7]], ['xam 0.90', [0.9, 0.9, 0.9]],
  ['da', [0.35, 0.2, 0.15]], ['do', [0.5, 0.05, 0.04]], ['luc', [0.1, 0.4, 0.08]], ['xanh duong', [0.05, 0.1, 0.5]],
  ['vang', [0.6, 0.5, 0.05]], ['cyan', [0.05, 0.4, 0.45]], ['magenta', [0.5, 0.08, 0.4]], ['la cay', [0.12, 0.2, 0.07]],
];
const COLS = 4, ROWS = 4, VW = 1080, VH = 1920, PW = VW / COLS, PH = VH / ROWS;

const codesBySpace = {};
const makeVideo = (space) => {
  const def = CS.INPUT_SPACES[space];
  const m = def.gamut ? CS.rec709ToGamut(def.gamut) : null;
  const f = def.curve ?? ((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const px = Buffer.alloc(VW * VH * 3);
  codesBySpace[space] = [];
  PATCHES.forEach(([, lin], i) => {
    let v = lin;
    if (m) v = [m[0] * lin[0] + m[1] * lin[1] + m[2] * lin[2], m[3] * lin[0] + m[4] * lin[1] + m[5] * lin[2], m[6] * lin[0] + m[7] * lin[1] + m[8] * lin[2]];
    const code = v.map((c) => Math.round(invert(f, c) * 255));
    codesBySpace[space].push(code);
    const x0 = (i % COLS) * PW, y0 = Math.floor(i / COLS) * PH;
    for (let y = y0; y < y0 + PH; y++) for (let x = x0; x < x0 + PW; x++) { const o = (y * VW + x) * 3; px[o] = code[0]; px[o + 1] = code[1]; px[o + 2] = code[2]; }
  });
  const ppm = resolve(OUT, `${space}.ppm`);
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${VW} ${VH}\n255\n`), px]));
  const mp4 = resolve(OUT, `${space}.mp4`);
  const r = run('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', ppm, '-t', '2', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-crf', '8', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', mp4]);
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  return mp4;
};
const decode = (png) => run('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png }).stdout;
const W = 270, H = 480;

const spaces = ['none', 'slog3_sgamut3cine', 'slog3_sgamut3', 'vlog_vgamut', 'logc3_awg3', 'applelog', 'davinci_dwg', 'acescct', 'log3g10_rwg'];
for (const space of spaces) {
  const mp4 = makeVideo(space);
  await call('POST', '/project/new', {});
  await sleep(1200);
  const imp = (await call('POST', '/media_import', { path: mp4 })).data;
  for (const id of [imp.job_id, imp.audio_job_id]) if (id) await waitJob(id);
  await ops([{ op: 'add_clip', clip: { id: 'c', track: 'v1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: 1.5, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }]);
  // khung KHONG chinh mau: ma that su ma app giai ma duoc tu video (sau nen H.264/YUV 4:2:0) = dau vao thuc cua duong chinh mau
  const rawImg = decode((await call('GET', '/preview_frame?t=0.5&scale=0.25')).data);
  if (space !== 'none') await ops([{ op: 'set_grade', id: 'c', grade: { input: space } }]);
  const fr = await call('GET', '/preview_frame?t=0.5&scale=0.25');
  const img = decode(fr.data);
  let wGray = 0, wCol = 0, wName = '', qGray = 0, qCol = 0, qName = '';
  PATCHES.forEach(([name, lin], i) => {
    const cx = Math.round(((i % COLS) + 0.5) * (W / COLS)), cy = Math.round((Math.floor(i / COLS) + 0.5) * (H / ROWS));
    const got = [0, 1, 2].map((c) => img[(cy * W + cx) * 3 + c]);
    // (1) ky vong tu CPU tren chinh ma 8-bit da luu (tach nhieu luong tu 8-bit khoi loi GPU)
    const code = [0, 1, 2].map((c) => rawImg[(cy * W + cx) * 3 + c] / 255);
    const cpu = CS.toLinear709(space, code[0], code[1], code[2]).map((v) => srgbOetf(v) * 255);
    const e1 = Math.max(...got.map((g, c) => Math.abs(g - cpu[c])));
    if (i < 8) wGray = Math.max(wGray, e1); else if (e1 > wCol) { wCol = e1; wName = name; }
    // (2) so voi mau goc: gioi han boi luong tu 8-bit cua footage log
    const exp = lin.map((v) => srgbOetf(v) * 255);
    const e2 = Math.max(...got.map((g, c) => Math.abs(g - exp[c])));
    if (i < 8) qGray = Math.max(qGray, e2); else if (e2 > qCol) { qCol = e2; qName = name; }
  });
  const label = space === 'none' ? 'Rec.709 (chuan, kiem ma hoa video + mau)' : CS.INPUT_SPACES[space].label;
  ok(wGray <= 4 && wCol <= 6, `GPU = CPU tren ma 8-bit: ${label}`, `xam ${wGray.toFixed(1)}, mau ${wCol.toFixed(1)} (${wName}) /255`);
  console.log(`      so voi mau goc (gom nhieu luong tu hoa 8-bit cua log): xam ${qGray.toFixed(1)}, mau ${qCol.toFixed(1)} (${qName}) /255`);
}
console.log(`\n${pass} dat, ${fail} that bai`);
process.exit(fail ? 1 : 0);
