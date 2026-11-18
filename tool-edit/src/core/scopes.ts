// Scope: thong ke va ve anh tu so lieu dem cua compute shader (renderer.analyze). Thuan tuy, co test. Xem CHUC-NANG.md F-52.
export interface ScopeCounts {
  w: number;
  h: number;
  cols: number;
  hist: Uint32Array; // 6*256: R, G, B, luma, Cb, Cr (4, 5 chi co o ban moi)
  wave: Uint32Array; // 6*cols*256
  vect: Uint32Array; // 256*256, hang 0 = Cr cao nhat
}

export type ScopeKind = 'waveform' | 'rgbwave' | 'parade' | 'ycbcr' | 'vectorscope' | 'histogram';
export const SCOPE_KINDS: ScopeKind[] = ['waveform', 'rgbwave', 'parade', 'ycbcr', 'vectorscope', 'histogram'];
export const SCOPE_LABEL: Record<ScopeKind, string> = { waveform: 'Waveform', rgbwave: 'RGB chồng', parade: 'RGB Parade', ycbcr: 'YCbCr Parade', vectorscope: 'Vectorscope', histogram: 'Histogram' };

export interface FrameStats {
  pixels: number;
  channels: Record<'r' | 'g' | 'b' | 'luma', { mean: number; std: number; min: number; max: number; p1: number; p50: number; p99: number }>; // 0..1 (ma hoa sau Output Transform)
  clipped_high_pct: number; // % diem co do sang >= 0.98
  crushed_black_pct: number; // % diem co do sang <= 0.02
  channel_clip_pct: { r: number; g: number; b: number }; // % diem kenh >= 0.99
  below_legal_pct: number; // % diem co luma < 16/255 (duoi muc den hop le broadcast)
  above_legal_pct: number; // % diem co luma > 235/255 (tren muc trang hop le)
  saturation_mean: number; // do dai chroma trung binh (0..~0.5) cua cac diem co mau
  chroma_cb: number; // trung binh Cb, Cr (-0.5..0.5): lech mau tong the
  chroma_cr: number;
  cast: string; // mo ta mau bi lech
  skin_tone_pct: number; // % diem co mau nam gan duong da (+-12 do quanh 123 do) va du bao hoa
  zones_pct: { black: number; shadows: number; mids: number; highlights: number; white: number }; // % theo luma: <0.1, <0.35, <0.65, <0.9, con lai
}

const N = 256;

function histStats(h: Uint32Array, o: number, total: number) {
  let sum = 0,
    sq = 0,
    mn = -1,
    mx = 0;
  const cum: number[] = [];
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const c = h[o + i];
    sum += i * c;
    sq += i * i * c;
    acc += c;
    cum.push(acc);
    if (c > 0) {
      if (mn < 0) mn = i;
      mx = i;
    }
  }
  const mean = total ? sum / total : 0;
  const pct = (p: number) => {
    const k = total * p;
    for (let i = 0; i < N; i++) if (cum[i] >= k) return i / 255;
    return 1;
  };
  return { mean: mean / 255, std: Math.sqrt(Math.max(0, (total ? sq / total : 0) - mean * mean)) / 255, min: Math.max(0, mn) / 255, max: mx / 255, p1: pct(0.01), p50: pct(0.5), p99: pct(0.99) };
}

