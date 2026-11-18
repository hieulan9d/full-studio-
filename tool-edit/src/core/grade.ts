// Chinh mau (primary + curves + LUT + secondary) gop thanh mot 3D LUT; khong gian mau dau vao; doc/ghi .cube. Thuan tuy, co test. Xem CHUC-NANG.md F-50..F-53, F-103..F-106.
import { srgbEotf, srgbOetf } from './color';
import { acesTonemap, gamutToRec709, INPUT_SPACES, INPUT_SPACE_IDS, toLinear709, type InputSpace, type ToneMap } from './colorspace';
export { slog3ToLinear, vlogToLinear } from './colorspace';

export type LogInput = InputSpace;
export const LOG_INPUTS: LogInput[] = INPUT_SPACE_IDS;
export const LOG_LABEL: Record<LogInput, string> = Object.fromEntries(INPUT_SPACE_IDS.map((k) => [k, INPUT_SPACES[k].label])) as Record<LogInput, string>;
export type { ToneMap };

export interface Wheel {
  r: number;
  g: number;
  b: number;
  m: number; // master
}
export type Pt = [number, number];
export interface Curves {
  master?: Pt[];
  r?: Pt[];
  g?: Pt[];
  b?: Pt[];
}
export interface GradeLut {
  path: string; // file .cube (3D)
  name: string;
  mix: number; // 0..1
}
/** Bo loc mau HSL (hieu chinh cap hai): chon mau theo sac do / bao hoa / do sang roi chi chinh vung duoc chon. */
export interface Qualifier {
  enabled: boolean;
  hue: { center: number; width: number; soft: number }; // do: tam 0..360, nua rong 0..180 (180 = moi sac do), do mem 0..90
  sat: { lo: number; hi: number; soft: number }; // 0..1
  lum: { lo: number; hi: number; soft: number }; // 0..1
  invert: boolean;
  adjust: { hue: number; sat: number; lum: number }; // xoay sac do (do), nhan bao hoa (1 = giu), cong do sang (-1..1)
  show: boolean; // xem mat na (trang = duoc chon)
}
/** Ba banh mau theo vung: bong toi, trung gian, vung sang (kieu Log wheels cua DaVinci). */
export interface LogWheels {
  shadows: Wheel;
  mids: Wheel;
  highlights: Wheel;
  shadowRange: number; // 0.05..0.6: ranh gioi vung toi (do sang ma hoa)
  highlightRange: number; // 0.4..0.95: ranh gioi vung sang
}
/** Cua so (power window): chi ap chinh mau ben trong (hoac ben ngoai) mot hinh, mep mem. Toa do theo ty le clip (0..1). */
export interface PowerWindow {
  enabled: boolean;
  shape: 'ellipse' | 'rect';
  cx: number;
  cy: number;
  w: number; // 0.02..2 (ty le ngang clip)
  h: number;
  rot: number; // do
  feather: number; // 0..1 (ty le nua kich thuoc nho nhat)
  invert: boolean;
}

export interface Grade {
  input: LogInput;
  exposure: number; // stop, -4..4
  temperature: number; // -100..100 (xanh <-> cam); gan dung, khong phai Kelvin
  tint: number; // -100..100 (luc <-> magenta)
  contrast: number; // -1..1 quanh pivot
  pivot: number; // 0..1 (ma hoa)
  saturation: number; // 0..2, 1 = giu nguyen
  vibrance: number; // -1..1: tang/giam bao hoa cua mau it bao hoa truoc
  black: number; // 0..0.9: diem den dau vao (levels)
  white: number; // 0.1..1: diem trang dau vao
  lift: Wheel;
  gamma: Wheel;
  gain: Wheel;
  offset: Wheel;
  curves: Curves;
  lut?: GradeLut;
  mix: number; // 0..1 muc ap dung ca grade
  tonemap?: ToneMap; // 'aces': tone-map ACES cho anh sang tuyen tinh (nen dung voi video log)
  logw?: LogWheels;
  qual?: Qualifier;
  win?: PowerWindow;
}

