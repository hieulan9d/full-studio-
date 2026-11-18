// DUNG LAI video mau talking head "Foodtage" bang Tool Edit (thay cho build.jsx chay trong After Effects), tu cung bo du lieu D cua kit.
// Dung API noi bo (can app chay voi TOOL_EDIT_DEV_API=1): tao du an, nhap media, dat clip, luu .tedit, xuat 9:16, chup khung de so voi ref/video-mau.mp4.
// Chay:  node scripts/build-foodtage.mjs [--no-render]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const KIT = resolve('..', 'phong-cach/talking-head/examples/foodtage');
const A = resolve(KIT, 'assets');
const OUT = resolve('out/gd6');
mkdirSync(resolve(OUT, 'icons'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  const ct = r.headers.get('content-type') ?? '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const waitJob = async (id, ms = 600000) => {
  const t0 = Date.now();
  for (;;) {
    const j = (await call('GET', `/jobs/${id}`)).data;
    if (j.state !== 'running') return j;
    if (Date.now() - t0 > ms) throw new Error('job qua han ' + id);
    await sleep(400);
  }
};
const run = (cmd, args) => spawnSync(cmd, args, { maxBuffer: 1 << 28 });

// ---------------- DATA (lay nguyen tu build.jsx cua kit) ----------------
const D = {};
D.zooms = [[0, 100], [2.58, 120], [4.9, 110], [7.12, 114], [9.22, 122], [11.72, 112], [15.08, 122], [17.66, 112]];
D.numbers = [['Number', '1', 2.58, 3.75], ['Number', '2', 9.22, 10.4], ['and Last', '3', 15.08, 16.25]];
D.keywords = [[['FASTER'], 5.64, 6.74, 215, 270], [['Efficient'], 6.74, 8.6, 215, 230], [['Sound', 'Design'], 10.88, 12.0, 330, 300], [['Telling', 'Story'], 16.68, 17.95, 330, 290]];
D.tiles = { Keyboard: 'keyboard-and-mouse (1).mp4', Audio: 'audio-editing.mp4', Story: 'storytelling.mp4' };
D.tilePlaces = [['Keyboard', 1.0, 2.45, [200, 310], 72, -12], ['Audio', 1.15, 2.45, [540, 250], 72, 0], ['Story', 1.3, 2.45, [880, 310], 72, 12], ['Keyboard', 3.67, 7.12, [540, 1460]], ['Audio', 10.88, 12.0, [540, 1460]], ['Story', 16.68, 22.2, [540, 1460]]];
D.bursts = [[200, 300, 1.15, 60], [540, 250, 1.3, 60], [880, 300, 1.45, 60], [400, 1660, 4.0], [700, 1560, 4.25, 45], [760, 1470, 11.2], [380, 1300, 17.0], [720, 1560, 19.7, 50], [360, 1240, 7.5], [760, 1360, 7.9, 50]];
D.logos = ['Premiere-Pro-logo-Adobe-symbol-professional-video-editing-transparent-png-image.png', 'CapCut-Logo-Video-Editing-App-Icon.png', 'davinci vuông.png', 'Adobe-After-Effects-Logo-84.png', 'icons8-final-cut-pro-x-480.png'];
D.logoSpan = [7.12, 9.04];
D.broll = { t0: 12.0, t1: 14.73 };
// kit v1 chon sai 3 doan (6.0 nhieu, 7.67 loe do, 16.67 vet trang) va 12.0 tran trang len B-roll: chon lai theo contact sheet cua file leak (am: ~3s, cam: ~7s, do: ~10s)
D.leaks = [[1.0, 3.0], [6.0, 7.0], [7.67, 10.0], [16.67, 7.2]];
D.sfx = [['Tiktok SFX 2.mp3', 0.0, 0, 1.2, -4], ['pop sound.MP3', 1.0, 0, 0, -3], ['pop sound.MP3', 1.15, 0, 0, -3], ['pop sound.MP3', 1.3, 0, 0, -3], ['ping.MP3', 3.67, 0, 0, -6], ['ping.MP3', 10.88, 0, 0, -6], ['ping.MP3', 16.68, 0, 0, -6], ['Camera Shutter Sound Effect.mp3', 5.62, 0, 0, -6], ['Camera Shutter Sound Effect.mp3', 6.72, 0, 0, -8], ['riser long classique.mp3', 7.3, 0.8, 1.92, -4], ['Tiktok SFX 2.mp3', 13.5, 0, 1.5, -6], ['Gears 1.wav', 17.85, 0, 0, -4], ['riser long classique.mp3', 18.3, 0, 0, -6]];
D.hits = [2.56, 9.2, 15.06];
const DUR = 22.2;
const FPS = 30;
const F = 1 / FPS;
const FONT = { title: 'TR Impact', cap: 'Pensum Display Book', script: 'SVN-Rosellinda Alyamore', wide: 'TacticSansExd-BlkIt', wideUp: 'TacticSansExd-Blk' };
const COL = { titleTop: '#7563ff', titleBot: '#dcd3ff', label: '#1f4fff', labelGlow: '#2a5cff', digit: '#9a82ff', digitEdge: '#8ff8ff', digitGlow: '#5ff4ff', cap: '#5cf7e0', card: '#101318', cardGlow: '#7a1cff', edge: '#9b3cff', icon: '#55f2ff' };

// ---------------- chuan bi icon: net neon (thay Find Edges + Tint cua AE) ----------------
const iconFile = {};
for (const [k, f] of Object.entries(D.tiles)) {
  const out = resolve(OUT, 'icons', k + '.mp4');
  if (!existsSync(out)) {
    const r = run('ffmpeg', ['-v', 'error', '-y', '-i', resolve(A, 'icon&logo', f), '-vf', 'format=gray,negate,eq=contrast=1.4,format=rgb24,colorchannelmixer=rr=0.33:gg=0.95:bb=1.0,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-an', out]);
    if (r.status !== 0) throw new Error('khong tao duoc icon ' + k + ': ' + r.stderr);
  }
  iconFile[k] = out;
}

// ---------------- ease / keyframe ----------------
const EASE = { linear: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 }, snap: { kind: 'bezier', x1: 0.1, y1: 0.9, x2: 0.2, y2: 1 }, hold: { kind: 'hold', x1: 0, y1: 0, x2: 1, y2: 1 }, accel: { kind: 'bezier', x1: 0.7, y1: 0, x2: 1, y2: 0.5 } };
const kf = (list) => list.map(([t, v, e = 'linear']) => ({ t: Math.round(t * 1e6) / 1e6, v, ease: EASE[e] }));
const px2x = (x) => (x - 540) / 1080;
const px2y = (y) => (y - 960) / 1920;

