// Keyframe + duong cong ease (cubic-bezier nhu CSS) + giai tri so cua clip tai mot thoi diem. Thuan tuy, co test. Xem F-24, F-25.
import type { Clip, Transform } from './schema';
import type { TextSpec } from './text';
import { FX_DEFAULT, FX_PROP_LABEL, FX_PROPS, SHAPE_PROP_LABEL, SHAPE_PROPS, type Fx, type ShapeSpec } from './fx';

export type EaseKind = 'linear' | 'hold' | 'bezier';
export interface Ease {
  kind: EaseKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Keyframe {
  t: number; // giay tinh tu DAU CLIP (clip-local)
  v: number;
  ease: Ease; // duong cong tu khung nay toi khung ke tiep
}
export type KeyframeMap = Record<string, Keyframe[]>;

const E = (kind: EaseKind, x1 = 0, y1 = 0, x2 = 1, y2 = 1): Ease => ({ kind, x1, y1, x2, y2 });
export const EASE_PRESETS: Record<string, Ease> = {
  linear: E('linear'),
  hold: E('hold'),
  ease: E('bezier', 0.25, 0.1, 0.25, 1),
  'ease-in': E('bezier', 0.42, 0, 1, 1),
  'ease-out': E('bezier', 0, 0, 0.58, 1),
  'ease-in-out': E('bezier', 0.42, 0, 0.58, 1),
  snap: E('bezier', 0.1, 0.9, 0.2, 1), // "snap" cua kit: vao nhanh, dung gon
  accel: E('bezier', 0.7, 0, 1, 0.5),
  overshoot: E('bezier', 0.34, 1.56, 0.64, 1), // vuot qua roi ve (pop)
};
export const EASE_NAMES = Object.keys(EASE_PRESETS);

export function easeFromName(name: string): Ease | null {
  const e = EASE_PRESETS[name];
  return e ? { ...e } : null;
}

/** Ten preset neu khop, nguoc lai 'custom'. */
export function easeName(e: Ease): string {
  for (const [n, p] of Object.entries(EASE_PRESETS)) {
    if (p.kind === e.kind && (e.kind !== 'bezier' || (p.x1 === e.x1 && p.y1 === e.y1 && p.x2 === e.x2 && p.y2 === e.y2))) return n;
  }
  return 'custom';
}

/** y = f(x) cua duong bezier (0,0)-(x1,y1)-(x2,y2)-(1,1) (Newton + chia doi du phong). */
export function bezierAt(e: Ease, x: number): number {
  if (e.kind === 'linear') return x;
  if (e.kind === 'hold') return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const { x1, y1, x2, y2 } = e;
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const X = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = X(t) - x;
    if (Math.abs(err) < 1e-7) return ((ay * t + by) * t + cy) * t;
    const d = dX(t);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  let lo = 0,
    hi = 1;
  t = x;
  for (let i = 0; i < 40; i++) {
    const v = X(t);
    if (Math.abs(v - x) < 1e-7) break;
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return ((ay * t + by) * t + cy) * t;
}

/** Gia tri cua mot track keyframe tai thoi diem t (clip-local). Truoc khung dau / sau khung cuoi: giu gia tri. */
export function evalTrack(keys: Keyframe[], t: number): number {
  const n = keys.length;
  if (n === 0) return NaN;
  if (t <= keys[0].t) return keys[0].v;
  if (t >= keys[n - 1].t) return keys[n - 1].v;
  let i = 0;
  while (i + 1 < n && keys[i + 1].t <= t) i++;
  const a = keys[i],
    b = keys[i + 1];
  if (a.ease.kind === 'hold') return a.v;
  const u = (t - a.t) / (b.t - a.t);
  return a.v + (b.v - a.v) * bezierAt(a.ease, u);
}

// ---- thuoc tinh co the keyframe ----
export const CLIP_PROPS = ['transform.x', 'transform.y', 'transform.scale', 'transform.rotation', 'transform.opacity', 'volume', 'speed'] as const;
export const TEXT_PROPS = ['text.size', 'text.letterSpacing', 'text.lineHeight', 'text.fill.angle', 'text.fill.offset', 'text.stroke.width', 'text.shadow.opacity', 'text.shadow.blur', 'text.shadow.x', 'text.shadow.y', 'text.glow.strength', 'text.glow.radius'] as const;
export const ANIM_PROPS: string[] = [...CLIP_PROPS, ...TEXT_PROPS, ...FX_PROPS, ...SHAPE_PROPS];

/** Nhan tieng Viet de hien trong giao dien. */
export const PROP_LABEL: Record<string, string> = {
  ...FX_PROP_LABEL, ...SHAPE_PROP_LABEL,
  'transform.x': 'Vị trí X', 'transform.y': 'Vị trí Y', 'transform.scale': 'Tỉ lệ', 'transform.rotation': 'Xoay', 'transform.opacity': 'Độ đục', volume: 'Âm lượng', speed: 'Tốc độ',
  'text.size': 'Có chữ', 'text.letterSpacing': 'Giãn chữ', 'text.lineHeight': 'Giãn dòng', 'text.fill.angle': 'Góc gradient', 'text.fill.offset': 'Dịch gradient',
  'text.stroke.width': 'Độ dày viền', 'text.shadow.opacity': 'Độ đục bóng', 'text.shadow.blur': 'Mở bóng', 'text.shadow.x': 'Bóng X', 'text.shadow.y': 'Bóng Y', 'text.glow.strength': 'Cường độ glow', 'text.glow.radius': 'Bán kính glow',
};

export function isAnimatable(prop: string, clip: Clip): boolean {
  if (!ANIM_PROPS.includes(prop)) return false;
  if (prop.startsWith('text.')) return clip.src.type === 'text';
  if (prop.startsWith('shape.')) return clip.src.type === 'shape';
  if (prop.startsWith('fx.')) return !!(clip.fx as Record<string, unknown> | undefined)?.[prop.split('.')[1]];
  if (prop === 'volume' || prop === 'speed') return clip.src.type === 'media';
  if (prop === 'volume' && clip.src.type === 'shape') return false;
  return true;
}

function getPath(o: any, path: string[]): number {
  let cur = o;
  for (const k of path) cur = cur?.[k];
  return typeof cur === 'number' ? cur : NaN;
}
function setPath(o: any, path: string[], v: number) {
  let cur = o;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = v;
}

/** Gia tri nen (khong keyframe) cua mot thuoc tinh tren clip. */
export function baseValue(clip: Clip, prop: string): number {
  const [head, ...rest] = prop.split('.');
  if (head === 'volume') return clip.volume;
  if (head === 'speed') return clip.speed ?? 1;
  if (head === 'transform') return getPath(clip.transform, rest);
  if (head === 'text' && clip.src.type === 'text') return getPath(clip.src.text, rest);
  if (head === 'shape' && clip.src.type === 'shape') return getPath(clip.src.shape, rest);
  if (head === 'fx') return getPath((clip.fx as unknown as Record<string, unknown>)?.[rest[0]] ?? (FX_DEFAULT as unknown as Record<string, unknown>)[rest[0]], rest.slice(1));
  return NaN;
}

/** Gia tri cua mot thuoc tinh tai thoi diem clip-local lt: neu co keyframe thi noi suy, khong thi gia tri nen. */
export function valueAt(clip: Clip, prop: string, lt: number): number {
  const keys = clip.keyframes?.[prop];
  return keys && keys.length ? evalTrack(keys, lt) : baseValue(clip, prop);
}

/** Dung patch long nhau cho set_text / set_transform tu duong dan thuoc tinh ('text.fill.angle', 5) -> { fill: { angle: 5 } }. */
export function textPatchFor(prop: string, v: number): Record<string, unknown> {
  const parts = prop.split('.').slice(1);
  const out: Record<string, unknown> = {};
  let cur = out;
  parts.forEach((k, i) => {
    if (i === parts.length - 1) cur[k] = v;
    else cur = cur[k] = {} as Record<string, unknown>;
  });
  return out;
}

/** Cac diem lay mau (t, v) cua mot track de dung duong gap khuc: moi doan ease chia nho (de khop duong cong bezier). */
export function sampleTrack(keys: Keyframe[], perSegment = 10): { t: number; v: number }[] {
  if (!keys.length) return [];
  const out: { t: number; v: number }[] = [{ t: keys[0].t, v: keys[0].v }];
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i],
      b = keys[i + 1];
    if (a.ease.kind === 'hold') {
      out.push({ t: b.t - 1e-4, v: a.v }, { t: b.t, v: b.v });
      continue;
    }
    const n = a.ease.kind === 'linear' ? 1 : perSegment;
    for (let j = 1; j <= n; j++) out.push({ t: a.t + ((b.t - a.t) * j) / n, v: evalTrack([a, b], a.t + ((b.t - a.t) * j) / n) });
  }
  return out;
}

