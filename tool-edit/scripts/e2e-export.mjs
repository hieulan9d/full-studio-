// Kiem XUAT TIMELINE sang Premiere / Resolve / CapCut / After Effects / EDL (F-97) bang file that. Chay app voi TOOL_EDIT_DEV_API=1.
// Dung: TOOL_EDIT_PORT=17481 node scripts/e2e-export.mjs   (can out/media/aroll6.mp4, test-a.mp4, beep.wav)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import vm from 'node:vm';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const MEDIA = resolve('out/media');
const OUT = resolve('out/e2e-export');
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
const waitJob = async (id, ms = 300000) => {
  const t0 = Date.now();
  for (;;) {
    const j = (await call('GET', `/jobs/${id}`)).data;
    if (j.state !== 'running') return j;
    if (Date.now() - t0 > ms) throw new Error('job qua han');
    await sleep(200);
  }
};
const lin = { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 };

// ---- dung du an ----
await call('POST', '/project/new', {});
const imp = {};
for (const n of ['aroll6.mp4', 'test-a.mp4', 'beep.wav']) imp[n] = (await call('POST', '/media_import', { path: resolve(MEDIA, n) })).data;
for (const n of Object.keys(imp)) await waitJob(imp[n].job_id ?? imp[n].audio_job_id);
await sleep(500);
const pr0 = (await call('GET', '/project')).data;
const mid = (n) => pr0.media.find((m) => m.path.endsWith(n)).id;
const tf = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: 'contain', anchorH: 'center', anchorV: 'middle', margin: 0.06 };
const clipV = (id, track, name, start, dur, extra = {}) => ({ id, track, src: { type: 'media', mediaId: mid(name) }, start, duration: dur, in: 0, volume: 1, transform: { ...tf }, keyframes: {}, ...extra });
const ops = [
  { op: 'add_track', track: { id: 'v2', kind: 'video', name: 'B-roll' } },
  { op: 'add_track', track: { id: 'v3', kind: 'video', name: 'Chu' } },
  { op: 'add_clip', clip: clipV('c1', 'v1', 'aroll6.mp4', 0, 6, { keyframes: { 'transform.scale': [{ t: 0, v: 1, ease: lin }, { t: 6, v: 1.3, ease: lin }] } }) },
  { op: 'add_clip', clip: clipV('c2', 'v2', 'test-a.mp4', 2, 2, { volume: 0, transform: { ...tf, scale: 0.5, x: 0.2 } }) },
  { op: 'add_clip', clip: clipV('c3', 'a1', 'beep.wav', 0, 3, { volume: 0.5 }) },
  { op: 'add_clip', clip: { id: 'x1', track: 'v3', src: { type: 'text', text: { content: 'Việt Nam tuyệt vời', font: 'Segoe UI Black', size: 170, maxWidth: 0.9, fill: { type: 'linear', angle: 60, offset: 0, stops: [{ pos: 0, color: '#ff9a2e' }, { pos: 0.5, color: '#ff3d71' }, { pos: 1, color: '#7b2dff' }] }, stroke: { color: '#20103a', width: 6, over: false }, shadow: { color: '#000000', opacity: 0.5, blur: 18, x: 0, y: 8 } } }, start: 1, duration: 2, in: 0, volume: 1, transform: { ...tf }, keyframes: {} } },
];
const rr = await call('POST', '/ops', { source: 'human', ops });
ok(rr.status === 200, 'dung du an thu (A-roll co keyframe zoom, B-roll, nhac, chu gradient)', JSON.stringify(rr.data).slice(0, 120));

const run = async (target, extra = {}) => {
  const r = await call('POST', '/export_timeline', { target, ...extra });
  if (r.status !== 200) return { err: r.data.error };
  const j = await waitJob(r.data.job_id);
  return { start: r.data, job: j };
};
const probe = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f]).stdout.toString());
const xmlOk = (f) => spawnSync('python', ['-I', '-c', 'import sys,xml.etree.ElementTree as E; E.parse(sys.argv[1])', f]).status === 0;