// ---------------- du an ----------------
await call('POST', '/project/new', {});
await sleep(1500);
const media = {};
const imp = async (key, file) => {
  const r = (await call('POST', '/media_import', { path: file })).data;
  if (!r.ok) throw new Error('import loi ' + file + ' ' + JSON.stringify(r));
  media[key] = { id: r.mediaId, jobs: [r.job_id, r.audio_job_id].filter(Boolean) };
};
await imp('aroll', resolve(KIT, 'media/aroll.mp4'));
for (const k of Object.keys(D.tiles)) await imp('icon:' + k, iconFile[k]);
D.logos.forEach((f, i) => void i);
for (let i = 0; i < D.logos.length; i++) await imp('logo' + i, resolve(A, 'icon&logo', D.logos[i]));
await imp('meme', resolve(A, 'B-Roll/meme khóc rồi cười.mp4'));
await imp('record', resolve(A, 'B-Roll/Record.mov'));
await imp('leak', resolve(A, 'ánh sáng chuyển cảnh 1.mp4'));
const sfxFiles = [...new Set([...D.sfx.map((s) => s[0]), 'MUI IMPACT SWEETENER Space Impact.wav', '2. Lightsaber.mp3', 'click-for transitions.MP3'])];
for (const f of sfxFiles) await imp('sfx:' + f, resolve(A, 'SFX', f));
for (const m of Object.values(media)) for (const j of m.jobs) await waitJob(j);
console.log('da nhap', Object.keys(media).length, 'media');

