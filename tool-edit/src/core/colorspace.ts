// Quan ly mau: duong cong log -> anh sang tuyen tinh, gam mau (primaries) -> Rec.709, tone-map ACES. Thuan tuy, co test. Xem CHUC-NANG.md F-103.
// Gam mau duoc tinh tu toa do sac (xy) cua 3 mau goc + diem trang, KHONG chep ma tran tu tri nho: ma tran chuyen = inv(M_709) * M_nguon,
// co thich ung mau Bradford khi diem trang khac D65 (ACES D60). Duong cong log kiem bang diem xam 18 % cua tai lieu hang.
import { srgbEotf } from './color';

type V3 = [number, number, number];
type M3 = [number, number, number, number, number, number, number, number, number]; // hang truoc

export interface Primaries {
  r: [number, number];
  g: [number, number];
  b: [number, number];
  w: [number, number];
}
const D65: [number, number] = [0.3127, 0.329];
const D60: [number, number] = [0.32168, 0.33767];

export const GAMUTS: Record<string, Primaries> = {
  rec709: { r: [0.64, 0.33], g: [0.3, 0.6], b: [0.15, 0.06], w: D65 },
  rec2020: { r: [0.708, 0.292], g: [0.17, 0.797], b: [0.131, 0.046], w: D65 },
  sgamut3: { r: [0.73, 0.28], g: [0.14, 0.855], b: [0.1, -0.05], w: D65 },
  sgamut3cine: { r: [0.766, 0.275], g: [0.225, 0.8], b: [0.089, -0.087], w: D65 },
  vgamut: { r: [0.73, 0.28], g: [0.165, 0.84], b: [0.1, -0.03], w: D65 },
  awg3: { r: [0.684, 0.313], g: [0.221, 0.848], b: [0.0861, -0.102], w: D65 },
  dwg: { r: [0.8, 0.313], g: [0.1682, 0.9877], b: [0.079, -0.1155], w: D65 },
  rwg: { r: [0.780308, 0.304253], g: [0.121595, 1.493994], b: [0.095612, -0.084589], w: D65 },
  ap1: { r: [0.713, 0.293], g: [0.165, 0.83], b: [0.128, 0.044], w: D60 },
};

const mul3 = (a: M3, b: M3): M3 => {
  const o = new Array(9).fill(0) as M3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
};
const inv3 = (m: M3): M3 => {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
};
const mulV = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const xyz = ([x, y]: [number, number]): V3 => [x / y, 1, (1 - x - y) / y];

/** Ma tran RGB tuyen tinh -> XYZ cua mot gam mau (theo diem trang cua no). */
export function rgbToXyz(p: Primaries): M3 {
  const R = xyz(p.r), G = xyz(p.g), B = xyz(p.b), W = xyz(p.w);
  const P: M3 = [R[0], G[0], B[0], R[1], G[1], B[1], R[2], G[2], B[2]];
  const S = mulV(inv3(P), W);
  return [R[0] * S[0], G[0] * S[1], B[0] * S[2], R[1] * S[0], G[1] * S[1], B[1] * S[2], R[2] * S[0], G[2] * S[1], B[2] * S[2]];
}

const BRADFORD: M3 = [0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296];
/** Thich ung mau Bradford (XYZ, trang nguon -> trang dich). */
export function bradford(from: [number, number], to: [number, number]): M3 {
  const s = mulV(BRADFORD, xyz(from)), d = mulV(BRADFORD, xyz(to));
  const D: M3 = [d[0] / s[0], 0, 0, 0, d[1] / s[1], 0, 0, 0, d[2] / s[2]];
  return mul3(inv3(BRADFORD), mul3(D, BRADFORD));
}

const cache = new Map<string, M3>();
/** Ma tran doi RGB tuyen tinh cua gam `from` sang Rec.709 (D65). */
export function gamutToRec709(from: string): M3 {
  let m = cache.get(from);
  if (m) return m;
  const src = GAMUTS[from];
  if (!src) throw new Error(`gam mau khong biet: ${from}`);
  let toXyz = rgbToXyz(src);
  if (src.w[0] !== D65[0] || src.w[1] !== D65[1]) toXyz = mul3(bradford(src.w, D65), toXyz);
  m = mul3(inv3(rgbToXyz(GAMUTS.rec709)), toXyz);
  cache.set(from, m);
  return m;
}

