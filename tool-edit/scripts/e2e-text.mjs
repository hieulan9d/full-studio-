// Kiem dung chu + keyframe bang DIEM ANH THAT (qua preview_frame/xuat) + font tieng Viet. Chay app voi TOOL_EDIT_DEV_API=1.
// Dung: node scripts/e2e-text.mjs   (can out/media/test-a.mp4 cho phan am luong)
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = `http://127.0.0.1:${process.env.TOOL_EDIT_PORT ?? 17480}`;
const OUT = resolve('out/e2e-text');
rmSync(OUT, { recursive: true, force: true }); // xuat khong ghi de, nen don thu muc ket qua cu
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
const waitJob = async (id, ms = 120000) => {
  const t0 = Date.now();
  for (;;) {
    const j = (await call('GET', `/jobs/${id}`)).data;
    if (j.state !== 'running') return j;
    if (Date.now() - t0 > ms) throw new Error('job qua han');
    await sleep(150);
  }
};
const probe = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f]).stdout.toString());

/** Anh PNG -> {w,h,buf(rgb24)} */
const decode = (png, w, h) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('doc png loi');
  return { w, h, buf: r.stdout, px: (x, y) => [r.stdout[(y * w + x) * 3], r.stdout[(y * w + x) * 3 + 1], r.stdout[(y * w + x) * 3 + 2]] };
};
const frame = async (t, aspect, scale = 0.5, proposal) => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=${scale}${aspect ? '&aspect=' + encodeURIComponent(aspect) : ''}`);
  if (r.status !== 200) throw new Error(`preview_frame ${r.status}: ${JSON.stringify(r.data)}`);
  const w = Number(1080 * scale) | 0;
  const portrait = !aspect || aspect === '9:16';
  return decode(r.data, portrait ? Math.round(1080 * scale) : Math.round(1920 * scale), portrait ? Math.round(1920 * scale) : Math.round(1080 * scale));
};
/** khung bao cua pixel "sang" (tong kenh > thr) */
const bbox = (img, thr = 90) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 3;
      if (img.buf[i] + img.buf[i + 1] + img.buf[i + 2] > thr) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, n, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};
const mass = (img, f) => { let n = 0; for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (f(img.px(x, y))) n++; return n; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const nearC = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const srgbEotf = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const srgbOetf = (l) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const blendLin = (a, b, o) => a.map((v, i) => Math.round(255 * srgbOetf((1 - o) * srgbEotf(v / 255) + o * srgbEotf(b[i] / 255))));

const tx = (content, extra = {}) => ({ content, font: 'Arial', weight: 900, size: 300, maxWidth: 0, ...extra });
let seq = 0;
let b2;
/** Dat lai du an chi co mot clip chu (partial spec duoc bo sung tu mac dinh). */
const setup = async (text, opts = {}) => {
  await call('POST', '/project/new', {});
  const id = `c${++seq}`;
  const ops = [{ op: 'add_clip', clip: { id, track: 'v1', src: { type: 'text', text }, start: 0, duration: opts.duration ?? 4, in: 0, volume: 1, transform: opts.transform ?? {}, keyframes: opts.keyframes ?? {} } }];
  const r = await call('POST', '/ops', { source: 'human', ops });
  if (r.status !== 200) throw new Error('setup loi: ' + JSON.stringify(r.data));
  return id;
};

// ---- 0. app san sang
for (let i = 0; i < 60; i++) { const s = await call('GET', '/status').catch(() => null); if (s?.data?.rendererReady) break; await sleep(500); }

// ---- 1. dung chu co ban
let id = await setup(tx('HELLO'));
let img = await frame(1);
let bb = bbox(img);
ok(bb.n > 500 && nearC(img.px(5, 5), [0, 0, 0], 2), 'chu trang tren nen den: co pixel chu, goc anh den', `${bb.n} pixel`);
ok(near(bb.cx, img.w / 2, 4) && near(bb.cy, img.h / 2, 24), 'chu can giua khung (neo giua/giua; can theo HOP DONG nhu CapCut/CSS, nen muc chu in hoa lech ~13px)', `tam (${bb.cx.toFixed(0)},${bb.cy.toFixed(0)}) / khung ${img.w}x${img.h}`);
const sample = (() => { let w = 0; for (let y = bb.y0; y <= bb.y1; y++) for (let x = bb.x0; x <= bb.x1; x++) { const c = img.px(x, y); if (c[0] > 250 && c[1] > 250 && c[2] > 250) w++; } return w; })();
ok(sample > 300, 'co pixel TRANG tuyet doi (fill don sac #ffffff dung mau)', `${sample}`);

// ---- 2. tieng Viet: dau hien ra
await setup(tx('E', { size: 500 }));
const e1 = bbox(await frame(1));
await setup(tx('Ệ', { size: 500 }));
const e2 = bbox(await frame(1));
ok(e2.h > e1.h + 20, 'chu "Ệ" cao hon "E": dau mu + dau nang duoc ve', `E cao ${e1.h}px, Ệ cao ${e2.h}px`);
await setup(tx('Việt Nam đẹp lắm', { size: 150, maxWidth: 0.95 }));
const vi = bbox(await frame(1));
ok(vi.n > 3000 && vi.w > 300, 'chuoi tieng Viet day du dau ve duoc', `${vi.n} pixel`);

// ---- 3. gradient tuyen tinh doc: tren do -> duoi xanh
id = await setup(tx('I', { size: 800, fill: { type: 'linear', angle: 90, offset: 0, stops: [{ pos: 0, color: '#ff0000' }, { pos: 1, color: '#0000ff' }] } }));
img = await frame(1);
bb = bbox(img);
const cx = Math.round(bb.cx);
const topC = img.px(cx, bb.y0 + Math.round(bb.h * 0.1));
const botC = img.px(cx, bb.y0 + Math.round(bb.h * 0.9));
ok(topC[0] > 150 && topC[0] > topC[2] + 80 && botC[2] > 120 && botC[2] > botC[0] + 60, 'gradient tuyen tinh 90 do (trai theo hop dong): dinh nghieng DO, day nghieng XANH', `${topC} -> ${botC}`);
// goc 0: trai -> phai
id = await setup(tx('H', { size: 800, fill: { type: 'linear', angle: 0, offset: 0, stops: [{ pos: 0, color: '#00ff00' }, { pos: 1, color: '#ff00ff' }] } }));
img = await frame(1);
bb = bbox(img);
const lC = img.px(bb.x0 + 4, Math.round(bb.cy)), rC = img.px(bb.x1 - 4, Math.round(bb.cy));
ok(lC[1] > 190 && lC[0] < 120 && rC[0] > 190 && rC[2] > 190 && rC[1] < 120, 'gradient goc 0 do: trai XANH LA, phai HONG', `${lC} -> ${rC}`);
// gradient radial / angular chi can render duoc va khac nhau
for (const type of ['radial', 'angular']) {
  await setup(tx('O', { size: 800, fill: { type, angle: 0, offset: 0, cx: 0.5, cy: 0.5, radius: 1, stops: [{ pos: 0, color: '#ffff00' }, { pos: 1, color: '#ff0000' }] } }));
  const g = await frame(1);
  const b2 = bbox(g);
  const colors = new Set();
  for (let y = b2.y0; y <= b2.y1; y += 6) for (let x = b2.x0; x <= b2.x1; x += 6) { const c = g.px(x, y); if (c[0] + c[1] + c[2] > 200) colors.add(`${c[1] >> 5}`); }
  ok(b2.n > 1000 && colors.size >= 3, `gradient ${type}: nhieu muc mau tren chu`, `${colors.size} muc xanh la khac nhau`);
}

// ---- 4. vien / bong / glow
await setup(tx('I', { size: 600, fill: { type: 'solid', color: '#ffffff' }, stroke: { color: '#00ff00', width: 40, over: false } }));
img = await frame(1);
const greens = mass(img, (c) => c[1] > 200 && c[0] < 80 && c[2] < 80);
ok(greens > 800, 'vien xanh la (40px) ve quanh chu', `${greens} pixel xanh`);
await setup(tx('I', { size: 600, fill: { type: 'solid', color: '#ffffff' }, shadow: { color: '#ff0000', opacity: 1, blur: 0, x: 0, y: 40 } }));
img = await frame(1);
const reds = mass(img, (c) => c[0] > 200 && c[1] < 60 && c[2] < 60);
const wb = bbox(await (async () => { await setup(tx('I', { size: 600 })); return frame(1); })());
ok(reds > 500, 'bong do lech 40px hien ra duoi chu (do #ff0000)', `${reds} pixel do`);
await setup(tx('I', { size: 600, fill: { type: 'solid', color: '#ffffff' }, glow: { color: '#00ffff', radius: 40, strength: 2 } }));
img = await frame(1);
const cy = Math.round(img.h / 2);
let glowPx = 0;
for (let x = 0; x < img.w; x++) { const c = img.px(x, cy); if (c[2] > 90 && c[1] > 90 && c[0] < c[2] - 40 && !(c[0] > 200)) glowPx++; }
ok(glowPx > 10, 'glow cyan lan ra ngoai chu (pixel cyan ngoai net chu)', `${glowPx} pixel tren hang giua`);

// ---- 5. neo vi tri + chu theo canh ngan (9:16 va 16:9 giong nhau)
await setup(tx('I', { size: 300 }), { transform: { anchorH: 'left', anchorV: 'top', margin: 0.1 } });
let p9 = bbox(await frame(1, '9:16'));
let p16 = bbox(await frame(1, '16:9'));
ok(near(p9.x0, p16.x0, 2) && near(p9.y0, p16.y0, 2), 'neo trai-tren, le 10%: khoang cach toi mep trai/tren GIONG NHAU o 9:16 va 16:9 (le tinh theo canh ngan)', `9:16 (${p9.x0},${p9.y0}) 16:9 (${p16.x0},${p16.y0})`);
ok(p9.x0 > 0.1 * 540 - 10 && p9.x0 < 0.1 * 540 + 30, 'neo trai: mep chu cach mep trai ~ le 10% canh ngan (+ khoang can le)', `x0=${p9.x0}, le=${0.1 * 540}`);
ok(near(p9.h, p16.h, 3), 'cung co chu (px theo canh ngan) o 9:16 va 16:9', `${p9.h} vs ${p16.h}`);
await setup(tx('I', { size: 300 }), { transform: { anchorH: 'right', anchorV: 'bottom', margin: 0.1 } });
p9 = bbox(await frame(1, '9:16'));
p16 = bbox(await frame(1, '16:9'));
ok(near(540 - p9.x1, 960 - p16.x1, 2) && near(960 - p9.y1, 540 - p16.y1, 2), 'neo phai-duoi, le 10%: khoang cach toi mep phai/duoi GIONG NHAU o 9:16 va 16:9', `9:16 (${540 - p9.x1},${960 - p9.y1}) 16:9 (${960 - p16.x1},${540 - p16.y1})`);
await setup(tx('I', { size: 300 }), { transform: { anchorH: 'right', anchorV: 'bottom', margin: 0.1, x: -0.1, y: -0.1 } });
const sh = bbox(await frame(1, '9:16'));
ok(near(p9.x1 - sh.x1, 0.1 * 540, 3) && near(p9.y1 - sh.y1, 0.1 * 960, 3), 'x, y la dich tu diem neo (theo ty le khung): -10% di vao trong 54px / 96px', `${p9.x1 - sh.x1} / ${p9.y1 - sh.y1}`);

// ---- 6. keyframe do duc: tron tuyen tinh
const lin = { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1 };
id = await setup(tx('I', { size: 700 }), { duration: 4, keyframes: { 'transform.opacity': [{ t: 0, v: 0, ease: lin }, { t: 2, v: 1, ease: lin }] } });
bb = bbox(await frame(2));
const whiteC = (await frame(2)).px(Math.round(bb.cx), Math.round(bb.cy));
const halfC = (await frame(1)).px(Math.round(bb.cx), Math.round(bb.cy));
const zeroImg = await frame(0);
ok(whiteC[0] > 245, 'keyframe do duc: t=2 -> 100%', String(whiteC));
ok(nearC(halfC, blendLin([0, 0, 0], [255, 255, 255], 0.5), 6), 'keyframe do duc: t=1 -> 50% (tron tuyen tinh)', `${halfC} ky vong ${blendLin([0, 0, 0], [255, 255, 255], 0.5)}`);
ok(mass(zeroImg, (c) => c[0] > 20) < 50, 'keyframe do duc: t=0 -> an hoan toan');

// ---- 7. keyframe ti le: chieu rong chu theo thoi gian
id = await setup(tx('HI', { size: 300 }), { duration: 4, keyframes: { 'transform.scale': [{ t: 0, v: 0.5, ease: lin }, { t: 2, v: 1.5, ease: lin }] } });
const w0 = bbox(await frame(0)).w, w1 = bbox(await frame(1)).w, w2 = bbox(await frame(2)).w;
ok(near(w1 / w0, 2, 0.15) && near(w2 / w0, 3, 0.25), 'keyframe ti le 0.5 -> 1.5: chieu rong ty le 1 : 2 : 3', `${w0} : ${w1} : ${w2}`);

// ---- 8. keyframe vi tri X (tam chu di chuyen) + hold
id = await setup(tx('I', { size: 400 }), { duration: 4, keyframes: { 'transform.x': [{ t: 0, v: -0.25, ease: lin }, { t: 2, v: 0.25, ease: lin }] } });
const c0 = bbox(await frame(0)).cx, c1 = bbox(await frame(1)).cx, c2 = bbox(await frame(2)).cx;
ok(near(c1 - c0, 0.25 * 540, 8) && near(c2 - c0, 0.5 * 540, 10), 'keyframe X -25% -> +25%: tam chu dich dung 135px / 270px', `${(c1 - c0).toFixed(0)} / ${(c2 - c0).toFixed(0)}`);
const hold = { kind: 'hold', x1: 0, y1: 0, x2: 1, y2: 1 };
id = await setup(tx('I', { size: 700 }), { duration: 4, keyframes: { 'transform.opacity': [{ t: 0, v: 0, ease: hold }, { t: 2, v: 1, ease: lin }] } });
ok(mass(await frame(1.9), (c) => c[0] > 20) < 50 && bbox(await frame(2.05)).n > 800, 'ease HOLD: giu 0 den het t=2 roi nhay len 100%');

// ---- 9. keyframe sua gradient (offset): mau doi theo thoi gian
id = await setup(tx('I', { size: 800, fill: { type: 'linear', angle: 90, offset: 0, stops: [{ pos: 0, color: '#ff0000' }, { pos: 1, color: '#0000ff' }] } }), { duration: 4, keyframes: { 'text.fill.offset': [{ t: 0, v: 0, ease: lin }, { t: 2, v: 0.6, ease: lin }] } });
const g0 = await frame(0), g1 = await frame(2);
b2 = bbox(g0);
const mid0 = g0.px(Math.round(b2.cx), b2.y0 + Math.round(b2.h * 0.5));
const mid1 = g1.px(Math.round(b2.cx), b2.y0 + Math.round(b2.h * 0.5));
ok(mid0[0] > 90 && mid0[2] > 90 && mid1[0] > mid0[0] + 40, 'keyframe gradient.offset: mau giua chu doi tu tim sang do khi truot', `${mid0} -> ${mid1}`);

// ---- 10. animator: tung ky tu hien dan
await setup(tx('ABCDEFGH', { size: 200, animator: { preset: 'fade', unit: 'char', duration: 0.2, stagger: 0.3, delay: 0, distance: 0, blur: 0, out: false } }), { duration: 4 });
const a0 = bbox(await frame(0.15)).n, a1 = bbox(await frame(1.2)).n, a2 = bbox(await frame(3.5)).n;
ok(a0 < a1 && a1 < a2 && a0 < a2 * 0.4, 'animator fade theo ky tu: so pixel tang dan (it -> nhieu -> du)', `${a0} < ${a1} < ${a2}`);
await setup(tx('Mot hai ba bon nam sau', { size: 150, maxWidth: 0.9, animator: { preset: 'slide-up', unit: 'word', duration: 0.2, stagger: 0.4, delay: 0, distance: 60, blur: 0, out: false } }), { duration: 4 });
const w_a = bbox(await frame(0.3)).n, w_b = bbox(await frame(3.9)).n;
ok(w_a > 0 && w_a < w_b * 0.6, 'animator slide-up theo tu: luc dau moi co 1-2 tu', `${w_a} vs ${w_b}`);
await setup(tx('Typewriter test', { size: 160, animator: { preset: 'typewriter', unit: 'char', duration: 0.001, stagger: 0.2, delay: 0, distance: 0, blur: 0, out: false } }), { duration: 4 });
const ty0 = bbox(await frame(0.5)), ty1 = bbox(await frame(3.5));
ok(ty0.w < ty1.w * 0.5 && ty1.w > 300, 'animator typewriter: chieu rong chu tang dan khi go', `${ty0.w} -> ${ty1.w}`);

// ---- 11. font: danh sach + canh bao tieng Viet
const fonts = (await call('GET', '/fonts')).data;
const fam = (n) => fonts.fonts.find((f) => f.family === n);
ok(fonts.total > 50 && !fonts.scanning, 'quet font xong, co >50 ho font', `${fonts.total} ho`);
ok(fam('Segoe UI')?.vietnamese === true && fam('Arial')?.vietnamese === true, 'Segoe UI, Arial: du glyph tieng Viet');
ok(fam('Impact')?.vietnamese === false, 'Impact: THIEU glyph tieng Viet (kiem bang cmap that)');
const trImpact = fam('TR Impact');
if (trImpact) ok(trImpact.vietnamese === false && trImpact.user === true, 'font kit "TR Impact" (font nguoi dung): thieu dau tieng Viet, dung nhu tai lieu kit', `vn=${trImpact.vietnamese}`);
const onlyVn = (await call('GET', '/fonts?vietnamese=1')).data;
ok(onlyVn.fonts.every((f) => f.vietnamese) && onlyVn.total < fonts.total && onlyVn.total > 5, 'loc vietnamese=1 chi tra font du dau', `${onlyVn.total}/${fonts.total}`);
await setup(tx('Việt Nam', { font: 'Impact' }));
let w = (await call('GET', '/warnings')).data;
ok(w.length === 1 && w[0].code === 'font-no-vietnamese' && w[0].level === 'error', 'canh bao: font Impact + chu Viet co dau -> loi font-no-vietnamese', w[0]?.message?.slice(0, 60));
await setup(tx('Viet Nam khong dau', { font: 'Impact' }));
w = (await call('GET', '/warnings')).data;
ok(w.length === 0, 'khong canh bao khi chu KHONG co dau (Impact dung duoc)');
await setup(tx('Việt Nam', { font: 'Segoe UI' }));
ok((await call('GET', '/warnings')).data.length === 0, 'Segoe UI + chu Viet: khong canh bao');
await setup(tx('Việt Nam', { font: 'Font Khong Ton Tai 123' }));
w = (await call('GET', '/warnings')).data;
ok(w.length === 1 && w[0].code === 'font-missing', 'font khong co trong may: canh bao font-missing');

// ---- 12. preset keyword-gradient: mau + keyframe vao
await call('POST', '/project/new', {});
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'k1', track: 'v1', src: { type: 'text', text: { content: 'I', size: 700 } }, start: 0, duration: 3, in: 0, volume: 1, transform: {}, keyframes: {} } }, { op: 'apply_preset', id: 'k1', preset: 'keyword-gradient' }] });
const kPrj = (await call('GET', '/project')).data;
ok(kPrj.clips[0].keyframes['transform.scale'][0].v === 1.35 && kPrj.clips[0].src.text.fill.stops[0].color === '#7563ff', 'preset keyword-gradient: so do dung kit (scale 135%, #7563ff)');
const kf = await frame(1.5);
bb = bbox(kf);
const kt = kf.px(Math.round(bb.cx), bb.y0 + Math.round(bb.h * 0.08)), kb = kf.px(Math.round(bb.cx), bb.y0 + Math.round(bb.h * 0.92));
ok(nearC(kt, [0x75, 0x63, 0xff], 40) && nearC(kb, [0xdc, 0xd3, 0xff], 40), 'preset keyword-gradient: gradient tim #7563ff (dinh) -> lavender #dcd3ff (day)', `${kt} -> ${kb}`);
const k0 = await frame(0), k2 = await frame(2.95); // 3 khung cuoi cua clip 3s = 2.9..3.0: lay giua doan tat
ok(mass(k0, (c) => c[0] > 20 || c[2] > 20) < 50 && bbox(await frame(0.2)).n > 500, 'preset keyword-gradient: t=0 an, vao nhanh (2 khung)');
const energy = (im) => { let e = 0; for (let k = 0; k < im.buf.length; k++) e += im.buf[k]; return e; };
ok(energy(k2) < energy(kf) * 0.8, 'preset keyword-gradient: tat dan o cuoi (3 khung cuoi clip): do sang giam', `${energy(k2)} < ${energy(kf)}`);

// ---- 13. PREVIEW GIONG FILE XUAT: chu + keyframe + animator (9:16 va 16:9)
await call('POST', '/project/new', {});
await call('POST', '/ops', { source: 'human', ops: [
  { op: 'add_clip', clip: { id: 'x1', track: 'v1', src: { type: 'text', text: { content: 'Việt Nam tuyệt vời', font: 'Segoe UI Black', size: 170, maxWidth: 0.9, fill: { type: 'linear', angle: 60, offset: 0, stops: [{ pos: 0, color: '#ff9a2e' }, { pos: 0.5, color: '#ff3d71' }, { pos: 1, color: '#7b2dff' }] }, stroke: { color: '#20103a', width: 6, over: false }, shadow: { color: '#000000', opacity: 0.5, blur: 18, x: 0, y: 8 }, glow: { color: '#ff3d71', radius: 24, strength: 1 }, animator: { preset: 'slide-up', unit: 'word', duration: 0.3, stagger: 0.25, delay: 0, distance: 60, blur: 10, out: false } }, }, start: 0, duration: 3, in: 0, volume: 1, transform: { anchorV: 'middle' }, keyframes: { 'transform.scale': [{ t: 0, v: 0.8, ease: { kind: 'bezier', x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 } }, { t: 1, v: 1, ease: lin }], 'text.fill.offset': [{ t: 0, v: 0, ease: lin }, { t: 3, v: 0.4, ease: lin }] } } },
  { op: 'add_track', track: { id: 'v2', kind: 'video', name: 'V2' } },
  { op: 'add_clip', clip: { id: 'x2', track: 'v2', src: { type: 'text', text: { content: '1', font: 'Segoe UI Black', size: 500, italic: true, fill: { type: 'solid', color: '#9a82ff' }, stroke: { color: '#8ff8ff', width: 12, over: true }, glow: { color: '#5ff4ff', radius: 30, strength: 0.9 } } }, start: 0.5, duration: 2.5, in: 0, volume: 1, transform: { anchorH: 'right', anchorV: 'bottom', margin: 0.05 }, keyframes: { 'transform.rotation': [{ t: 0, v: -14, ease: { kind: 'bezier', x1: 0.1, y1: 0.9, x2: 0.2, y2: 1 } }, { t: 0.5, v: 0, ease: lin }], 'transform.opacity': [{ t: 0, v: 0, ease: lin }, { t: 0.2, v: 1, ease: lin }] } } },
] });
for (const preset of ['9:16', '16:9']) {
  const out = resolve(OUT, `text-${preset.replace(':', 'x')}.mp4`);
  await call('POST', '/render_start', { preset, out }).then(async (r) => { if (r.status !== 200) throw new Error(JSON.stringify(r.data)); const j = await waitJob(r.data.job_id); if (j.state !== 'done') throw new Error('xuat loi ' + j.error); });
  const pv = probe(out).streams.find((s) => s.codec_type === 'video');
  ok(pv.nb_frames === '90' && (preset === '9:16' ? pv.width === 1080 : pv.width === 1920), `xuat ${preset}: 90 khung dung kich thuoc`, `${pv.width}x${pv.height} nb=${pv.nb_frames}`);
  const sc = 1;
  for (const t of [0.3, 0.9, 1.7, 2.6]) {
    const ex = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', out, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: 1 << 28 }).stdout;
    const pf = await call('GET', `/preview_frame?t=${t}&scale=${sc}&aspect=${encodeURIComponent(preset)}`);
    const W = preset === '9:16' ? 1080 : 1920, H = preset === '9:16' ? 1920 : 1080;
    const pr = decode(pf.data, W, H);
    let sum = 0, max = 0;
    for (let i = 0; i < pr.buf.length; i++) { const d = Math.abs(pr.buf[i] - ex[i]); sum += d; if (d > max) max = d; }
    const mae = sum / pr.buf.length;
    ok(ex.length === pr.buf.length && mae < 1.6, `preview GIONG file xuat (${preset}, chu+keyframe+animator, t=${t})`, `MAE ${mae.toFixed(2)} max ${max}`);
  }
}

// ---- 14. keyframe am luong khi xuat: dung test-a.mp4 (sin 440Hz)
await call('POST', '/project/new', {});
const imp = (await call('POST', '/media_import', { path: resolve('out/media/test-a.mp4') })).data;
await waitJob(imp.job_id);
await call('POST', '/ops', { source: 'human', ops: [{ op: 'add_clip', clip: { id: 'a1c', track: 'v1', src: { type: 'media', mediaId: imp.mediaId }, start: 0, duration: 4, in: 0, volume: 1, transform: {}, keyframes: { volume: [{ t: 0, v: 0, ease: lin }, { t: 2, v: 1, ease: lin }, { t: 4, v: 0, ease: lin }] } } }] });
const aout = resolve(OUT, 'volume.mp4');
const rj = await call('POST', '/render_start', { preset: '9:16', out: aout });
const rjob = await waitJob(rj.data.job_id);
const rms = (t0, d) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t0), '-t', String(d), '-i', aout, '-af', 'astats=metadata=1:reset=0,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-']);
  const m = [...r.stdout.toString().matchAll(/RMS_level=(-?[0-9.]+|-inf)/g)].map((x) => (x[1] === '-inf' ? -120 : Number(x[1])));
  return m.length ? m[m.length - 1] : NaN;
};
const lo = rms(0.0, 0.3), mid = rms(1.85, 0.3), hi = rms(1.0, 0.3), end = rms(3.7, 0.3);
ok(rjob.state === 'done' && mid > hi + 3 && hi > lo + 6 && mid > end + 6, 'xuat voi keyframe AM LUONG (0 -> 1 -> 0): dinh o giua, nho o hai dau', `RMS dB: 0s=${lo.toFixed(1)} 1s=${hi.toFixed(1)} 2s=${mid.toFixed(1)} 3.8s=${end.toFixed(1)}`);

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