export const ZERO_WHEEL: Wheel = { r: 0, g: 0, b: 0, m: 0 };
export function defaultGrade(): Grade {
  return {
    input: 'none',
    exposure: 0,
    temperature: 0,
    tint: 0,
    contrast: 0,
    pivot: 0.45,
    saturation: 1,
    vibrance: 0,
    black: 0,
    white: 1,
    lift: { ...ZERO_WHEEL },
    gamma: { ...ZERO_WHEEL },
    gain: { ...ZERO_WHEEL },
    offset: { ...ZERO_WHEEL },
    curves: {},
    mix: 1,
  };
}

type PD<T> = { [K in keyof T]?: T[K] extends object ? PD<T[K]> : T[K] };
export type DeepPartialGrade = { [K in keyof Grade]?: K extends 'lift' | 'gamma' | 'gain' | 'offset' ? Partial<Wheel> : K extends 'lut' ? GradeLut | null : K extends 'curves' ? { [C in keyof Curves]?: Pt[] | null } : K extends 'logw' | 'qual' | 'win' ? PD<NonNullable<Grade[K]>> | null : Grade[K] };

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
export const defaultLogWheels = (): LogWheels => ({ shadows: { ...ZERO_WHEEL }, mids: { ...ZERO_WHEEL }, highlights: { ...ZERO_WHEEL }, shadowRange: 0.33, highlightRange: 0.66 });
export const defaultQualifier = (): Qualifier => ({ enabled: true, hue: { center: 0, width: 180, soft: 0 }, sat: { lo: 0, hi: 1, soft: 0 }, lum: { lo: 0, hi: 1, soft: 0 }, invert: false, adjust: { hue: 0, sat: 1, lum: 0 }, show: false });
export const defaultWindow = (): PowerWindow => ({ enabled: true, shape: 'ellipse', cx: 0.5, cy: 0.5, w: 0.5, h: 0.5, rot: 0, feather: 0.3, invert: false });
const defaults = { logw: defaultLogWheels, qual: defaultQualifier, win: defaultWindow };
function deepAssign<T extends object>(base: T, patch: object): T {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const b = (base as Record<string, unknown>)[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object') deepAssign(b as object, v);
    else (base as Record<string, unknown>)[k] = v;
  }
  return base;
}


/** Gop patch (tung phan) vao grade. patch.lut = null: go LUT. */
export function mergeGrade(base: Grade | undefined, patch: DeepPartialGrade): Grade {
  const g = base ? clone(base) : defaultGrade();
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === 'lift' || k === 'gamma' || k === 'gain' || k === 'offset') g[k] = { ...g[k], ...(v as Partial<Wheel>) };
    else if (k === 'curves') {
      for (const [c, pts] of Object.entries(v as Record<string, Pt[] | null>)) {
        if (pts === null) delete (g.curves as Record<string, Pt[]>)[c];
        else (g.curves as Record<string, Pt[]>)[c] = pts;
      }
    }
    else if (k === 'logw' || k === 'qual' || k === 'win') {
      if (v === null) delete (g as unknown as Record<string, unknown>)[k];
      else {
        const cur = (g as unknown as Record<string, unknown>)[k] ?? defaults[k as 'logw' | 'qual' | 'win']();
        (g as unknown as Record<string, unknown>)[k] = deepAssign(clone(cur), v as object);
      }
    } else if (k === 'lut') {
      if (v === null) delete g.lut;
      else g.lut = { ...(v as GradeLut), mix: (v as GradeLut).mix ?? 1 };
    } else (g as unknown as Record<string, unknown>)[k] = v;
  }
  return g;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const wheelIdentity = (w: Wheel) => near(w.r, 0) && near(w.g, 0) && near(w.b, 0) && near(w.m, 0);
const curveIdentity = (c?: Pt[]) => !c || c.length < 2 || c.every(([x, y]) => near(x, y));

