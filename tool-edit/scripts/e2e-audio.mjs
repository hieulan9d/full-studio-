// Kiem GD3 bang AM THANH THAT: whisper (GPU) tren giong TTS co kich ban biet truoc, phu de tung tu khop moc, cat khoang lang,
// duck nhac, chuan hoa -14 LUFS, SFX theo su kien (duyet tung muc), nhan nhip, QC. Chay app voi TOOL_EDIT_DEV_API=1.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const MEDIA = resolve('out/media');
const AUDIO = resolve('out/audio');
const OUT = resolve('out/e2e-audio');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(AUDIO, { recursive: true });
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
  return r.data;
};
const clearClips = async () => {
  const p = await project();
  const o = p.clips.map((c) => ({ op: 'remove_clip', id: c.id }));
  if (o.length) await ops(o);
  await ops([{ op: 'clear_markers' }]);
  // go cac track phu (phu de, SFX): khong co op xoa track, nen de nguyen; clip da xoa het
};
const imp = async (file) => {
  const r = (await call('POST', '/media_import', { path: file })).data;
  if (!r.ok) throw new Error('import loi ' + JSON.stringify(r));
  if (r.job_id) await waitJob(r.job_id);
  if (r.audio_job_id) await waitJob(r.audio_job_id);
  return r.mediaId;
};
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { maxBuffer: 1 << 28, ...opt });
const probe = (f) => JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f]).stdout.toString());
const decode = (png, w, h) => {
  const r = run('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png });
  return { w, h, buf: r.stdout, px: (x, y) => [r.stdout[(y * w + x) * 3], r.stdout[(y * w + x) * 3 + 1], r.stdout[(y * w + x) * 3 + 2]] };
};
const frame = async (t, scale = 0.5) => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=${scale}`);
  if (r.status !== 200) throw new Error(`preview_frame ${r.status} ${JSON.stringify(r.data)}`);
  return decode(r.data, Math.round(1080 * scale), Math.round(1920 * scale));
};
const countPx = (img, f) => { let n = 0, sx = 0; for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (f(img.px(x, y))) { n++; sx += x; } return { n, cx: n ? sx / n : NaN }; };
const isYellow = (c) => c[0] > 225 && c[1] > 170 && c[2] < 160 && c[0] > c[2] + 90;
const isWhite = (c) => c[0] > 235 && c[1] > 235 && c[2] > 235;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
/** RMS (dB) cua mot cua so tieng, co the loc dai hep quanh f (Hz). */
const rms = (file, t0, d, f) => {
  const af = (f ? `bandpass=f=${f}:width_type=h:w=250,` : '') + 'astats=metadata=1:reset=0,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-';
  const r = run('ffmpeg', ['-v', 'error', '-ss', String(t0), '-t', String(d), '-i', file, '-af', af, '-f', 'null', '-']);
  const m = [...r.stdout.toString().matchAll(/RMS_level=(-?[0-9.]+|-inf)/g)].map((x) => (x[1] === '-inf' ? -120 : Number(x[1])));
  return m.length ? m[m.length - 1] : NaN;
};
const integrated = (file) => {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
  const s = r.stderr.toString();
  const o = JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));
  return { i: Number(o.input_i), tp: Number(o.input_tp) };
};
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);
const wer = (ref, hyp) => {
  const d = Array.from({ length: ref.length + 1 }, (_, i) => [i, ...Array(hyp.length).fill(0)]);
  for (let j = 0; j <= hyp.length; j++) d[0][j] = j;
  for (let i = 1; i <= ref.length; i++) for (let j = 1; j <= hyp.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  return d[ref.length][hyp.length] / ref.length;
};

for (let i = 0; i < 60; i++) { const s = await call('GET', '/status').catch(() => null); if (s?.data?.rendererReady) break; await sleep(500); }

// ---- 0. nguyen lieu: giong TTS co kich ban biet truoc (khoang lap 1.8s o giua)
const REF = 'The quick brown fox jumps over the lazy dog. Today we talk about video editing with artificial intelligence. It is fast, precise, and fun.';
const speechWav = resolve(AUDIO, 'speech-en.wav');
const speechMp4 = resolve(MEDIA, 'speech-en.mp4');
if (!existsSync(speechMp4)) {
  const ps = resolve(AUDIO, '_tts.ps1');
  writeFileSync(ps, `Add-Type -AssemblyName System.Speech\n$s = New-Object System.Speech.Synthesis.SpeechSynthesizer\n$s.SelectVoice('Microsoft Zira Desktop')\n$s.SetOutputToWaveFile('${speechWav}')\n$s.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">The quick brown fox jumps over the lazy dog. <break time="1800ms"/> Today we talk about video editing with artificial intelligence. It is fast, precise, and fun.</speak>')\n$s.Dispose()\n`);
  run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps]);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x203040:s=1080x1920:r=30', '-i', speechWav, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-shortest', '-c:a', 'aac', speechMp4]);
}
ok(existsSync(speechMp4), 'co file giong noi thu (TTS Zira, kich ban biet truoc)');