/** Ma tran nguoc: RGB tuyen tinh Rec.709 -> RGB tuyen tinh cua gam `to` (dung kiem thu quay vong). */
export function rec709ToGamut(to: string): M3 {
  return inv3(gamutToRec709(to));
}

// ---------- duong cong log -> tuyen tinh (khong gioi han duoi) ----------
export const slog3ToLinear = (x: number) => {
  const c = 171.2102946929 / 1023;
  return x >= c ? Math.pow(10, (x * 1023 - 420) / 261.5) * (0.18 + 0.01) - 0.01 : ((x * 1023 - 95) * 0.01125) / (171.2102946929 - 95);
};
export const vlogToLinear = (x: number) => (x < 0.181 ? (x - 0.125) / 5.6 : Math.pow(10, (x - 0.598206) / 0.241514) - 0.00873);
/** ARRI LogC3 (EI 800). */
export const logc3ToLinear = (t: number) => {
  const a = 5.555556, b = 0.052272, c = 0.24719, d = 0.385537, e = 5.367655, f = 0.092809, cut = 0.010591;
  return t > e * cut + f ? (Math.pow(10, (t - d) / c) - b) / a : (t - f) / e;
};
/** DaVinci Intermediate. */
export const davinciToLinear = (x: number) => {
  const A = 0.0075, B = 7.0, C = 0.07329248, M = 10.44426855, LOG_CUT = 0.02740668;
  return x > LOG_CUT ? Math.pow(2, x / C - B) - A : x / M;
};
/** ACEScct. */
export const acescctToLinear = (t: number) => (t <= 0.155251141552511 ? (t - 0.0729055341958355) / 10.5402377416545 : Math.pow(2, t * 17.52 - 9.72));
/** RED Log3G10. */
export const log3g10ToLinear = (x: number) => (x >= 0 ? (Math.pow(10, x / 0.224282) - 1) / 155.975327 - 0.01 : x / 15.1927 - 0.01);
/** Apple Log. */
export const applelogToLinear = (x: number) => {
  const R0 = -0.05641088, c = 47.28711236, beta = 0.00964052, gamma = 0.08550479, delta = 0.69336945;
  const Pt = c * Math.pow(0.01 - R0, 2);
  return x >= Pt ? Math.pow(2, (x - delta) / gamma) - beta : Math.sqrt(Math.max(0, x) / c) + R0;
};

export type InputSpace = 'none' | 'slog3' | 'vlog' | 'slog3_sgamut3cine' | 'slog3_sgamut3' | 'vlog_vgamut' | 'logc3_awg3' | 'applelog' | 'davinci_dwg' | 'acescct' | 'log3g10_rwg';
interface SpaceDef {
  label: string;
  curveId: number; // ma duong cong cho shader (0 sRGB, 1 S-Log3, 2 V-Log, 3 LogC3, 4 DaVinci, 5 ACEScct, 6 Log3G10, 7 Apple Log)
  curve: ((x: number) => number) | null; // null = sRGB EOTF
  gamut: string | null; // null = Rec.709 (khong doi)
  checked: string; // muc do doi chieu voi tai lieu hang
}
export const INPUT_SPACES: Record<InputSpace, SpaceDef> = {
  none: { curveId: 0, label: 'Rec.709 / sRGB (video thường)', curve: null, gamut: null, checked: 'chuẩn' },
  slog3: { curveId: 1, label: 'Sony S-Log3 (chỉ đường cong, giữ cho dự án cũ)', curve: slog3ToLinear, gamut: null, checked: 'đường cong: xám 18 % đạt' },
  vlog: { curveId: 2, label: 'Panasonic V-Log (chỉ đường cong, giữ cho dự án cũ)', curve: vlogToLinear, gamut: null, checked: 'đường cong: xám 18 % đạt' },
  slog3_sgamut3cine: { curveId: 1, label: 'Sony S-Log3 / S-Gamut3.Cine', curve: slog3ToLinear, gamut: 'sgamut3cine', checked: 'gam màu tính từ tọa độ xy, chưa đối chiếu ma trận hãng' },
  slog3_sgamut3: { curveId: 1, label: 'Sony S-Log3 / S-Gamut3', curve: slog3ToLinear, gamut: 'sgamut3', checked: 'gam màu tính từ tọa độ xy, chưa đối chiếu ma trận hãng' },
  vlog_vgamut: { curveId: 2, label: 'Panasonic V-Log / V-Gamut', curve: vlogToLinear, gamut: 'vgamut', checked: 'gam màu tính từ tọa độ xy, chưa đối chiếu ma trận hãng' },
  logc3_awg3: { curveId: 3, label: 'ARRI LogC3 (EI 800) / ARRI Wide Gamut 3', curve: logc3ToLinear, gamut: 'awg3', checked: 'xám 18 % và ma trận AWG3→709 đạt' },
  applelog: { curveId: 7, label: 'Apple Log / Rec.2020', curve: applelogToLinear, gamut: 'rec2020', checked: 'chỉ kiểm quay vòng, chưa đối chiếu số hãng' },
  davinci_dwg: { curveId: 4, label: 'DaVinci Intermediate / DaVinci Wide Gamut', curve: davinciToLinear, gamut: 'dwg', checked: 'xám 18 % đạt; gam màu chưa đối chiếu ma trận hãng' },
  acescct: { curveId: 5, label: 'ACEScct / ACES AP1', curve: acescctToLinear, gamut: 'ap1', checked: 'xám 18 % đạt; AP1→709 theo Bradford D60→D65' },
  log3g10_rwg: { curveId: 6, label: 'RED Log3G10 / REDWideGamutRGB', curve: log3g10ToLinear, gamut: 'rwg', checked: 'xám 18 % đạt; gam màu chưa đối chiếu ma trận hãng' },
};
export const INPUT_SPACE_IDS = Object.keys(INPUT_SPACES) as InputSpace[];