// ---- loi hop le ----
ok((await call('POST', '/export_timeline', { target: 'xyz' })).status === 500, 'target khong hop le -> loi co cau truc');
ok((await call('GET', '/export_targets')).data.targets.length === 5, 'GET /export_targets liet ke 5 dich, kem muc kiem');

// ---- EDL (khong lop phu) ----
let r = await run('edl');
ok(r.job?.state === 'done' && r.start.overlay_frames === 0, 'EDL: xong ngay, khong ve lop phu', r.err ?? r.job?.error);
const edlFiles = r.job.result.files.filter((f) => f.endsWith('.edl'));
ok(edlFiles.length >= 3 && readFileSync(edlFiles[0], 'utf8').includes('FCM: NON-DROP FRAME'), 'EDL: moi track mot file', `${edlFiles.length} file`);
ok(/Mức kiểm: chưa kiểm/.test(readFileSync(r.job.result.files.find((f) => f.endsWith('HUONG-DAN.txt')), 'utf8')), 'HUONG-DAN.txt ghi ro muc kiem "chua kiem"');

// ---- Premiere: co lop phu ----
r = await run('premiere');
ok(r.job?.state === 'done', 'Premiere: job xong', r.err ?? r.job?.error);
const res = r.job.result;
const mov = res.overlay?.path;
ok(mov && existsSync(mov), 'Premiere: co file lop phu .mov', mov);
const pm = probe(mov);
const vs = pm.streams[0];
ok(vs.codec_name === 'qtrle' && vs.width === 1080 && vs.height === 1920 && Number(vs.nb_frames) === 180, 'Lop phu: qtrle 1080x1920, du 180 khung (6 giay)', `${vs.codec_name} ${vs.width}x${vs.height} ${vs.nb_frames}`);
// alpha that: khung 1.5s (co chu) va 5s (khong chu)
const rgba = (t) => {
  const x = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', mov, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], { maxBuffer: 1 << 28 }).stdout;
  return x;
};
const f15 = rgba(1.5),
  f5 = rgba(5);
let aMax5 = 0;
for (let i = 3; i < f5.length; i += 4) aMax5 = Math.max(aMax5, f5[i]);
let nOpaque = 0,
  nPartial = 0,
  aCorner = f15[3];
for (let i = 3; i < f15.length; i += 4) {
  if (f15[i] > 250) nOpaque++;
  else if (f15[i] > 5) nPartial++;
}
ok(aMax5 === 0, 'Ngoai khoang co chu (t=5s): lop phu trong suot hoan toan (alpha max = 0)', `max=${aMax5}`);
ok(aCorner === 0 && nOpaque > 5000 && nPartial > 500, 'Khung co chu (t=1.5s): nen trong suot, loi chu dac, vien mem co alpha giua', `dac=${nOpaque} giua=${nPartial} goc=${aCorner}`);
// so voi preview thuc: video tat, chi chu. Nen den -> overlay phu len den phai khop preview_frame
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_clip', id: 'c1', patch: { disabled: true } }, { op: 'set_clip', id: 'c2', patch: { disabled: true } }] });
const pv = (await call('GET', '/preview_frame?t=1.5&scale=1')).data;
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_clip', id: 'c1', patch: { disabled: false } }, { op: 'set_clip', id: 'c2', patch: { disabled: false } }] });
const pvRaw = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: pv, maxBuffer: 1 << 28 }).stdout;
let sum = 0,
  worst = 0,
  cnt = 0;
