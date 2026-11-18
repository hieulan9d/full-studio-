// Kiem GD4 bang DU LIEU THAT: speed ramp (thoi gian lai) trong preview va file xuat, tron khung khi cham, giu cao do am thanh;
// tach nen bang RVM (GPU) tren clip talking head that, ghep matte dung, lam mem vien, chu sau lung nguoi.
// Chay app voi TOOL_EDIT_DEV_API=1. Can: ffmpeg, python + onnxruntime, models/rvm_mobilenetv3_fp32.onnx, clip aroll.mp4 cua kit.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const MEDIA = resolve('out/media');
const OUT = resolve('out/e2e-video');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(MEDIA, { recursive: true });
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
const waitJob = async (id, ms = 300000) => {
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
  return r.data;
};
const tryOps = async (list) => (await call('POST', '/ops', { source: 'human', ops: list })).status === 200;
const fresh = async () => {
  await call('POST', '/project/new', {});
  await sleep(1500);
};
const imp = async (file) => {
  const r = (await call('POST', '/media_import', { path: file })).data;
  if (!r.ok) throw new Error('import loi ' + JSON.stringify(r));
  if (r.job_id) await waitJob(r.job_id);
  if (r.audio_job_id) await waitJob(r.audio_job_id);
  return r.mediaId;
};
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { maxBuffer: 1 << 28, ...opt });
const decode = (png, w, h) => {
  const r = run('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png });
  return { w, h, buf: r.stdout, px: (x, y) => [r.stdout[(y * w + x) * 3], r.stdout[(y * w + x) * 3 + 1], r.stdout[(y * w + x) * 3 + 2]] };
};
const frame = async (t, scale = 0.25, extra = '') => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=${scale}${extra}`);
  if (r.status !== 200) throw new Error(`preview_frame ${r.status} ${JSON.stringify(r.data)}`);
  return decode(r.data, Math.round(1080 * scale), Math.round(1920 * scale));
};
const center = (img) => img.px(img.w >> 1, img.h >> 1)[0];
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const rms = (file, t0, d, f) => {
  const af = `bandpass=f=${f}:width_type=h:w=120,astats=metadata=1:reset=0,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`;
  const r = run('ffmpeg', ['-v', 'error', '-ss', String(t0), '-t', String(d), '-i', file, '-af', af, '-f', 'null', '-']);
  const m = [...r.stdout.toString().matchAll(/RMS_level=(-?[0-9.]+|-inf)/g)].map((x) => (x[1] === '-inf' ? -120 : Number(x[1])));
  return m.length ? m[m.length - 1] : NaN;
};
const exportTo = async (name, preset = '9:16') => {
  const out = resolve(OUT, name);
  const r = (await call('POST', '/render_start', { preset, out })).data;
  if (!r.ok) throw new Error('render_start loi ' + JSON.stringify(r));
  const j = await waitJob(r.job_id, 240000);
  if (j.state !== 'done') throw new Error('xuat that bai: ' + j.error);
  return out;
};
const mkclip = (id, track, mediaId, start, duration, extra = {}) => ({ id, track, src: { type: 'media', mediaId }, start, duration, in: 0, volume: 1, transform: {}, keyframes: {}, ...extra });
const K = (t, v, kind = 'linear') => ({ t, v, ease: { kind, x1: 0, y1: 0, x2: 1, y2: 1 } });

// ---- file thu: dốc sáng theo thời gian (tuyến tính) + dốc răng cưa nhanh + tiếng 440 Hz
const common = ['-v', 'error', '-y', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '12', '-g', '15', '-bf', '0', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-c:a', 'aac'];
const lin = resolve(MEDIA, 'ramp-lin.mp4');
const saw = resolve(MEDIA, 'ramp-saw.mp4');
if (!existsSync(lin)) run('ffmpeg', ['-f', 'lavfi', '-i', 'color=c=gray:s=360x640:r=30:d=10', '-f', 'lavfi', '-i', 'sine=f=440:d=10', '-vf', "geq=lum='16+219*T/10':cb=128:cr=128", ...common, '-shortest', lin]);
if (!existsSync(saw)) run('ffmpeg', ['-f', 'lavfi', '-i', 'color=c=gray:s=360x640:r=30:d=6', '-f', 'lavfi', '-i', 'sine=f=440:d=6', '-vf', "geq=lum='16+219*mod(T*2,1)':cb=128:cr=128", ...common, '-shortest', saw]);
const aroll = resolve('..', 'phong-cach/talking-head/examples/foodtage/media/aroll.mp4');
const aroll6 = resolve(MEDIA, 'aroll6.mp4');
if (existsSync(aroll) && !existsSync(aroll6)) run('ffmpeg', ['-v', 'error', '-y', '-ss', '2', '-t', '6', '-i', aroll, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-c:a', 'aac', aroll6]);

// ================= A. TOC DO =================
await fresh();
const mLin = await imp(lin);
const mSaw = await imp(saw);
// gia tri xam THUC cua file nguon tai giay `t` (do truc tiep bang ffmpeg, khong gia dinh cong thuc)
const srcVal = (file, t) => run('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=36:64:in_range=tv:out_range=pc,format=gray', '-f', 'rawvideo', 'pipe:1']).stdout[32 * 36 + 18];
const val = (frac) => srcVal(lin, frac * 10);

// A1 toc do co dinh 2x, co in
await ops([{ op: 'add_clip', clip: mkclip('s1', 'v1', mLin, 0, 3, { in: 1, speed: 2 }) }]);
for (const t of [0.25, 1, 2.5]) {
  const v = center(await frame(t));
  const src = 1 + 2 * t;
  ok(near(v, val(src / 10), 6), `Toc do 2x (in=1): t=${t}s hien khung nguon ${src.toFixed(2)}s`, `${v} vs ${val(src / 10)}`);
}
// A2 keyframe toc do 1 -> 3 (tuyen tinh) trong 2 giay
await ops([{ op: 'set_speed', id: 's1', speed: 1 }, { op: 'set_clip', id: 's1', patch: { in: 0, duration: 2 } }, { op: 'set_keyframes', id: 's1', prop: 'speed', keys: [K(0, 1), K(2, 3)] }]);
for (const t of [1.0, 1.9]) {
  const src = t + (t * t) / 2; // tich phan cua 1+t
  const v = center(await frame(t));
  ok(near(v, val(src / 10), 6), `Speed ramp 1->3: t=${t}s hien khung nguon ${src.toFixed(2)}s`, `${v} vs ${val(src / 10)}`);
}
// A3 cham 0.25x: tron khung ke nhau => dai gia tri lien tuc (khong thanh bac thang)
await ops([{ op: 'remove_clip', id: 's1' }, { op: 'add_clip', clip: mkclip('s2', 'v1', mSaw, 0, 2, { speed: 0.25 }) }]);
const devs = [];
for (let k = 1; k <= 9; k++) {
  const v = center(await frame(k / 30));
  const exp = 255 * 2 * ((k / 30) * 0.25); // giá trị liên tục
  devs.push(Math.abs(v - exp));
}
ok(Math.max(...devs) <= 5, 'Cham 0.25x: tron hai khung nguon ke nhau, gia tri bam sat duong lien tuc (khong bac thang)', `lech toi da ${Math.max(...devs).toFixed(1)} / bac thang se ~14`);
// A4 khong keo dai vuot nguon
ok(!(await tryOps([{ op: 'set_clip', id: 's2', patch: { duration: 40 } }])), 'Keo dai clip toc do 0.25 qua do dai nguon bi tu choi (validate theo toc do)');

// A5 xuat: toc do 2x giu cao do (440 Hz, khong len 880), khung dung
await ops([{ op: 'remove_clip', id: 's2' }, { op: 'add_clip', clip: mkclip('s3', 'v1', mLin, 0, 4, { speed: 2 }) }]);
const f2 = await exportTo('speed2.mp4');
const dur2 = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f2]).stdout.toString());
ok(near(dur2, 4, 0.1), 'Xuat clip 2x: dai dung do dai tren timeline', `${dur2.toFixed(2)}s`);
const a440 = rms(f2, 0.5, 2, 440),
  a880 = rms(f2, 0.5, 2, 880);
ok(a440 - a880 > 20, 'Am thanh 2x giu cao do (440 Hz), khong len thanh 880 Hz (atempo)', `440:${a440.toFixed(1)} dB, 880:${a880.toFixed(1)} dB`);
const lumaOut = srcVal(f2, 1.5);
const want = val(0.3),
  wrongT = val(0.15); // neu bo qua toc do se hien khung nguon giay 1.5
ok(near(lumaOut, want, 10) && Math.abs(lumaOut - want) < Math.abs(lumaOut - wrongT) / 2, 'Xuat 2x: khung o giay 1.5 dung khung nguon giay 3 (khong phai giay 1.5)', `luma ${lumaOut} vs ${want} (sai thi ~${wrongT})`);

// A6 speed ramp: tat tieng (khong co track am thanh)
await ops([{ op: 'set_keyframes', id: 's3', prop: 'speed', keys: [K(0, 1), K(4, 2)] }]);
const fr = await exportTo('ramp.mp4');
const streams = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', fr]).stdout.toString()).streams;
ok(!streams.some((s) => s.codec_type === 'audio'), 'Speed ramp: am thanh bi tat (khong keo gian theo duong cong), file van xuat dung');

// ================= B. TACH NEN =================
if (!existsSync(aroll6) || !existsSync(resolve('models/rvm_mobilenetv3_fp32.onnx'))) {
  console.log('BO QUA phan tach nen: thieu aroll6.mp4 hoac mo hinh RVM');
} else {
  await fresh();
  const mA = await imp(aroll6);
  const noMatte = await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: mkclip('p1', 'v1', mA, 0, 6) }, { op: 'set_clip_matte', id: 'p1', matte: { lo: 0, hi: 1, feather: 0 } }] });
  ok(noMatte.status !== 200, 'Ap matte khi chua tach nen bi tu choi, khong de lai clip nua voi');
  const mj = (await call('POST', '/matte', { media_id: mA })).data;
  ok(mj.ok && mj.job_id, 'POST /matte tra job_id (chay nen)');
  const busy = await call('POST', '/matte', { media_id: mA });
  ok(busy.status === 409, 'Chay tach nen thu hai khi dang chay bi tu choi (GPU 6GB chi mot phan tich mot luc)');
  const t0 = Date.now();
  const job = await waitJob(mj.job_id);
  ok(job.state === 'done', 'Tach nen RVM xong tren GPU', `${job.error ?? ((Date.now() - t0) / 1000).toFixed(1) + 's, ' + job.result?.device}`);
  let pj = await project();
  const mm = pj.media.find((m) => m.role === 'matte');
  ok(mm && pj.media.find((m) => m.id === mA).matte === mm.id, 'Matte la media phu (role=matte) gan vao media goc', mm?.id);
  for (let i = 0; i < 60 && (await project()).media.find((m) => m.role === 'matte')?.cache?.status !== 'ready'; i++) await sleep(500);
  pj = await project();
  ok(pj.media.find((m) => m.role === 'matte').cache.status === 'ready', 'Cache matte san sang (qua cung duong ong H.264 nhu media thuong)');
  // dung lai khi tach lan hai
  const again = (await call('POST', '/matte', { media_id: mA })).data;
  const j2 = await waitJob(again.job_id);
  ok(j2.state === 'done' && (await project()).media.filter((m) => m.role === 'matte').length === 1, 'Tach lai cung file: dung lai matte da co (khong tao ban sao)');

  // dung canh: nen bars o v1, nguoi o v2
  await ops([{ op: 'remove_clip', id: 'p1' }]).catch(() => {});
  await ops([
    { op: 'add_clip', clip: { id: 'bg', track: 'v1', src: { type: 'gen', kind: 'bars', param: 0 }, start: 0, duration: 6, in: 0, volume: 1, transform: {}, keyframes: {} } },
    { op: 'add_track', track: { id: 'v2', kind: 'video', name: 'Nguoi' } },
    { op: 'add_clip', clip: mkclip('p1', 'v2', mA, 0, 6) },
  ]);
  const T = 2; // giay
  const B = await frame(T, 0.25); // nguoi + nen bars, KHONG matte (nguoi phu kin)
  await ops([{ op: 'set_clip_matte', id: 'p1', matte: { lo: 0, hi: 1, feather: 0 } }]);
  const C = await frame(T, 0.25); // co matte
  await ops([{ op: 'set_clip_matte', id: 'p1', matte: null }, { op: 'set_clip', id: 'p1', patch: { duration: 6 } }]);
  await ops([{ op: 'remove_clip', id: 'p1' }]);
  const A = await frame(T, 0.25); // chi nen bars
  // matte tham chieu: doc thang file matte tai cung thoi diem (cung kich thuoc xem truoc)
  const mp = pj.media.find((m) => m.role === 'matte').path;
  const mref = run('ffmpeg', ['-v', 'error', '-ss', String(T), '-i', mp, '-frames:v', '1', '-vf', `scale=${C.w}:${C.h}`, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']).stdout;
  let nIn = 0, okIn = 0, nOut = 0, okOut = 0, cover = 0;
  const d = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) {
    const m = mref[y * C.w + x] / 255;
    if (m > 0.97) { nIn++; cover++; if (d(C.px(x, y), B.px(x, y)) <= 10) okIn++; }
    else if (m < 0.03) { nOut++; if (d(C.px(x, y), A.px(x, y)) <= 10) okOut++; }
  }
  ok(nIn > 5000 && okIn / nIn > 0.97, 'Vung la NGUOI (matte=1): ket qua giong video goc', `${(100 * okIn / nIn).toFixed(1)}% cua ${nIn} diem`);
  ok(nOut > 5000 && okOut / nOut > 0.97, 'Vung la NEN (matte=0): thay nen phia sau (bars), nguoi trong suot', `${(100 * okOut / nOut).toFixed(1)}% cua ${nOut} diem`);
  ok(cover / (C.w * C.h) > 0.3 && cover / (C.w * C.h) < 0.85, 'Phan nguoi chiem ty le hop ly cua khung', `${(100 * cover / (C.w * C.h)).toFixed(0)}%`);
  const inter = (img) => { let n = 0; for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const p = img.px(x, y); if (d(p, A.px(x, y)) > 14 && d(p, B.px(x, y)) > 14) n++; } return n; };
  const edge0 = inter(C);

  // lam mem vien (feather) va muc den/trang
  await ops([{ op: 'add_clip', clip: mkclip('p1', 'v2', mA, 0, 6) }, { op: 'set_clip_matte', id: 'p1', matte: { lo: 0, hi: 1, feather: 8 } }]);
  const F = await frame(T, 0.25);
  const edgeF = inter(F);
  ok(edgeF > edge0 * 1.15, 'Feather 8: vien mem hon (nhieu diem chuyen tiep hon)', `${edge0} -> ${edgeF} diem`);
  await ops([{ op: 'set_clip_matte', id: 'p1', matte: { lo: 0.45, hi: 0.55, feather: 0 } }]);
  const H = await frame(T, 0.25);
  ok(inter(H) < edge0 * 0.85, 'Muc den/trang hep (0.45..0.55): vien gon, cung hon', `${edge0} -> ${inter(H)} diem`);

  // chu SAU lung nguoi
  await ops([{ op: 'set_clip_matte', id: 'p1', matte: null }, { op: 'remove_clip', id: 'p1' }]);
  await fresh();
  const mB = await imp(aroll6);
  const mj3 = (await call('POST', '/matte', { media_id: mB })).data;
  await waitJob(mj3.job_id);
  for (let i = 0; i < 60 && (await project()).media.find((m) => m.role === 'matte')?.cache?.status !== 'ready'; i++) await sleep(500);
  const TXT = { type: 'text', text: { content: 'SAU', size: 420, weight: 900, fill: { type: 'solid', color: '#ffffff' } } };
  await ops([{ op: 'add_clip', clip: mkclip('p', 'v1', mB, 0, 6) }]);
  const C0 = await frame(T, 0.25); // chi nguoi + nen goc
  await ops([{ op: 'add_track', track: { id: 'v2', kind: 'video', name: 'Chu' } }, { op: 'add_clip', clip: { id: 'tx', track: 'v2', src: TXT, start: 0, duration: 6, in: 0, volume: 1, transform: {}, keyframes: {} } }]);
  const Tf = await frame(T, 0.25); // chu DE LEN tren nguoi
  await ops([{ op: 'add_track', track: { id: 'v3', kind: 'video', name: 'Nguoi' } }, { op: 'add_clip', clip: mkclip('pp', 'v3', mB, 0, 6, { volume: 0 }) }, { op: 'set_clip_matte', id: 'pp', matte: { lo: 0, hi: 1, feather: 0 } }]);
  const D = await frame(T, 0.25); // chu SAU nguoi
  const mp2 = (await project()).media.find((m) => m.role === 'matte').path;
  const mr = run('ffmpeg', ['-v', 'error', '-ss', String(T), '-i', mp2, '-frames:v', '1', '-vf', `scale=${D.w}:${D.h}`, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']).stdout;
  let textOnPerson = 0, hiddenOk = 0, textOnBg = 0, shownOk = 0;
  for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) {
    const m = mr[y * D.w + x] / 255;
    const diff = d(Tf.px(x, y), C0.px(x, y)) > 60; // diem ma chu de len tao khac biet ro
    if (!diff) continue;
    if (m > 0.97) { textOnPerson++; if (d(D.px(x, y), C0.px(x, y)) <= 10) hiddenOk++; }
    else if (m < 0.03) { textOnBg++; if (d(D.px(x, y), Tf.px(x, y)) <= 10) shownOk++; }
  }
  ok(textOnPerson > 300 && hiddenOk / textOnPerson > 0.97, 'Chu SAU nguoi: cho chu giao voi nguoi, nguoi che chu (chi con video)', `${(100 * hiddenOk / Math.max(1, textOnPerson)).toFixed(1)}% cua ${textOnPerson} diem`);
  ok(textOnBg > 300 && shownOk / textOnBg > 0.97, 'Chu SAU nguoi: cho khong co nguoi, chu van hien ro', `${(100 * shownOk / Math.max(1, textOnBg)).toFixed(1)}% cua ${textOnBg} diem`);
  // xuat: khung xuat trung voi xem truoc o khung chu sau nguoi
  const fx = await exportTo('behind.mp4');
  const fxo = run('ffmpeg', ['-v', 'error', '-ss', String(T), '-i', fx, '-frames:v', '1', '-vf', `scale=${D.w}:${D.h}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']).stdout;
  let sum = 0;
  for (let i = 0; i < D.w * D.h * 3; i++) sum += Math.abs(fxo[i] - D.buf[i]);
  ok(sum / (D.w * D.h * 3) < 6, 'Xuat co matte (chu sau nguoi): khung xuat khop xem truoc', `sai so TB ${(sum / (D.w * D.h * 3)).toFixed(2)} / 255`);
}

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
