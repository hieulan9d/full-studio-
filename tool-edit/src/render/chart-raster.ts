// Vẽ clip biểu đồ bằng Canvas 2D thành texture premultiplied (cùng đường ống với chữ và hình). Xem F-96.
import { chartProgress, formatNumber, itemProgress, niceMax, type ChartSpec } from '../core/chart';

export interface ChartRaster {
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  pad: number;
}

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

type Ctx = OffscreenCanvasRenderingContext2D;

export function rasterizeChart(spec: ChartSpec, frameW: number, frameH: number, lt: number): ChartRaster {
  const k = Math.min(frameW, frameH) / 1080;
  const W = Math.max(2, Math.round(spec.w * k)),
    H = Math.max(2, Math.round(spec.h * k));
  const cv = new OffscreenCanvas(W, H);
  const g = cv.getContext('2d')!;
  const fs = spec.fontSize * k;
  const fam = `"${spec.font}", "Segoe UI", sans-serif`;
  const font = (size: number, weight = 500) => `${weight} ${Math.max(6, Math.round(size))}px ${fam}`;
  // thẻ nền
  if (spec.bgOpacity > 0) {
    g.fillStyle = rgba(spec.bg, spec.bgOpacity);
    g.beginPath();
    g.roundRect(0, 0, W, H, Math.min(spec.radius * k, W / 2, H / 2));
    g.fill();
  }
  const pad = 40 * k;
  let top = pad;
  g.textBaseline = 'alphabetic';
  if (spec.title) {
    g.fillStyle = spec.textColor;
    g.font = font(fs * 1.05, 700);
    g.textAlign = 'left';
    g.fillText(fit(g, spec.title, W - 2 * pad), pad, top + fs * 0.95);
    top += fs * 1.9;
  }
  const area = { x: pad, y: top, w: W - 2 * pad, h: H - top - pad };
  const col = (i: number) => spec.data[i].color ?? spec.palette[i % spec.palette.length];
  const fmt = (v: number) => formatNumber(v, spec.decimals, spec.prefix, spec.suffix);
  if (spec.kind === 'bar') drawBars(g, spec, area, k, fs, font, col, fmt, lt);
  else if (spec.kind === 'hbar') drawHBars(g, spec, area, k, fs, font, col, fmt, lt);
  else if (spec.kind === 'line') drawLine(g, spec, area, k, fs, font, col, fmt, lt);
  else if (spec.kind === 'number') drawNumber(g, spec, area, k, fs, font, fmt, lt);
  else drawPie(g, spec, area, k, fs, font, col, fmt, lt);
  return { canvas: cv, width: W, height: H, pad: 0 };
}