export function statsOf(d: ScopeCounts): FrameStats {
  const total = d.w * d.h;
  const r = (x: number) => Math.round(x * 10000) / 10000;
  const ch = (i: number) => {
    const s = histStats(d.hist, i * N, total);
    return { mean: r(s.mean), std: r(s.std), min: r(s.min), max: r(s.max), p1: r(s.p1), p50: r(s.p50), p99: r(s.p99) };
  };
  const frac = (from: number, to: number, c: number) => {
    let n = 0;
    for (let i = from; i <= to; i++) n += d.hist[c * N + i];
    return total ? (100 * n) / total : 0;
  };
  let cbSum = 0,
    crSum = 0,
    chromaSum = 0,
    skin = 0,
    colored = 0;
  const skinAngle = (123 * Math.PI) / 180;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = d.vect[y * N + x];
      if (!c) continue;
      const cb = x / 255 - 0.5,
        cr = (255 - y) / 255 - 0.5;
      cbSum += cb * c;
      crSum += cr * c;
      const rad = Math.hypot(cb, cr);
      chromaSum += rad * c;
      if (rad > 0.04) {
        colored += c;
        let da = Math.abs(Math.atan2(cr, cb) - skinAngle);
        if (da > Math.PI) da = 2 * Math.PI - da;
        if (da < (12 * Math.PI) / 180) skin += c;
      }
    }
  const cb = total ? cbSum / total : 0,
    cr = total ? crSum / total : 0;
  const mag = Math.hypot(cb, cr);
  let cast = 'trung tính';
  if (mag > 0.012) {
    const ang = (Math.atan2(cr, cb) * 180) / Math.PI;
    // goc tren vectorscope: 0 = xanh duong, 90 = do, 180 = vang, 270(-90) = xanh la/cyan
    cast = ang >= -45 && ang < 45 ? 'lệch xanh đường (lạnh)' : ang >= 45 && ang < 135 ? 'lệch độ/magenta (âm)' : ang >= 135 || ang < -135 ? 'lệch vàng/cam (âm)' : 'lệch xanh lá/cyan';
  }
  const lz = 3 * N;
  return {
    pixels: total,
    channels: { r: ch(0), g: ch(1), b: ch(2), luma: ch(3) },
    clipped_high_pct: r(frac(250, 255, 3)),
    crushed_black_pct: r(frac(0, 5, 3)),
    channel_clip_pct: { r: r(frac(252, 255, 0)), g: r(frac(252, 255, 1)), b: r(frac(252, 255, 2)) },
    below_legal_pct: r(frac(0, 15, 3)),
    above_legal_pct: r(frac(236, 255, 3)),
    saturation_mean: r(total ? chromaSum / total : 0),
    chroma_cb: r(cb),
    chroma_cr: r(cr),
    cast,
    skin_tone_pct: r(total ? (100 * skin) / total : 0),
    zones_pct: {
      black: r((100 * sumRange(d.hist, lz, 0, 25)) / Math.max(1, total)),
      shadows: r((100 * sumRange(d.hist, lz, 26, 89)) / Math.max(1, total)),
      mids: r((100 * sumRange(d.hist, lz, 90, 165)) / Math.max(1, total)),
      highlights: r((100 * sumRange(d.hist, lz, 166, 229)) / Math.max(1, total)),
      white: r((100 * sumRange(d.hist, lz, 230, 255)) / Math.max(1, total)),
    },
  };
}
const sumRange = (h: Uint32Array, o: number, a: number, b: number) => {
  let n = 0;
  for (let i = a; i <= b; i++) n += h[o + i];
  return n;
};

export interface Img {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

const newImg = (w: number, h: number): Img => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  return { width: w, height: h, rgba };
};
const px = (im: Img, x: number, y: number, r: number, g: number, b: number, a = 1) => {
  if (x < 0 || y < 0 || x >= im.width || y >= im.height) return;
  const i = (y * im.width + x) * 4;
  im.rgba[i] = im.rgba[i] * (1 - a) + r * a;
  im.rgba[i + 1] = im.rgba[i + 1] * (1 - a) + g * a;
  im.rgba[i + 2] = im.rgba[i + 2] * (1 - a) + b * a;
};
/** Cong them (anh sang) cho waveform. */
const add = (im: Img, x: number, y: number, r: number, g: number, b: number) => {
  const i = (y * im.width + x) * 4;
  im.rgba[i] = Math.min(255, im.rgba[i] + r);
  im.rgba[i + 1] = Math.min(255, im.rgba[i + 1] + g);
  im.rgba[i + 2] = Math.min(255, im.rgba[i + 2] + b);
};

function drawWave(d: ScopeCounts, im: Img, ox: number, ow: number, ch: number, colour: [number, number, number], max: number) {
  const { cols } = d;
  for (let x = 0; x < ow; x++) {
    const col = Math.min(cols - 1, Math.floor((x * cols) / ow));
    for (let lv = 0; lv < N; lv++) {
      const c = d.wave[(ch * cols + col) * N + lv];
      if (!c) continue;
      const k = Math.min(1, Math.sqrt(c / max) * 1.4);
      add(im, ox + x, N - 1 - lv, colour[0] * k, colour[1] * k, colour[2] * k);
    }
  }
}

function graticule(im: Img, ox: number, ow: number) {
  for (const v of [0, 16, 64, 128, 192, 235, 255]) for (let x = ox; x < ox + ow; x += 2) px(im, x, N - 1 - v, 255, 255, 255, v === 0 || v === 255 ? 0.25 : 0.12);
}