// matte (RVM) cho aroll
const mj = (await call('POST', '/matte', { media_id: media.aroll.id })).data;
if (!mj.ok) throw new Error('matte: ' + JSON.stringify(mj));
const mjob = await waitJob(mj.job_id);
if (mjob.state !== 'done') throw new Error('tach nen loi: ' + mjob.error);
for (let i = 0; i < 120; i++) { const p = (await call('GET', '/project')).data; if (p.media.find((m) => m.role === 'matte')?.cache?.status === 'ready') break; await sleep(500); }
console.log('tach nen xong:', mjob.result?.seconds ?? 'dung lai', 's');

const ops = [];
const used = {}; // lane -> [[t0,t1]]
let nClip = 0;
const cid = () => 'k' + ++nClip;
// track theo thu tu lop (duoi -> tren)
const GROUPS = [['base', 1], ['behind', 3], ['person', 1], ['front', 24], ['broll', 4], ['leaks', 1]];
const lanes = {};
for (const [g, n] of GROUPS) {
  lanes[g] = [];
  for (let i = 0; i < n; i++) {
    const id = g === 'base' ? 'v1' : `${g}${i + 1}`;
    lanes[g].push(id);
    if (id !== 'v1') ops.push({ op: 'add_track', track: { id, kind: 'video', name: `${g} ${i + 1}` } });
  }
}
const sfxLanes = [];
for (let i = 0; i < 6; i++) {
  sfxLanes.push(`sfx${i + 1}`);
  ops.push({ op: 'add_track', track: { id: `sfx${i + 1}`, kind: 'audio', name: `SFX ${i + 1}` } });
}
const lane = (group, t0, t1, ids = lanes[group]) => {
  for (const id of ids) {
    const u = (used[id] ??= []);
    if (!u.some(([a, b]) => t0 < b - 1e-6 && a < t1 - 1e-6)) {
      u.push([t0, t1]);
      return id;
    }
  }
  throw new Error('het lane ' + group + ' tai ' + t0);
};
const base = (id, track, src, t0, t1, extra = {}) => ({ id, track, src, start: t0, duration: t1 - t0, in: 0, volume: 1, transform: {}, keyframes: {}, ...extra });
const add = (clip, post = []) => {
  ops.push({ op: 'add_clip', clip });
  ops.push(...post);
  return clip.id;
};
const R = (x) => Math.round(x * 1e6) / 1e6;

/** Clip chu. pos = tam [x,y] theo px AE (khung 1080x1920); t = patch TextSpec. */
function textClip(group, t0, t1, t, pos, tf = {}, kfs = {}, fx = null) {
  const id = cid();
  const clip = base(id, lane(group, t0, t1), { type: 'text', text: t }, t0, t1, { transform: { x: px2x(pos[0]), y: px2y(pos[1]), ...tf }, keyframes: kfs });
  if (fx) clip.fx = fx;
  return add(clip);
}
const grad = (a, b) => ({ type: 'linear', color: a, stops: [{ pos: 0, color: a }, { pos: 1, color: b }], angle: 90, offset: 0 });
const punch = (pct, frames = 5) => ({ 'transform.scale': kf([[0, pct / 100, 'snap'], [frames * F, 1]]) });

// ---------------- 1. nen: aroll da grade + zoom (key HOLD) ----------------
const GRADE = { black: 24 / 255, white: 228 / 255, vibrance: 0.45, saturation: 1.25, contrast: 0.3, exposure: -0.05, gamma: { m: -0.12 } };
const FOCUS = [540, 700];
const zk = (prop, f) => kf(D.zooms.map(([t, pct]) => [t, f(pct / 100), 'hold']));
const arollKf = { 'transform.scale': zk('s', (s) => s), 'transform.y': zk('y', (s) => (-(FOCUS[1] - 960) / 1920) * (s - 1)) };
const arollId = add(base('aroll', 'v1', { type: 'media', mediaId: media.aroll.id }, 0, 22.1, { keyframes: arollKf, grade: undefined }));
ops.push({ op: 'set_grade', id: arollId, grade: GRADE }, { op: 'set_fx', id: arollId, fx: { vignette: { amount: 0.35, softness: 0.6 } } });
// transcript tu kit
const tr = JSON.parse(readFileSync(resolve(KIT, 'media/transcript.json'), 'utf8'));
const words = tr.segments.flatMap((s) => s.words).map((w) => ({ w: w.word, s: w.start, e: w.end, p: w.p }));
ops.push({ op: 'set_transcript', mediaId: media.aroll.id, transcript: { lang: 'en', model: 'kit', duration: tr.duration, words, source: 'whisper' } });

