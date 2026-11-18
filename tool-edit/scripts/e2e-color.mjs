// Kiem GD5 bang DIEM ANH THAT: chinh mau tren GPU (LUT 3D) so voi cong thuc CPU, log input, LUT .cube, scope (compute shader) tren ramp/thanh mau
// co dap an biet truoc, analyze_frame, xuat khop xem truoc. Chay app voi TOOL_EDIT_DEV_API=1. Can out/media/color-test.mp4 (tao boi lenh trong CHUC-NANG.md muc 5).
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const OUT = resolve('out/e2e-color');
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

// 1. LUT gan nhu identity: khong lam sai mau
await ops([{ op: 'set_grade', id: 'c', grade: { contrast: 0.0001 } }]);
const I = await frame(T);
let idSum = 0;
for (let i = 0; i < U.length; i++) idSum += Math.abs(I[i] - U[i]);
ok(idSum / U.length < 0.6, 'Duong LUT khi gan nhu khong chinh: dung 33^3 + float16 khong lam sai mau (sai so TB < 0.6/255)', `${(idSum / U.length).toFixed(3)}`);

// 2. cac phep chinh
const c1 = await compare('phoi sang +0.7 stop', { exposure: 0.7 });
ok(c1.changed > 0.2, 'Phoi sang that su doi anh (hon 20% diem doi qua 3/255)', `${Math.round(c1.changed * 100)}%`);
await compare('tuong phan 0.4 + bao hoa 1.4', { contrast: 0.4, saturation: 1.4 });
await compare('nhiet do +40, tint -20', { temperature: 40, tint: -20 });
await compare('lift/gamma/gain/offset', { lift: { m: 0.04, b: 0.03 }, gamma: { m: 0.3, r: -0.1 }, gain: { m: -0.15, r: 0.1 }, offset: { g: 0.02 } });
await compare('duong cong master + R', { curves: { master: [[0, 0], [0.3, 0.2], [0.7, 0.82], [1, 1]], r: [[0, 0], [0.5, 0.6], [1, 1]] } });
await compare('log S-Log3 + phoi sang', { input: 'slog3', exposure: -0.3 }, { mean: 3, max: 16 });
await compare('log V-Log + tuong phan', { input: 'vlog', contrast: 0.2 }, { mean: 3, max: 16 });
await compare('muc ap dung 50% (mix)', { exposure: 1, saturation: 0, mix: 0.5 });

// 3. LUT .cube: dao kenh do + hoan doi G/B
const cubeTxt = G.writeCube(17, (r, g, b) => [1 - r, b, g], 'dao');
writeFileSync(resolve(OUT, 'dao.cube'), cubeTxt);
const lut = G.parseCube(cubeTxt);
await compare('LUT .cube 17^3 (dao do, doi G/B)', { lut: { path: resolve(OUT, 'dao.cube'), name: 'dao.cube', mix: 1 } }, { mean: 2.5, max: 12 }, lut);
await compare('LUT mix 40% + phoi sang', { lut: { path: resolve(OUT, 'dao.cube'), name: 'dao.cube', mix: 0.4 }, exposure: 0.3 }, { mean: 2.5, max: 12 }, lut);
const missing = await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_grade', id: 'c', grade: { lut: { path: resolve(OUT, 'khong-co.cube'), name: 'x', mix: 1 } } }] });
const fr = await call('GET', '/preview_frame?t=1&scale=0.1');
ok(missing.status === 200 && fr.status !== 200, 'LUT tro toi file khong ton tai: xem truoc bao loi ro rang (khong im lang bo qua)', `preview ${fr.status}`);
await ops([{ op: 'set_grade', id: 'c', grade: null }]);

// 4. xuat khop xem truoc
await ops([{ op: 'set_grade', id: 'c', grade: { exposure: 0.5, contrast: 0.3, saturation: 1.2, temperature: 20 } }]);
const Pv = await frame(T);
const out = resolve(OUT, 'graded.mp4');
const rs = (await call('POST', '/render_start', { preset: '9:16', out })).data;
const j = await waitJob(rs.job_id);
ok(j.state === 'done', 'Xuat video co chinh mau xong', j.error);
const ex = run('ffmpeg', ['-v', 'error', '-ss', String(T), '-i', out, '-frames:v', '1', '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']).stdout;
let d = 0;
for (let i = 0; i < Pv.length; i++) d += Math.abs(ex[i] - Pv[i]);
ok(d / Pv.length < 5, 'Khung xuat khop khung xem truoc khi co chinh mau', `sai so TB ${(d / Pv.length).toFixed(2)}/255`);
// toc do xuat: co chinh mau vs khong (tieu chi "khong lam giam fps ro ret")
const tG = j.result.seconds;
await ops([{ op: 'set_grade', id: 'c', grade: null }]);
const j2 = await waitJob((await call('POST', '/render_start', { preset: '9:16', out: resolve(OUT, 'plain.mp4') })).data.job_id);
ok(j2.state === 'done' && tG < j2.result.seconds * 1.25 + 0.3, 'Chinh mau KHONG lam cham xuat dang ke (< +25%)', `co chinh ${tG}s, khong ${j2.result.seconds}s, ${j2.result.frames} khung`);

