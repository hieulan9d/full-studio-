// Hinh hoc cua clip tren khung xem: hop (tam, rong, cao, goc xoay) theo toa do pixel cua khung du an (W x H cua ti le dang xem).
// Dung de chon clip bang chuot, ve khung chon + tay nam, va tinh snap. Cung cong thuc voi bo render (Renderer.layerRect), nen
// hop trung khop voi hinh that tren man hinh. Xem CHUC-NANG.md F-95.
import { resolveClip } from '../core/anim';
import type { Clip, Project, Transform } from '../core/schema';
import { Renderer } from '../render/renderer';
import { rasterizeChart } from '../render/chart-raster';
import { rasterizeShape } from '../render/shape-raster';
import { rasterizeText } from '../render/text-raster';

export interface Box {
  clipId: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number; // do (duong = theo chieu kim dong ho, nhu CSS)
  kind: 'text' | 'shape' | 'video' | 'image';
}

/** Khung (px) cua ti le dang xem tai cho goc cua du an (khong thu nho). */
export function frameSize(p: Project, aspect: string): { W: number; H: number } {
  const big = Math.max(p.width, p.height),
    small = Math.min(p.width, p.height);
  return aspect === '16:9' ? { W: big, H: small } : { W: small, H: big };
}

const cache = new Map<string, { w: number; h: number; pad: number }>();
function key(o: unknown) {
  return JSON.stringify(o);
}
function textBlock(spec: unknown, W: number, H: number, t: number, duration: number) {
  const k = key([spec, W, H, Math.round(t * 20), duration]);
  let v = cache.get(k);
  if (!v) {
    const r = rasterizeText({ spec: spec as never, frameW: W, frameH: H, t, duration });
    v = { w: r.blockW, h: r.blockH, pad: r.pad };
    cache.set(k, v);
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  }
  return v;
}

/** Hop cua mot clip (null = clip khong chon duoc bang chuot: am thanh, gen, chua co media...). Co the dung transform tuy chinh (luc dang keo). */
export function boxOf(p: Project, c: Clip, W: number, H: number, playhead: number, tfOverride?: Transform): Box | null {
  const lt = Math.min(c.duration, Math.max(0, playhead - c.start));
  const res = resolveClip(c, lt);
  const tf = tfOverride ?? res.transform;
  if (c.src.type === 'text') {
    const b = textBlock(res.text, W, H, lt, c.duration);
    const r = Renderer.layerRect(W, H, b.w + 2 * b.pad, b.h + 2 * b.pad, tf, { noFit: true, inset: b.pad });
    return { clipId: c.id, cx: r.cx, cy: r.cy, w: b.w * tf.scale, h: b.h * tf.scale, rot: tf.rotation, kind: 'text' };
  }
  if (c.src.type === 'shape') {
    const r0 = rasterizeShape(res.shape!, W, H);
    const bw = r0.width - 2 * r0.pad,
      bh = r0.height - 2 * r0.pad;
    const r = Renderer.layerRect(W, H, r0.width, r0.height, tf, { noFit: true, inset: r0.pad });
    return { clipId: c.id, cx: r.cx, cy: r.cy, w: bw * tf.scale, h: bh * tf.scale, rot: tf.rotation, kind: 'shape' };
  }
  if (c.src.type === 'chart') {
    const r0 = rasterizeChart(c.src.chart, W, H, lt);
    const r = Renderer.layerRect(W, H, r0.width, r0.height, tf, { noFit: true, inset: 0 });
    return { clipId: c.id, cx: r.cx, cy: r.cy, w: r0.width * tf.scale, h: r0.height * tf.scale, rot: tf.rotation, kind: 'shape' };
  }
  if (c.src.type === 'media') {
    const m = p.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId);
    if (!m || m.kind === 'audio') return null;
    const mw = m.cache?.width ?? m.width,
      mh = m.cache?.height ?? m.height;
    if (!mw || !mh) return null;
    const r = Renderer.layerRect(W, H, mw, mh, tf);
    return { clipId: c.id, cx: r.cx, cy: r.cy, w: r.sw, h: r.sh, rot: tf.rotation, kind: m.kind === 'image' ? 'image' : 'video' };
  }
  return null;
}