/** Gia tri ma hoa cua video -> anh sang tuyen tinh theo primaries Rec.709 (co the am neu mau ngoai gam). */
export function toLinear709(space: InputSpace, r: number, g: number, b: number, out: V3 = [0, 0, 0]): V3 {
  const def = INPUT_SPACES[space] ?? INPUT_SPACES.none;
  const f = def.curve ?? srgbEotf;
  let lr = f(r), lg = f(g), lb = f(b);
  if (def.gamut) {
    const m = gamutToRec709(def.gamut);
    let R = m[0] * lr + m[1] * lg + m[2] * lb, G = m[3] * lr + m[4] * lg + m[5] * lb, B = m[6] * lr + m[7] * lg + m[8] * lb;
    // Mau ngoai gam Rec.709 (thanh phan am): giam bao hoa ve phia do sang cho vua gam thay vi cat cung ve 0.
    // Cat cung tao "vach" gay (hue lech, mat chi tiet, LUT 3D khong bieu dien noi); phep nay lien tuc, giu do sang.
    const mn = Math.min(R, G, B);
    if (mn < 0) {
      const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      const k = y > 0 ? y / (y - mn) : 0;
      R = y * (1 - k) + R * k;
      G = y * (1 - k) + G * k;
      B = y * (1 - k) + B * k;
      if (y <= 0) { R = 0; G = 0; B = 0; }
    }
    lr = R; lg = G; lb = B;
  }
  out[0] = lr; out[1] = lg; out[2] = lb;
  return out;
}

// ---------- tone-map ACES (Stephen Hill fit cua RRT+ODT, anh sang tuyen tinh 709 -> hien thi tuyen tinh 709) ----------
export type ToneMap = 'none' | 'aces';
const ACES_IN: M3 = [0.59719, 0.35458, 0.04823, 0.076, 0.90834, 0.01566, 0.0284, 0.13383, 0.83777];
const ACES_OUT: M3 = [1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602];
const rrtOdt = (v: number) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
export function acesTonemap(r: number, g: number, b: number, out: V3 = [0, 0, 0]): V3 {
  const a = mulV(ACES_IN, [Math.max(0, r), Math.max(0, g), Math.max(0, b)]);
  const t: V3 = [rrtOdt(a[0]), rrtOdt(a[1]), rrtOdt(a[2])];
  const o = mulV(ACES_OUT, t);
  out[0] = Math.min(1, Math.max(0, o[0])); out[1] = Math.min(1, Math.max(0, o[1])); out[2] = Math.min(1, Math.max(0, o[2]));
  return out;
}