/** Cắt chuỗi cho vừa bề rộng (thêm …). */
function fit(g: Ctx, s: string, maxW: number): string {
  if (g.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}
type FontFn = (size: number, weight?: number) => string;

function drawBars(g: Ctx, spec: ChartSpec, area: Area, k: number, fs: number, font: FontFn, col: (i: number) => string, fmt: (v: number) => string, lt: number) {
  const max = spec.max > 0 ? spec.max : niceMax(Math.max(...spec.data.map((d) => d.value)));
  g.font = font(fs * 0.62, 500);
  const labW = g.measureText(fmt(max)).width + 14 * k;
  const a: Area = { x: area.x + labW, y: area.y + fs * 0.9, w: area.w - labW, h: area.h - fs * 0.9 - fs * 1.25 };
  // trục
  gridAndAxisV(g, spec, a, k, fs, font, max, fmt);
  const n = spec.data.length;
  const slot = a.w / n,
    bw = slot * 0.62;
  spec.data.forEach((d, i) => {
    const p = itemProgress(spec, i, lt);
    const x = a.x + slot * i + (slot - bw) / 2;
    const h = (d.value / max) * a.h * p;
    const y = a.y + a.h - h;
    if (h > 0.5) {
      g.fillStyle = col(i);
      g.beginPath();
      const r = Math.min(12 * k, bw / 2, h);
      g.roundRect(x, y, bw, h, [r, r, 0, 0]);
      g.fill();
    }
    g.textAlign = 'center';
    g.fillStyle = spec.textColor;
    g.font = font(fs * 0.62, 500);
    g.fillText(fit(g, d.label, slot - 6 * k), x + bw / 2, a.y + a.h + fs * 0.95);
    if (spec.valueLabels && p > 0.02) {
      g.font = font(fs * 0.7, 700);
      g.globalAlpha = Math.min(1, p * 1.6);
      g.fillText(fmt(d.value * p), x + bw / 2, y - 8 * k);
      g.globalAlpha = 1;
    }
  });
}

function gridAndAxisV(g: Ctx, spec: ChartSpec, a: Area, k: number, fs: number, font: FontFn, max: number, fmt: (v: number) => string) {
  const ticks = 4;
  g.font = font(fs * 0.62, 500);
  g.textAlign = 'right';
  for (let i = 0; i <= ticks; i++) {
    const v = (max * i) / ticks;
    const y = a.y + a.h - (a.h * i) / ticks;
    if (spec.grid) {
      g.strokeStyle = rgba(spec.textColor, i === 0 ? 0.35 : 0.12);
      g.lineWidth = Math.max(1, k * (i === 0 ? 2 : 1.5));
      g.beginPath();
      g.moveTo(a.x, y);
      g.lineTo(a.x + a.w, y);
      g.stroke();
    }
    g.fillStyle = rgba(spec.textColor, 0.7);
    g.fillText(fmt(v), a.x - 10 * k, y + fs * 0.2);
  }
}

function drawHBars(g: Ctx, spec: ChartSpec, area: Area, k: number, fs: number, font: FontFn, col: (i: number) => string, fmt: (v: number) => string, lt: number) {
  const max = spec.max > 0 ? spec.max : niceMax(Math.max(...spec.data.map((d) => d.value)));
  g.font = font(fs * 0.7, 500);
  const labW = Math.min(area.w * 0.34, Math.max(...spec.data.map((d) => g.measureText(d.label).width)) + 16 * k);
  const valW = spec.valueLabels ? g.measureText(fmt(max)).width + 20 * k : 0;
  const a: Area = { x: area.x + labW, y: area.y, w: area.w - labW - valW, h: area.h };
  if (spec.grid) {
    for (let i = 0; i <= 4; i++) {
      const x = a.x + (a.w * i) / 4;
      g.strokeStyle = rgba(spec.textColor, i === 0 ? 0.35 : 0.12);
      g.lineWidth = Math.max(1, k * (i === 0 ? 2 : 1.5));
      g.beginPath();
      g.moveTo(x, a.y);
      g.lineTo(x, a.y + a.h);
      g.stroke();
    }
  }
  const n = spec.data.length;
  const slot = a.h / n,
    bh = Math.min(slot * 0.62, 70 * k);
  spec.data.forEach((d, i) => {
    const p = itemProgress(spec, i, lt);
    const y = a.y + slot * i + (slot - bh) / 2;
    const w = (d.value / max) * a.w * p;
    g.fillStyle = spec.textColor;
    g.font = font(fs * 0.7, 500);
    g.textAlign = 'right';
    g.fillText(fit(g, d.label, labW - 12 * k), a.x - 12 * k, y + bh / 2 + fs * 0.24);
    if (w > 0.5) {
      g.fillStyle = col(i);
      g.beginPath();
      const r = Math.min(10 * k, bh / 2, w);
      g.roundRect(a.x, y, w, bh, [0, r, r, 0]);
      g.fill();
    }
    if (spec.valueLabels && p > 0.02) {
      g.fillStyle = spec.textColor;
      g.font = font(fs * 0.7, 700);
      g.textAlign = 'left';
      g.globalAlpha = Math.min(1, p * 1.6);
      g.fillText(fmt(d.value * p), a.x + w + 10 * k, y + bh / 2 + fs * 0.24);
      g.globalAlpha = 1;
    }
  });
}

function drawLine(g: Ctx, spec: ChartSpec, area: Area, k: number, fs: number, font: FontFn, col: (i: number) => string, fmt: (v: number) => string, lt: number) {
  const max = spec.max > 0 ? spec.max : niceMax(Math.max(...spec.data.map((d) => d.value)));
  g.font = font(fs * 0.62, 500);
  const labW = g.measureText(fmt(max)).width + 14 * k;
  const a: Area = { x: area.x + labW, y: area.y + fs * 0.9, w: area.w - labW - 20 * k, h: area.h - fs * 0.9 - fs * 1.25 };
  gridAndAxisV(g, spec, a, k, fs, font, max, fmt);
  const n = spec.data.length;
  const pts = spec.data.map((d, i) => ({ x: a.x + (n === 1 ? a.w / 2 : (a.w * i) / (n - 1)), y: a.y + a.h - (d.value / max) * a.h }));
  const prog = chartProgress(spec, lt) * Math.max(1, n - 1);
  const color = col(0);
  // đoạn đã vẽ: các đoạn nguyên + một phần đoạn đang vẽ
  const drawn: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (i <= Math.floor(prog)) drawn.push(pts[i]);
    else if (i - 1 < prog) {
      const u = prog - (i - 1);
      drawn.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u });
    }
  }
  if (drawn.length >= 2) {
    const grad = g.createLinearGradient(0, a.y, 0, a.y + a.h);
    grad.addColorStop(0, rgba(color, 0.35));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(drawn[0].x, a.y + a.h);
    for (const p of drawn) g.lineTo(p.x, p.y);
    g.lineTo(drawn[drawn.length - 1].x, a.y + a.h);
    g.closePath();
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 6 * k;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    drawn.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.stroke();
  }
  g.textAlign = 'center';
  spec.data.forEach((d, i) => {
    g.fillStyle = spec.textColor;
    g.font = font(fs * 0.62, 500);
    g.fillText(fit(g, d.label, (a.w / Math.max(1, n - 1)) * 0.95), pts[i].x, a.y + a.h + fs * 0.95);
    if (i <= prog + 1e-9) {
      g.fillStyle = col(0);
      g.beginPath();
      g.arc(pts[i].x, pts[i].y, 8 * k, 0, Math.PI * 2);
      g.fill();
      if (spec.valueLabels) {
        g.fillStyle = spec.textColor;
        g.font = font(fs * 0.66, 700);
        g.fillText(fmt(d.value), pts[i].x, pts[i].y - 16 * k);
      }
    }
  });
}

