// Kiem clip bieu do / so dem (F-96) bang DIEM ANH THAT tren GPU: ti le cot / dien tich tron dung du lieu, hoat hoa vao dung thoi diem,
// lo vanh khuyen trong suot, so dem doi roi dung yen. Chay app voi TOOL_EDIT_DEV_API=1.
import { spawnSync } from 'node:child_process';
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
const W = 540,
  H = 960;
const frame = async (t) => {
  const r = await call('GET', `/preview_frame?t=${t}&scale=0.5`);
  if (r.status !== 200) throw new Error('preview_frame ' + JSON.stringify(r.data).slice(0, 200));
  return decode(r.data);
};
const count = (f, pred) => { let n = 0; for (let i = 0; i < f.length; i += 3) if (pred(f[i], f[i + 1], f[i + 2])) n++; return n; };
const RED = (r, g, b) => r > 170 && g < 70 && b < 70;
const GRN = (r, g, b) => g > 170 && r < 70 && b < 70;
const BLU = (r, g, b) => b > 170 && r < 70 && g < 70;
const bbox = (f, pred) => { let x0 = W, x1 = -1, y0 = H, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (pred(f[i], f[i + 1], f[i + 2])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } return x1 < 0 ? null : { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };

await call('POST', '/project/new', {});
await sleep(1200);
const base = { title: '', bgOpacity: 0, grid: false, valueLabels: false, textColor: '#ffffff', delay: 0.2, duration: 1, stagger: 0, ease: 'linear' };
const put = async (chart) => {
  await ops([{ op: 'add_clip', clip: { id: 'ch', track: 'v1', src: { type: 'chart', chart: { ...base, ...chart } }, start: 0, duration: 5, in: 0, volume: 1, transform: {}, keyframes: {} } }]);
  await sleep(250);
};
const drop = () => ops([{ op: 'remove_clip', id: 'ch' }]);

// ---- cot ----
await put({ kind: 'bar', data: [{ label: 'A', value: 50, color: '#ff0000' }, { label: 'B', value: 100, color: '#00ff00' }] });
let f = await frame(0.05);
ok(count(f, RED) + count(f, GRN) === 0, 'Cot: truoc khi bat dau hoat hoa (t < delay) chua co cot nao');
f = await frame(3);
let r = bbox(f, RED), g = bbox(f, GRN);
ok(r && g && Math.abs(g.h / r.h - 2) < 0.08, 'Cot: cot B (100) cao gap doi cot A (50)', r && g ? `${g.h}/${r.h} = ${(g.h / r.h).toFixed(2)}` : 'khong thay cot');
ok(r && g && Math.abs(r.y1 - g.y1) <= 1, 'Cot: hai cot chung duong day (truc 0)');
ok(r && g && Math.abs(r.w - g.w) <= 2, 'Cot: hai cot rong bang nhau');
// hoat hoa: tuyen tinh, delay 0.2, duration 1 -> t=0.7 la 50% chieu cao cuoi
f = await frame(0.7);
const gm = bbox(f, GRN);
ok(gm && g && Math.abs(gm.h / g.h - 0.5) < 0.06, 'Cot: o giua hoat hoa (t=0.7) cot cao ~50% chieu cao cuoi', gm ? `${(gm.h / g.h).toFixed(2)}` : '');
const f4 = await frame(4), f45 = await frame(4.5);
let d = 0; for (let i = 0; i < f4.length; i++) d += Math.abs(f4[i] - f45[i]);
ok(d / f4.length < 0.5, 'Cot: sau khi xong hoat hoa, hinh dung yen', `${(d / f4.length).toFixed(3)}`);
await drop();

// ---- cot ngang ----
await put({ kind: 'hbar', data: [{ label: 'A', value: 25, color: '#ff0000' }, { label: 'B', value: 100, color: '#00ff00' }] });
f = await frame(3);
r = bbox(f, RED); g = bbox(f, GRN);
ok(r && g && Math.abs(g.w / r.w - 4) < 0.25, 'Cot ngang: cot B (100) dai gap 4 lan cot A (25)', r && g ? `${(g.w / r.w).toFixed(2)}` : 'khong thay');
await drop();

// ---- tron: dien tich ti le gia tri ----
await put({ kind: 'pie', data: [{ label: 'A', value: 25, color: '#ff0000' }, { label: 'B', value: 75, color: '#00ff00' }] });
f = await frame(3);
const ra = count(f, RED), ga = count(f, GRN);
ok(ra > 500 && Math.abs(ga / ra - 3) < 0.25, 'Tron: dien tich B gap 3 lan A (75 / 25)', `${(ga / ra).toFixed(2)}`);
const fp = await frame(0.7);
const part = count(fp, RED) + count(fp, GRN);
ok(part > (ra + ga) * 0.35 && part < (ra + ga) * 0.65, 'Tron: o giua hoat hoa (50%) da quet ~nua vong', `${(part / (ra + ga)).toFixed(2)}`);
await drop();

// ---- vanh khuyen: lo giua trong suot ----
await put({ kind: 'donut', data: [{ label: 'A', value: 50, color: '#0000ff' }, { label: 'B', value: 50, color: '#00ff00' }] });
f = await frame(3);
const bb = bbox(f, (r2, g2, b2) => BLU(r2, g2, b2) || GRN(r2, g2, b2));
const cxp = Math.round((bb.x0 + bb.x1) / 2), cyp = Math.round((bb.y0 + bb.y1) / 2);
const pxAt = (x, y) => [f[(y * W + x) * 3], f[(y * W + x) * 3 + 1], f[(y * W + x) * 3 + 2]];
const center = pxAt(cxp, cyp);
// lo giua co so tong (chu trang) nhung xung quanh tam la nen den; kiem mot diem lech nhe khoi chu
const holeProbe = pxAt(cxp, cyp - Math.round(bb.h * 0.16));
const ringProbe = pxAt(cxp, cyp - Math.round(bb.h * 0.45));
ok(holeProbe.every((v) => v < 30) && (BLU(...ringProbe) || GRN(...ringProbe)), 'Vanh khuyen: giua rong (trong suot), vanh mau o ngoai', `lo ${holeProbe}, vanh ${ringProbe}, tam ${center}`);
await drop();

// ---- duong: ve dan tu trai sang phai ----
await put({ kind: 'line', data: [{ label: 'T1', value: 10 }, { label: 'T2', value: 40 }, { label: 'T3', value: 30 }, { label: 'T4', value: 90 }], palette: ['#00ff00'] });
const l1 = await frame(0.7), l2 = await frame(3);
const b1 = bbox(l1, GRN), b2 = bbox(l2, GRN);
ok(b1 && b2 && b1.x1 < b2.x1 - 20 && Math.abs(b1.x1 - (b2.x0 + (b2.x1 - b2.x0) * 0.5)) < 40, 'Duong: o giua hoat hoa moi ve toi ~nua chieu ngang, cuoi hoat hoa ve du', b1 && b2 ? `${b1.x1} -> ${b2.x1}` : '');
await drop();

// ---- so dem ----
await put({ kind: 'number', data: [{ label: 'Khach hang', value: 12500 }], from: 0, palette: ['#00ff00'], w: 760, h: 420 });
const n0 = await frame(0.05), n1 = await frame(0.7), n2 = await frame(3), n3 = await frame(4);
const lit = (f2) => count(f2, (r2, g2, b2) => g2 > 150 && r2 < 120);
ok(lit(n1) > 100 && lit(n2) > lit(n1) * 0.9, 'So dem: dang hien chu so (mau palette) o giua va cuoi hoat hoa', `${lit(n0)} -> ${lit(n1)} -> ${lit(n2)}`);
let dd = 0; for (let i = 0; i < n2.length; i++) dd += Math.abs(n2[i] - n1[i]);
let ds = 0; for (let i = 0; i < n2.length; i++) ds += Math.abs(n2[i] - n3[i]);
ok(dd / n2.length > 0.3 && ds / n2.length < 0.1, 'So dem: giua hoat hoa khac cuoi, sau khi xong thi dung yen', `${(dd / n2.length).toFixed(2)} / ${(ds / n2.length).toFixed(3)}`);
await drop();

// ---- the nen + tieu de + chu hien duoc ----
await put({ kind: 'bar', title: 'Doanh thu', data: [{ label: 'Q1', value: 30 }, { label: 'Q2', value: 60 }], bgOpacity: 1, bg: '#102040', grid: true, valueLabels: true });
f = await frame(3);
const card = count(f, (r2, g2, b2) => Math.abs(r2 - 16) < 6 && Math.abs(g2 - 32) < 6 && Math.abs(b2 - 64) < 6);
const white = count(f, (r2, g2, b2) => r2 > 220 && g2 > 220 && b2 > 220);
ok(card > 40000 && white > 300, 'The nen dac + tieu de/nhan/gia tri bang chu trang hien ra', `nen ${card}, chu ${white}`);
await drop();

// ---- xuat khop xem truoc ----
await put({ kind: 'bar', title: 'Q', data: [{ label: 'A', value: 50 }, { label: 'B', value: 80 }], bgOpacity: 0.9 });
console.log(`\n${pass} dat, ${fail} that bai`);
process.exitCode = fail ? 1 : 0;
