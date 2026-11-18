// Kieu du lieu chu (phang, de AI/MCP dien): fill gradient, vien, bong, glow, animator. Xem CHUC-NANG.md F-20..F-23.

export interface GradientStop {
  pos: number; // 0..1
  color: string; // #rrggbb hoac #rrggbbaa
}

export type FillType = 'solid' | 'linear' | 'radial' | 'angular';
export interface Fill {
  type: FillType;
  color: string; // dung cho solid
  stops: GradientStop[]; // dung cho gradient (>= 2)
  angle: number; // do. linear: 0 = trai->phai, 90 = tren->duoi. angular: goc bat dau
  offset: number; // dich gradient doc theo truc (linear/radial) hoac xoay (angular, vong 0..1); animate duoc
  cx: number; // tam (0..1 trong khung chu) cho radial/angular
  cy: number;
  radius: number; // radial: ty le theo nua duong cheo khung chu (1 = ra toi goc)
}

export interface Stroke {
  color: string;
  width: number; // px @ canh ngan 1080; 0 = khong vien
  over: boolean; // vien ve de len fill
}

export interface Shadow {
  color: string;
  opacity: number; // 0 = khong bong
  blur: number; // px
  x: number;
  y: number;
}

export interface Glow {
  color: string;
  radius: number; // px
  strength: number; // 0 = khong glow; >1 = dam hon
}

export type AnimPreset = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'pop' | 'bounce' | 'typewriter' | 'blur-in' | 'color-wave' | 'karaoke';
export const ANIM_PRESETS: AnimPreset[] = ['none', 'fade', 'slide-up', 'slide-down', 'pop', 'bounce', 'typewriter', 'blur-in', 'color-wave', 'karaoke'];
export type AnimUnit = 'char' | 'word' | 'line';
export const ANIM_UNITS: AnimUnit[] = ['char', 'word', 'line'];

export interface Animator {
  preset: AnimPreset;
  unit: AnimUnit;
  duration: number; // giay cho moi don vi vao hoan toan
  stagger: number; // giay giua cac don vi
  delay: number; // giay tu dau clip
  distance: number; // px (slide)
  blur: number; // px mo toi da luc bat dau
  out: boolean; // chay nguoc o cuoi clip
  color: string; // mau thu hai (color-wave, karaoke: mau tu dang noi)
  times?: number[]; // thoi diem BAT DAU cua tung don vi (giay tu dau clip), ghi de delay + i*stagger. Dung cho phu de khop loi noi
}

export interface TextSpec {
  content: string;
  font: string; // ten ho font (phai co trong may)
  size: number; // px @ canh ngan 1080 (tu co theo khung)
  weight: number; // 100..900
  italic: boolean;
  align: 'left' | 'center' | 'right';
  lineHeight: number; // nhan voi size
  letterSpacing: number; // px @ canh ngan 1080
  maxWidth: number; // ngat dong theo ty le chieu rong khung (0 = khong ngat)
  fill: Fill;
  stroke: Stroke;
  shadow: Shadow;
  glow: Glow;
  animator: Animator;
}

export type DeepPartialText = {
  [K in keyof TextSpec]?: TextSpec[K] extends object ? Partial<TextSpec[K]> : TextSpec[K];
};

export const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function defaultText(): TextSpec {
  return {
    content: 'Chữ mới',
    font: 'Segoe UI',
    size: 120,
    weight: 700,
    italic: false,
    align: 'center',
    lineHeight: 1.15,
    letterSpacing: 0,
    maxWidth: 0.9,
    fill: { type: 'solid', color: '#ffffff', stops: [{ pos: 0, color: '#ffffff' }, { pos: 1, color: '#9a82ff' }], angle: 90, offset: 0, cx: 0.5, cy: 0.5, radius: 1 },
    stroke: { color: '#000000', width: 0, over: false },
    shadow: { color: '#000000', opacity: 0, blur: 12, x: 0, y: 6 },
    glow: { color: '#5ff4ff', radius: 18, strength: 0 },
    animator: { preset: 'none', unit: 'word', duration: 0.25, stagger: 0.08, delay: 0, distance: 40, blur: 0, out: false, color: '#ffd166' },
  };
}

/** Gop patch vao spec: moi nhom con (fill/stroke/shadow/glow/animator) gop nong; stops thay ca mang. Tra ban sao moi. */
export function mergeText(spec: TextSpec, patch: DeepPartialText): TextSpec {
  const out: TextSpec = JSON.parse(JSON.stringify(spec));
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v === undefined) continue;
    if (k === 'fill' || k === 'stroke' || k === 'shadow' || k === 'glow' || k === 'animator') {
      Object.assign((out as any)[k], JSON.parse(JSON.stringify(v)));
    } else {
      (out as any)[k] = v;
    }
  }
  return out;
}

