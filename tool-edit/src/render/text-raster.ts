// Ve chu bang Canvas 2D vao OffscreenCanvas: layout, gradient (tuyen tinh/tron/goc), vien, bong, glow, animator tung ky tu/tu/dong.
// Moi kich thuoc "px @ canh ngan 1080" duoc nhan he so k = min(W, H) / 1080 de chu co theo khung (9:16 va 16:9 nhin giong nhau). Xem F-20..F-23.
import { bezierAt, EASE_PRESETS } from '../core/anim';
import { parseHex, rgba, type Animator, type Fill, type TextSpec } from '../core/text';

export interface RasterIn {
  spec: TextSpec; // da ap keyframe
  frameW: number;
  frameH: number;
  t: number; // giay tu dau clip
  duration: number; // do dai clip
}

export interface Raster {
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  /** le (px) quanh khoi chu chua bong/glow/vien/animator: khong tinh vao neo vi tri. */
  pad: number;
  blockW: number;
  blockH: number;
}

interface Unit {
  text: string;
  x: number; // le trai trong dong (chua tinh can le)
  w: number;
  line: number;
  index: number; // thu tu toan cuc
}
interface Line {
  text: string;
  width: number;
  units: Unit[];
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const MAX_DIM = 8192;
const CACHE_MAX = 24;
const cache = new Map<string, Raster>();

function fontString(spec: TextSpec, k: number): string {
  const fam = spec.font.replace(/["\\]/g, '');
  return `${spec.italic ? 'italic ' : ''}${Math.round(spec.weight)} ${(spec.size * k).toFixed(2)}px "${fam}", "Segoe UI", sans-serif`;
}

function applyFont(c: OffscreenCanvasRenderingContext2D, spec: TextSpec, k: number) {
  c.font = fontString(spec, k);
  (c as any).letterSpacing = `${(spec.letterSpacing * k).toFixed(2)}px`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
}

function layout(c: OffscreenCanvasRenderingContext2D, spec: TextSpec, k: number, frameW: number): { lines: Line[]; bw: number; bh: number; lineH: number; count: number } {
  const maxPx = spec.maxWidth > 0 ? spec.maxWidth * frameW : Infinity;
  const paras = spec.content.normalize('NFC').split('\n');
  const raw: string[] = [];
  for (const para of paras) {
    if (!isFinite(maxPx)) {
      raw.push(para);
      continue;
    }
    const words = para.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && c.measureText(test).width > maxPx) {
        raw.push(cur);
        cur = w;
      } else cur = test;
    }
    raw.push(cur);
  }
  const lines: Line[] = [];
  let count = 0;
  const unit = spec.animator.unit;
  for (let li = 0; li < raw.length; li++) {
    const text = raw[li];
    const width = c.measureText(text).width;
    const units: Unit[] = [];
    if (unit === 'line') {
      if (text.trim()) units.push({ text, x: 0, w: width, line: li, index: count++ });
    } else if (unit === 'word') {
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        units.push({ text: m[0], x: c.measureText(text.slice(0, m.index)).width, w: c.measureText(m[0]).width, line: li, index: count++ });
      }
    } else {
      const parts = segmenter ? [...segmenter.segment(text)].map((s) => ({ s: s.segment, i: s.index })) : [...text].map((s, i) => ({ s, i }));
      for (const p of parts) {
        if (!p.s.trim()) continue;
        units.push({ text: p.s, x: c.measureText(text.slice(0, p.i)).width, w: c.measureText(p.s).width, line: li, index: count++ });
      }
    }
    lines.push({ text, width, units });
  }
  const lineH = spec.size * k * spec.lineHeight;
  const bw = Math.max(1, ...lines.map((l) => l.width));
  return { lines, bw, bh: Math.max(1, lines.length * lineH), lineH, count };
}