const logwIdentity = (l?: LogWheels) => !l || (wheelIdentity(l.shadows) && wheelIdentity(l.mids) && wheelIdentity(l.highlights));
const qualIdentity = (q: Qualifier) => near(q.adjust.hue, 0) && near(q.adjust.sat, 1) && near(q.adjust.lum, 0) && !q.show;
/** Grade khong lam gi (khong can LUT). */
export function isIdentity(g: Grade | undefined): boolean {
  if (!g) return true;
  return (
    g.input === 'none' &&
    near(g.exposure, 0) && near(g.temperature, 0) && near(g.tint, 0) && near(g.contrast, 0) && near(g.saturation, 1) && near(g.vibrance ?? 0, 0) && near(g.black ?? 0, 0) && near(g.white ?? 1, 1) &&
    wheelIdentity(g.lift) && wheelIdentity(g.gamma) && wheelIdentity(g.gain) && wheelIdentity(g.offset) &&
    curveIdentity(g.curves.master) && curveIdentity(g.curves.r) && curveIdentity(g.curves.g) && curveIdentity(g.curves.b) &&
    (!g.tonemap || g.tonemap === 'none') && logwIdentity(g.logw) && (!g.qual || !g.qual.enabled || qualIdentity(g.qual)) &&
    (!g.lut || g.lut.mix <= 0) || g.mix <= 0
  );
}

export function validateGrade(g: Grade, where: string): string[] {
  const e: string[] = [];
  const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  const rng = (name: string, v: number, lo: number, hi: number) => {
    if (!fin(v) || v < lo || v > hi) e.push(`${where}.${name} phai trong ${lo}..${hi}`);
  };
  if (!LOG_INPUTS.includes(g.input)) e.push(`${where}.input phai la ${LOG_INPUTS.join('|')}`);
  rng('exposure', g.exposure, -6, 6);
  rng('temperature', g.temperature, -100, 100);
  rng('tint', g.tint, -100, 100);
  rng('contrast', g.contrast, -1, 1);
  rng('pivot', g.pivot, 0.05, 0.95);
  rng('saturation', g.saturation, 0, 3);
  rng('vibrance', g.vibrance ?? 0, -1, 1);
  rng('black', g.black ?? 0, 0, 0.9);
  rng('white', g.white ?? 1, 0.1, 1);
  if ((g.white ?? 1) - (g.black ?? 0) < 0.05) e.push(`${where}: white - black phai >= 0.05`);
  rng('mix', g.mix, 0, 1);
  for (const w of ['lift', 'gamma', 'gain', 'offset'] as const) {
    const wh = g[w];
    if (!wh) {
      e.push(`${where}.${w} thieu`);
      continue;
    }
    for (const c of ['r', 'g', 'b', 'm'] as const) rng(`${w}.${c}`, wh[c], w === 'offset' ? -0.5 : -1, w === 'offset' ? 0.5 : w === 'gain' || w === 'gamma' ? 2 : 1);
  }
  for (const [name, pts] of Object.entries(g.curves ?? {})) {
    if (!['master', 'r', 'g', 'b'].includes(name)) {
      e.push(`${where}.curves.${name} khong hop le (master|r|g|b)`);
      continue;
    }
    const p = pts as Pt[];
    if (!Array.isArray(p) || p.length < 2 || p.length > 16) e.push(`${where}.curves.${name}: 2..16 diem`);
    else {
      for (let i = 0; i < p.length; i++) {
        if (!Array.isArray(p[i]) || !fin(p[i][0]) || !fin(p[i][1]) || p[i][0] < 0 || p[i][0] > 1 || p[i][1] < -0.2 || p[i][1] > 1.2) e.push(`${where}.curves.${name}[${i}]: x trong 0..1, y trong -0.2..1.2`);
        if (i > 0 && !(p[i][0] > p[i - 1][0])) e.push(`${where}.curves.${name}: x phai tang dan`);
      }
    }
  }
  if (g.tonemap !== undefined && !['none', 'aces'].includes(g.tonemap)) e.push(`${where}.tonemap phai la none|aces`);
  if (g.logw) {
    for (const k of ['shadows', 'mids', 'highlights'] as const) for (const c of ['r', 'g', 'b', 'm'] as const) rng(`logw.${k}.${c}`, g.logw[k]?.[c] ?? 0, -1, 1);
    rng('logw.shadowRange', g.logw.shadowRange, 0.05, 0.6);
    rng('logw.highlightRange', g.logw.highlightRange, 0.4, 0.95);
  }
  if (g.qual) {
    const q = g.qual;
    rng('qual.hue.center', q.hue.center, 0, 360);
    rng('qual.hue.width', q.hue.width, 0, 180);
    rng('qual.hue.soft', q.hue.soft, 0, 90);
    for (const k of ['sat', 'lum'] as const) {
      rng(`qual.${k}.lo`, q[k].lo, 0, 1);
      rng(`qual.${k}.hi`, q[k].hi, 0, 1);
      rng(`qual.${k}.soft`, q[k].soft, 0, 1);
      if (q[k].lo > q[k].hi) e.push(`${where}.qual.${k}: lo phai <= hi`);
    }
    rng('qual.adjust.hue', q.adjust.hue, -180, 180);
    rng('qual.adjust.sat', q.adjust.sat, 0, 3);
    rng('qual.adjust.lum', q.adjust.lum, -1, 1);
  }
  if (g.win) {
    const w = g.win;
    if (!['ellipse', 'rect'].includes(w.shape)) e.push(`${where}.win.shape phai la ellipse|rect`);
    rng('win.cx', w.cx, -1, 2);
    rng('win.cy', w.cy, -1, 2);
    rng('win.w', w.w, 0.02, 2);
    rng('win.h', w.h, 0.02, 2);
    rng('win.rot', w.rot, -360, 360);
    rng('win.feather', w.feather, 0, 1);
  }
  if (g.lut) {
    if (typeof g.lut.path !== 'string' || !/\.cube$/i.test(g.lut.path)) e.push(`${where}.lut.path phai la file .cube`);
    rng('lut.mix', g.lut.mix, 0, 1);
  }
  return e;
}

