// Kiem tu dau den cuoi tren app dang chay (npm start): nhap media, de xuat/duyet, do chinh xac khung, ghep lop, xuat NVENC.
// Dung: node scripts/e2e.mjs   (can out/media/{seq,color,test-a}.mp4, xem NHAT-KY.md de tao)
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const MEDIA = resolve('out/media');
const OUT = resolve('out/e2e');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let pass = 0,
  fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} - ${name}${extra ? '  [' + extra + ']' : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const waitJob = async (id, ms = 120000) => {
  const t0 = Date.now();
  for (;;) {
    const j = (await call('GET', `/jobs/${id}`)).data;
    if (j.state !== 'running') return j;
    if (Date.now() - t0 > ms) throw new Error(`job ${id} qua han`);
    await sleep(150);
  }
};
const frameRgb = (png, w, h) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('ffmpeg doc png loi: ' + r.stderr);
  const buf = r.stdout;
  return { buf, px: (x, y) => [buf[(y * w + x) * 3], buf[(y * w + x) * 3 + 1], buf[(y * w + x) * 3 + 2]] };
};
const preview = async (t, scale = 0.25) => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=${scale}`);
  if (r.status !== 200) throw new Error(`preview_frame ${r.status}: ${JSON.stringify(r.data)}`);
  const w = Math.round(1080 * scale),
    h = Math.round(1920 * scale);
  return { w, h, ...frameRgb(r.data, w, h) };
};
// Mau tham chieu cua color.mp4: do bang chinh ffmpeg giai ma file nguon (khong phai gia tri ly thuyet 191,64,0: file thu bi luong tu hoa/chroma 4:2:0)
const COLOR_REF = [187, 62, 0];
const near = (a, b, tol) => a.length === b.length && a.length > 0 && a.every((v, i) => Math.abs(v - b[i]) <= tol);
const srgbEotf = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const srgbOetf = (l) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const blend = (a, b, o) => a.map((v, i) => Math.round(255 * srgbOetf((1 - o) * srgbEotf(v / 255) + o * srgbEotf(b[i] / 255))));
const probe = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f]).stdout.toString());

// ---- 0. app san sang
for (let i = 0; i < 60; i++) {
  const s = await call('GET', '/status').catch(() => null);
  if (s?.data?.rendererReady) break;
  await sleep(500);
}
const st = (await call('GET', '/status')).data;
ok(st.rendererReady && st.gpu?.vendor === 'nvidia', 'app san sang, GPU = nvidia', st.gpu?.vendor);

// ---- 1. nhap media
const bad = await call('POST', '/media_import', { path: resolve(MEDIA, 'khong-co.mp4') });
ok(bad.status === 500 && /khong thay file/.test(bad.data.error), 'nhap file khong ton tai tra loi co cau truc', bad.data.error?.slice(0, 40));
const imp = {};
for (const n of ['seq', 'color', 'test-a']) {
  const r = await call('POST', '/media_import', { path: resolve(MEDIA, `${n}.mp4`), source: 'human' });
  imp[n] = r.data;
}
ok(imp.seq.mediaId === 'm1' && imp.color.mediaId === 'm2' && imp['test-a'].mediaId === 'm3', 'nhap 3 media, id m1..m3');
const again = (await call('POST', '/media_import', { path: resolve(MEDIA, 'seq.mp4') })).data;
ok(again.existing === true && again.mediaId === 'm1', 'nhap lai cung file khong nhan doi');
const jobs = [];
for (const n of ['seq', 'color', 'test-a']) jobs.push(await waitJob(imp[n].job_id));
ok(jobs.every((j) => j.state === 'done'), 'ca 3 job cache xong', jobs.map((j) => j.state).join(','));
const prj = (await call('GET', '/project')).data;
ok(prj.media.every((m) => m.cache?.status === 'ready'), 'media.cache.status = ready');
ok(prj.media[0].width === 360 && prj.media[0].height === 640 && Math.abs(prj.media[0].duration - 3) < 0.1, 'ffprobe: seq 360x640 ~3s', `${prj.media[0].width}x${prj.media[0].height} ${prj.media[0].duration}`);

// ---- 2. de xuat cho duyet (khong ap dung thang)
const clip = (id, track, mediaId, start, duration, extra = {}) => ({ id, track, src: { type: 'media', mediaId }, start, duration, in: 0, volume: 1, transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fit: 'contain' }, ...extra });
const prop = await call('POST', '/propose', { source: 'ai:test', note: 'them clip seq', ops: [{ op: 'add_clip', clip: clip('c1', 'v1', 'm1', 0, 3) }] });
ok(prop.status === 200 && prop.data.status === 'pending', 'propose tao de xuat pending');
ok((await call('GET', '/project')).data.clips.length === 0, 'de xuat CHUA ap dung vao du an');
const badProp = await call('POST', '/propose', { source: 'ai:test', ops: [{ op: 'add_clip', clip: clip('cx', 'v1', 'm1', 0, 99) }] });
ok(badProp.status === 400 && badProp.data.errors.length > 0, 'de xuat sai bi bao loi ngay', badProp.data.errors?.[0]?.slice(0, 50));
const acc = await call('POST', `/proposals/${prop.data.proposal_id}/accept`);
ok(acc.status === 200 && (await call('GET', '/project')).data.clips.length === 1, 'accept ap dung de xuat');
ok((await call('POST', `/proposals/${prop.data.proposal_id}/accept`)).status === 409, 'accept lan 2 bi tu choi (409)');
const hist = (await call('GET', '/project')).data.history.at(-1);
ok(hist.source === 'ai:test', 'history ghi nguon ai:test');

// ---- 3. chinh xac khung (seq.mp4: xam = mod(N*7,200) tren thang 16..216; ky vong ma day du = mod*255/219)
const gray = (n) => Math.round(((n * 7) % 200) * 255 / 219);
const order = [0, 5, 29, 30, 31, 60, 89, 3, 88, 45, 44, 46, 10, 11, 12, 13];
let accBad = [];
for (const n of order) {
  const f = await preview(n / 30);
  const p = f.px(f.w >> 1, f.h >> 1);
  const g = gray(n);
  if (!(near(p, [g, g, g], 4))) accBad.push(`f${n}: ${p} != ${g}`);
}
ok(accBad.length === 0, `do chinh xac khung (${order.length} lan seek, gom lui va qua ranh GOP)`, accBad.slice(0, 3).join('; '));
accBad = [];
const t0 = Date.now();
for (let n = 14; n < 44; n++) {
  const f = await preview(n / 30);
  const g = gray(n);
  if (!near(f.px(f.w >> 1, f.h >> 1), [g, g, g], 4)) accBad.push(n);
}
ok(accBad.length === 0, 'phat lien tiep 30 khung deu dung', accBad.join(','));
console.log(`     (${((Date.now() - t0) / 30).toFixed(1)} ms/khung gom HTTP + PNG + giai ma, scale 0.25)`);

// ---- 4. ghep lop, mau, opacity, transform
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_track', track: { id: 'v2', kind: 'video', name: 'Video 2' } }, { op: 'add_clip', clip: clip('c2', 'v2', 'm2', 0, 3) }] });
let f = await preview(1.0);
ok(near(f.px(f.w >> 1, f.h >> 1), COLOR_REF, 2), 'mau BT.709 qua cache+WebCodecs khop ffmpeg giai ma cung file (187,62,0)', String(f.px(f.w >> 1, f.h >> 1)));

await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_transform', id: 'c2', patch: { opacity: 0.5 } }] });
f = await preview(2.0);
const n60 = 60;
const g60 = gray(n60);
const exp = blend([g60, g60, g60], COLOR_REF, 0.5);
ok(near(f.px(f.w >> 1, f.h >> 1), exp, 5), 'opacity 0.5 tron trong khong gian tuyen tinh', `${f.px(f.w >> 1, f.h >> 1)} vs ${exp}`);

await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_transform', id: 'c2', patch: { opacity: 1, scale: 0.5 } }] });
f = await preview(2.0);
ok(near(f.px(f.w >> 1, f.h >> 1), COLOR_REF, 3), 'scale 0.5: giua van la lop tren');
ok(near(f.px(Math.round(f.w * 0.85), f.h >> 1), [g60, g60, g60], 5), 'scale 0.5: ngoai vung lop tren thay lop duoi', String(f.px(Math.round(f.w * 0.85), f.h >> 1)));

await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_transform', id: 'c2', patch: { scale: 0.5, x: 0.25 } }] });
f = await preview(2.0);
ok(near(f.px(Math.round(f.w * 0.75), f.h >> 1), COLOR_REF, 3) && near(f.px(Math.round(f.w * 0.4), f.h >> 1), [g60, g60, g60], 5), 'dich ngang x=0.25');

// timeline ket thuc: ngoai clip = den
f = await preview(3.5);
ok(near(f.px(f.w >> 1, f.h >> 1), [0, 0, 0], 1), 'sau het timeline la khung den');

// ---- 5. dat lai bo cuc cuoi cung de xuat: v1 seq 0..3s, v2 color 1..2.5s o giua mo 0.5, am thanh tu test-a
await call('POST', '/ops', { source: 'human', ops: [{ op: 'set_clip', id: 'c2', patch: { start: 1, duration: 1.5 } }, { op: 'set_transform', id: 'c2', patch: { opacity: 0.5, scale: 0.6, x: 0 } }, { op: 'add_clip', clip: clip('c3', 'a1', 'm3', 0, 3, { volume: 0.8 }) }] });
const pf = await preview(2.0, 1);
// ---- 6. xuat 9:16
const r1 = (await call('POST', '/render_start', { preset: '9:16', out: resolve(OUT, 'out-916.mp4') })).data;
ok(r1.ok && r1.frames === 90 && r1.width === 1080 && r1.height === 1920, 'render_start 9:16: 90 khung 1080x1920', JSON.stringify({ f: r1.frames, w: r1.width }));
const second = await call('POST', '/render_start', { preset: '9:16', out: resolve(OUT, 'out-dup.mp4') });
ok(second.status === 500 && /dang co mot job/.test(second.data.error), 'khong cho hai job xuat cung luc');
const j1 = await waitJob(r1.job_id);
ok(j1.state === 'done', 'job xuat 9:16 xong', j1.error ?? `${j1.result?.seconds}s ${j1.result?.bytes}B`);
if (j1.state === 'done') console.log(`     (xuat 90 khung 1080x1920: ${j1.result.seconds}s => ${(90 / j1.result.seconds).toFixed(1)} khung/s)`);
const pr1 = probe(resolve(OUT, 'out-916.mp4'));
const v1 = pr1.streams.find((s) => s.codec_type === 'video'),
  a1 = pr1.streams.find((s) => s.codec_type === 'audio');
ok(v1?.codec_name === 'h264' && v1.width === 1080 && v1.height === 1920 && v1.nb_frames === '90', 'file xuat: h264 1080x1920 90 khung', `${v1?.codec_name} ${v1?.width}x${v1?.height} nb=${v1?.nb_frames}`);
ok(v1?.color_space === 'bt709' && v1?.color_range === 'tv', 'file xuat gan co BT.709 limited', `${v1?.color_space}/${v1?.color_range}`);
ok(a1?.codec_name === 'aac' && Math.abs(Number(pr1.format.duration) - 3) < 0.15, 'file xuat co am thanh aac, dai ~3s', `${a1?.codec_name} ${pr1.format.duration}s`);
const refl = spawnSync('ffmpeg', ['-v', 'error', '-ss', '2.0', '-i', resolve(OUT, 'out-916.mp4'), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: 1 << 28 });
const exported = refl.stdout;
let sum = 0,
  maxd = 0;
for (let i = 0; i < pf.buf.length; i++) {
  const d = Math.abs(pf.buf[i] - exported[i]);
  sum += d;
  if (d > maxd) maxd = d;
}
const mae = sum / pf.buf.length;
ok(exported.length === pf.buf.length && mae < 2.5, 'preview GIONG file xuat (khung t=2s, 1080x1920)', `sai so tuyet doi TB ${mae.toFixed(2)}, max ${maxd}`);

// ---- 7. xuat 16:9
const r2 = (await call('POST', '/render_start', { preset: '16:9', out: resolve(OUT, 'out-169.mp4') })).data;
const j2 = await waitJob(r2.job_id);
const pr2 = probe(resolve(OUT, 'out-169.mp4'));
const v2 = pr2.streams.find((s) => s.codec_type === 'video');
ok(j2.state === 'done' && v2.width === 1920 && v2.height === 1080, 'xuat 16:9: 1920x1080', j2.error ?? `${v2?.width}x${v2?.height}`);
const c169 = spawnSync('ffmpeg', ['-v', 'error', '-ss', '2.0', '-i', resolve(OUT, 'out-169.mp4'), '-frames:v', '1', '-vf', 'crop=2:2:960:540,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']).stdout;
ok(near([...c169], exp, 6), 'khung 16:9: tam anh ra dung mau tron (clip 9:16 duoc fit vao khung ngang)', `${[...c169]} vs ${blend([g60, g60, g60], COLOR_REF, 0.5)}`);
const exist = await call('POST', '/render_start', { preset: '9:16', out: resolve(OUT, 'out-916.mp4') });
ok(exist.status === 500 && /khong ghi de/.test(exist.data.error), 'khong ghi de file da co');

// ---- 8. huy job
const r3 = (await call('POST', '/render_start', { preset: '9:16', out: resolve(OUT, 'out-cancel.mp4') })).data;
await sleep(300);
await call('POST', `/jobs/${r3.job_id}/cancel`);
await sleep(1000);
const j3 = (await call('GET', `/jobs/${r3.job_id}`)).data;
ok(j3.state === 'cancelled' && !existsSync(resolve(OUT, 'out-cancel.mp4')), 'huy job: trang thai cancelled va khong de lai file do', j3.state);
const afterCancel = await call('POST', '/render_start', { preset: '9:16', out: resolve(OUT, 'out-after.mp4') });
ok(afterCancel.status === 200, 'sau khi huy co the xuat lai');
if (afterCancel.status === 200) await waitJob(afterCancel.data.job_id);

// ---- 9. HOI QUY: video 1080p giai ma lien tuc va tua (loi that: giu >=12 VideoFrame lam bo giai ma phan cung dung o khung thu 12)
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: clip('c4', 'v1', 'm3', 3, 3) }] });
{
  const tms = [];
  let bad9 = 0;
  for (let n = 90; n < 150; n++) {
    const t0 = Date.now();
    const r = await Promise.race([call('GET', `/preview_frame?t=${n / 30}&scale=0.1`), sleep(8000).then(() => ({ status: 0 }))]);
    tms.push(Date.now() - t0);
    if (r.status !== 200) {
      bad9++;
      console.log(`     khung ${n}: status ${r.status} sau ${Date.now() - t0}ms`);
      break;
    }
  }
  ok(bad9 === 0 && tms.length === 60, 'giai ma 60 khung 1080p lien tiep khong treo', `${tms.length}/60 khung, TB ${(tms.reduce((a, b) => a + b, 0) / Math.max(1, tms.length)).toFixed(0)} ms`);
  let seekBad = 0;
  for (const tt of [5.9, 3.2, 4.5, 3.0, 5.0, 3.5, 5.5, 4.0, 3.9, 5.7]) {
    const r = await Promise.race([call('GET', `/preview_frame?t=${tt}&scale=0.1`), sleep(8000).then(() => ({ status: 0 }))]);
    if (r.status !== 200) seekBad++;
  }
  ok(seekBad === 0, 'tua ngau nhien tren clip 1080p (10 diem, lui va tien)', `${seekBad} loi`);
  const a = await preview(4.0), b = await preview(5.0);
  let diff = 0;
  for (let i = 0; i < a.buf.length; i++) diff += Math.abs(a.buf[i] - b.buf[i]);
  ok(diff / a.buf.length > 0.5, 'noi dung clip 1080p thay doi theo thoi gian (khung dong bang se cho 0)', `chenh lech TB ${(diff / a.buf.length).toFixed(1)}`);
  const rr = (await call('POST', '/render_start', { preset: 'project', out: resolve(OUT, 'out-1080p-full.mp4') })).data;
  const jj = await waitJob(rr.job_id, 90000).catch((e) => ({ state: 'timeout', error: String(e) }));
  ok(rr.ok && jj.state === 'done' && rr.frames === 180, 'xuat 180 khung co clip 1080p, khong treo', jj.error ?? `${jj.result?.seconds}s => ${(180 / (jj.result?.seconds || 1)).toFixed(1)} khung/s`);
  if (jj.state !== 'done') await call('POST', `/jobs/${rr.job_id}/cancel`);
  else {
    const pv = probe(resolve(OUT, 'out-1080p-full.mp4')).streams.find((x) => x.codec_type === 'video');
    ok(pv.nb_frames === '180', 'file xuat day du 180 khung', pv.nb_frames);
  }
}

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
