// Ve hinh vector (rect, ellipse, ring, star) bang Canvas 2D thanh texture premultiplied, giong duong ong cua chu. Xem F-63.
import type { ShapeSpec } from '../core/fx';

export interface ShapeRaster {
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  pad: number;
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function rasterizeShape(spec: ShapeSpec, frameW: number, frameH: number): ShapeRaster {
  const k = Math.min(frameW, frameH) / 1080;
  const sw = Math.max(0, spec.stroke.width) * k;
  const pad = Math.ceil(sw / 2 + 2);
  const w = Math.max(1, Math.round(spec.w * k)),
    h = Math.max(1, Math.round(spec.h * k));
  const W = w + 2 * pad,
    H = h + 2 * pad;
  const cv = new OffscreenCanvas(W, H);
  const g = cv.getContext('2d')!;
  g.translate(pad, pad);
  const path = new Path2D();
  const cx = w / 2,
    cy = h / 2;
  if (spec.kind === 'rect') {
    const r = Math.min(spec.radius * k, w / 2, h / 2);
    path.roundRect(0, 0, w, h, r);
  } else if (spec.kind === 'ellipse' || spec.kind === 'ring') {
    path.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    const n = Math.round(spec.points),
      R = Math.min(w, h) / 2,
      rin = R * spec.inner;
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const rr = i % 2 === 0 ? R : rin;
      const x = cx + rr * Math.cos(a),
        y = cy + rr * Math.sin(a);
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
  }
  if (spec.fill && spec.kind !== 'ring' && spec.fillOpacity > 0) {
    g.fillStyle = rgba(spec.fill, spec.fillOpacity);
    g.fill(path);
  }
  if (sw > 0 && spec.trim > 0) {
    g.strokeStyle = rgba(spec.stroke.color, 1);
    g.lineWidth = sw;
    g.lineJoin = 'round';
    g.lineCap = spec.trim < 1 ? 'round' : 'butt';
    if (spec.trim >= 1) g.stroke(path);
    else if (spec.kind === 'ellipse' || spec.kind === 'ring') {
      // ve ho tu dinh, theo chieu kim dong ho
      const a0 = -Math.PI / 2;
      g.beginPath();
      g.ellipse(cx, cy, w / 2, h / 2, 0, a0, a0 + Math.PI * 2 * spec.trim);
      g.stroke();
    } else {
      // vien chu nhat/sao: dung net dut theo chu vi xap xi (do tu duong dan)
      const perim = spec.kind === 'rect' ? 2 * (w + h) : Math.max(1, 2 * Math.PI * Math.min(w, h) * 0.5 * 1.3);
      g.setLineDash([perim * spec.trim, perim * 2]);
      g.stroke(path);
    }
  }
  return { canvas: cv, width: W, height: H, pad };
}