/** Duong cong cua khong gian dau vao cho MOT kenh (dung kiem thu). */
export const logToLinear = (kind: LogInput, x: number) => (INPUT_SPACES[kind]?.curve ?? srgbEotf)(x);

// ---------- duong cong (monotone cubic) ----------
/** Noi suy monotone (Fritsch-Carlson) qua cac diem; ngoai doan: giu gia tri bien. */
export function evalCurve(pts: Pt[] | undefined, x: number): number {
  if (!pts || pts.length < 2) return x;
  const n = pts.length;
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= pts[n - 1][0]) return pts[n - 1][1];
  const dx: number[] = [],
    m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / m[i],
        b = t[i + 1] / m[i],
        s = a * a + b * b;
      if (s > 9) {
        const k = 3 / Math.sqrt(s);
        t[i] = k * a * m[i];
        t[i + 1] = k * b * m[i];
      }
    }
  }
  let i = 0;
  while (i < n - 2 && x > pts[i + 1][0]) i++;
  const h = dx[i],
    u = (x - pts[i][0]) / h;
  const h00 = (1 + 2 * u) * (1 - u) * (1 - u),
    h10 = u * (1 - u) * (1 - u),
    h01 = u * u * (3 - 2 * u),
    h11 = u * u * (u - 1);
  return h00 * pts[i][1] + h10 * h * t[i] + h01 * pts[i + 1][1] + h11 * h * t[i + 1];
}

// ---------- LUT .cube ----------
export interface CubeLut {
  size: number;
  data: Float32Array; // size^3 * 3, do (r nhanh nhat), mien 0..1
  title?: string;
}