await call('POST', '/project/new', {});
const m1 = await imp(speechMp4);
const dur = (await project()).media.find((m) => m.id === m1).duration;

// ---- 1. whisper tren GPU
const tj = await call('POST', '/transcribe', { media_id: m1, lang: 'en', model: 'large-v3-turbo' });
ok(tj.status === 200 && tj.data.job_id, 'POST /transcribe tra job_id (chay nen)', JSON.stringify(tj.data).slice(0, 80));
const dup = await call('POST', '/transcribe', { media_id: m1, lang: 'en' });
ok(dup.status === 409 && /chay/.test(dup.data.error), 'khong cho hai phan tich cung luc (GPU 6GB)');
const tdone = await waitJob(tj.data.job_id);
ok(tdone.state === 'done', 'job whisper xong', tdone.error ?? `${tdone.result?.words} tu, ${tdone.result?.device}, ${tdone.result?.seconds}s cho ${dur.toFixed(1)}s am thanh`);
const tr = (await call('GET', `/transcript?media_id=${m1}`)).data;
ok(tr.ok && tr.total_words >= 20, 'transcript co du tu', `${tr.total_words} tu: "${tr.text.slice(0, 70)}..."`);
const e = wer(norm(REF), norm(tr.text));
ok(e <= 0.12, 'WER (loi nhan dang) <= 12% tren kich ban tieng Anh co dap an', `WER ${(e * 100).toFixed(1)}%`);
const W = tr.words;
ok(W.every((w, i) => w.e >= w.s && (i === 0 || w.s >= W[i - 1].s - 1e-6)) && W[W.length - 1].e <= dur + 0.2, 'moc thoi gian tung tu tang dan va nam trong do dai file');
let gapAt = -1, gapLen = 0;
for (let i = 1; i < W.length; i++) if (W[i].s - W[i - 1].e > gapLen) { gapLen = W[i].s - W[i - 1].e; gapAt = i; }
ok(gapLen > 1.7 && gapLen < 2.7 && /dog/i.test(W[gapAt - 1].w) && /today/i.test(W[gapAt].w), 'moc tu bat dung khoang lap giua "dog." va "Today" (1.8s ngat + nghi hoi tu nhien cua TTS)', `khoang ${gapLen.toFixed(2)}s giua "${W[gapAt - 1].w}" va "${W[gapAt].w}"`);
const rtf = tdone.result.seconds / dur;
console.log(`     (toc do whisper: ${(1 / rtf).toFixed(1)}x thoi gian thuc tren ${tdone.result.device})`);

// ---- 2. phu de tung tu khop moc
await ops([{ op: 'add_clip', clip: { id: 'v', track: 'v1', src: { type: 'media', mediaId: m1 }, start: 0, duration: dur, in: 0, volume: 1, transform: {}, keyframes: {} } }]);
await ops([{ op: 'generate_captions', id: 'v', opts: { style: 'karaoke', maxWords: 4, highlight: '#ffd166' } }]);
let pj = await project();
let caps = pj.clips.filter((c) => c.tag === 'captions:v');
ok(caps.length >= 5 && caps.every((c) => c.src.text.animator.preset === 'karaoke' && c.src.text.animator.times.length >= 1), 'generate_captions: nhom phu de karaoke co moc vao tung tu', `${caps.length} nhom`);
const firstWord = W[0];
const c0 = caps[0];
ok(near(c0.start, firstWord.s, 0.02) && near(c0.start + c0.src.text.animator.times[1], W[1].s, 0.02), 'moc vao cua tu trong phu de = moc whisper (cung timeline)', `nhom 1 bat dau ${c0.start} vs tu dau ${firstWord.s}`);
// do HIEU UNG thuc: tai giua moi tu thuoc nhom 1, mau vang (tu dang noi) xuat hien va DICH SANG PHAI theo tung tu
const xs = [];
for (let i = 0; i < 3; i++) { // 3 tu dau cung nam tren mot dong (tu thu 4 xuong dong, tam lech)
  const t = (W[i].s + W[i].e) / 2;
  const f = await frame(t);
  const y = countPx(f, isYellow);
  xs.push(y.n > 6 ? y.cx : NaN);
}
ok(xs.every((x) => Number.isFinite(x)) && xs.every((x, i) => i === 0 || x > xs[i - 1] + 3), 'Render: tu dang noi sang MAU VANG va di chuyen sang phai theo tung tu (3 tu dau cung dong)', xs.map((x) => x.toFixed(0)).join(' -> '));
const mid = (W[gapAt - 1].e + W[gapAt].s) / 2;
const fp = await frame(mid);
ok(countPx(fp, isWhite).n < 30 && countPx(fp, isYellow).n < 5, 'Trong khoang lang 1.8s khong con phu de (het giu 0.35s)');
const tw = await frame(W[gapAt + 3].s + 0.05);
ok(countPx(tw, isWhite).n + countPx(tw, isYellow).n > 200, 'Sau khoang lang phu de hien lai dung luc noi');