// ---------------- 2. chu SAU lung nguoi: so neon + tu khoa ----------------
for (const [label, digit, t0, t1] of D.numbers) {
  textClip('behind', t0, t1, { content: label, font: FONT.title, size: 190, weight: 400, align: 'left', fill: { type: 'solid', color: COL.label }, glow: { color: COL.labelGlow, radius: 14, strength: 0.6 } }, [70, 205], { anchorH: 'left', margin: 0, x: 70 / 1080 }, punch(140));
  textClip('behind', t0 + 2 * F, t1, { content: digit, font: FONT.cap, size: 1050, weight: 450, italic: true, fill: { type: 'solid', color: COL.digit }, stroke: { color: COL.digitEdge, width: 12, over: true }, glow: { color: COL.digitGlow, radius: 30, strength: 0.9 } }, [850, 430], {}, {
    'transform.scale': kf([[0, 1.5, 'snap'], [8 * F, 1, 'snap'], [t1 - t0 - 2 * F, 0.94]]),
    'transform.rotation': kf([[0, -14, 'snap'], [8 * F, 0]]),
    'transform.opacity': kf([[0, 0], [2 * F, 1]]),
  });
}
for (const [lines, t0, t1, y, size] of D.keywords) {
  textClip('behind', t0, t1, { content: lines.join('\n'), font: FONT.title, size, weight: 400, lineHeight: 0.98, fill: grad(COL.titleTop, COL.titleBot), shadow: { color: '#000000', opacity: 0.45, blur: 20, x: 0, y: 6 } }, [540, y], {}, punch(135));
}

// ---------------- 3. lop nguoi tach nen (tren chu sau-lung, duoi chu truoc) ----------------
const personId = add(base('person', lanes.person[0], { type: 'media', mediaId: media.aroll.id }, 0, 22.1, { keyframes: JSON.parse(JSON.stringify(arollKf)), volume: 0, tag: 'cutout:aroll' }), []);
ops.push({ op: 'set_media_matte', mediaId: media.aroll.id, matteId: (await call('GET', '/project')).data.media.find((m) => m.role === 'matte').id });
ops.push({ op: 'set_clip_matte', id: personId, matte: { lo: 0, hi: 1, feather: 0 } }, { op: 'set_grade', id: personId, grade: GRADE }, { op: 'set_fx', id: personId, fx: { vignette: { amount: 0.35, softness: 0.6 } } });

// ---------------- 4. chu truoc: hook ----------------
const T = (g, t0, t1, t, pos, tf, k, fx) => textClip(g, t0, t1, t, pos, tf, k, fx);
T('front', 0.1, 2.45, { content: "Here's", font: FONT.wideUp, size: 150, weight: 400, fill: grad('#4b86ff', '#1238ff'), glow: { color: '#2d6bff', radius: 18, strength: 0.7 } }, [545, 980], {}, punch(150));
T('front', 0.34, 2.45, { content: '3', font: FONT.wideUp, size: 360, weight: 400, fill: grad('#ff7a2b', '#ff2b2b'), glow: { color: '#ff4b2b', radius: 20, strength: 0.8 } }, [280, 1215], {}, punch(170));
T('front', 0.56, 2.45, { content: 'Ways', font: FONT.script, size: 300, weight: 400, fill: { type: 'solid', color: '#2dff4f' }, stroke: { color: '#d6ffd6', width: 3, over: true }, glow: { color: '#2dff4f', radius: 26, strength: 1.2 } }, [640, 1335], {}, punch(140));

