// Hieu ung lop (blur, glow, bong, bo goc, vignette, wipe), che do tron (blend) va hinh vector (shape). Thuan tuy, co test. Xem CHUC-NANG.md F-60..F-63.

export type BlendMode = 'normal' | 'add' | 'screen' | 'multiply';
export const BLEND_MODES: BlendMode[] = ['normal', 'add', 'screen', 'multiply'];
export const BLEND_LABEL: Record<BlendMode, string> = { normal: 'Bình thường', add: 'Cộng (Add)', screen: 'Screen', multiply: 'Multiply' };

export interface FxBlur {
  radius: number; // px @ canh ngan 1080
}
export interface FxGlow {
  radius: number; // px
  intensity: number; // 0..4
  color: string; // mau tinh chinh; '' = giu mau nguon
  threshold: number; // 0..1: chi sang hon muc nay moi phat sang
}
export interface FxShadow {
  x: number; // px
  y: number;
  blur: number; // px
  opacity: number; // 0..1
  color: string;
}
export interface FxRound {
  radius: number; // 0..0.5 ty le canh ngan cua lop (bo goc lop video/anh/hinh)
}
export interface FxVignette {
  amount: number; // 0..1 do toi goc khung
  softness: number; // 0..1
}
export interface FxWipe {
  progress: number; // 0 = che het, 1 = hien het
  angle: number; // do: 0 = quet tu trai sang phai, 90 = tu tren xuong
  feather: number; // 0..1 do mem mep
}
export interface FxCrop {
  left: number; // 0..0.95: phan bi cat theo ti le chieu rong/cao CUA LOP (truoc bien doi), cat cung mep hinh chu nhat
  top: number;
  right: number;
  bottom: number;
}
export interface FxBackdrop {
  radius: number; // px @ canh ngan 1080: lam mo phan nen NAM SAU hinh dang cua lop (kinh mo / frosted glass)
}
export interface Fx {
  backdrop?: FxBackdrop;
  crop?: FxCrop;
  blur?: FxBlur;
  glow?: FxGlow;
  shadow?: FxShadow;
  round?: FxRound;
  vignette?: FxVignette;
  wipe?: FxWipe;
}
export type FxName = keyof Fx;
export const FX_NAMES: FxName[] = ['backdrop', 'crop', 'blur', 'glow', 'shadow', 'round', 'vignette', 'wipe'];
export const FX_LABEL: Record<FxName, string> = { backdrop: 'Kính mờ (làm mờ nền sau)', crop: 'Cắt khung (Crop)', blur: 'Làm mờ (Gaussian)', glow: 'Phát sáng (Glow)', shadow: 'Bóng đổ', round: 'Bo góc', vignette: 'Vignette', wipe: 'Quét (Linear Wipe)' };

export const FX_DEFAULT: { [K in FxName]: Required<Fx>[K] } = {
  backdrop: { radius: 28 },
  crop: { left: 0, top: 0, right: 0, bottom: 0 },
  blur: { radius: 20 },
  glow: { radius: 40, intensity: 1, color: '', threshold: 0.3 },
  shadow: { x: 0, y: 12, blur: 24, opacity: 0.5, color: '#000000' },
  round: { radius: 0.12 },
  vignette: { amount: 0.35, softness: 0.6 },
  wipe: { progress: 1, angle: 0, feather: 0.1 },
};