export function parseCube(text: string): CubeLut {
  let size = 0,
    title: string | undefined;
  let dmin = [0, 0, 0],
    dmax = [1, 1, 1];
  const vals: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const up = line.split(/\s+/);
    const key = up[0].toUpperCase();
    if (key === 'TITLE') title = line.replace(/^TITLE\s*/i, '').replace(/"/g, '');
    else if (key === 'LUT_3D_SIZE') size = Number(up[1]);
    else if (key === 'LUT_1D_SIZE') throw new Error('LUT 1D chưa hỗ trợ (chỉ LUT 3D)');
    else if (key === 'DOMAIN_MIN') dmin = up.slice(1, 4).map(Number);
    else if (key === 'DOMAIN_MAX') dmax = up.slice(1, 4).map(Number);
    else if (/^[-+0-9.]/.test(line)) {
      const v = up.map(Number);
      if (v.length < 3 || v.some((x) => !Number.isFinite(x))) throw new Error(`dong LUT khong doc duoc: "${line.slice(0, 40)}"`);
      vals.push(v[0], v[1], v[2]);
    }
  }
  if (!(size >= 2 && size <= 129)) throw new Error('thiếu hoặc sai LUT_3D_SIZE (2..129)');
  if (vals.length !== size * size * size * 3) throw new Error(`LUT ${size}^3 can ${size ** 3} dong, co ${vals.length / 3}`);
  const data = new Float32Array(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const c = i % 3;
    data[i] = (vals[i] - dmin[c]) / Math.max(1e-9, dmax[c] - dmin[c]); // dua ve 0..1
  }
  return { size, data, title };
}

/** Lay mau 3D LUT noi suy tam tuyen (r nhanh nhat). */
export function sampleCube(l: CubeLut, r: number, g: number, b: number, out: number[]) {
  const N = l.size,
    s = N - 1;
  const fx = Math.min(1, Math.max(0, r)) * s,
    fy = Math.min(1, Math.max(0, g)) * s,
    fz = Math.min(1, Math.max(0, b)) * s;
  const x0 = Math.min(N - 2, Math.floor(fx)),
    y0 = Math.min(N - 2, Math.floor(fy)),
    z0 = Math.min(N - 2, Math.floor(fz));
  const tx = fx - x0,
    ty = fy - y0,
    tz = fz - z0;
  const at = (x: number, y: number, z: number, c: number) => l.data[((z * N + y) * N + x) * 3 + c];
  for (let c = 0; c < 3; c++) {
    const c00 = at(x0, y0, z0, c) * (1 - tx) + at(x0 + 1, y0, z0, c) * tx;
    const c10 = at(x0, y0 + 1, z0, c) * (1 - tx) + at(x0 + 1, y0 + 1, z0, c) * tx;
    const c01 = at(x0, y0, z0 + 1, c) * (1 - tx) + at(x0 + 1, y0, z0 + 1, c) * tx;
    const c11 = at(x0, y0 + 1, z0 + 1, c) * (1 - tx) + at(x0 + 1, y0 + 1, z0 + 1, c) * tx;
    out[c] = (c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz;
  }
}

export function writeCube(size: number, f: (r: number, g: number, b: number) => [number, number, number], title = 'Tool Edit'): string {
  const lines = [`TITLE "${title}"`, `LUT_3D_SIZE ${size}`, 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1'];
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const o = f(x / (size - 1), y / (size - 1), z / (size - 1));
        lines.push(`${o[0].toFixed(6)} ${o[1].toFixed(6)} ${o[2].toFixed(6)}`);
      }
  return lines.join('\n') + '\n';
}


const smooth = (a: number, b: number, x: number) => {
  if (b <= a) return x >= b ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-9) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
}
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s < 1e-9) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
/** Mat na qualifier 0..1 cho mot mau ma hoa (r,g,b). Hue: nua rong + do mem, khong chon mau trung tinh khi bo loc hue hep. */
export function qualifierMask(q: Qualifier, r: number, g: number, b: number): number {
  const [h, s, l] = rgbToHsl(Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b)));
  let mh = 1;
  if (q.hue.width < 180) {
    let d = Math.abs(h * 360 - q.hue.center) % 360;
    if (d > 180) d = 360 - d;
    mh = d <= q.hue.width ? 1 : q.hue.soft > 0 ? 1 - smooth(q.hue.width, q.hue.width + q.hue.soft, d) : 0;
    mh *= Math.min(1, s / 0.08); // mau gan trung tinh khong co sac do ro rang
  }
  const rangeM = (v: number, lo: number, hi: number, soft: number) => (soft > 0 ? smooth(lo - soft, lo, v) * (1 - smooth(hi, hi + soft, v)) : v >= lo && v <= hi ? 1 : 0);
  let m = mh * rangeM(s, q.sat.lo, q.sat.hi, q.sat.soft) * rangeM(l, q.lum.lo, q.lum.hi, q.lum.soft);
  if (q.invert) m = 1 - m;
  return m;
}