// ---- animator ----
interface UnitState {
  alpha: number;
  dx: number;
  dy: number;
  scale: number;
  blur: number;
  wave: number; // 0..1 (color-wave)
}
const OUT = EASE_PRESETS['ease-out'];
const bounceOut = (x: number) => {
  const n1 = 7.5625,
    d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

export function unitState(a: Animator, index: number, t: number, clipDur: number, k: number): UnitState {
  const startAt = a.times && a.times[index] !== undefined ? a.times[index] : a.delay + index * a.stagger;
  const endAt = a.times && a.times[index + 1] !== undefined ? a.times[index + 1] : clipDur;
  const s: UnitState = { alpha: 1, dx: 0, dy: 0, scale: 1, blur: 0, wave: 0 };
  if (a.preset === 'none') return s;
  const dur = Math.max(1e-4, a.duration);
  const start = startAt;
  let p = Math.min(1, Math.max(0, (t - start) / dur));
  if (a.out) p = Math.min(p, Math.min(1, Math.max(0, (clipDur - t - (a.delay + index * a.stagger * 0)) / dur)));
  const e = bezierAt(OUT, p);
  const dist = a.distance * k;
  switch (a.preset) {
    case 'fade':
      s.alpha = e;
      break;
    case 'slide-up':
      s.alpha = e;
      s.dy = (1 - e) * dist;
      break;
    case 'slide-down':
      s.alpha = e;
      s.dy = -(1 - e) * dist;
      break;
    case 'pop': {
      const o = bezierAt(EASE_PRESETS.overshoot, p);
      s.scale = p <= 0 ? 0 : o;
      s.alpha = Math.min(1, p * 4);
      break;
    }
    case 'bounce':
      s.dy = -(1 - bounceOut(p)) * dist;
      s.alpha = Math.min(1, p * 5);
      break;
    case 'typewriter':
      s.alpha = p > 0 ? 1 : 0;
      break;
    case 'blur-in':
      s.alpha = e;
      s.blur = (1 - e) * (a.blur > 0 ? a.blur : 14) * k;
      return s;
    case 'karaoke': {
      // ca nhom hien san (mo truoc khi toi luot), tu dang noi sang len va nay nhe, tu da noi tro ve binh thuong
      const active = t >= startAt && t < endAt;
      s.alpha = t < startAt ? 0.45 : 1;
      s.wave = active ? 1 : 0;
      s.scale = active ? 1.08 : 1;
      return s;
    }
    case 'color-wave':
      s.wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * (t - index * a.stagger)) / Math.max(0.2, a.duration * 4));
      break;
  }
  if (a.blur > 0) s.blur = Math.max(s.blur, (1 - e) * a.blur * k);
  return s;
}

/** Thoi diem (giay) khi unit cuoi vao xong; sau do (neu khong out va khong color-wave) chu dung yen. */
function animSettledAt(a: Animator, count: number): number {
  if (a.times?.length) return Math.max(...a.times) + a.duration;
  return a.delay + Math.max(0, count - 1) * a.stagger + a.duration;
}

