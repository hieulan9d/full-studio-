// Kiem chuan cho khong gian mau, tone-map, qualifier, log wheels (co dap an biet truoc). Xem CHUC-NANG.md F-103..F-106.
import assert from 'node:assert/strict';
import { acesTonemap, acescctToLinear, applelogToLinear, davinciToLinear, gamutToRec709, GAMUTS, INPUT_SPACE_IDS, INPUT_SPACES, log3g10ToLinear, logc3ToLinear, rgbToXyz, toLinear709 } from '../src/core/colorspace';
import { gradeKey, stageA, stageAParams, stageB, stageBIdentity, windowMask, defaultWindow, bakeLut, bakeSizeFor, defaultGrade, gradePixel, isIdentity, mergeGrade, qualifierMask, validateGrade, rgbToHsl, hslToRgb } from '../src/core/grade';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const near = (a: number, b: number, tol = 1e-4) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b} (tol ${tol})`);

t('duong cong log: diem xam 18 % theo tai lieu hang ve 0.18 tuyen tinh', () => {
  near(logc3ToLinear(0.391007), 0.18, 1e-3); // ARRI LogC3 EI800
  near(davinciToLinear(0.336043), 0.18, 1e-4); // DaVinci Intermediate
  near(acescctToLinear(0.4135884), 0.18, 1e-4); // ACEScct
  near(log3g10ToLinear(1 / 3), 0.18, 1e-3); // RED Log3G10
});

t('duong cong log: lien tuc tai diem noi (khong nhay)', () => {
  const cont = (f: (x: number) => number, x0: number, name: string) => near(f(x0 - 1e-7), f(x0 + 1e-7), 1e-4);
  cont(logc3ToLinear, 0.010591 * 5.367655 + 0.092809, 'logc3');
  cont(davinciToLinear, 0.02740668, 'davinci');
  cont(acescctToLinear, 0.155251141552511, 'acescct');
  cont(log3g10ToLinear, 0, 'log3g10');
  cont(applelogToLinear, 47.28711236 * Math.pow(0.01 + 0.05641088, 2), 'applelog');
});

t('Apple Log: quay vong ma hoa/giai ma', () => {
  const enc = (x: number) => (x >= 0.01 ? 0.08550479 * Math.log2(x + 0.00964052) + 0.69336945 : 47.28711236 * Math.pow(x + 0.05641088, 2));
  for (const x of [0, 0.005, 0.01, 0.18, 0.5, 1, 4]) near(applelogToLinear(enc(x)), x, 1e-5);
});

t('gam mau: moi hang ma tran sang Rec.709 cong lai bang 1 (trang giu nguyen), ke ca AP1 (D60 -> D65)', () => {
  for (const k of Object.keys(GAMUTS)) {
    const m = gamutToRec709(k);
    for (let r = 0; r < 3; r++) near(m[r * 3] + m[r * 3 + 1] + m[r * 3 + 2], 1, 1e-4);
  }
  const id = gamutToRec709('rec709');
  [1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => near(id[i], v, 1e-9));
});

t('gam mau: ARRI Wide Gamut 3 -> Rec.709 khop ma tran cua ARRI', () => {
  const ref = [1.617523, -0.537287, -0.080237, -0.070573, 1.334613, -0.26404, -0.021102, -0.226954, 1.248056];
  const m = gamutToRec709('awg3');
  ref.forEach((v, i) => near(m[i], v, 3e-3));
});

t('gam mau: ma tran Rec.709 -> XYZ khop gia tri chuan BT.709', () => {
  const m = rgbToXyz(GAMUTS.rec709);
  const ref = [0.4124, 0.3576, 0.1805, 0.2126, 0.7152, 0.0722, 0.0193, 0.1192, 0.9505];
  ref.forEach((v, i) => near(m[i], v, 2e-3));
});

t('toLinear709: xam khong doi mau o moi khong gian; do hoa 18 % dung', () => {
  for (const id of INPUT_SPACE_IDS) {
    const v = toLinear709(id, 0.4, 0.4, 0.4);
    near(v[0], v[1], 2e-3);
    near(v[1], v[2], 2e-3);
  }
  const gray = toLinear709('acescct', 0.4135884, 0.4135884, 0.4135884);
  near(gray[0], 0.18, 2e-3);
  assert.ok(Object.values(INPUT_SPACES).every((d) => d.label.length > 3 && d.checked.length > 3));
});

t('ACES tone-map: don dieu, trong 0..1, trung tinh giu trung tinh, khong nhay mau', () => {
  let prev = -1;
  for (let i = 0; i <= 80; i++) {
    const x = i * 0.05;
    const o = acesTonemap(x, x, x);
    assert.ok(o[0] >= prev - 1e-9 && o[0] <= 1, `khong don dieu tai ${x}`);
    near(o[0], o[1], 0.01);
    near(o[1], o[2], 0.01);
    prev = o[0];
  }
  near(acesTonemap(0, 0, 0)[0], 0, 1e-3);
  assert.ok(acesTonemap(16, 16, 16)[0] > 0.97);
  const mid = acesTonemap(0.18, 0.18, 0.18)[0];
  assert.ok(mid > 0.08 && mid < 0.14, `xam 18% -> ${mid}`); // ACES dua xam 18 % ve ~0.1 hien thi tuyen tinh (~10 nit tren man 100 nit)
});

t('gradePixel: tonemap aces nen vung sang (khong cat cung o 1)', () => {
  const g = mergeGrade(undefined, { input: 'acescct', tonemap: 'aces' });
  const hi = gradePixel(g, null, 0.7, 0.7, 0.7);
  const mid = gradePixel(g, null, 0.4135884, 0.4135884, 0.4135884);
  assert.ok(hi[0] > mid[0] && hi[0] <= 1.0001);
  assert.ok(mid[0] > 0.3 && mid[0] < 0.45, `giua ${mid[0]}`);
});

t('gam mau: mau ngoai gam duoc nen lien tuc (khong am, khong nhay vach, giu do sang)', () => {
  // tien den bien gam: xanh la rat bao hoa trong AWG3 -> ngoai gam 709
  const out = toLinear709('logc3_awg3', 0.3, 0.6, 0.3);
  assert.ok(out.every((v) => v >= -1e-9), `am: ${out}`);
  // lien tuc khi di chuyen dan: sai khac nho giua hai diem sat nhau
  let worst = 0;
  for (let i = 0; i < 400; i++) {
    const a = toLinear709('logc3_awg3', 0.3 + i * 0.0005, 0.6, 0.3 + i * 0.0003);
    const b = toLinear709('logc3_awg3', 0.3 + (i + 1) * 0.0005, 0.6, 0.3 + (i + 1) * 0.0003);
    worst = Math.max(worst, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  }
  assert.ok(worst < 0.05, `nhay vach ${worst}`);
  // mau trong gam khong bi doi
  const inGamut = toLinear709('logc3_awg3', 0.4, 0.4, 0.4);
  near(inGamut[0], inGamut[1], 1e-6);
});

t('HSL quay vong', () => {
  for (const [r, g, b] of [[1, 0, 0], [0.2, 0.7, 0.4], [0.9, 0.8, 0.1], [0.3, 0.3, 0.3], [0, 0, 1]]) {
    const [h, s, l] = rgbToHsl(r, g, b);
    const o = hslToRgb(h, s, l);
    near(o[0], r, 1e-6);
    near(o[1], g, 1e-6);
    near(o[2], b, 1e-6);
  }
});

t('qualifier: chon do, loai xanh la va xam; mep mem; dao nguoc', () => {
  const q = mergeGrade(undefined, { qual: { hue: { center: 0, width: 20, soft: 0 } } }).qual!;
  near(qualifierMask(q, 1, 0, 0), 1, 1e-9);
  near(qualifierMask(q, 0, 1, 0), 0, 1e-9);
  near(qualifierMask(q, 0.5, 0.5, 0.5), 0, 1e-9);
  const soft = mergeGrade(undefined, { qual: { hue: { center: 0, width: 20, soft: 40 } } }).qual!;
  const edge = qualifierMask(soft, ...hslToRgb(40 / 360, 1, 0.5));
  assert.ok(edge > 0.05 && edge < 0.95, `mep mem ${edge}`);
  near(qualifierMask({ ...q, invert: true }, 1, 0, 0), 0, 1e-9);
  near(qualifierMask({ ...q, invert: true }, 0, 1, 0), 1, 1e-9);
});

t('qualifier: khoang bao hoa va do sang', () => {
  const q = mergeGrade(undefined, { qual: { sat: { lo: 0.6, hi: 1 }, lum: { lo: 0.3, hi: 0.7 } } }).qual!;
  near(qualifierMask(q, 1, 0, 0), 1, 1e-9); // l = 0.5, s = 1
  near(qualifierMask(q, 0.55, 0.45, 0.45), 0, 1e-9); // it bao hoa
  near(qualifierMask(q, 1, 0.8, 0.8), 0, 1e-9); // qua sang
});

t('qualifier: xoay sac do chi doi vung duoc chon', () => {
  const g = mergeGrade(undefined, { qual: { hue: { center: 0, width: 25, soft: 0 }, adjust: { hue: 120 } } });
  const red = gradePixel(g, null, 0.9, 0.1, 0.1);
  assert.ok(red[1] > red[0] && red[1] > red[2], `do -> ${red}`);
  const green = gradePixel(g, null, 0.1, 0.8, 0.1);
  near(green[0], 0.1, 1e-6);
  near(green[1], 0.8, 1e-6);
  const shown = gradePixel(mergeGrade(g, { qual: { show: true } }), null, 0.9, 0.1, 0.1);
  near(shown[0], 1, 1e-9);
  near(shown[1], 1, 1e-9);
});

t('log wheels: dong vung toi, khong dong vung sang', () => {
  const g = mergeGrade(undefined, { logw: { shadows: { m: 0.2 } } });
  const dark = gradePixel(g, null, 0.1, 0.1, 0.1);
  const base = gradePixel(defaultGrade(), null, 0.1, 0.1, 0.1);
  assert.ok(dark[0] > base[0] + 0.03, `toi ${dark[0]} vs ${base[0]}`);
  const bright = gradePixel(g, null, 0.9, 0.9, 0.9);
  const b0 = gradePixel(defaultGrade(), null, 0.9, 0.9, 0.9);
  near(bright[0], b0[0], 1e-3);
  const hg = mergeGrade(undefined, { logw: { highlights: { r: 0.3 } } });
  const h1 = gradePixel(hg, null, 0.9, 0.9, 0.9);
  assert.ok(h1[0] > h1[1] + 0.05);
  near(gradePixel(hg, null, 0.1, 0.1, 0.1)[0], gradePixel(defaultGrade(), null, 0.1, 0.1, 0.1)[0], 2e-3);
});

t('isIdentity va mergeGrade voi truong moi', () => {
  assert.equal(isIdentity(mergeGrade(undefined, { tonemap: 'aces' })), false);
  assert.equal(isIdentity(mergeGrade(undefined, { logw: { shadows: { m: 0 } } })), true);
  assert.equal(isIdentity(mergeGrade(undefined, { qual: { hue: { center: 30 } } })), true); // chua chinh gi (adjust mac dinh)
  assert.equal(isIdentity(mergeGrade(undefined, { qual: { adjust: { sat: 1.5 } } })), false);
  const g = mergeGrade(mergeGrade(undefined, { qual: { hue: { center: 30, width: 20 } } }), { qual: { adjust: { lum: 0.1 } } });
  near(g.qual!.hue.center, 30, 0);
  near(g.qual!.adjust.lum, 0.1, 0);
  assert.equal(mergeGrade(g, { qual: null }).qual, undefined);
});

t('validateGrade: bat gia tri sai cua truong moi', () => {
  assert.deepEqual(validateGrade(mergeGrade(undefined, { tonemap: 'aces', qual: { hue: { center: 20, width: 30 } }, win: { cx: 0.4 } }), 'g'), []);
  assert.ok(validateGrade(mergeGrade(undefined, { qual: { hue: { center: 400 } } }), 'g').length > 0);
  assert.ok(validateGrade(mergeGrade(undefined, { qual: { sat: { lo: 0.9, hi: 0.2 } } }), 'g').length > 0);
  assert.ok(validateGrade(mergeGrade(undefined, { logw: { shadowRange: 0.9 } }), 'g').length > 0);
  assert.ok(validateGrade({ ...defaultGrade(), input: 'xyz' as never }, 'g').length > 0);
});

t('buoc A / buoc B: tham so, khoa LUT, kich thuoc nuong', () => {
  const g = mergeGrade(undefined, { input: 'logc3_awg3', exposure: 0.5, tonemap: 'aces', mix: 0.7 });
  const a = stageAParams(g);
  assert.equal(a.on, true);
  assert.equal(a.curve, 3);
  assert.equal(a.tonemap, 1);
  assert.equal(a.gamut, true);
  near(a.mul[0], Math.pow(2, 0.5), 1e-12);
  assert.equal(stageAParams(defaultGrade()).on, false);
  assert.equal(stageBIdentity(g), true); // chi buoc A: LUT don vi
  assert.equal(bakeSizeFor(g), 2);
  assert.equal(bakeSizeFor(mergeGrade(g, { contrast: 0.2 })), 33);
  assert.equal(bakeSizeFor(mergeGrade(g, { qual: { adjust: { sat: 1.4 } } })), 65);
  // keo phoi sang / doi khong gian / tone-map / muc ap dung / cua so KHONG doi khoa LUT (khong nuong lai); doi tuong phan thi doi
  const k0 = gradeKey(mergeGrade(undefined, { contrast: 0.2 }));
  assert.equal(gradeKey(mergeGrade(undefined, { contrast: 0.2, exposure: 1.3, input: 'acescct', tonemap: 'aces', mix: 0.5, temperature: 20, win: { cx: 0.3 } })), k0);
  assert.notEqual(gradeKey(mergeGrade(undefined, { contrast: 0.3 })), k0);
});

t('gradePixel = buoc A roi buoc B; phan vuot 1 cua buoc A cong lai nguyen', () => {
  const g = mergeGrade(undefined, { input: 'acescct', exposure: 0.3, contrast: 0.2, saturation: 1.2 });
  const c = [0.45, 0.5, 0.4];
  const A = stageA(g, c[0], c[1], c[2]);
  const inn = A.map((v) => Math.min(1, Math.max(0, v)));
  const B = stageB(g, null, inn);
  const full = gradePixel(g, null, c[0], c[1], c[2]);
  for (let i = 0; i < 3; i++) near(full[i], B[i] + (A[i] - inn[i]), 1e-12);
  const hot = gradePixel(mergeGrade(undefined, { exposure: 2 }), null, 0.8, 0.8, 0.8);
  assert.ok(hot[0] > 1.4, `giu nang luong vuot 1: ${hot[0]}`);
  // trang thai khong chinh gi: buoc A tat, ra dung gia tri goc
  const idn = gradePixel(defaultGrade(), null, 0.3, 0.6, 0.9);
  near(idn[0], 0.3, 1e-12);
  near(idn[2], 0.9, 1e-12);
});

t('nuong LUT buoc B 65^3 voi qualifier du nhanh', () => {
  const g = mergeGrade(undefined, { input: 'acescct', tonemap: 'aces', qual: { hue: { center: 0, width: 30, soft: 20 }, adjust: { sat: 1.4 } } });
  assert.equal(bakeSizeFor(g), 65);
  assert.equal(bakeSizeFor(defaultGrade()), 2);
  const t0 = Date.now();
  const lut = bakeLut(g, null, 65);
  const ms = Date.now() - t0;
  console.log(`   nuong 65^3: ${ms} ms`);
  assert.ok(ms < 4000, `qua cham ${ms} ms`);
  assert.equal(lut.length, 65 * 65 * 65 * 4);
  assert.ok(lut.every((v) => Number.isFinite(v)));
});

t('cua so: elip va chu nhat, mep mem, dao nguoc, xoay', () => {
  const w = { ...defaultWindow(), w: 0.5, h: 0.5, feather: 0.2 };
  near(windowMask(w, 0.5, 0.5, 1000, 1000), 1, 1e-9); // tam
  near(windowMask(w, 0.95, 0.95, 1000, 1000), 0, 1e-9); // ngoai
  const edge = windowMask(w, 0.5 + 0.25 * 0.9, 0.5, 1000, 1000); // d = 0.9: trong vung mem
  assert.ok(edge > 0.05 && edge < 0.95, `mep ${edge}`);
  near(windowMask({ ...w, invert: true }, 0.5, 0.5, 1000, 1000), 0, 1e-9);
  // chu nhat: goc (0.7,0.7) nam trong hinh chu nhat 0.5x0.5 tam 0.5 nhung ngoai elip
  const rect = { ...w, shape: 'rect' as const, feather: 0 };
  assert.ok(windowMask(rect, 0.74, 0.74, 1000, 1000) > 0.99);
  assert.ok(windowMask({ ...w, feather: 0 }, 0.74, 0.74, 1000, 1000) < 0.01);
  // xoay 90 do: hinh chu nhat 0.8 x 0.2 thanh doc
  const bar = { ...w, shape: 'rect' as const, w: 0.8, h: 0.2, feather: 0, rot: 90 };
  assert.ok(windowMask(bar, 0.5, 0.85, 1000, 1000) > 0.99);
  assert.ok(windowMask(bar, 0.85, 0.5, 1000, 1000) < 0.01);
  near(windowMask({ ...w, enabled: false }, 0.99, 0.99, 1000, 1000), 1, 0);
});

console.log(`${n} test khong gian mau dat`);