// ---------------- 5. tile icon + vong no ----------------
function tile(key, t0, t1, pos, sc = 100, rot = 0) {
  const s = sc / 100;
  const dy = px2y(pos[1]);
  const mk = (scaleBase) => ({
    'transform.y': kf([[0, dy + 260 / 1920, 'snap'], [15 * F, dy]]),
    'transform.scale': kf([[0, scaleBase * s * 0.6, 'snap'], [10 * F, scaleBase * s]]),
    'transform.opacity': kf([[0, 0], [3 * F, 1]]),
  });
  const x = px2x(pos[0]);
  const card = textlessShape(t0, t1, { kind: 'rect', w: 380, h: 380, radius: 84, fill: COL.card, fillOpacity: 1, stroke: { color: COL.edge, width: 5 } }, { x, y: dy, rotation: rot }, mk(1), { glow: { radius: 36, intensity: 0.9, color: COL.cardGlow, threshold: 0.05 } });
  // icon lap lai (kit dung loopOut): cat thanh cac doan bang do dai file; chi doan dau co keyframe vao
  const segLen = iconDur[key];
  for (let a = t0, n = 0; a < t1 - 1e-6; a += segLen, n++) {
    const b = Math.min(t1, a + segLen);
    const fin = { 'transform.y': undefined };
    void fin;
    add(base(cid(), lane('front', a, b), { type: 'media', mediaId: media['icon:' + key].id }, a, b, { transform: { x, y: dy, rotation: rot, fit: 'contain', scale: n ? (300 / 1080) * s : 1 }, keyframes: n ? {} : mk(300 / 1080), volume: 0, blend: 'screen', fx: { glow: { radius: 20, intensity: 1.0, color: '#3fd8ff', threshold: 0.2 } } }));
  }
}
function textlessShape(t0, t1, shape, tf, kfs, fx) {
  const sp = { kind: 'rect', w: 100, h: 100, fill: '', fillOpacity: 1, stroke: { color: '#ffffff', width: 0 }, radius: 0, points: 5, inner: 0.45, trim: 1, ...shape };
  const clip = base(cid(), lane('front', t0, t1), { type: 'shape', shape: sp }, t0, t1, { transform: tf, keyframes: kfs });
  if (fx) clip.fx = fx;
  return add(clip);
}
const pj1 = (await call('GET', '/project')).data;
const iconDur = Object.fromEntries(Object.keys(D.tiles).map((k) => [k, pj1.media.find((m) => m.id === media['icon:' + k].id).duration - 0.02]));
for (const [k, t0, t1, pos, sc, rot] of D.tilePlaces) tile(k, t0, Math.min(t1, DUR), pos, sc, rot ?? 0);
for (const [x, y, t, d = 70] of D.bursts) {
  textlessShape(t, t + 0.4, { kind: 'ring', w: d, h: d, fill: '', stroke: { color: '#ffffff', width: 6 } }, { x: px2x(x), y: px2y(y) }, { 'transform.scale': kf([[0, 0.6, 'snap'], [0.4, 1.9]]), 'transform.opacity': kf([[0, 1], [0.15, 1], [0.4, 0]]) });
}
// "Keyboard Shortcut"
T('front', 3.8, 4.9, { content: 'Keyboard\nShortcut', font: FONT.wide, size: 118, weight: 400, lineHeight: 0.92, fill: grad('#7fa8ff', '#1d4dff'), glow: { color: '#3a70ff', radius: 24, strength: 0.8 } }, [540, 1120], {}, { 'transform.y': kf([[0, px2y(1190), 'snap'], [10 * F, px2y(1120)]]), 'transform.opacity': kf([[0, 0], [3 * F, 1]]) });