/** Bieu thuc ffmpeg (bien `t` = giay tu dau clip) cho am luong theo keyframe. Dung voi volume=eval=frame. */
export function volumeExpr(keys: Keyframe[]): string {
  const pts = sampleTrack(keys);
  const f = (x: number) => (+x.toFixed(6)).toString();
  let e = f(pts[pts.length - 1].v);
  for (let i = pts.length - 2; i >= 0; i--) {
    const a = pts[i],
      b = pts[i + 1];
    const dt = b.t - a.t;
    const seg = dt < 1e-9 ? f(b.v) : `${f(a.v)}+(${f(b.v - a.v)})*(t-${f(a.t)})/${f(dt)}`;
    e = `if(lt(t,${f(b.t)}),${seg},${e})`;
  }
  return `if(lt(t,${f(pts[0].t)}),${f(pts[0].v)},${e})`;
}

export interface Resolved {
  transform: Transform;
  volume: number;
  text?: TextSpec;
  shape?: ShapeSpec;
  fx?: Fx;
}

/** Gia tri thuc cua clip tai thoi diem clip-local `lt`: gia tri nen, ghi de boi cac track keyframe. */
export function resolveClip(clip: Clip, lt: number): Resolved {
  const out: Resolved = { transform: { ...clip.transform }, volume: clip.volume };
  const hasText = clip.src.type === 'text';
  const hasShape = clip.src.type === 'shape';
  const kf = clip.keyframes ?? {};
  const props = Object.keys(kf);
  if (hasText) out.text = props.some((p) => p.startsWith('text.')) ? JSON.parse(JSON.stringify((clip.src as { text: TextSpec }).text)) : (clip.src as { text: TextSpec }).text;
  if (hasShape) out.shape = props.some((p) => p.startsWith('shape.')) ? JSON.parse(JSON.stringify((clip.src as { shape: ShapeSpec }).shape)) : (clip.src as { shape: ShapeSpec }).shape;
  if (clip.fx) out.fx = props.some((p) => p.startsWith('fx.')) ? JSON.parse(JSON.stringify(clip.fx)) : clip.fx;
  for (const prop of props) {
    const keys = kf[prop];
    if (!keys?.length) continue;
    const v = evalTrack(keys, lt);
    const [head, ...rest] = prop.split('.');
    if (head === 'transform') setPath(out.transform, rest, v);
    else if (head === 'volume') out.volume = v;
    else if (head === 'text' && out.text) setPath(out.text, rest, v);
    else if (head === 'shape' && out.shape) setPath(out.shape, rest, v);
    else if (head === 'fx' && out.fx && (out.fx as Record<string, unknown>)[rest[0]]) setPath(out.fx, rest, v);
  }
  return out;
}