// ---- gradient ----
function makeFill(c: OffscreenCanvasRenderingContext2D, f: Fill, x: number, y: number, w: number, h: number): string | CanvasGradient {
  if (f.type === 'solid') return rgba(f.color);
  const stops = [...f.stops].sort((a, b) => a.pos - b.pos);
  let g: CanvasGradient;
  const cx = x + f.cx * w,
    cy = y + f.cy * h;
  if (f.type === 'linear') {
    const a = (f.angle * Math.PI) / 180;
    const dx = Math.cos(a),
      dy = Math.sin(a);
    const L = Math.max(1, Math.abs(w * dx) + Math.abs(h * dy));
    const mx = x + w / 2 + dx * L * f.offset,
      my = y + h / 2 + dy * L * f.offset;
    g = c.createLinearGradient(mx - (dx * L) / 2, my - (dy * L) / 2, mx + (dx * L) / 2, my + (dy * L) / 2);
  } else if (f.type === 'radial') {
    const r = Math.max(1, (Math.hypot(w, h) / 2) * f.radius * Math.max(0.01, 1 + f.offset));
    g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else {
    g = c.createConicGradient(((f.angle + f.offset * 360) * Math.PI) / 180, cx, cy);
  }
  for (const s of stops) g.addColorStop(Math.min(1, Math.max(0, s.pos)), rgba(s.color));
  return g;
}

function lerpHex(a: string, b: string, t: number): string {
  const A = parseHex(a),
    B = parseHex(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

const OFF = 6000; // meo ve bong rieng (khong ve hinh): dich hinh ra ngoai canvas, bong roi vao trong

function drawUnit(c: OffscreenCanvasRenderingContext2D, spec: TextSpec, k: number, text: string, x: number, y: number, uw: number, st: UnitState, fill: string | CanvasGradient) {
  if (st.alpha <= 0.002 || (st.scale <= 0.002 && st.scale !== 1)) return;
  c.save();
  c.globalAlpha = Math.min(1, st.alpha);
  if (st.blur > 0.3) c.filter = `blur(${st.blur.toFixed(2)}px)`;
  const ux = x + uw / 2;
  c.translate(st.dx, st.dy);
  if (st.scale !== 1) {
    c.translate(ux, y);
    c.scale(st.scale, st.scale);
    c.translate(-ux, -y);
  }
  // 1) bong do
  if (spec.shadow.opacity > 0) {
    c.save();
    c.shadowColor = rgba(spec.shadow.color, spec.shadow.opacity);
    c.shadowBlur = spec.shadow.blur * k;
    c.shadowOffsetX = spec.shadow.x * k + OFF;
    c.shadowOffsetY = spec.shadow.y * k;
    c.fillStyle = '#000';
    c.fillText(text, x - OFF, y);
    c.restore();
  }
  // 2) glow (bong cung mau, khong lech, ve nhieu lan cho dam)
  if (spec.glow.strength > 0 && spec.glow.radius > 0) {
    const n = Math.min(6, Math.max(1, Math.ceil(spec.glow.strength * 2)));
    c.save();
    c.shadowColor = rgba(spec.glow.color);
    c.shadowBlur = spec.glow.radius * k;
    c.fillStyle = rgba(spec.glow.color);
    for (let i = 0; i < n; i++) c.fillText(text, x, y);
    c.restore();
  }
  const sw = spec.stroke.width * k;
  const strokeIt = () => {
    c.save();
    c.lineWidth = sw;
    c.lineJoin = 'round';
    c.miterLimit = 2;
    c.strokeStyle = rgba(spec.stroke.color);
    c.strokeText(text, x, y);
    c.restore();
  };
  if (sw > 0 && !spec.stroke.over) strokeIt();
  c.fillStyle = fill;
  c.fillText(text, x, y);
  if (sw > 0 && spec.stroke.over) strokeIt();
  c.restore();
}

function cacheKey(spec: TextSpec, k: number, frameW: number, t: number, duration: number, count: number): string {
  const a = spec.animator;
  let bucket = 'S';
  if (a.preset !== 'none') {
    const settled = animSettledAt(a, count);
    const staticNow = a.preset !== 'color-wave' && a.preset !== 'karaoke' && t >= settled && (!a.out || t <= duration - settled);
    if (!staticNow) bucket = String(Math.round(t * 120));
  }
  return JSON.stringify([spec, +k.toFixed(4), spec.maxWidth > 0 ? Math.round(frameW) : 0, bucket, a.out ? Math.round(duration * 120) : 0]);
}

export function rasterizeText(inp: RasterIn): Raster {
  const { spec, frameW, frameH, t, duration } = inp;
  const k = Math.min(frameW, frameH) / 1080;
  // do truoc de biet so unit (cho khoa cache) — dung mot canvas nho dung chung
  const probe = (rasterizeText as any)._probe ?? ((rasterizeText as any)._probe = new OffscreenCanvas(8, 8).getContext('2d')!);
  applyFont(probe, spec, k);
  const L0 = layout(probe, spec, k, frameW);
  const key = cacheKey(spec, k, frameW, t, duration, L0.count);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  const a = spec.animator;
  const animPad = a.preset !== 'none' ? Math.max(a.distance * k, a.blur * k * 2, spec.size * k * 0.3) : 0;
  const pad = Math.ceil(Math.max(spec.stroke.width * k, spec.glow.strength > 0 ? spec.glow.radius * k * 2.5 : 0, spec.shadow.opacity > 0 ? spec.shadow.blur * k * 2 + Math.max(Math.abs(spec.shadow.x), Math.abs(spec.shadow.y)) * k : 0, animPad) + 4);
  const W = Math.min(MAX_DIM, Math.ceil(L0.bw + 2 * pad)),
    H = Math.min(MAX_DIM, Math.ceil(L0.bh + 2 * pad));
  const canvas = new OffscreenCanvas(Math.max(2, W), Math.max(2, H));
  const c = canvas.getContext('2d')!;
  applyFont(c, spec, k);
  const base = makeFill(c, spec.fill, pad, pad, L0.bw, L0.bh);
  const colorWave = a.preset === 'color-wave' || a.preset === 'karaoke';

  for (let li = 0; li < L0.lines.length; li++) {
    const line = L0.lines[li];
    const left = pad + (spec.align === 'left' ? 0 : spec.align === 'right' ? L0.bw - line.width : (L0.bw - line.width) / 2);
    const y = pad + li * L0.lineH + L0.lineH / 2;
    if (a.preset === 'none' || a.unit === 'line') {
      // ca dong: mot unit (hoac tinh)
      const u = line.units[0];
      const st = a.preset === 'none' || !u ? ({ alpha: 1, dx: 0, dy: 0, scale: 1, blur: 0, wave: 0 } as UnitState) : unitState(a, u.index, t, duration, k);
      const fill = colorWave && u ? waveColor(a, spec.fill, st.wave) : base;
      if (line.text) drawUnit(c, spec, k, line.text, left, y, line.width, st, fill);
    } else {
      for (const u of line.units) {
        const st = unitState(a, u.index, t, duration, k);
        const fill = colorWave ? waveColor(a, spec.fill, st.wave) : base;
        drawUnit(c, spec, k, u.text, left + u.x, y, u.w, st, fill);
      }
    }
  }
  const r: Raster = { canvas, width: canvas.width, height: canvas.height, pad, blockW: L0.bw, blockH: L0.bh };
  cache.set(key, r);
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return r;
}

/** Mau cua don vi theo `wave`: color-wave (0 -> mau thu hai, 1 -> mau goc); karaoke (0 -> mau goc, 1 -> mau nhan cua tu dang noi). */
function waveColor(a: Animator, f: Fill, wave: number): string {
  return a.preset === 'karaoke' ? lerpHex(firstColor(f), a.color, wave) : lerpHex(a.color, firstColor(f), wave);
}

function firstColor(f: Fill): string {
  return f.type === 'solid' ? f.color : [...f.stops].sort((a, b) => a.pos - b.pos)[0]?.color ?? '#ffffff';
}