function drawPie(g: Ctx, spec: ChartSpec, area: Area, k: number, fs: number, font: FontFn, col: (i: number) => string, fmt: (v: number) => string, lt: number) {
  const total = spec.data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  const D = Math.min(area.h, area.w * 0.52);
  const cx = area.x + D / 2,
    cy = area.y + area.h / 2,
    R = D / 2;
  const sweep = chartProgress(spec, lt) * Math.PI * 2;
  let a0 = -Math.PI / 2;
  const hole = spec.kind === 'donut' ? R * 0.58 : 0;
  spec.data.forEach((d, i) => {
    const full = (Math.max(0, d.value) / total) * Math.PI * 2;
    const used = Math.min(full, Math.max(0, sweep - (a0 + Math.PI / 2)));
    if (used > 1e-4) {
      g.fillStyle = col(i);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, R, a0, a0 + used);
      g.closePath();
      g.fill();
    }
    a0 += full;
  });
  if (hole > 0) {
    // khoét lỗ: xoá phần giữa rồi tô lại nền thẻ (giữ trong suốt thật)
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(cx, cy, hole, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    if (spec.bgOpacity > 0) {
      g.fillStyle = rgba(spec.bg, spec.bgOpacity); // tô lại nền thẻ trong lỗ (không để xuyên thấu)
      g.beginPath();
      g.arc(cx, cy, hole, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.fillStyle = spec.textColor;
    g.textAlign = 'center';
    g.font = font(fs * 1.0, 700);
    g.fillText(fmt(total * chartProgress(spec, lt)), cx, cy + fs * 0.2);
  }
  // chú giải bên phải
  const lx = area.x + D + 36 * k;
  const rowH = Math.min(fs * 1.5, area.h / spec.data.length);
  const y0 = area.y + area.h / 2 - (rowH * spec.data.length) / 2;
  g.textAlign = 'left';
  spec.data.forEach((d, i) => {
    const y = y0 + rowH * i + rowH / 2;
    g.fillStyle = col(i);
    g.beginPath();
    g.roundRect(lx, y - fs * 0.28, fs * 0.56, fs * 0.56, 4 * k);
    g.fill();
    g.fillStyle = spec.textColor;
    g.font = font(fs * 0.68, 500);
    const pct = ((Math.max(0, d.value) / total) * 100).toFixed(0) + '%';
    const pw = g.measureText(pct).width;
    g.fillText(fit(g, d.label, area.x + area.w - lx - fs * 0.9 - pw - 10 * k), lx + fs * 0.8, y + fs * 0.24);
    g.textAlign = 'right';
    g.font = font(fs * 0.68, 700);
    g.fillText(pct, area.x + area.w, y + fs * 0.24);
    g.textAlign = 'left';
  });
}

function drawNumber(g: Ctx, spec: ChartSpec, area: Area, k: number, fs: number, font: FontFn, fmt: (v: number) => string, lt: number) {
  const d = spec.data[0];
  const p = chartProgress(spec, lt);
  const v = spec.from + (d.value - spec.from) * p;
  g.textAlign = 'center';
  g.fillStyle = spec.palette[0];
  let size = fs * 3.6;
  g.font = font(size, 800);
  const text = fmt(v);
  const maxW = area.w * 0.96;
  const wFinal = g.measureText(fmt(d.value)).width;
  if (wFinal > maxW) size *= maxW / wFinal; // số đích dài thì thu nhỏ để cả hai đầu đều vừa
  g.font = font(size, 800);
  g.fillText(text, area.x + area.w / 2, area.y + area.h / 2 + size * 0.2);
  if (d.label) {
    g.fillStyle = rgba(spec.textColor, 0.85);
    g.font = font(fs * 0.9, 500);
    g.fillText(fit(g, d.label, area.w), area.x + area.w / 2, area.y + area.h / 2 + size * 0.2 + fs * 1.5);
  }
}