// ---------------- 6. thanh kinh + logo ----------------
{
  const [a, b] = D.logoSpan;
  const bar = textlessShape(a, b, { kind: 'rect', w: 940, h: 300, radius: 60, fill: '#ffffff', fillOpacity: 0.16 }, { x: 0, y: px2y(1300) }, { 'transform.x': kf([[0, 300 / 1080, 'snap'], [0.3, 0], [b - a, -30 / 1080]]), 'transform.opacity': kf([[0, 0], [0.08, 1]]) });
  void bar;
  for (let i = 0; i < 5; i++) {
    const big = i === 2;
    const k = (big ? 270 : 215) / 1080;
    const dx = (i - 2) * 185;
    const id = cid();
    add(base(id, lane('front', a, b), { type: 'media', mediaId: media['logo' + i].id }, a, b, { transform: { x: px2x(540 + dx), y: px2y(1300) }, keyframes: { 'transform.scale': kf([[0, k]]), 'transform.x': kf([[0, px2x(540 + dx) + 300 / 1080, 'snap'], [0.3, px2x(540 + dx)], [b - a, px2x(540 + dx) - 30 / 1080]]), 'transform.opacity': kf([[0, 0], [0.08, 1]]) }, fx: big ? { shadow: { x: 0, y: 14, blur: 30, opacity: 0.6, color: '#000000' } } : undefined, volume: 0 }));
  }
}

// ---------------- 7. B-roll the (nua tren: meme trong the bo goc; nua duoi: man hinh ghi) ----------------
{
  const { t0, t1 } = D.broll;
  const dur = t1 - t0;
  // nen xam co vignette
  textlessShape(t0, t1, { kind: 'rect', w: 1080, h: 1920, fill: '#2a2a2c' }, { fit: 'cover' }, {}, { vignette: { amount: 0.6, softness: 0.7 } });
  // man hinh ghi (nua duoi), nghieng nhe: cat vung tu y=770 xuong
  const recW = 3840 * 1.5, recH = 2160 * 1.5;
  const ctr = [540 + (1920 - 1500) * 1.5, 1460 + (1080 - 1420) * 1.5]; // tam lop sau khi dat diem neo (1500,1420) vao (540,1460)
  const left = ctr[0] - recW / 2, top = ctr[1] - recH / 2;
  const win = { l: 0, t: 770, r: 1080, b: 1920 };
  const crop = { left: R(Math.max(0, (win.l - left) / recW)), top: R(Math.max(0, (win.t - top) / recH)), right: R(Math.max(0, (left + recW - win.r) / recW)), bottom: R(Math.max(0, (top + recH - win.b) / recH)) };
  add(base(cid(), lane('broll', t0, t1), { type: 'media', mediaId: media.record.id }, t0, t1, { in: 4.0, volume: 0, transform: { x: px2x(ctr[0]), y: px2y(ctr[1]), scale: recW / 1080, rotation: -3, fit: 'contain' }, keyframes: { 'transform.scale': kf([[0, recW / 1080], [dur, ((recW + 8 * 38.4) / 1080)]]) }, fx: { crop, shadow: { x: 0, y: 20, blur: 50, opacity: 0.6, color: '#000000' } } }));
  // the meme: cat theo cua so 880x740 quanh (550,420), bo goc, nghieng, to dan
  const mW = 576 * 1.57, mH = 1024 * 1.57;
  const mc = [550, 420 + 90];
  const mleft = mc[0] - mW / 2, mtop = mc[1] - mH / 2;
  const w2 = { l: 110, t: 50, r: 990, b: 790 };
  const mcrop = { left: R((w2.l - mleft) / mW), top: R((w2.t - mtop) / mH), right: R((mleft + mW - w2.r) / mW), bottom: R((mtop + mH - w2.b) / mH) };
  add(base(cid(), lane('broll', t0, t1), { type: 'media', mediaId: media.meme.id }, t0, t1, { in: 0.4, volume: 0, transform: { x: px2x(mc[0]), y: px2y(mc[1]), scale: mW / 1080, rotation: -2, fit: 'contain' }, keyframes: { 'transform.scale': kf([[0, (mW * 0.85) / 1080, 'snap'], [8 * F, (mW * 1.06) / 1080, 'snap'], [dur, (mW * 1.1) / 1080]]) }, fx: { crop: mcrop, round: { radius: 0.045 }, shadow: { x: 0, y: 25, blur: 60, opacity: 0.6, color: '#000000' } } }));
}

// ---------------- 8. light leak (screen) ----------------
for (const [t, ft] of D.leaks) {
  add(base(cid(), lane('leaks', t, t + 0.45), { type: 'media', mediaId: media.leak.id }, t, t + 0.45, { in: ft, volume: 0, blend: 'screen', transform: { fit: 'cover', opacity: 0.6 } }));
}