// ---- thao tac tren track ----
const TOL = 1e-4;

/** Them/ghi de mot keyframe (cung thoi diem trong dung sai thi ghi de). Tra mang moi da sap xep. */
export function upsertKey(keys: Keyframe[], k: Keyframe): Keyframe[] {
  const out = keys.filter((x) => Math.abs(x.t - k.t) > TOL);
  out.push({ ...k });
  out.sort((a, b) => a.t - b.t);
  return out;
}

export function removeKeyAt(keys: Keyframe[], t: number): Keyframe[] {
  return keys.filter((x) => Math.abs(x.t - t) > TOL);
}

export function findKeyAt(keys: Keyframe[] | undefined, t: number): Keyframe | undefined {
  return keys?.find((x) => Math.abs(x.t - t) <= TOL);
}

export function shiftKeys(map: KeyframeMap, dt: number): KeyframeMap {
  const out: KeyframeMap = {};
  for (const [p, ks] of Object.entries(map)) out[p] = ks.map((k) => ({ ...k, t: round(k.t + dt) }));
  return out;
}

const round = (x: number) => Math.round(x * 1e6) / 1e6;

/** Cat keyframe tai `s` (clip-local). Giu lien tuc gia tri tai diem cat o ca hai nua. */
export function splitKeys(map: KeyframeMap, s: number): { left: KeyframeMap; right: KeyframeMap } {
  const left: KeyframeMap = {},
    right: KeyframeMap = {};
  for (const [p, ks] of Object.entries(map)) {
    if (!ks.length) continue;
    const at = evalTrack(ks, s);
    const prev = [...ks].reverse().find((k) => k.t <= s + TOL);
    const L = ks.filter((k) => k.t <= s + TOL);
    const R = ks.filter((k) => k.t > s + TOL).map((k) => ({ ...k, t: round(k.t - s) }));
    // nua trai: neu con khung sau diem cat thi them khung chot tai diem cat de duong cong ket thuc dung gia tri
    if (!L.length) left[p] = [{ t: 0, v: ks[0].v, ease: EASE_PRESETS.linear }];
    else {
      const last = L[L.length - 1];
      left[p] = R.length && Math.abs(last.t - s) > TOL ? [...L, { t: round(s), v: at, ease: EASE_PRESETS.linear }] : L.map((k) => ({ ...k }));
    }
    // nua phai: khung dau tai 0 mang gia tri tai diem cat va duong cong cua doan dang chay
    if (!R.length) right[p] = [{ t: 0, v: at, ease: EASE_PRESETS.linear }];
    else right[p] = prev ? [{ t: 0, v: at, ease: { ...prev.ease } }, ...R] : R;
  }
  return { left, right };
}