const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);

export function validateText(t: TextSpec, label = 'text'): string[] {
  const e: string[] = [];
  if (typeof t.content !== 'string') e.push(`${label}: content phai la chuoi`);
  else if (t.content.length > 2000) e.push(`${label}: content qua dai (>2000 ky tu)`);
  if (typeof t.font !== 'string' || !t.font.trim()) e.push(`${label}: font rong`);
  if (!(num(t.size) && t.size > 0 && t.size <= 4000)) e.push(`${label}: size phai trong (0, 4000]`);
  if (!(num(t.weight) && t.weight >= 100 && t.weight <= 900)) e.push(`${label}: weight phai 100..900`);
  if (!['left', 'center', 'right'].includes(t.align)) e.push(`${label}: align la ${t.align}`);
  if (!(num(t.lineHeight) && t.lineHeight > 0 && t.lineHeight < 10)) e.push(`${label}: lineHeight khong hop le`);
  if (!num(t.letterSpacing)) e.push(`${label}: letterSpacing phai la so`);
  if (!(num(t.maxWidth) && t.maxWidth >= 0 && t.maxWidth <= 4)) e.push(`${label}: maxWidth phai 0..4`);
  const f = t.fill;
  if (!['solid', 'linear', 'radial', 'angular'].includes(f.type)) e.push(`${label}.fill.type la ${f.type}`);
  if (!HEX.test(f.color)) e.push(`${label}.fill.color khong phai #rrggbb: ${f.color}`); // kiem ca khi dang dung gradient (se dung lai khi doi ve solid)
  if (f.type !== 'solid') {
    if (!Array.isArray(f.stops) || f.stops.length < 2) e.push(`${label}.fill.stops can >= 2 diem`);
    else for (const s of f.stops) if (!(num(s.pos) && s.pos >= 0 && s.pos <= 1) || !HEX.test(s.color)) e.push(`${label}.fill.stops: diem khong hop le ${JSON.stringify(s)}`);
  }
  if (![f.angle, f.offset, f.cx, f.cy, f.radius].every(num)) e.push(`${label}.fill: angle/offset/cx/cy/radius phai la so`);
  if (!HEX.test(t.stroke.color) || !(num(t.stroke.width) && t.stroke.width >= 0)) e.push(`${label}.stroke khong hop le`);
  if (!HEX.test(t.shadow.color) || !(num(t.shadow.opacity) && t.shadow.opacity >= 0 && t.shadow.opacity <= 1) || ![t.shadow.blur, t.shadow.x, t.shadow.y].every(num) || t.shadow.blur < 0) e.push(`${label}.shadow khong hop le`);
  if (!HEX.test(t.glow.color) || !(num(t.glow.radius) && t.glow.radius >= 0) || !(num(t.glow.strength) && t.glow.strength >= 0)) e.push(`${label}.glow khong hop le`);
  const a = t.animator;
  if (!ANIM_PRESETS.includes(a.preset)) e.push(`${label}.animator.preset la ${a.preset} (hop le: ${ANIM_PRESETS.join(', ')})`);
  if (!ANIM_UNITS.includes(a.unit)) e.push(`${label}.animator.unit la ${a.unit}`);
  if (![a.duration, a.stagger, a.delay, a.distance, a.blur].every(num) || a.duration <= 0 || a.stagger < 0 || a.delay < 0 || a.blur < 0) e.push(`${label}.animator: duration>0, stagger/delay/blur>=0`);
  if (!HEX.test(a.color)) e.push(`${label}.animator.color khong hop le`);
  if (a.times !== undefined && (!Array.isArray(a.times) || a.times.length > 400 || !a.times.every(num))) e.push(`${label}.animator.times phai la mang <= 400 so`);
  return e;
}

export function parseHex(c: string): [number, number, number, number] {
  const m = HEX.test(c) ? c : '#ffffff';
  const r = parseInt(m.slice(1, 3), 16),
    g = parseInt(m.slice(3, 5), 16),
    b = parseInt(m.slice(5, 7), 16),
    a = m.length === 9 ? parseInt(m.slice(7, 9), 16) / 255 : 1;
  return [r, g, b, a];
}

export function rgba(c: string, alphaMul = 1): string {
  const [r, g, b, a] = parseHex(c);
  return `rgba(${r},${g},${b},${+(a * alphaMul).toFixed(4)})`;
}