// ---------- tinh mau cua mot diem ----------
const luma709 = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Tham so BUOC A (chay GPU bang giai tich, KHONG qua LUT): giai ma log + doi gam mau + phoi sang + nhiet do/tint + tone-map + ma hoa sRGB. */
export interface StageA {
  on: boolean; // false: khong lam gi (video thuong, khong phoi sang/nhiet do/tone-map)
  curve: number; // ma duong cong (INPUT_SPACES[..].curveId)
  m: number[]; // ma tran 3x3 gam mau -> Rec.709 (hang truoc)
  mul: [number, number, number]; // he so nhan tuyen tinh theo kenh (phoi sang * can bang trang)
  tonemap: number; // 0 khong, 1 ACES
  gamut: boolean; // co doi gam mau (kem nen gam ngoai Rec.709)
}
export function stageAParams(g: Grade): StageA {
  const def = INPUT_SPACES[g.input] ?? INPUT_SPACES.none;
  const ex = Math.pow(2, g.exposure);
  const tK = g.temperature / 100,
    tn = g.tint / 100;
  const mul: [number, number, number] = [ex * Math.pow(2, 0.4 * tK) * Math.pow(2, 0.15 * tn), ex * Math.pow(2, -0.3 * tn), ex * Math.pow(2, -0.4 * tK) * Math.pow(2, 0.15 * tn)];
  const m = def.gamut ? gamutToRec709(def.gamut) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const on = g.input !== 'none' || !near(g.exposure, 0) || !near(g.temperature, 0) || !near(g.tint, 0) || g.tonemap === 'aces';
  return { on, curve: def.curveId, m: Array.from(m), mul, tonemap: g.tonemap === 'aces' ? 1 : 0, gamut: !!def.gamut };
}

/** BUOC A tren mot diem (r,g,b = ma hoa video 0..1) -> mau ma hoa sRGB (>= 0, co the > 1). */
export function stageA(g: Grade, r: number, gg: number, b: number, out: number[] = [0, 0, 0]): number[] {
  const p = stageAParams(g);
  if (!p.on) {
    out[0] = r; out[1] = gg; out[2] = b;
    return out;
  }
  const lin = toLinear709(g.input, r, gg, b, [0, 0, 0]);
  let lr = lin[0] * p.mul[0], lg = lin[1] * p.mul[1], lb = lin[2] * p.mul[2];
  if (p.tonemap) {
    const t = acesTonemap(lr, lg, lb);
    lr = t[0]; lg = t[1]; lb = t[2];
  }
  out[0] = srgbOetf(Math.max(0, lr));
  out[1] = srgbOetf(Math.max(0, lg));
  out[2] = srgbOetf(Math.max(0, lb));
  return out;
}

/** Buoc B (nuong thanh LUT 3D) khong lam gi? */
export function stageBIdentity(g: Grade): boolean {
  return (
    near(g.black ?? 0, 0) && near(g.white ?? 1, 1) && near(g.contrast, 0) && near(g.saturation, 1) && near(g.vibrance ?? 0, 0) &&
    wheelIdentity(g.lift) && wheelIdentity(g.gamma) && wheelIdentity(g.gain) && wheelIdentity(g.offset) &&
    curveIdentity(g.curves.master) && curveIdentity(g.curves.r) && curveIdentity(g.curves.g) && curveIdentity(g.curves.b) &&
    logwIdentity(g.logw) && (!g.qual || !g.qual.enabled || qualIdentity(g.qual)) && (!g.lut || g.lut.mix <= 0)
  );
}