export function validateKeyframes(clip: Clip): string[] {
  const e: string[] = [];
  const kf = clip.keyframes ?? {};
  for (const [prop, ks] of Object.entries(kf)) {
    if (!isAnimatable(prop, clip)) {
      e.push(`clip ${clip.id}: thuoc tinh "${prop}" khong keyframe duoc tren clip nay (hop le: ${ANIM_PROPS.filter((p) => isAnimatable(p, clip)).join(', ')})`);
      continue;
    }
    if (!Array.isArray(ks) || ks.length > 200) {
      e.push(`clip ${clip.id}.${prop}: toi da 200 keyframe`);
      continue;
    }
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      if (!(Number.isFinite(k.t) && Number.isFinite(k.v))) e.push(`clip ${clip.id}.${prop}[${i}]: t, v phai la so huu han`);
      if (prop === 'speed' && !(k.v >= 0.05 && k.v <= 16)) e.push(`clip ${clip.id}.speed[${i}]: toc do phai trong 0.05..16`);
      if (i > 0 && !(k.t > ks[i - 1].t + TOL / 2)) e.push(`clip ${clip.id}.${prop}: keyframe phai tang dan theo t (khong trung)`);
      const z = k.ease;
      if (!z || !['linear', 'hold', 'bezier'].includes(z.kind)) e.push(`clip ${clip.id}.${prop}[${i}]: ease khong hop le`);
      else if (z.kind === 'bezier' && !(z.x1 >= 0 && z.x1 <= 1 && z.x2 >= 0 && z.x2 <= 1 && [z.y1, z.y2].every(Number.isFinite))) e.push(`clip ${clip.id}.${prop}[${i}]: bezier can x1,x2 trong 0..1`);
    }
  }
  return e;
}