/** Cac hop cua clip dang hien tai playhead, tu duoi len tren (cung thu tu ve). */
export function boxesAt(p: Project, W: number, H: number, playhead: number): Box[] {
  const out: Box[] = [];
  const eps = 1e-6;
  for (const tr of p.tracks) {
    if (tr.kind !== 'video') continue;
    const c = p.clips.find((x) => !x.disabled && x.track === tr.id && playhead >= x.start - eps && playhead < x.start + x.duration - eps);
    if (!c) continue;
    try {
      const b = boxOf(p, c, W, H, playhead);
      if (b) out.push(b);
    } catch {
      /* clip chua ve duoc: bo qua */
    }
  }
  return out;
}

/** Bon goc (px) cua hop da xoay, theo thu tu: tren-trai, tren-phai, duoi-phai, duoi-trai. */
export function corners(b: { cx: number; cy: number; w: number; h: number; rot: number }): [number, number][] {
  const a = (b.rot * Math.PI) / 180,
    cs = Math.cos(a),
    sn = Math.sin(a);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const dx = (sx * b.w) / 2,
      dy = (sy * b.h) / 2;
    return [b.cx + dx * cs - dy * sn, b.cy + dx * sn + dy * cs] as [number, number];
  });
}

/** Diem (px khung) co nam trong hop khong. */
export function hit(b: { cx: number; cy: number; w: number; h: number; rot: number }, x: number, y: number, slop = 0): boolean {
  const a = (-b.rot * Math.PI) / 180,
    dx = x - b.cx,
    dy = y - b.cy;
  const lx = dx * Math.cos(a) - dy * Math.sin(a),
    ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= b.w / 2 + slop && Math.abs(ly) <= b.h / 2 + slop;
}

/** Hop bao (khong xoay) cua hop da xoay. */
export function bounds(b: { cx: number; cy: number; w: number; h: number; rot: number }) {
  const cs = corners(b);
  const xs = cs.map((c) => c[0]),
    ys = cs.map((c) => c[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export interface SnapResult {
  dx: number;
  dy: number;
  vlines: number[]; // x (px khung) cac duong gioi doc dang bam
  hlines: number[];
}

/** Doi dx,dy sao cho mep / tam hop bao bam vao giua khung, mep khung, vung an toan. thr = nguong (px khung). */
export function snapMove(bb: { x0: number; x1: number; y0: number; y1: number }, dx: number, dy: number, W: number, H: number, thr: number, safe = true): SnapResult {
  const m = Math.min(W, H);
  const xt = [0, W / 2, W, ...(safe ? [0.05 * m, W - 0.05 * m] : [])];
  const yt = [0, H / 2, H, ...(safe ? [0.05 * m, H - 0.05 * m] : [])];
  const one = (lo: number, hi: number, d: number, targets: number[]) => {
    const pts = [lo + d, (lo + hi) / 2 + d, hi + d];
    let best = { off: 0, line: NaN, dist: thr + 1e-9 };
    for (const p of pts) for (const t of targets) if (Math.abs(p - t) < best.dist) best = { off: t - p, line: t, dist: Math.abs(p - t) };
    return best;
  };
  const bx = one(bb.x0, bb.x1, dx, xt),
    by = one(bb.y0, bb.y1, dy, yt);
  return { dx: dx + (Number.isNaN(bx.line) ? 0 : bx.off), dy: dy + (Number.isNaN(by.line) ? 0 : by.off), vlines: Number.isNaN(bx.line) ? [] : [bx.line], hlines: Number.isNaN(by.line) ? [] : [by.line] };
}