// ---- 3. khoang lang + cat theo loi thoai
const sil = (await call('GET', '/silences?clip_id=v&min=0.8&keep=0.12')).data;
ok(sil.ok && sil.source === 'words' && sil.count === 1 && near(sil.total_seconds, gapLen - 0.24, 0.1), 'GET /silences: tim dung 1 khoang lang (tu loi thoai)', `${sil.count} khoang, tong ${sil.total_seconds}s, nguon ${sil.source}`);
const silA = (await call('GET', '/silences?clip_id=v&min=0.8&keep=0.12&source=audio&noise=-35')).data;
ok(silA.ok && silA.source === 'audio' && silA.count >= 1 && silA.ranges.some((r) => near((r.s + r.e) / 2, (W[gapAt - 1].e + W[gapAt].s) / 2, 0.4)), 'GET /silences (ffmpeg silencedetect tu am thanh): cung tim thay khoang lang o giua', `${silA.count} khoang`);
const capToday = caps.find((c) => /today/i.test(c.src.text.content));
const startBefore = capToday.start;
const cut = await ops([{ op: 'remove_ranges', id: 'v', ranges: sil.ranges }]);
pj = await project();
const vids = pj.clips.filter((c) => c.src.type === 'media').sort((a, b) => a.start - b.start);
const total = vids.reduce((a, c) => a + c.duration, 0);
ok(cut.ok && vids.length === 2 && near(total, dur - sil.total_seconds, 0.01) && near(vids[1].start, vids[0].start + vids[0].duration, 1e-6), 'remove_ranges: cat khoang lang, hai manh noi lien, tong ngan di dung do dai khoang lang', `${dur.toFixed(2)}s -> ${total.toFixed(2)}s`);
const capsAfter = pj.clips.filter((c) => c.tag?.startsWith('captions:'));
const capTodayAfter = capsAfter.find((c) => /today/i.test(c.src.text.content));
ok(capTodayAfter && near(startBefore - capTodayAfter.start, sil.total_seconds, 0.03), 'Phu de TU TAO LAI theo moc moi: nhom "Today" lui dung bang khoang da cat', `lui ${(startBefore - capTodayAfter.start).toFixed(2)}s (khoang cat ${sil.total_seconds}s)`);
const after = await frame(capTodayAfter.start + 0.2);
ok(countPx(after, isWhite).n + countPx(after, isYellow).n > 200, 'Render sau khi cat: chu "Today" hien dung o vi tri moi');
await call('POST', '/undo');
pj = await project();
ok(pj.clips.filter((c) => c.src.type === 'media').length === 1 && near(pj.clips.find((c) => c.src.type === 'media').duration, dur, 1e-6), 'Ctrl+Z hoan tac viec cat (mot buoc)');

// ---- 4. sua tu + tao lai phu de
const iFox = tr.words.findIndex((w) => /fox/i.test(w.w));
await ops([{ op: 'edit_word', mediaId: m1, index: iFox, text: 'cáo' }]);
await ops([{ op: 'generate_captions', id: 'v', opts: { style: 'word-pop', maxWords: 3 } }]);
pj = await project();
ok(pj.clips.some((c) => c.tag === 'captions:v' && /cáo/.test(c.src.text.content) && c.src.text.animator.preset === 'slide-up'), 'edit_word + tao lai phu de kieu khac: noi dung va style moi', pj.clips.find((c) => /cáo/.test(c.src?.text?.content ?? ''))?.src.text.content);

