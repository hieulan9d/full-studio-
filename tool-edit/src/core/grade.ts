// Chinh mau (primary + curves + LUT) gop thanh mot 3D LUT; log input; doc/ghi .cube. Thuan tuy, co test. Xem CHUC-NANG.md F-50..F-53.
import { srgbEotf, srgbOetf } from './color';

export type LogInput = 'none' | 'slog3' | 'vlog';
export const LOG_INPUTS: LogInput[] = ['none', 'slog3', 'vlog'];
export const LOG_LABEL: Record<LogInput, string> = { none: 'Khong (Rec.709 / sRGB)', slog3: 'Sony S-Log3 (chỉ đường cong)', vlog: 'Panasonic V-Log (chỉ đường cong)' };

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

export type DeepPartialGrade = { [K in keyof Grade]?: K extends 'lift' | 'gamma' | 'gain' | 'offset' ? Partial<Wheel> : K extends 'lut' ? GradeLut | null : K extends 'curves' ? { [C in keyof Curves]?: Pt[] | null } : Grade[K] };

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

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
    else if (k === 'lut') {
      if (v === null) delete g.lut;
      else g.lut = { ...(v as GradeLut), mix: (v as GradeLut).mix ?? 1 };
    } else (g as unknown as Record<string, unknown>)[k] = v;
  }
  return g;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const wheelIdentity = (w: Wheel) => near(w.r, 0) && near(w.g, 0) && near(w.b, 0) && near(w.m, 0);
const curveIdentity = (c?: Pt[]) => !c || c.length < 2 || c.every(([x, y]) => near(x, y));

/** Grade khong lam gi (khong can LUT). */
export function isIdentity(g: Grade | undefined): boolean {
  if (!g) return true;
  return (
    g.input === 'none' &&
    near(g.exposure, 0) && near(g.temperature, 0) && near(g.tint, 0) && near(g.contrast, 0) && near(g.saturation, 1) && near(g.vibrance ?? 0, 0) && near(g.black ?? 0, 0) && near(g.white ?? 1, 1) &&
    wheelIdentity(g.lift) && wheelIdentity(g.gamma) && wheelIdentity(g.gain) && wheelIdentity(g.offset) &&
    curveIdentity(g.curves.master) && curveIdentity(g.curves.r) && curveIdentity(g.curves.g) && curveIdentity(g.curves.b) &&
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
  if (g.lut) {
    if (typeof g.lut.path !== 'string' || !/\.cube$/i.test(g.lut.path)) e.push(`${where}.lut.path phai la file .cube`);
    rng('lut.mix', g.lut.mix, 0, 1);
  }
  return e;
}

// ---------- duong cong log -> anh sang tuyen tinh (diem xam 18% = 0.18) ----------
export function slog3ToLinear(x: number): number {
  const c = 171.2102946929 / 1023;
  return x >= c ? Math.pow(10, (x * 1023 - 420) / 261.5) * (0.18 + 0.01) - 0.01 : ((x * 1023 - 95) * 0.01125) / (171.2102946929 - 95);
}
export function vlogToLinear(x: number): number {
  return x < 0.181 ? (x - 0.125) / 5.6 : Math.pow(10, (x - 0.598206) / 0.241514) - 0.00873;
}
export const logToLinear = (kind: LogInput, x: number) => (kind === 'slog3' ? slog3ToLinear(x) : kind === 'vlog' ? vlogToLinear(x) : srgbEotf(x));

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

// ---------- tinh mau cua mot diem ----------
const luma709 = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Ap grade len mot diem (r,g,b = gia tri MA HOA cua video 0..1). Tra ve mau ma hoa sRGB (co the ngoai 0..1). */
export function gradePixel(g: Grade, lut: CubeLut | null, r: number, gg: number, b: number, out: number[] = [0, 0, 0]): number[] {
  const tmp = [0, 0, 0];
  // 1) ve anh sang tuyen tinh (log input hoac sRGB)
  let lr = logToLinear(g.input, r),
    lg = logToLinear(g.input, gg),
    lb = logToLinear(g.input, b);
  // 2) phoi sang + nhiet do/tint (tuyen tinh)
  const ex = Math.pow(2, g.exposure);
  const tK = g.temperature / 100,
    tn = g.tint / 100;
  lr *= ex * Math.pow(2, 0.4 * tK) * Math.pow(2, 0.15 * tn);
  lg *= ex * Math.pow(2, -0.3 * tn);
  lb *= ex * Math.pow(2, -0.4 * tK) * Math.pow(2, 0.15 * tn);
  // 3) sang ma hoa sRGB
  let c: number[] = [srgbOetf(Math.max(0, lr)), srgbOetf(Math.max(0, lg)), srgbOetf(Math.max(0, lb))];
  // 3b) muc den/trang dau vao (levels)
  const bk = g.black ?? 0,
    wh = g.white ?? 1;
  if (bk > 0 || wh < 1) c = c.map((v) => (v - bk) / (wh - bk));
  // 4) tuong phan quanh pivot
  if (Math.abs(g.contrast) > 1e-9) c = c.map((v) => g.pivot + (v - g.pivot) * (1 + g.contrast));
  // 5) duong cong
  const k = g.curves;
  if (k.master || k.r || k.g || k.b) {
    c = c.map((v, i) => {
      const x = Math.min(1, Math.max(0, v));
      const m = k.master ? evalCurve(k.master, x) : x;
      const ch = [k.r, k.g, k.b][i];
      return ch ? evalCurve(ch, Math.min(1, Math.max(0, m))) : m;
    });
  }
  // 6) lift / gamma / gain / offset
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
  // 7) bao hoa
  if (Math.abs(g.saturation - 1) > 1e-9) {
    const y = luma709(c[0], c[1], c[2]);
    c = c.map((v) => y + (v - y) * g.saturation);
  }
  // 7b) vibrance: tang bao hoa cho mau it bao hoa hon
  if (Math.abs(g.vibrance ?? 0) > 1e-9) {
    const y = luma709(c[0], c[1], c[2]);
    const sat = Math.max(...c) - Math.min(...c);
    const k = 1 + g.vibrance * (1 - Math.min(1, Math.max(0, sat)));
    c = c.map((v) => y + (v - y) * k);
  }
  // 8) LUT
  if (lut && g.lut && g.lut.mix > 0) {
    sampleCube(lut, c[0], c[1], c[2], tmp);
    const m = g.lut.mix;
    c = c.map((v, i) => v + (tmp[i] - v) * m);
  }
  // 9) muc ap dung chung
  const base = [r, gg, b];
  for (let i = 0; i < 3; i++) out[i] = base[i] + (c[i] - base[i]) * g.mix;
  return out;
}

/** Nuong grade thanh 3D LUT (size^3 diem, r nhanh nhat) dang float32 RGBA (a = 1). */
export function bakeLut(g: Grade, lut: CubeLut | null, size = 33): Float32Array {
  const out = new Float32Array(size * size * size * 4);
  const px = [0, 0, 0];
  let i = 0;
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        gradePixel(g, lut, x / (size - 1), y / (size - 1), z / (size - 1), px);
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
export const gradeKey = (g: Grade): string => JSON.stringify(g);
