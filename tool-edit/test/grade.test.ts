import assert from 'node:assert/strict';
import { Session } from '../src/core/session';
import { DEFAULT_TRANSFORM, validate, type Clip, type Media } from '../src/core/schema';
import { srgbEotf, srgbOetf } from '../src/core/color';
import { bakeLut, defaultGrade, evalCurve, gradePixel, isIdentity, logToLinear, mergeGrade, parseCube, sampleCube, slog3ToLinear, toF16, validateGrade, vlogToLinear, writeCube } from '../src/core/grade';

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log('ok -', name);
};
const near = (a: number, b: number, tol = 1e-4) => assert.ok(Math.abs(a - b) <= tol, `${a} !~ ${b}`);
const media = (id: string): Media => ({ id, path: `D:/x/${id}.mp4`, kind: 'video', duration: 10, width: 1080, height: 1920, fps: 30, hasAudio: true });
const mclip = (id: string, mediaId: string): Clip => ({ id, track: 'v1', src: { type: 'media', mediaId }, start: 0, duration: 4, in: 0, volume: 1, transform: { ...DEFAULT_TRANSFORM }, keyframes: {} });

t('grade mac dinh la identity va nuong LUT = duong cheo', () => {
  assert.equal(isIdentity(defaultGrade()), true);
  const lut = bakeLut(defaultGrade(), null, 9);
  let max = 0;
  for (let z = 0; z < 9; z++) for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    const i = ((z * 9 + y) * 9 + x) * 4;
    max = Math.max(max, Math.abs(lut[i] - x / 8), Math.abs(lut[i + 1] - y / 8), Math.abs(lut[i + 2] - z / 8));
  }
  assert.ok(max < 1e-6, `lech ${max}`);
});

t('log input: diem xam 18% cua S-Log3 va V-Log ve 0.18 tuyen tinh', () => {
  near(slog3ToLinear(420 / 1023), 0.18, 1e-4);
  near(vlogToLinear(0.423311), 0.18, 1e-3);
  near(slog3ToLinear(95 / 1023), 0, 1e-6); // den
  near(logToLinear('none', 0.5), srgbEotf(0.5));
  // 18% tuyen tinh -> ma hoa sRGB ~ 0.461
  const g = { ...defaultGrade(), input: 'slog3' as const };
  const o = gradePixel(g, null, 420 / 1023, 420 / 1023, 420 / 1023);
  near(o[0], srgbOetf(0.18), 2e-3);
});

t('phoi sang +1 stop nhan doi anh sang tuyen tinh; khong doi voi 0', () => {
  const g = mergeGrade(undefined, { exposure: 1 });
  const o = gradePixel(g, null, 0.3, 0.3, 0.3);
  near(srgbEotf(o[0]), 2 * srgbEotf(0.3), 1e-5);
  const z = gradePixel(mergeGrade(undefined, { exposure: 0 }), null, 0.3, 0.3, 0.3);
  near(z[0], 0.3, 1e-9);
});

t('tuong phan: pivot khong doi; xa pivot thi gian ra', () => {
  const g = mergeGrade(undefined, { contrast: 0.5, pivot: 0.45 });
  near(gradePixel(g, null, 0.45, 0.45, 0.45)[0], 0.45, 1e-9);
  assert.ok(gradePixel(g, null, 0.8, 0.8, 0.8)[0] > 0.8);
  assert.ok(gradePixel(g, null, 0.2, 0.2, 0.2)[0] < 0.2);
});

t('lift nang den, gain nhan trang, offset cong, gamma doi giua', () => {
  near(gradePixel(mergeGrade(undefined, { lift: { m: 0.1 } }), null, 0, 0, 0)[0], 0.1, 1e-9);
  near(gradePixel(mergeGrade(undefined, { lift: { m: 0.1 } }), null, 1, 1, 1)[0], 1, 1e-9); // lift khong dong vao trang
  near(gradePixel(mergeGrade(undefined, { gain: { m: 0.5 } }), null, 1, 1, 1)[0], 1.5, 1e-9);
  near(gradePixel(mergeGrade(undefined, { offset: { r: 0.05 } }), null, 0.5, 0.5, 0.5)[0], 0.55, 1e-9);
  near(gradePixel(mergeGrade(undefined, { offset: { r: 0.05 } }), null, 0.5, 0.5, 0.5)[1], 0.5, 1e-9);
  const lighter = gradePixel(mergeGrade(undefined, { gamma: { m: 0.5 } }), null, 0.5, 0.5, 0.5)[0];
  assert.ok(lighter > 0.5 && gradePixel(mergeGrade(undefined, { gamma: { m: 0.5 } }), null, 0, 0, 0)[0] === 0 && near(gradePixel(mergeGrade(undefined, { gamma: { m: 0.5 } }), null, 1, 1, 1)[0], 1, 1e-9) === undefined);
});

t('bao hoa 0 ra xam (R=G=B = luma); 1 giu nguyen; nhiet do am lam xanh hon', () => {
  const o = gradePixel(mergeGrade(undefined, { saturation: 0 }), null, 0.8, 0.4, 0.2);
  near(o[0], o[1], 1e-9);
  near(o[1], o[2], 1e-9);
  near(o[0], 0.2126 * 0.8 + 0.7152 * 0.4 + 0.0722 * 0.2, 1e-9);
  const cool = gradePixel(mergeGrade(undefined, { temperature: -50 }), null, 0.5, 0.5, 0.5);
  assert.ok(cool[2] > cool[0]);
  const warm = gradePixel(mergeGrade(undefined, { temperature: 50 }), null, 0.5, 0.5, 0.5);
  assert.ok(warm[0] > warm[2]);
});