// 5. SCOPE tren du lieu co dap an: ramp tuyen tinh (gen ramp) va thanh mau 75%
await ops([{ op: 'remove_clip', id: 'c' }, { op: 'add_clip', clip: { id: 'ramp', track: 'v1', src: { type: 'gen', kind: 'ramp', param: 0 }, start: 0, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }]);
let s = (await call('GET', '/analyze_frame?t=1&scale=0.4')).data;
const near = (a, b, t) => Math.abs(a - b) <= t;
ok(near(s.channels.luma.mean, 0.5, 0.02) && near(s.channels.luma.std, 0.2887, 0.02) && near(s.channels.luma.p50, 0.5, 0.02), 'Scope tren ramp 0..1: luma TB 0.5, do lech 0.289 (phan bo deu), trung vi 0.5', `TB ${s.channels.luma.mean}, std ${s.channels.luma.std}, p50 ${s.channels.luma.p50}`);
ok(s.channels.luma.min <= 0.01 && s.channels.luma.max >= 0.99, 'Ramp: min 0, max 1', `${s.channels.luma.min}..${s.channels.luma.max}`);
ok(near(s.clipped_high_pct, 2.3, 0.8) && near(s.crushed_black_pct, 2.3, 0.8) && near(s.channel_clip_pct.r, 1.6, 0.8), 'Ramp: % diem sang >= 98% va toi <= 2% dung ~2.3%, kenh R clip ~1.6%', `${s.clipped_high_pct}%, ${s.crushed_black_pct}%, ${s.channel_clip_pct.r}%`);
ok(s.saturation_mean < 0.005 && s.cast === 'trung tính' && s.skin_tone_pct < 1, 'Ramp xam: khong co mau, khong lech mau, khong co da', `sat ${s.saturation_mean}, ${s.cast}`);
const wv = decode((await call('GET', '/scope_image?t=1&kind=waveform&scale=0.4')).data);
const WW = 640;
const lum = (x, y) => wv[(y * WW + x) * 3 + 1];
let diag = 0,
  off = 0;
for (const x of [60, 160, 320, 480, 580]) {
  const lv = Math.round((x / WW) * 255);
  diag += lum(x, 255 - lv) + lum(x, 255 - lv + 1) + lum(x, 255 - Math.max(0, lv - 1));
  off += lum(x, Math.max(0, 255 - lv - 60)) + lum(x, Math.min(255, 255 - lv + 60));
}
ok(diag > off * 4 + 300, 'Waveform cua ramp la DUONG CHEO (diem sang dung o muc = vi tri cot)', `tren duong ${diag} vs ngoai ${off}`);
const hg = decode((await call('GET', '/scope_image?t=1&kind=histogram&scale=0.4')).data);
let flat = [];
for (const x of [100, 250, 400, 450]) { let top = 0; for (let y = 0; y < 256; y++) if (hg[(y * 512 + x) * 3 + 1] > 40) top++; flat.push(top); }
ok(Math.max(...flat) - Math.min(...flat) < 100 && Math.min(...flat) > 100, 'Histogram cua ramp phang (cot cao bang nhau)', flat.join(','));

// vung do (roi): ramp ngang 0..1 -> nua trai TB 0.25, nua phai 0.75, giua 0.5; so diem ti le dung; sai tham so bi tu choi
const sl = (await call('GET', '/analyze_frame?t=1&scale=0.4&roi=left')).data;
const sr = (await call('GET', '/analyze_frame?t=1&scale=0.4&roi=right')).data;
const sm = (await call('GET', '/analyze_frame?t=1&scale=0.4&roi=0.25,0,0.75,1')).data;
ok(near(sl.channels.luma.mean, 0.25, 0.02) && near(sr.channels.luma.mean, 0.75, 0.02) && near(sm.channels.luma.mean, 0.5, 0.02), 'Vung do: nua trai ramp TB 0.25, nua phai 0.75, giua 0.5', `${sl.channels.luma.mean}, ${sr.channels.luma.mean}, ${sm.channels.luma.mean}`);
ok(near(sl.pixels / s.pixels, 0.5, 0.03) && near(sm.pixels / s.pixels, 0.5, 0.03) && sl.roi === 'left', 'Vung do: so diem do dung ti le (nua khung = ~50%)', `${sl.pixels}/${s.pixels}`);
ok(near(s.below_legal_pct, 6.25, 1.2) && near(s.above_legal_pct, 7.8, 1.2), 'Ramp: % duoi 16 ~6.25 va tren 235 ~7.8 (muc hop le broadcast)', `${s.below_legal_pct}%, ${s.above_legal_pct}%`);
ok((await call('GET', '/analyze_frame?t=1&roi=2,0,3,1')).status === 400 && (await call('GET', '/analyze_frame?t=1&roi=1,0,0,1')).status === 400, 'roi sai (ngoai 0..1 hoac x1<=x0) bi tu choi 400');
const rw = await call('GET', '/scope_image?t=1&kind=rgbwave&scale=0.4');
ok(rw.status === 200 && decode(rw.data).length === 640 * 256 * 3, 'Scope RGB chong (rgbwave): anh 640x256');

await ops([{ op: 'remove_clip', id: 'ramp' }, { op: 'add_clip', clip: { id: 'bars', track: 'v1', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }]);
s = (await call('GET', '/analyze_frame?t=1&scale=0.4')).data;
ok(near(s.channels.r.mean, 0.4286, 0.015) && near(s.channels.g.mean, 0.4286, 0.015) && near(s.channels.b.mean, 0.4286, 0.015), '7 thanh mau 75%: trung binh R,G,B = 4/7 * 0.75 = 0.4286', `${s.channels.r.mean}, ${s.channels.g.mean}, ${s.channels.b.mean}`);
ok(s.saturation_mean > 0.1, 'Thanh mau co bao hoa cao', `${s.saturation_mean}`);
const vs = decode((await call('GET', '/scope_image?t=1&kind=vectorscope&scale=0.4')).data);
// diem do 75% (R=.75): cb = (0 - y)/1.8556 ; cr = (.75 - y)/1.5748, y = .1595
const probe = (r, g, b) => { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const cx = Math.round(128 + 255 * ((b - y) / 1.8556)), cy = Math.round(128 - 255 * ((r - y) / 1.5748)); let m = 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) m = Math.max(m, vs[((cy + dy) * 256 + cx + dx) * 3 + 1]); return m; };
const marks = [[0.75, 0, 0], [0.75, 0.75, 0], [0, 0.75, 0], [0, 0.75, 0.75], [0, 0, 0.75], [0.75, 0, 0.75]].map(([r, g, b]) => probe(r, g, b));
ok(marks.every((m) => m > 90), 'Vectorscope thanh mau: du 6 cham mau (R,Y,G,C,B,M) nam dung o muc tieu 75%', marks.join(','));
const par = decode((await call('GET', '/scope_image?t=1&kind=parade&scale=0.4')).data);
ok(par.length === 960 * 256 * 3, 'Parade: anh 960x256 (3 kenh canh nhau)', `${par.length}`);

// 6. analyze_frame theo clip + graded=0/1 + de xuat
await ops([{ op: 'remove_clip', id: 'bars' }, { op: 'add_clip', clip: { id: 'c', track: 'v1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: 3, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }, { op: 'set_grade', id: 'c', grade: { exposure: 1 } }]);
const g1 = (await call('GET', '/analyze_frame?t=1&clip_id=c&graded=1')).data;
const g0 = (await call('GET', '/analyze_frame?t=1&clip_id=c&graded=0')).data;
ok(g1.channels.luma.mean > g0.channels.luma.mean + 0.04 && g0.graded === false, 'analyze_frame clip graded=1 sang hon graded=0 (mau goc)', `${g1.channels.luma.mean} vs ${g0.channels.luma.mean}`);
const pr = (await call('POST', '/propose', { ops: [{ op: 'set_grade', id: 'c', grade: { exposure: -1, saturation: 0 } }], note: 'tt', source: 'ai:test' })).data;
const gp = (await call('GET', `/analyze_frame?t=1&clip_id=c&proposal=${pr.proposal_id}`)).data;
ok(gp.channels.luma.mean < g0.channels.luma.mean && gp.saturation_mean < 0.005, 'analyze_frame voi proposal: do duoc ket qua cua de xuat CHUA duyet (toi hon, het mau)', `${gp.channels.luma.mean}, sat ${gp.saturation_mean}`);
ok((await project()).clips[0].grade.exposure === 1, 'De xuat khong doi du an');
const bad = await call('GET', '/scope_image?t=1&kind=khong-co');
ok(bad.status === 400, 'scope_image voi kind sai bi tu choi');

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