/** Ve mot scope thanh anh RGBA. */
export function drawScope(d: ScopeCounts, kind: ScopeKind, opts: { grid?: boolean } = {}): Img {
  const grid = opts.grid !== false; // grid=false: chi ve du lieu (UI tu ve luoi, nhan, vach muc hop le)
  if (kind === 'waveform' || kind === 'parade' || kind === 'rgbwave' || kind === 'ycbcr') {
    const ow = kind === 'parade' || kind === 'ycbcr' ? d.cols * 3 : d.cols * 2;
    const im = newImg(ow, N);
    const per = d.cols * 2;
    let maxc = 1;
    for (let ch = 0; ch < 4; ch++) {
      // chuan hoa theo mat do thuc te cua tung cot (diem / cot) de scope doc duoc o moi do phan giai
      for (let i = 0; i < d.cols * N; i++) maxc = Math.max(maxc, d.wave[ch * d.cols * N + i]);
    }
    maxc = Math.max(1, (d.w * d.h) / d.cols / 6); // ~ 1/6 so diem moi cot = sang toi da
    if (kind === 'waveform') {
      if (grid) graticule(im, 0, ow);
      drawWave(d, im, 0, per, 3, [200, 255, 200], maxc);
    } else if (kind === 'rgbwave') {
      if (grid) graticule(im, 0, ow);
      drawWave(d, im, 0, per, 0, [255, 60, 60], maxc);
      drawWave(d, im, 0, per, 1, [60, 255, 60], maxc);
      drawWave(d, im, 0, per, 2, [70, 110, 255], maxc);
    } else {
      if (grid) graticule(im, 0, ow);
      const pw = d.cols;
      const chs = kind === 'ycbcr' ? [3, 4, 5] : [0, 1, 2];
      const cols3: [number, number, number][] = kind === 'ycbcr' ? [[235, 235, 235], [90, 130, 255], [255, 70, 70]] : [[255, 70, 70], [70, 255, 70], [90, 130, 255]];
      drawWave(d, im, 0, pw, chs[0], cols3[0], maxc);
      drawWave(d, im, pw, pw, chs[1], cols3[1], maxc);
      drawWave(d, im, 2 * pw, pw, chs[2], cols3[2], maxc);
      if (grid) for (let y = 0; y < N; y++) {
        px(im, pw, y, 255, 255, 255, 0.3);
        px(im, 2 * pw, y, 255, 255, 255, 0.3);
      }
    }
    return im;
  }
  if (kind === 'histogram') {
    const im = newImg(512, 256);
    let mx = 1;
    for (let ch = 0; ch < 3; ch++) for (let i = 1; i < N - 1; i++) mx = Math.max(mx, d.hist[ch * N + i]);
    const cols: [number, number, number][] = [[255, 60, 60], [60, 255, 60], [80, 120, 255]];
    for (let x = 0; x < 512; x++) {
      const bin = Math.min(255, x >> 1);
      for (let ch = 0; ch < 3; ch++) {
        const hgt = Math.min(255, Math.round((Math.sqrt(d.hist[ch * N + bin] / mx)) * 250));
        for (let y = 0; y < hgt; y++) add(im, x, 255 - y, cols[ch][0] * 0.55, cols[ch][1] * 0.55, cols[ch][2] * 0.55);
      }
    }
    if (grid) for (const v of [0, 64, 128, 192, 255]) for (let y = 0; y < N; y += 3) px(im, Math.min(511, v * 2), y, 255, 255, 255, 0.2);
    return im;
  }
  // vectorscope
  const im = newImg(256, 256);
  let mx = 1;
  for (let i = 0; i < d.vect.length; i++) mx = Math.max(mx, d.vect[i]);
  mx = Math.max(1, (d.w * d.h) / 60);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = d.vect[y * N + x];
      if (!c) continue;
      const k = Math.min(1, Math.sqrt(c / mx) * 1.2);
      add(im, x, y, 120 * k, 255 * k, 180 * k);
    }
  if (!grid) return im;
  // luoi: vong tron 25/50/75%, truc, duong da (123 do), o muc tieu R G B Y C M (75%)
  for (const rad of [0.125, 0.25, 0.375]) for (let a = 0; a < 720; a++) px(im, Math.round(128 + 255 * rad * Math.cos(a / 114.6)), Math.round(128 - 255 * rad * Math.sin(a / 114.6)), 255, 255, 255, 0.12);
  for (let i = 0; i < 256; i++) {
    px(im, i, 128, 255, 255, 255, 0.1);
    px(im, 128, i, 255, 255, 255, 0.1);
  }
  const ang = (123 * Math.PI) / 180;
  for (let r = 0; r < 120; r++) px(im, Math.round(128 + r * Math.cos(ang)), Math.round(128 - r * Math.sin(ang)), 255, 190, 120, 0.7);
  const bars: [number, number, number][] = [[0.75, 0, 0], [0.75, 0.75, 0], [0, 0.75, 0], [0, 0.75, 0.75], [0, 0, 0.75], [0.75, 0, 0.75]];
  for (const [r, g, b] of bars) {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const cx = Math.round(128 + 255 * ((b - y) / 1.8556)),
      cy = Math.round(128 - 255 * ((r - y) / 1.5748));
    for (let k = -4; k <= 4; k++) {
      px(im, cx + k, cy - 4, 255, 255, 255, 0.5);
      px(im, cx + k, cy + 4, 255, 255, 255, 0.5);
      px(im, cx - 4, cy + k, 255, 255, 255, 0.5);
      px(im, cx + 4, cy + k, 255, 255, 255, 0.5);
    }
  }
  return im;
}