// ---------------- 9. am thanh: SFX theo cue cua kit ----------------
const sfxId = (f) => media['sfx:' + f].id;
const db = (x) => Math.pow(10, x / 20);
let sn = 0;
const mdur = Object.fromEntries((await call('GET', '/project')).data.media.map((m) => [m.id, m.duration]));
const sfx = (file, t, inn, len, dB) => {
  const dur = Math.max(0.05, Math.min(len > 0 ? len : 1.0, (mdur[sfxId(file)] ?? 1) - inn - 0.02));
  const id = cid();
  const lane2 = (() => {
    for (const l of sfxLanes) {
      const u = (used[l] ??= []);
      if (!u.some(([a, b]) => t < b - 1e-6 && a < t + dur - 1e-6)) {
        u.push([t, t + dur]);
        return l;
      }
    }
    throw new Error('het lane sfx');
  })();
  ops.push({ op: 'add_clip', clip: { id, track: lane2, src: { type: 'media', mediaId: sfxId(file) }, start: t, duration: dur, in: inn, volume: db(dB), transform: {}, keyframes: {}, tag: 'sfx:kit' } });
  sn++;
};
const SFXLEN = { 'pop sound.MP3': 0.4, 'ping.MP3': 1.2, 'Camera Shutter Sound Effect.mp3': 0.8, 'Gears 1.wav': 2.0, 'click-for transitions.MP3': 0.25, 'Tiktok SFX 2.mp3': 1.5, 'riser long classique.mp3': 1.92, 'MUI IMPACT SWEETENER Space Impact.wav': 2.4, '2. Lightsaber.mp3': 1.5 };
for (const [f, t, inn, len, dB] of D.sfx) sfx(f, t, inn, len > 0 ? len : SFXLEN[f] ?? 1, dB);
for (const h of D.hits) {
  sfx('MUI IMPACT SWEETENER Space Impact.wav', h, 0.05, 2.4, -2);
  sfx('2. Lightsaber.mp3', h + 0.05, 0, 1.5, -8);
}
for (const w of words) sfx('click-for transitions.MP3', w.s, 0, 0.25, -14);
console.log('SFX:', sn);

// ---------------- gui du an ----------------
const r = await call('POST', '/ops', { source: 'human', ops });
if (r.status !== 200) {
  console.error('ops that bai:', JSON.stringify(r.data).slice(0, 1500));
  process.exit(1);
}
// phu de tu loi thoai (clip aroll)
const rc = await call('POST', '/ops', { source: 'human', ops: [{ op: 'generate_captions', id: arollId, opts: { style: 'word-pop', maxWords: 4, maxChars: 20, font: FONT.cap, size: 112, color: COL.cap, y: -0.34, weight: 450, maxWidth: 0.34, lineHeight: 0.78 } }] });
if (rc.status !== 200) console.error('phu de loi:', JSON.stringify(rc.data).slice(0, 600));
// kit chi hien phu de tu giay 4.9 (truoc do la hook "Here's 3 Ways")
{
  const pj = (await call('GET', '/project')).data;
  const early = pj.clips.filter((c) => c.tag === 'captions:' + arollId && c.start < 4.85).map((c) => ({ op: 'remove_clip', id: c.id }));
  if (early.length) await call('POST', '/ops', { source: 'human', ops: early });
}
await call('POST', '/project/save', { path: resolve(OUT, 'foodtage.tedit') });
const p = (await call('GET', '/project')).data;
console.log(`du an: ${p.clips.length} clip, ${p.tracks.length} track`);

if (!process.argv.includes('--no-render')) {
  const out = resolve(OUT, 'foodtage-tooledit.mp4');
  const rs = (await call('POST', '/render_start', { preset: '9:16', out, loudness_lufs: -14, loudness: -14 })).data;
  if (!rs.ok) throw new Error('render_start: ' + JSON.stringify(rs));
  const t0 = Date.now();
  const j = await waitJob(rs.job_id);
  console.log('xuat:', j.state, j.error ?? `${((Date.now() - t0) / 1000).toFixed(1)}s, ${j.result?.frames} khung`);
}