for (let p = 0; p < 1080 * 1920; p++) {
  const a = f15[p * 4 + 3] / 255;
  for (let c = 0; c < 3; c++) {
    const comp = f15[p * 4 + c] * a; // phu len nen den
    const d = Math.abs(comp - pvRaw[p * 3 + c]);
    sum += d;
    cnt++;
    if (d > worst) worst = d;
  }
}
const mae = sum / cnt;
ok(mae < 0.6, 'Lop phu phu len nen den khop preview that (sai so trung binh < 0,6/255)', `MAE=${mae.toFixed(3)} lon nhat=${worst.toFixed(0)}`);
const xml = res.files.find((f) => f.endsWith('.xml'));
ok(xmlOk(xml), 'Premiere: file .xml la XML hop le (parser Python)');
const xtxt = readFileSync(xml, 'utf8');
ok(/<xmeml version="4">/.test(xtxt) && /lop-phu\.mov/.test(xtxt) && (xtxt.match(/<clipitem /g) ?? []).length >= 5, 'Premiere: xmeml co clip video, am thanh, lop phu', `${(xtxt.match(/<clipitem /g) ?? []).length} clipitem`);
ok(res.warnings.some((w) => /lớp video trong suốt/.test(w)), 'Canh bao noi ro phan vao lop phu', res.warnings[0]?.slice(0, 80));

// ---- Resolve ----
r = await run('resolve', { overlay: false });
ok(r.job?.state === 'done' && !r.job.result.overlay && r.job.result.warnings.some((w) => /bỏ qua lớp phủ/.test(w)), 'Resolve (bo lop phu): xong nhanh, canh bao chu se mat', r.err ?? r.job?.error);
const fx = r.job.result.files.find((f) => f.endsWith('.fcpxml'));
ok(fx && xmlOk(fx) && /<fcpxml version="1.9">/.test(readFileSync(fx, 'utf8')), 'Resolve: .fcpxml la XML hop le');
ok(r.job.result.files.some((f) => f.endsWith('-xmeml.xml') && xmlOk(f)), 'Resolve: kem .xml (xmeml) hop le');

// ---- After Effects ----
r = await run('ae', { overlay: false });
const jsx = r.job.result.files.find((f) => f.endsWith('.jsx'));
ok(r.job.state === 'done' && jsx, 'AE: job xong, co .jsx');
let syntax = true;
try {
  new vm.Script(readFileSync(jsx, 'utf8'));
} catch (e) {
  syntax = false;
  console.log(String(e));
}
ok(syntax && !/alert\(/.test(readFileSync(jsx, 'utf8')), 'AE: script cu phap hop le, khong hop thoai');

// ---- CapCut ----
const tg = (await call('GET', '/export_targets')).data.targets.find((t) => t.id === 'capcut');
if (!tg.available) {
  console.log('skip - CapCut: chua co ban nhap khuon tren may:', tg.unavailable_reason);
  r = await run('capcut', { overlay: false });
  ok(!!r.err && /chua tim thay ban nhap CapCut/.test(r.err), 'CapCut: khong co khuon thi bao loi ro rang (khong tao file hong)', r.err?.slice(0, 80));
} else {
  r = await run('capcut');
  ok(r.job?.state === 'done', 'CapCut: job xong (co ve lop phu)', r.err ?? r.job?.error);
  const dir = r.job.result.capcut.dir;
  const D = JSON.parse(readFileSync(resolve(dir, 'draft_content.json'), 'utf8'));
  const names = D.tracks.map((t) => `${t.type}:${t.segments.length}`);
  ok(D.tracks.some((t) => t.type === 'video') && D.tracks.some((t) => t.type === 'audio') && existsSync(resolve(dir, 'draft_meta_info.json')), 'CapCut: draft_content.json + meta, co track video + audio', names.join(' '));
  const seg = D.tracks[0].segments[0];
  ok((seg.common_keyframes ?? []).some((k) => k.property_type === 'KFTypeScaleX'), 'CapCut: keyframe zoom cua A-roll duoc chuyen (KFTypeScaleX)');
  ok(D.tracks.some((t) => /Lớp phủ/.test(t.name)) && D.materials.videos.some((m) => /lop-phu\.mov$/.test(m.path)), 'CapCut: lop phu .mov la mot track video tren cung');
  ok(D.duration === 6_000_000, 'CapCut: do dai 6 giay', String(D.duration));
}
console.log(`\n${pass} dat, ${fail} hong`);
void readdirSync;
process.exit(fail ? 1 : 0);