/** BUOC B: tu mau ma hoa sRGB 0..1 (sau buoc A) den ket qua cuoi (levels, tuong phan, cong cong, banh mau, log wheels, bao hoa, qualifier, LUT). */
export function stageB(g: Grade, lut: CubeLut | null, cin: number[], out: number[] = [0, 0, 0]): number[] {
  const tmp = [0, 0, 0];
  let c: number[] = [cin[0], cin[1], cin[2]];
  const qmask = g.qual && g.qual.enabled ? qualifierMask(g.qual, c[0], c[1], c[2]) : -1; // mat na tinh tren anh sau buoc A (truoc cac chinh sua)
  if (qmask >= 0 && g.qual!.show) {
    out[0] = out[1] = out[2] = qmask;
    return out;
  }
  // levels
  const bk = g.black ?? 0,
    wh = g.white ?? 1;
  if (bk > 0 || wh < 1) c = c.map((v) => (v - bk) / (wh - bk));
  // tuong phan quanh pivot
  if (Math.abs(g.contrast) > 1e-9) c = c.map((v) => g.pivot + (v - g.pivot) * (1 + g.contrast));
  // duong cong
  const k = g.curves;
  if (k.master || k.r || k.g || k.b) {
    c = c.map((v, i) => {
      const x = Math.min(1, Math.max(0, v));
      const m = k.master ? evalCurve(k.master, x) : x;
      const ch = [k.r, k.g, k.b][i];
      return ch ? evalCurve(ch, Math.min(1, Math.max(0, m))) : m;
    });
  }
  // lift / gamma / gain / offset
  const W = (w: Wheel, i: number) => w.m + [w.r, w.g, w.b][i];
  c = c.map((v, i) => {
    let x = Math.max(0, v);
    const lift = W(g.lift, i),
      gain = 1 + W(g.gain, i),
      pw = Math.pow(2, -W(g.gamma, i)),
      off = W(g.offset, i);
    x = gain * (x + lift * (1 - x));
    x = Math.pow(Math.max(0, x), pw);
    return x + off;
  });
  // log wheels: ba vung theo do sang
  if (g.logw && !logwIdentity(g.logw)) {
    const lw = g.logw;
    c = c.map((v, i) => {
      const y = Math.min(1, Math.max(0, v));
      const sh = 1 - smooth(0, lw.shadowRange, y);
      const hi = smooth(lw.highlightRange, 1, y);
      const mi = Math.max(0, 1 - sh - hi);
      const W2 = (w: Wheel) => w.m + [w.r, w.g, w.b][i];
      return (v + W2(lw.shadows) * 0.5 * sh) * (1 + W2(lw.highlights) * hi) * Math.pow(2, -W2(lw.mids) * mi);
    });
  }
  // bao hoa
  if (Math.abs(g.saturation - 1) > 1e-9) {
    const y = luma709(c[0], c[1], c[2]);
    c = c.map((v) => y + (v - y) * g.saturation);
  }
  // vibrance: tang bao hoa cho mau it bao hoa hon
  if (Math.abs(g.vibrance ?? 0) > 1e-9) {
    const y = luma709(c[0], c[1], c[2]);
    const sat = Math.max(...c) - Math.min(...c);
    const k2 = 1 + g.vibrance * (1 - Math.min(1, Math.max(0, sat)));
    c = c.map((v) => y + (v - y) * k2);
  }
  // hieu chinh theo mat na qualifier
  if (qmask >= 0) {
    const a = g.qual!.adjust;
    if (Math.abs(a.hue) > 1e-9 || Math.abs(a.sat - 1) > 1e-9 || Math.abs(a.lum) > 1e-9) {
      const h = rgbToHsl(c[0], c[1], c[2]);
      const adj = hslToRgb((h[0] + a.hue / 360 + 1) % 1, Math.min(1, Math.max(0, h[1] * a.sat)), Math.min(1.5, Math.max(0, h[2] + a.lum)));
      c = c.map((v, i) => v + (adj[i] - v) * qmask);
    }
  }
  // LUT .cube
  if (lut && g.lut && g.lut.mix > 0) {
    sampleCube(lut, c[0], c[1], c[2], tmp);
    const m = g.lut.mix;
    c = c.map((v, i) => v + (tmp[i] - v) * m);
  }
  out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
  return out;
}