// ---- 5. duck nhac duoi loi thoai + chuan hoa loudness
await clearClips();
const toneFile = resolve(AUDIO, 'tone7k.wav');
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=7000:duration=${Math.ceil(dur) + 1}`, '-af', 'volume=0.5', '-c:a', 'pcm_s16le', toneFile]);
const mtone = await imp(toneFile);
await ops([{ op: 'add_clip', clip: { id: 'v', track: 'v1', src: { type: 'media', mediaId: m1 }, start: 0, duration: dur, in: 0, volume: 1, transform: {}, keyframes: {} } }, { op: 'add_clip', clip: { id: 'mu', track: 'a1', src: { type: 'media', mediaId: mtone }, start: 0, duration: dur, in: 0, volume: 1, transform: {}, keyframes: {} } }]);
const dk = await call('POST', '/ops', { source: 'human', ops: [{ op: 'duck_clip', id: 'mu', opts: { amountDb: -14 } }] });
pj = await project();
const vk = pj.clips.find((c) => c.id === 'mu').keyframes.volume;
ok(dk.status === 200 && vk.length >= 4 && Math.min(...vk.map((k) => k.v)) < 0.25 && Math.max(...vk.map((k) => k.v)) === 1, 'duck_clip: tao keyframe am luong cho nhac (xuong -14 dB duoi loi noi)', `${vk.length} keyframe, thap nhat ${Math.min(...vk.map((k) => k.v)).toFixed(3)}`);
const qc1 = (await call('GET', '/qc')).data;
ok(qc1.loudness && Number.isFinite(qc1.loudness.integrated_lufs) && qc1.speech.seconds > 5, 'GET /qc: do loudness cua ban tron va tong thoi gian loi thoai', `${qc1.loudness?.integrated_lufs} LUFS, ${qc1.loudness?.true_peak_dbtp} dBTP, loi ${qc1.speech.seconds}s`);
ok(qc1.issues.some((i) => i.code === 'no-captions'), 'QC bao "co loi thoai nhung chua co phu de"');
const exA = resolve(OUT, 'duck.mp4');
const ra = await call('POST', '/render_start', { preset: '9:16', out: exA });
ok((await waitJob(ra.data.job_id)).state === 'done', 'xuat co nhac duoc duck');
const speechWin = rms(exA, W[2].s, 0.8, 7000), pauseWin = rms(exA, (W[gapAt - 1].e + W[gapAt].s) / 2 - 0.3, 0.6, 7000);
ok(pauseWin - speechWin > 9, 'Nhac (7 kHz) NHO HON >= 9 dB khi co tieng noi so voi luc im lang (do tren file xuat)', `loi noi ${speechWin.toFixed(1)} dB, im lang ${pauseWin.toFixed(1)} dB (chenh ${(pauseWin - speechWin).toFixed(1)})`);
const exB = resolve(OUT, 'loud.mp4');
const rb = await call('POST', '/render_start', { preset: '9:16', out: exB, loudness_lufs: -14 });
ok(rb.data.loudness && Number.isFinite(rb.data.loudness.measured_lufs), 'render_start loudness_lufs=-14: do truoc roi chuan hoa 2 luot', JSON.stringify(rb.data.loudness));
await waitJob(rb.data.job_id);
const la = integrated(exA), lb = integrated(exB);
ok(near(lb.i, -14, 1.0) && lb.tp <= -1.0, 'Xuat chuan hoa: loudness tich phan -14 LUFS (+-1) va dinh <= -1 dBTP', `khong chuan hoa ${la.i.toFixed(1)} LUFS -> chuan hoa ${lb.i.toFixed(1)} LUFS, dinh ${lb.tp.toFixed(1)} dBTP`);

// ---- 6. SFX theo su kien: de xuat, duyet TUNG MUC
await clearClips();
const mcol = await imp(resolve(MEDIA, 'color.mp4'));
await ops([
  { op: 'add_clip', clip: { id: 's1', track: 'v1', src: { type: 'media', mediaId: mcol }, start: 0, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {} } },
  { op: 'add_clip', clip: { id: 's2', track: 'v1', src: { type: 'media', mediaId: mcol }, start: 3, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {} } },
  { op: 'add_clip', clip: { id: 's3', track: 'v1', src: { type: 'media', mediaId: mcol }, start: 6, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {} } },
]);
const lib = (await call('GET', '/library')).data;
for (let i = 0; i < 40 && lib.total === 0; i++) { await sleep(500); }
const lib2 = (await call('GET', '/library?kind=sfx')).data;
ok(lib2.total >= 20 && lib2.total <= 40 && lib2.items.some((x) => x.tags.includes('whoosh')) && lib2.items.some((x) => x.tags.includes('pop')), 'Kho SFX (kho da duyet trong kit): >= 20 hieu ung, co tag whoosh va pop', `${lib2.total} SFX`);
const music = (await call('GET', '/library?kind=music')).data;
ok(music.total === 8 && music.items.every((x) => x.tags.includes('music')) && music.items.some((x) => x.bpm > 100), 'Kho nhac: >= 8 bai kem BPM tu index cua kit', `${music.total} bai`);
const sg = await call('POST', '/suggest_sfx', { rules: [{ event: 'cut', tag: 'whoosh', volume: 0.7 }], source: 'ai:test' });
ok(sg.status === 200 && sg.data.plan.length === 2 && near(sg.data.plan[0].t, 2.96, 0.001) && near(sg.data.plan[1].t, 5.96, 0.001), 'suggest_sfx: 2 SFX whoosh dung truoc cu cat 0.04s (2.96s, 5.96s)', sg.data.plan?.map((x) => `${x.t} ${x.sfx}`).join(' | '));
pj = await project();
ok(pj.clips.filter((c) => c.tag?.startsWith('sfx:')).length === 0, 'De xuat SFX CHUA ap dung (cho nguoi duyet)');
const props = (await call('GET', '/proposals')).data;
const sp = props.find((p) => p.id === sg.data.proposal_id);
const clipIdx = sp.ops.map((o, i) => (o.op === 'add_clip' ? i : -1)).filter((i) => i >= 0);
const acc = await call('POST', `/proposals/${sp.id}/accept`, { include: [clipIdx[1]] });
pj = await project();
const sfxClips = pj.clips.filter((c) => c.tag?.startsWith('sfx:'));
ok(acc.status === 200 && sfxClips.length === 1 && near(sfxClips[0].start, 5.96, 0.001) && pj.media.some((m) => m.id === sfxClips[0].src.mediaId && m.kind === 'audio'), 'Duyet CHI muc thu 2 (5.96s): chi 1 SFX duoc them, kem media va track di cung', `${sfxClips.length} clip tai ${sfxClips[0]?.start}`);
for (let i = 0; i < 60; i++) { const m = (await project()).media.find((x) => x.id === sfxClips[0].src.mediaId); if (m?.cache?.audio === 'ready') break; await sleep(300); }
ok((await project()).media.find((x) => x.id === sfxClips[0].src.mediaId).cache?.audio === 'ready', 'Media SFX moi (them qua de xuat) tu duoc chuan bi cache');
const exS = resolve(OUT, 'sfx.mp4');
const rs = await call('POST', '/render_start', { preset: '9:16', out: exS });
await waitJob(rs.data.job_id);
const hit = rms(exS, 5.95, 0.5), quiet = rms(exS, 1.0, 0.5);
ok(hit > quiet + 25, 'Xuat: SFX nghe thay dung luc (5.96s) so voi cho khong co SFX', `${hit.toFixed(1)} dB vs ${quiet.toFixed(1)} dB`);
const sg2 = await call('POST', '/suggest_sfx', { rules: [{ event: 'cut', tag: 'khong-co-tag' }] });
ok(sg2.status === 409 && sg2.data.missing.includes('khong-co-tag'), 'suggest_sfx voi tag khong co trong kho: bao thieu tag, khong tao de xuat rong');

// ---- 7. nhan nhip (nhac tong hop co dap an + nhac that cua kit)
const click = resolve(AUDIO, 'click120.wav');
const pyClick = resolve(AUDIO, '_click.py');
writeFileSync(pyClick, `import numpy as np,wave\nSR=22050\ny=np.zeros(SR*30,np.float32)\nfor k in range(58):\n    t=0.3+k*0.5\n    i=int(t*SR); L=int(0.25*SR); tt=np.arange(L)/SR\n    y[i:i+L]+=np.sin(2*np.pi*(55+90*np.exp(-tt*30))*tt)*np.exp(-tt*14)*0.9\nw=wave.open(r'${click}','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes()); w.close()`);
run('python', ['-X', 'utf8', pyClick]);
const mclick = await imp(click);
const bj = await call('POST', '/beats', { media_id: mclick });
const bd = await waitJob(bj.data.job_id, 120000);
pj = await project();
const bt = pj.media.find((m) => m.id === mclick).beats;
ok(bd.state === 'done' && near(bt.bpm, 120, 0.3) && near(bt.times[0] % 0.5, 0.3, 0.02), 'Nhan nhip nhac tong hop 120 BPM, nhip dau 0.3s: BPM va pha dung', `${bt?.bpm} BPM, nhip dau ${bt?.times[0]}s`);
const mixk = resolve('..', '..', 'phong-cach', 'saas-animation', 'audio', 'music', 'mixkit-digital-clouds.mp3');
if (existsSync(mixk)) {
  const mm = await imp(mixk);
  const bj2 = await call('POST', '/beats', { media_id: mm });
  await waitJob(bj2.data.job_id, 120000);
  const b2 = (await project()).media.find((m) => m.id === mm).beats;
  ok(near(b2.bpm, 129, 0.8), 'Nhac that (Mixkit digital-clouds): BPM khop do cua kit (129)', `${b2.bpm} BPM, ${b2.times.length} nhip`);
}

// ---- 8. phu de tieng Viet (khong qua ASR: loi thoai nhap tay co moc), mau/diacritics
await clearClips();
const viWords = ['Xin', 'chào', 'các', 'bạn,', 'hôm', 'nay', 'mình', 'học', 'dựng', 'video', 'thật', 'nhanh.'].map((w, i) => ({ w, s: 0.5 + i * 0.4, e: 0.5 + i * 0.4 + 0.3 }));
await ops([{ op: 'set_transcript', mediaId: m1, transcript: { lang: 'vi', model: 'manual', duration: 8, words: viWords, source: 'manual' } }, { op: 'add_clip', clip: { id: 'v', track: 'v1', src: { type: 'media', mediaId: m1 }, start: 0, duration: 6, in: 0, volume: 1, transform: {}, keyframes: {} } }, { op: 'generate_captions', id: 'v', opts: { style: 'karaoke', maxWords: 4, highlight: '#ffd166' } }]);
pj = await project();
const viCaps = pj.clips.filter((c) => c.tag === 'captions:v');
ok(viCaps.length === 3 && viCaps[0].src.text.content === 'Xin chào các bạn,' && viCaps[1].src.text.content === 'hôm nay mình học', 'Phu de tieng Viet: 12 tu chia 3 nhom theo dau cau va so tu', viCaps.map((c) => c.src.text.content).join(' | '));
const v1f = await frame(0.5 + 1 * 0.4 + 0.15); // tu "chao" dang noi
const v1y = countPx(v1f, isYellow), v1w = countPx(v1f, isWhite);
ok(v1y.n > 30 && v1w.n > 100, 'Tieng Viet: tu "chào" sang vang, cac tu con lai trang (dau tieng Viet ve dung)', `${v1y.n} px vang, ${v1w.n} px trang`);
const warnVi = (await call('GET', '/warnings')).data;
ok(warnVi.length === 0, 'Phu de dung font du dau tieng Viet (Segoe UI Black): khong canh bao font');
const qc2 = (await call('GET', '/qc')).data;
ok(qc2.speech.coverage !== null && qc2.speech.coverage > 0.85, 'QC: phu de bao phu >= 85% loi thoai', `phu ${(qc2.speech.coverage * 100).toFixed(0)}%`);
// QC chu tran khung
await ops([{ op: 'add_clip', clip: { id: 'big', track: 'v1', src: { type: 'text', text: { content: 'CHU QUA TO TRAN KHUNG HINH RAT RAT RONG', size: 400, maxWidth: 0, font: 'Segoe UI Black' } }, start: 7, duration: 2, in: 0, volume: 1, transform: {}, keyframes: {} } }]);
const qc3 = (await call('GET', '/qc')).data;
ok(qc3.issues.some((i) => i.code === 'text-overflow' && i.message.includes('big')) && qc3.ok === false, 'QC: phat hien chu tran khung (clip "big")', qc3.issues.find((i) => i.code === 'text-overflow')?.message.slice(0, 70));
await ops([{ op: 'set_text', id: 'big', patch: { size: 60, maxWidth: 0.9 } }]);
const qc4 = (await call('GET', '/qc')).data;
ok(!qc4.issues.some((i) => i.code === 'text-overflow'), 'QC: het canh bao sau khi thu nho chu va ngat dong');

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