/** Cac thuoc tinh fx keyframe duoc: 'fx.<ten>.<truong>' (so). */
export const FX_PROPS: string[] = [
  'fx.backdrop.radius', 'fx.blur.radius', 'fx.glow.radius', 'fx.glow.intensity', 'fx.glow.threshold', 'fx.shadow.x', 'fx.shadow.y', 'fx.shadow.blur', 'fx.shadow.opacity',
  'fx.round.radius', 'fx.crop.left', 'fx.crop.top', 'fx.crop.right', 'fx.crop.bottom', 'fx.vignette.amount', 'fx.vignette.softness', 'fx.wipe.progress', 'fx.wipe.angle', 'fx.wipe.feather',
];
export const FX_PROP_LABEL: Record<string, string> = {
  'fx.backdrop.radius': 'Kính mờ: bán kính', 'fx.blur.radius': 'Mờ (px)', 'fx.glow.radius': 'Glow: bán kính', 'fx.glow.intensity': 'Glow: cường độ', 'fx.glow.threshold': 'Glow: ngưỡng',
  'fx.shadow.x': 'Bóng X', 'fx.shadow.y': 'Bóng Y', 'fx.shadow.blur': 'Bóng: mờ', 'fx.shadow.opacity': 'Bóng: độ đục', 'fx.round.radius': 'Bo góc', 'fx.crop.left': 'Cắt trái', 'fx.crop.top': 'Cắt trên', 'fx.crop.right': 'Cắt phải', 'fx.crop.bottom': 'Cắt dưới',
  'fx.vignette.amount': 'Vignette', 'fx.vignette.softness': 'Vignette: mềm', 'fx.wipe.progress': 'Quét: tiến độ', 'fx.wipe.angle': 'Quét: góc', 'fx.wipe.feather': 'Quét: mềm',
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export type DeepPartialFx = { [K in FxName]?: Partial<Fx[K]> | null };

/** Gop patch vao fx. patch[ten] = null: go hieu ung do. */
export function mergeFx(base: Fx | undefined, patch: DeepPartialFx): Fx {
  const out: Fx = base ? JSON.parse(JSON.stringify(base)) : {};
  for (const name of Object.keys(patch) as FxName[]) {
    const v = patch[name];
    if (v === undefined) continue;
    if (v === null) delete out[name];
    else (out as Record<string, unknown>)[name] = { ...FX_DEFAULT[name], ...(out[name] as object | undefined), ...v };
  }
  return out;
}

export function fxIsEmpty(fx: Fx | undefined): boolean {
  return !fx || FX_NAMES.every((k) => !fx[k]);
}

export function validateFx(fx: Fx, where: string): string[] {
  const e: string[] = [];
  const rng = (n: string, v: unknown, lo: number, hi: number) => {
    if (!fin(v) || v < lo || v > hi) e.push(`${where}.${n} phai trong ${lo}..${hi}`);
  };
  for (const k of Object.keys(fx)) if (!FX_NAMES.includes(k as FxName)) e.push(`${where}: hieu ung "${k}" khong co (${FX_NAMES.join('|')})`);
  if (fx.backdrop) rng('backdrop.radius', fx.backdrop.radius, 0, 200);
  if (fx.blur) rng('blur.radius', fx.blur.radius, 0, 200);
  if (fx.glow) {
    rng('glow.radius', fx.glow.radius, 0, 200);
    rng('glow.intensity', fx.glow.intensity, 0, 6);
    rng('glow.threshold', fx.glow.threshold, 0, 1);
    if (fx.glow.color && !HEX.test(fx.glow.color)) e.push(`${where}.glow.color phai la #rrggbb hoac rong`);
  }
  if (fx.shadow) {
    rng('shadow.x', fx.shadow.x, -400, 400);
    rng('shadow.y', fx.shadow.y, -400, 400);
    rng('shadow.blur', fx.shadow.blur, 0, 200);
    rng('shadow.opacity', fx.shadow.opacity, 0, 1);
    if (!HEX.test(fx.shadow.color)) e.push(`${where}.shadow.color phai la #rrggbb`);
  }
  if (fx.round) rng('round.radius', fx.round.radius, 0, 0.5);
  if (fx.crop) {
    for (const k of ['left', 'top', 'right', 'bottom'] as const) rng(`crop.${k}`, fx.crop[k], 0, 0.95);
    if (fx.crop.left + fx.crop.right > 0.98 || fx.crop.top + fx.crop.bottom > 0.98) e.push(`${where}.crop cat het lop`);
  }
  if (fx.vignette) {
    rng('vignette.amount', fx.vignette.amount, 0, 1);
    rng('vignette.softness', fx.vignette.softness, 0, 1);
  }
  if (fx.wipe) {
    rng('wipe.progress', fx.wipe.progress, 0, 1);
    rng('wipe.angle', fx.wipe.angle, -360, 360);
    rng('wipe.feather', fx.wipe.feather, 0, 1);
  }
  return e;
}

// ---------- hinh vector ----------
export type ShapeKind = 'rect' | 'ellipse' | 'ring' | 'star';
export const SHAPE_KINDS: ShapeKind[] = ['rect', 'ellipse', 'ring', 'star'];
export interface ShapeSpec {
  kind: ShapeKind;
  w: number; // px @ canh ngan 1080
  h: number;
  fill: string; // #rrggbb; '' = khong to
  fillOpacity: number; // 0..1
  stroke: { color: string; width: number }; // width 0 = khong vien
  radius: number; // bo goc cua rect (px)
  points: number; // sao: so canh
  inner: number; // sao: ti le ban kinh trong 0..1
  trim: number; // 0..1: phan vien duoc ve (bat dau o tren, theo chieu kim dong ho); animate duoc (vien "tự vẽ")
}
export const SHAPE_PROPS = ['shape.w', 'shape.h', 'shape.stroke.width', 'shape.fillOpacity', 'shape.radius', 'shape.trim'];
export const SHAPE_PROP_LABEL: Record<string, string> = { 'shape.w': 'Hình: rộng', 'shape.h': 'Hình: cao', 'shape.stroke.width': 'Hình: độ dày viền', 'shape.fillOpacity': 'Hình: độ đục to', 'shape.radius': 'Hình: bo góc', 'shape.trim': 'Hình: về viền' };

export function defaultShape(kind: ShapeKind = 'rect'): ShapeSpec {
  return { kind, w: 400, h: kind === 'rect' ? 240 : 400, fill: kind === 'ring' ? '' : '#ffffff', fillOpacity: 1, stroke: { color: '#ffffff', width: kind === 'ring' ? 8 : 0 }, radius: 24, points: 5, inner: 0.45, trim: 1 };
}
export type DeepPartialShape = Partial<Omit<ShapeSpec, 'stroke'>> & { stroke?: Partial<ShapeSpec['stroke']> };
export function mergeShape(s: ShapeSpec, patch: DeepPartialShape): ShapeSpec {
  const out: ShapeSpec = JSON.parse(JSON.stringify(s));
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === undefined) continue;
    if (k === 'stroke') Object.assign(out.stroke, v);
    else (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
}
export function validateShape(s: ShapeSpec, where: string): string[] {
  const e: string[] = [];
  const rng = (n: string, v: unknown, lo: number, hi: number) => {
    if (!fin(v) || v < lo || v > hi) e.push(`${where}.${n} phai trong ${lo}..${hi}`);
  };
  if (!SHAPE_KINDS.includes(s.kind)) e.push(`${where}.kind phai la ${SHAPE_KINDS.join('|')}`);
  rng('w', s.w, 1, 4000);
  rng('h', s.h, 1, 4000);
  rng('fillOpacity', s.fillOpacity, 0, 1);
  rng('radius', s.radius, 0, 2000);
  rng('points', s.points, 3, 24);
  rng('inner', s.inner, 0.05, 1);
  rng('trim', s.trim, 0, 1);
  if (s.fill && !HEX.test(s.fill)) e.push(`${where}.fill phai la #rrggbb hoac rong`);
  if (!s.stroke || !HEX.test(s.stroke.color)) e.push(`${where}.stroke.color phai la #rrggbb`);
  else rng('stroke.width', s.stroke.width, 0, 400);
  return e;
}
