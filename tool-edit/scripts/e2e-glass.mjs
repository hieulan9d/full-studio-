// Kiem hieu ung "kinh mo" (fx.backdrop, F-97) bang DIEM ANH THAT: nen sau hinh bi lam mo DUNG trong hinh dang (ke ca hinh bo goc, do duc to thap),
// ngoai hinh khong doi. Chay app voi TOOL_EDIT_DEV_API=1. Can out/media/trA.png (testsrc2 1080x1920).
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
const decode = (png) => spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input: png, maxBuffer: 1 << 28 }).stdout;
const W = 270, H = 480;
const frame = async (t = 1) => decode((await call('GET', `/preview_frame?t=${t}&scale=0.25`)).data);
const lum = (f, x, y) => 0.2126 * f[(y * W + x) * 3] + 0.7152 * f[(y * W + x) * 3 + 1] + 0.0722 * f[(y * W + x) * 3 + 2];
/** Do sac net: gradient ngang LON NHAT trong vung (canh cang bi lam mo thi gradient cuc dai cang nho; tong bien thien thi khong doi nen khong dung trung binh). */
const energy = (f, x0, x1, y0, y1) => { let m = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m = Math.max(m, Math.abs(lum(f, x + 1, y) - lum(f, x, y))); return m; };
const meanLum = (f, x0, x1, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) (s += lum(f, x, y)), n++; return s / n; };
const diffArea = (a, b, x0, x1, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let c = 0; c < 3; c++) (s += Math.abs(a[(y * W + x) * 3 + c] - b[(y * W + x) * 3 + c])), n++; return s / n; };

await call('POST', '/project/new', {});
await sleep(1200);
const iA = (await call('POST', '/media_import', { path: resolve('out/media/trA.png') })).data.mediaId;
await sleep(800);
await ops([{ op: 'add_track', track: { id: 'v2', kind: 'video', name: 'V2' } }, { op: 'add_clip', clip: { id: 'A', track: 'v1', src: { type: 'media', mediaId: iA }, start: 0, duration: 4, in: 0, volume: 1, transform: { fit: 'cover' }, keyframes: {} } }]);
await sleep(1500);
const base = await frame();
ok(meanLum(base, 0, W - 1, 0, H - 1) > 15, 'Anh nen hien ra (khong den)', `${meanLum(base, 0, W - 1, 0, H - 1).toFixed(0)}`);
const R = [85, 185, 190, 290]; // vung giua hinh 500x500 (125x125 px o 0.25) bo vien de tranh mep
const e0 = energy(base, ...R);
const glass = (shape, fx = { backdrop: { radius: 40 } }) => ops([{ op: 'add_clip', clip: { id: 'G', track: 'v2', src: { type: 'shape', shape: { kind: 'rect', w: 500, h: 500, radius: 0, fill: '#ffffff', fillOpacity: 0, stroke: { color: '#ffffff', width: 0 }, ...shape } }, start: 0, duration: 4, in: 0, volume: 1, transform: {}, keyframes: {}, fx } }]);
await glass({});
await sleep(300);
const f1 = await frame();
const e1 = energy(f1, ...R);
ok(e0 > 60 && e1 < e0 * 0.2, 'Kinh mo (hinh KHONG co mau to, do duc to = 0): nen trong hinh bi lam mo manh', `chi tiet ${e0.toFixed(1)} -> ${e1.toFixed(1)}`);
ok(diffArea(f1, base, 0, 60, 0, 100) < 0.5 && diffArea(f1, base, 210, 270, 380, 480) < 0.5, 'Ngoai hinh: nen khong doi', `${diffArea(f1, base, 0, 60, 0, 100).toFixed(2)}`);
// mep: ngay trong / ngay ngoai hinh vuong 500x500 (±62 px)
const inside = diffArea(f1, base, 85, 185, 190, 290),
  outsideNear = diffArea(f1, base, 60, 68, 190, 290);
ok(inside > 8 && outsideNear < 1, 'Cat dung hinh dang: ben trong khac, sat mep ngoai van nguyen', `${inside.toFixed(1)} vs ${outsideNear.toFixed(2)}`);
await ops([{ op: 'remove_clip', id: 'G' }]);

// ---- hinh bo goc lon: goc ngoai cua khung vuong van sac net, giua bi mo
await glass({ radius: 250 });
await sleep(300);
const f2 = await frame();
const cornerOut = diffArea(f2, base, 75, 87, 180, 192); // goc tren-trai cua hinh vuong 500: nam NGOAI hinh bo tron
const center = diffArea(f2, base, 120, 150, 225, 255);
ok(center > 8 && cornerOut < 2, 'Hinh bo goc (ellipse-like): giua bi mo, goc ngoai khung vuong van sac net', `giua ${center.toFixed(1)}, goc ${cornerOut.toFixed(2)}`);
await ops([{ op: 'remove_clip', id: 'G' }]);

// ---- co mau to + kinh: sang hon ban chi mo
await glass({});
await sleep(200);
const fBlur = await frame();
await ops([{ op: 'remove_clip', id: 'G' }]);
await glass({ fill: '#ffffff', fillOpacity: 0.35 });
await sleep(300);
const fTint = await frame();
const mb = meanLum(fBlur, ...R), mt = meanLum(fTint, ...R);
ok(mt > mb + 15 && energy(fTint, ...R) < e0 * 0.3, 'Kinh + phu trang 35%: sang hon ban chi mo va van mo', `${mb.toFixed(0)} -> ${mt.toFixed(0)}, chi tiet ${energy(fTint, ...R).toFixed(1)}`);
await ops([{ op: 'remove_clip', id: 'G' }]);

// ---- ban kinh: lon hon thi mo hon
await glass({}, { backdrop: { radius: 6 } });
await sleep(200);
const eS = energy(await frame(), ...R);
await ops([{ op: 'remove_clip', id: 'G' }]);
await glass({}, { backdrop: { radius: 80 } });
await sleep(200);
const eL = energy(await frame(), ...R);
ok(eS > e1 && e1 > eL && eS < e0, 'Ban kinh mo lon hon thi mo hon (6 < 40 < 80)', `r6 ${eS.toFixed(1)}, r40 ${e1.toFixed(1)}, r80 ${eL.toFixed(1)}`);
await ops([{ op: 'remove_clip', id: 'G' }]);

// ---- ghep voi clip video co chuyen canh: opacity cua lop keo theo do mo (mat na nhan opacity)
await glass({});
await ops([{ op: 'set_clip', id: 'G', patch: {} }, { op: 'set_transform', id: 'G', patch: { opacity: 0 } }]);
await sleep(200);
const fz = await frame();
ok(diffArea(fz, base, 85, 185, 190, 290) < 1, 'Do duc lop = 0: kinh mo cung bien mat (khong de lai vung mo)', `${diffArea(fz, base, 85, 185, 190, 290).toFixed(2)}`);

console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