/** Ap grade len mot diem (r,g,b = gia tri MA HOA cua video 0..1). Tra ve mau ma hoa sRGB (co the ngoai 0..1). = BUOC A, roi BUOC B tren phan 0..1, phan vuot 1 cong lai nguyen. */
export function gradePixel(g: Grade, lut: CubeLut | null, r: number, gg: number, b: number, out: number[] = [0, 0, 0]): number[] {
  const a = stageA(g, r, gg, b, [0, 0, 0]);
  const cin = [clamp01(a[0]), clamp01(a[1]), clamp01(a[2])];
  const cb = stageB(g, lut, cin, [0, 0, 0]);
  const showMask = !!(g.qual && g.qual.enabled && g.qual.show);
  const base = [r, gg, b];
  for (let i = 0; i < 3; i++) {
    const fin = showMask ? cb[i] : cb[i] + (a[i] - cin[i]);
    out[i] = base[i] + (fin - base[i]) * g.mix;
  }
  return out;
}

/** Do min LUT cua BUOC B: 2 khi buoc B khong lam gi (LUT don vi), 65 khi co qualifier (mat na co canh gat), con lai 33. */
export function bakeSizeFor(g: Grade): number {
  if (stageBIdentity(g)) return 2;
  return g.qual && g.qual.enabled ? 65 : 33;
}
/** Nuong BUOC B thanh 3D LUT (size^3 diem, r nhanh nhat) dang float32 RGBA (a = 1). Dau vao la mau da qua buoc A (ma hoa sRGB 0..1). */
export function bakeLut(g: Grade, lut: CubeLut | null, size = 33): Float32Array {
  const out = new Float32Array(size * size * size * 4);
  const px = [0, 0, 0];
  const cin = [0, 0, 0];
  let i = 0;
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        cin[0] = x / (size - 1);
        cin[1] = y / (size - 1);
        cin[2] = z / (size - 1);
        stageB(g, lut, cin, px);
        out[i++] = px[0];
        out[i++] = px[1];
        out[i++] = px[2];
        out[i++] = 1;
      }
  return out;
}

/** float32 -> float16 (bit) de nap texture rgba16float. */
export function toF16(src: Float32Array): Uint16Array {
  const f = new Float32Array(1);
  const u = new Uint32Array(f.buffer);
  const out = new Uint16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    f[0] = src[i];
    const x = u[0];
    const sign = (x >>> 16) & 0x8000;
    let e = ((x >>> 23) & 0xff) - 127 + 15;
    let m = x & 0x7fffff;
    if (e >= 31) out[i] = sign | 0x7c00;
    else if (e <= 0) {
      if (e < -10) out[i] = sign;
      else {
        m = (m | 0x800000) >> (1 - e);
        out[i] = sign + ((m + 0x1000) >> 13);
      }
    } else out[i] = sign + (e << 10) + ((m + 0x1000) >> 13);
  }
  return out;
}

/** Khoa dung de nho LUT da nuong. */
// Khoa LUT chi gom nhung gi vao BUOC B; khong gian dau vao, phoi sang, nhiet do/tint, tone-map, muc ap dung chung va cua so la uniform shader (keo la doi ngay, khong nuong lai).
export const gradeKey = (g: Grade): string => JSON.stringify({ ...g, input: 'none', exposure: 0, temperature: 0, tint: 0, tonemap: undefined, mix: 1, win: undefined });

/** Mat na cua so tai diem (u,v) cua clip (0..1), kich thuoc clip (px) sx, sy. Cung cong thuc voi shader. */
export function windowMask(w: PowerWindow, u: number, v: number, sx: number, sy: number): number {
  if (!w.enabled) return 1;
  const px = (u - w.cx) * sx, py = (v - w.cy) * sy;
  const r = (w.rot * Math.PI) / 180, cr = Math.cos(r), sr = Math.sin(r);
  const qx = (px * cr + py * sr) / (0.5 * w.w * sx), qy = (-px * sr + py * cr) / (0.5 * w.h * sy);
  const d = w.shape === 'rect' ? Math.max(Math.abs(qx), Math.abs(qy)) : Math.hypot(qx, qy);
  const m = 1 - smooth(1 - Math.max(w.feather, 0.002), 1, d);
  return w.invert ? 1 - m : m;
}