t('duong cong: qua cac diem, don dieu, khong nhieu hon 0..1', () => {
  const pts: [number, number][] = [[0, 0], [0.25, 0.15], [0.75, 0.85], [1, 1]];
  for (const [x, y] of pts) near(evalCurve(pts, x), y, 1e-9);
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const v = evalCurve(pts, i / 100);
    assert.ok(v >= prev - 1e-9 && v >= 0 && v <= 1.0000001);
    prev = v;
  }
  near(evalCurve(undefined, 0.3), 0.3);
  const g = mergeGrade(undefined, { curves: { master: pts } });
  assert.ok(gradePixel(g, null, 0.25, 0.25, 0.25)[0] < 0.25 + 1e-9);
});

t('.cube: ghi roi doc lai, lay mau, ap len grade (LUT mix)', () => {
  const txt = writeCube(5, (r, g, b) => [1 - r, g, b], 'dao-do');
  const lut = parseCube(txt);
  assert.equal(lut.size, 5);
  assert.equal(lut.title, 'dao-do');
  const out = [0, 0, 0];
  sampleCube(lut, 0.3, 0.6, 0.9, out);
  near(out[0], 0.7, 1e-6);
  near(out[1], 0.6, 1e-6);
  const g = mergeGrade(undefined, { lut: { path: 'x.cube', name: 'x', mix: 1 } });
  near(gradePixel(g, lut, 0.2, 0.5, 0.5)[0], 0.8, 1e-6);
  const half = mergeGrade(undefined, { lut: { path: 'x.cube', name: 'x', mix: 0.5 } });
  near(gradePixel(half, lut, 0.2, 0.5, 0.5)[0], 0.5, 1e-6);
  assert.throws(() => parseCube('LUT_3D_SIZE 3\n0 0 0\n'), /can 27 dong/);
  assert.throws(() => parseCube('LUT_1D_SIZE 4\n0 0 0\n'), /1D/);
  assert.throws(() => parseCube('0 0 0'), /LUT_3D_SIZE/);
  const dom = parseCube('LUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 2 2 2\n' + Array.from({ length: 8 }, () => '2 1 0').join('\n'));
  near(dom.data[0], 1);
  near(dom.data[1], 0.5);
});

t('float16: sai so < 1e-3 trong 0..2, giu 0, 1', () => {
  const src = new Float32Array([0, 0.001, 0.25, 0.5, 0.7071, 1, 1.5, 2, -0.1]);
  const h = toF16(src);
  const dec = (b: number) => { const s = b & 0x8000 ? -1 : 1, e = (b >> 10) & 31, m = b & 1023; return e === 0 ? s * Math.pow(2, -14) * (m / 1024) : s * Math.pow(2, e - 15) * (1 + m / 1024); };
  src.forEach((v, i) => assert.ok(Math.abs(dec(h[i]) - v) < 1e-3 * Math.max(1, Math.abs(v)), `${v} -> ${dec(h[i])}`));
  assert.equal(h[5], 0x3c00); // 1.0
});

t('set_grade: gop tung phan, go bang null, tu choi chu/ngoai khoang; validate bat loi', () => {
  const s = new Session();
  s.apply([{ op: 'add_media', media: media('m1') }, { op: 'add_clip', clip: mclip('c', 'm1') }], 'human');
  assert.equal(s.apply([{ op: 'set_grade', id: 'c', grade: { exposure: 0.5, lift: { r: 0.02 } } }], 'human').ok, true);
  assert.equal(s.apply([{ op: 'set_grade', id: 'c', grade: { saturation: 1.2, lift: { b: -0.02 } } }], 'human').ok, true);
  const g = s.project.clips[0].grade!;
  assert.equal(g.exposure, 0.5);
  assert.equal(g.saturation, 1.2);
  assert.equal(g.lift.r, 0.02);
  assert.equal(g.lift.b, -0.02);
  assert.equal(s.apply([{ op: 'set_grade', id: 'c', grade: { exposure: 9 } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_grade', id: 'c', grade: { curves: { master: [[0, 0], [0.5, 0.4], [0.4, 0.6], [1, 1]] } } }], 'human').ok, false); // x khong tang
  assert.equal(s.apply([{ op: 'set_grade', id: 'c', grade: { lut: { path: 'a.png', name: 'a', mix: 1 } } }], 'human').ok, false);
  assert.equal(s.apply([{ op: 'set_grade', id: 'c', grade: null }], 'human').ok, true);
  assert.equal(s.project.clips[0].grade, undefined);
  assert.equal(s.apply([{ op: 'set_grade', id: 'khong', grade: {} }], 'human').ok, false);
  s.apply([{ op: 'add_clip', clip: { ...mclip('tx', 'm1'), track: 'v1', start: 8, src: { type: 'gen', kind: 'bars', param: 0 } } }], 'human');
  assert.equal(s.apply([{ op: 'set_grade', id: 'tx', grade: { exposure: 1 } }], 'human').ok, false);
  assert.equal(validate(s.project).length, 0);
  assert.ok(validateGrade({ ...defaultGrade(), saturation: 5 }, 'g').length > 0);
});

t('mergeGrade: curves null go duong cong, giu cac kenh khac', () => {
  let g = mergeGrade(undefined, { curves: { master: [[0, 0], [1, 1]], r: [[0, 0], [0.5, 0.6], [1, 1]] } });
  g = mergeGrade(g, { curves: { r: null } });
  assert.equal(g.curves.r, undefined);
  assert.ok(g.curves.master);
  assert.equal(isIdentity(g), true); // master la duong cheo = identity
  assert.equal(isIdentity(mergeGrade(g, { curves: { r: [[0, 0], [0.5, 0.6], [1, 1]] } })), false);
});

console.log(`${n} test grade dat`);
