// Tab "Scope": waveform, RGB chồng, RGB parade, vectorscope (đường da, ô mục tiêu), histogram + số đo của khung đang xem.
// Vẽ ở độ phân giải thiết bị có nhãn %, vạch mức hợp lệ 16/235; rê chuột lên scope để đọc giá trị chính xác; chọn vùng đo.
import { viText } from '../vi-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import { applyLive } from '../live';
import { drawScope, SCOPE_KINDS, SCOPE_LABEL, statsOf, type FrameStats, type ScopeCounts, type ScopeKind } from '../../core/scopes';
import { analyzeAt } from '../engine';
import { store, useStore } from '../store';
import { Row, Section } from './fields';

type RoiKey = 'full' | 'center' | 'upper' | 'lower';
const ROIS: { k: RoiKey; label: string; v?: { x0: number; y0: number; x1: number; y1: number } }[] = [
  { k: 'full', label: 'Toàn khung' },
  { k: 'center', label: 'Giữa 50%', v: { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 } },
  { k: 'upper', label: 'Nửa trên', v: { x0: 0, y0: 0, x1: 1, y1: 0.5 } },
  { k: 'lower', label: 'Nửa dưới', v: { x0: 0, y0: 0.5, x1: 1, y1: 1 } },
];

interface Layout {
  kind: ScopeKind;
  px: number;
  py: number;
  pw: number;
  ph: number;
  zoom: number;
  W: number;
  H: number;
  dpr: number;
}

const LEGAL_LO = 16 / 255;
const LEGAL_HI = 235 / 255;
// ô mục tiêu 75% của thanh màu: R, Y, G, C, B, M
const TARGETS: { n: string; rgb: [number, number, number]; col: string }[] = [
  { n: 'R', rgb: [0.75, 0, 0], col: '#ff6b6b' },
  { n: 'Y', rgb: [0.75, 0.75, 0], col: '#ffe066' },
  { n: 'G', rgb: [0, 0.75, 0], col: '#69db7c' },
  { n: 'C', rgb: [0, 0.75, 0.75], col: '#66d9e8' },
  { n: 'B', rgb: [0, 0, 0.75], col: '#74a7ff' },
  { n: 'M', rgb: [0.75, 0, 0.75], col: '#e599f7' },
];
const cbcr = (r: number, g: number, b: number) => {
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { cb: (b - y) / 1.8556, cr: (r - y) / 1.5748 };
};

function paintScope(cv: HTMLCanvasElement, d: ScopeCounts, kind: ScopeKind, cssW: number, vzoom: number): Layout {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const square = kind === 'vectorscope';
  const cssH = square ? Math.min(cssW, 320) : kind === 'histogram' ? 200 : 230;
  const W = Math.round(cssW * dpr),
    H = Math.round(cssH * dpr);
  cv.width = W;
  cv.height = H;
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, W, H);
  const im = drawScope(d, kind, { grid: false });
  const off = document.createElement('canvas');
  off.width = im.width;
  off.height = im.height;
  off.getContext('2d')!.putImageData(new ImageData(im.rgba as Uint8ClampedArray<ArrayBuffer>, im.width, im.height), 0, 0);
  const f = (n: number) => Math.round(n * dpr);
  const gl = square ? 0 : f(30),
    gr = square ? 0 : f(8),
    gt = f(8),
    gb = kind === 'histogram' ? f(20) : f(8);
  let L: Layout;
  ctx.font = `${f(10)}px "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';
  if (square) {
    const size = Math.min(W, H) - 2 * f(4);
    const px = Math.round((W - size) / 2),
      py = Math.round((H - size) / 2);
    L = { kind, px, py, pw: size, ph: size, zoom: vzoom, W, H, dpr };
    ctx.imageSmoothingEnabled = vzoom > 1;
    const c0 = 128 - 128 / vzoom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, size, size);
    ctx.clip();
    ctx.drawImage(off, c0, c0, 256 / vzoom, 256 / vzoom, px, py, size, size);
    // vùng màu phẳng chỉ chiếm 1 ô => chấm nhỏ; thêm quầng sáng để nhìn thấy (không đổi dữ liệu)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${f(2.2)}px)`;
    ctx.drawImage(off, c0, c0, 256 / vzoom, 256 / vzoom, px, py, size, size);
    ctx.drawImage(off, c0, c0, 256 / vzoom, 256 / vzoom, px, py, size, size);
    ctx.filter = `blur(${f(5)}px)`;
    ctx.drawImage(off, c0, c0, 256 / vzoom, 256 / vzoom, px, py, size, size);
    ctx.drawImage(off, c0, c0, 256 / vzoom, 256 / vzoom, px, py, size, size);
    ctx.restore();
    const cx = px + size / 2,
      cy = py + size / 2,
      k = size * vzoom; // pixel / đơn vị Cb,Cr
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, cy);
    ctx.lineTo(px + size, cy);
    ctx.moveTo(cx, py);
    ctx.lineTo(cx, py + size);
    ctx.stroke();
    for (const rad of [0.125, 0.25, 0.375, 0.5]) {
      ctx.beginPath();
      ctx.arc(cx, cy, rad * k, 0, Math.PI * 2);
      ctx.stroke();
      if (rad * k < size / 2 - f(8)) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillText(`${Math.round(rad * 200)}%`, cx + f(3), cy - rad * k + f(7));
      }
    }
    // đường da (123°)
    const a = (123 * Math.PI) / 180;
    ctx.strokeStyle = 'rgba(255,190,120,.8)';
    ctx.setLineDash([f(4), f(3)]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * size, cy - Math.sin(a) * size);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,190,120,.95)';
    const sx = cx + Math.cos(a) * 0.42 * k,
      sy = cy - Math.sin(a) * 0.42 * k;
    if (sx > px && sy > py && sx < px + size && sy < py + size) ctx.fillText('da', sx + f(3), sy);
    // ô mục tiêu 75%
    ctx.textAlign = 'center';
    for (const tg of TARGETS) {
      const { cb, cr } = cbcr(...tg.rgb);
      const x = cx + cb * k,
        y = cy - cr * k;
      if (x < px + f(8) || y < py + f(8) || x > px + size - f(8) || y > py + size - f(8)) continue;
      ctx.strokeStyle = tg.col;
      ctx.lineWidth = f(1.2);
      ctx.strokeRect(x - f(5), y - f(5), f(10), f(10));
      ctx.fillStyle = tg.col;
      ctx.fillText(tg.n, x + (cb >= 0 ? f(11) : -f(11)), y + (cr >= 0 ? -f(7) : f(7)));
    }
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    return L;
  }
  const pw = W - gl - gr,
    ph = H - gt - gb;
  L = { kind, px: gl, py: gt, pw, ph, zoom: 1, W, H, dpr };
  ctx.imageSmoothingEnabled = kind !== 'histogram';
  if (kind !== 'histogram' && im.width > pw) {
    // thu nhỏ theo chiều ngang bằng MAX (không lấy trung bình): giữ độ sáng của vệt mảnh, không bị mờ khi ảnh rộng hơn khung vẽ
    const tw = Math.max(1, pw);
    const src = im.rgba;
    const dst = new Uint8ClampedArray(tw * im.height * 4);
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor((x * im.width) / tw),
        x1 = Math.max(x0 + 1, Math.floor(((x + 1) * im.width) / tw));
      for (let y = 0; y < im.height; y++) {
        let r = 0, g = 0, b = 0;
        for (let xx = x0; xx < x1; xx++) {
          const i = (y * im.width + xx) * 4;
          if (src[i] > r) r = src[i];
          if (src[i + 1] > g) g = src[i + 1];
          if (src[i + 2] > b) b = src[i + 2];
        }
        const o = (y * tw + x) * 4;
        dst[o] = r; dst[o + 1] = g; dst[o + 2] = b; dst[o + 3] = 255;
      }
    }
    const small = document.createElement('canvas');
    small.width = tw;
    small.height = im.height;
    small.getContext('2d')!.putImageData(new ImageData(dst, tw, im.height), 0, 0);
    ctx.drawImage(small, 0, 0, tw, im.height, gl, gt, pw, ph);
  } else ctx.drawImage(off, 0, 0, im.width, im.height, gl, gt, pw, ph);
  ctx.lineWidth = 1;
  if (kind === 'histogram') {
    ctx.textAlign = 'center';
    for (const v of [0, 64, 128, 192, 255]) {
      const x = gl + (v / 255) * pw;
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.moveTo(x + 0.5, gt);
      ctx.lineTo(x + 0.5, gt + ph);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillText(String(v), Math.min(W - f(8), Math.max(f(8), x)), gt + ph + f(11));
    }
    ctx.strokeStyle = 'rgba(245,166,35,.7)';
    ctx.setLineDash([f(4), f(3)]);
    for (const v of [16, 235]) {
      const x = gl + (v / 255) * pw;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, gt);
      ctx.lineTo(x + 0.5, gt + ph);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'right';
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const y = gt + (1 - p) * ph;
      ctx.strokeStyle = p === 0 || p === 1 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.13)';
      ctx.beginPath();
      ctx.moveTo(gl, y + 0.5);
      ctx.lineTo(gl + pw, y + 0.5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillText(String(Math.round(p * 100)), gl - f(5), Math.min(H - f(7), Math.max(f(7), y)));
    }
    // mức hợp lệ: 16 (đen) và 235 (trắng)
    ctx.strokeStyle = 'rgba(245,166,35,.75)';
    ctx.setLineDash([f(4), f(3)]);
    for (const v of [LEGAL_LO, LEGAL_HI]) {
      const y = gt + (1 - v) * ph;
      ctx.beginPath();
      ctx.moveTo(gl, y + 0.5);
      ctx.lineTo(gl + pw, y + 0.5);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(245,166,35,.9)';
    ctx.textAlign = 'left';
    ctx.fillText('235', gl + pw - f(22), gt + (1 - LEGAL_HI) * ph - f(6));
    ctx.fillText('16', gl + pw - f(14), gt + (1 - LEGAL_LO) * ph + f(7));
    if (kind === 'parade') {
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      for (const i of [1, 2]) {
        const x = gl + (pw * i) / 3;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, gt);
        ctx.lineTo(x + 0.5, gt + ph);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ['R', 'G', 'B'].forEach((n, i) => {
        ctx.fillStyle = ['#ff6b6b', '#69db7c', '#74a7ff'][i];
        ctx.fillText(n, gl + (pw * (i + 0.5)) / 3, gt + f(9));
      });
      ctx.textAlign = 'left';
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.strokeRect(gl + 0.5, gt + 0.5, pw - 1, ph - 1);
  return L;
}

/** Đọc giá trị tại vị trí chuột (toạ độ CSS trong canvas). */
function probe(L: Layout, d: ScopeCounts, mx: number, my: number): string {
  const x = mx * L.dpr - L.px,
    y = my * L.dpr - L.py;
  if (x < 0 || y < 0 || x > L.pw || y > L.ph) return '';
  const total = Math.max(1, d.w * d.h);
  if (L.kind === 'vectorscope') {
    const k = L.pw * L.zoom;
    const cb = (x - L.pw / 2) / k,
      cr = -(y - L.ph / 2) / k;
    const sat = Math.hypot(cb, cr) / 0.5;
    let hue = (Math.atan2(cr, cb) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    let da = Math.abs(hue - 123);
    if (da > 180) da = 360 - da;
    const bx = Math.min(255, Math.max(0, Math.round((cb + 0.5) * 255))),
      by = Math.min(255, Math.max(0, 255 - Math.round((cr + 0.5) * 255)));
    const n = d.vect[by * 256 + bx];
    return `Cb ${(cb * 100).toFixed(1)}% · Cr ${(cr * 100).toFixed(1)}% · bão hòa ${(sat * 100).toFixed(0)}% · góc ${hue.toFixed(0)}° (cách đường da ${da.toFixed(0)}°) · ${((100 * n) / total).toFixed(3)}% điểm tại ô này`;
  }
  const lv = (1 - y / L.ph) * 255;
  if (L.kind === 'histogram') {
    const v = Math.min(255, Math.max(0, Math.round((x / L.pw) * 255)));
    const pc = (c: number) => ((100 * d.hist[c * 256 + v]) / total).toFixed(2);
    return `Giá trị ${v}/255 (${((v / 255) * 100).toFixed(0)}%) · số điểm đúng giá trị này: R ${pc(0)}% · G ${pc(1)}% · B ${pc(2)}% · luma ${pc(3)}%`;
  }
  const v = Math.min(255, Math.max(0, Math.round(lv)));
  const legal = v < 16 ? ' · DƯỚI mức đen hợp lệ (16)' : v > 235 ? ' · TRÊN mức trắng hợp lệ (235)' : '';
  return `Mức ${((v / 255) * 100).toFixed(1)}% · mã ${v}/255${legal}`;
}

export function Scope() {
  const base = useStore((s) => s.draft?.project ?? s.project);
  const live = useStore((s) => s.live);
  const project = useMemo(() => applyLive(base, live), [base, live]); // kéo thanh chỉnh màu: scope đổi theo ngay
  const t = useStore((s) => (s.playing ? Math.floor(s.playhead * 8) / 8 : s.playhead));
  const playing = useStore((s) => s.playing);
  const aspect = useStore((s) => s.aspect);
  const viewMode = useStore((s) => s.viewMode);
  const [kind, setKind] = useState<ScopeKind>('waveform');
  const [roi, setRoi] = useState<RoiKey>('full');
  const [vzoom, setVzoom] = useState(1);
  const [st, setSt] = useState<FrameStats | null>(null);
  const [meta, setMeta] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [tip, setTip] = useState('');
  const cv = useRef<HTMLCanvasElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);
  const again = useRef(false);
  const lay = useRef<{ L: Layout; d: ScopeCounts } | null>(null);
  const latest = useRef({ project, t, aspect, kind, roi, vzoom, playing });
  latest.current = { project, t, aspect, kind, roi, vzoom, playing };

  const run = async () => {
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      do {
        again.current = false;
        const { project: p, t: tt, aspect: a, kind: k, roi: rk, vzoom: vz, playing: pl } = latest.current;
        try {
          // đứng yên: đo ở 0.5 độ phân giải khung (nhiều điểm hơn, chính xác hơn); đang phát: 0.3 cho nhẹ
          const d = await analyzeAt(p, tt, pl ? 0.3 : 0.5, a, ROIS.find((r) => r.k === rk)?.v);
          const c = cv.current;
          if (c) {
            const L = paintScope(c, d, k, Math.max(120, Math.floor((wrap.current?.clientWidth ?? 324) - 24)), vz);
            lay.current = { L, d };
          }
          setSt(statsOf(d));
          setMeta(`${d.w}×${d.h} = ${(d.w * d.h).toLocaleString('vi-VN')} điểm`);
          setErr(null);
        } catch (e) {
          setErr(String((e as Error).message ?? e));
        }
      } while (again.current);
    } finally {
      busy.current = false;
    }
  };
  useEffect(() => {
    void run();
  }, [project, t, aspect, kind, roi, vzoom]);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => void run());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const c = cv.current;
    const cur = lay.current;
    if (!c || !cur) return;
    const r = c.getBoundingClientRect();
    setTip(probe(cur.L, cur.d, e.clientX - r.left, e.clientY - r.top));
  };

  const f = (x: number) => (x * 100).toFixed(1);
  const rows: { n: string; k: 'luma' | 'r' | 'g' | 'b'; col: string }[] = [
    { n: 'Luma', k: 'luma', col: '#e6e9f0' },
    { n: 'R', k: 'r', col: '#ff6b6b' },
    { n: 'G', k: 'g', col: '#69db7c' },
    { n: 'B', k: 'b', col: '#74a7ff' },
  ];
  const z = st?.zones_pct;
  return (
    <div className="scroll" data-testid="scope">
      <Section title="Scope">
        <div style={{ padding: '2px 12px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SCOPE_KINDS.map((k) => <button key={k} className={kind === k ? 'primary' : ''} data-testid={`scope-${k}`} onClick={() => setKind(k)}>{SCOPE_LABEL[k]}</button>)}
        </div>
        <div ref={wrap} style={{ padding: '6px 12px' }}>
          <canvas ref={cv} data-testid="scope-canvas" onMouseMove={onMove} onMouseLeave={() => setTip('')} style={{ display: 'block', margin: '0 auto', background: '#000', borderRadius: 4 }} />
          <div className="kbd" data-testid="scope-probe" style={{ minHeight: 34, paddingTop: 4, lineHeight: 1.45 }}>{tip || 'Rê chuột lên scope để đọc giá trị chính xác tại điểm đó.'}</div>
          {err && <div className="warn">{viText(err)}</div>}
        </div>
        <Row label="Vùng đo">
          <span className="seg">
            {ROIS.map((r) => <button key={r.k} className={roi === r.k ? 'on' : ''} data-testid={`scope-roi-${r.k}`} onClick={() => setRoi(r.k)}>{r.label}</button>)}
          </span>
        </Row>
        {kind === 'vectorscope' && (
          <Row label="Phóng vector">
            <span className="seg">
              {[1, 2, 4].map((zv) => <button key={zv} className={vzoom === zv ? 'on' : ''} data-testid={`scope-vz-${zv}`} onClick={() => setVzoom(zv)}>{zv}×</button>)}
            </span>
          </Row>
        )}
        <Row label="Chế độ xem">
          <span className="seg">
            <button className={viewMode === 'false' ? 'on' : ''} data-testid="scope-false" onClick={() => store.set({ viewMode: viewMode === 'false' ? 'none' : 'false' })}>Màu giả</button>
            <button className={viewMode === 'clip' ? 'on' : ''} data-testid="scope-clip" onClick={() => store.set({ viewMode: viewMode === 'clip' ? 'none' : 'clip' })}>Cảnh báo clip</button>
          </span>
        </Row>
        <div className="kbd" style={{ padding: '2px 12px 6px' }}>Đo {meta}{roi !== 'full' ? ` (${ROIS.find((r) => r.k === roi)?.label.toLowerCase()})` : ''} · sau chuyển đổi đầu ra, 8-bit. Vạch cam: mức hợp lệ 16 và 235.</div>
      </Section>
      {st && z && (
        <Section title="Số đo khung này">
          <div style={{ padding: '2px 12px', lineHeight: 1.6 }} data-testid="scope-stats">
            <table className="stt">
              <thead><tr><th>Kênh</th><th>TB</th><th>p1</th><th>Giữa</th><th>p99</th><th>Min</th><th>Max</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const c = st.channels[r.k];
                  return <tr key={r.k}><td style={{ color: r.col }}>{r.n}</td><td>{f(c.mean)}</td><td>{f(c.p1)}</td><td>{f(c.p50)}</td><td>{f(c.p99)}</td><td>{f(c.min)}</td><td>{f(c.max)}</td></tr>;
                })}
              </tbody>
            </table>
            <div className="kbd">Số liệu theo %, thang 0–100.</div>
            <div className="kbd" data-testid="stat-clip">Cháy sáng {st.clipped_high_pct}% · đen ép {st.crushed_black_pct}%</div>
            <div className="kbd" data-testid="stat-legal">Ngoài dải hợp lệ: dưới 16 {st.below_legal_pct}% · trên 235 {st.above_legal_pct}%</div>
            <div className="kbd">Kẹp kênh (≥252): R {st.channel_clip_pct.r}% · G {st.channel_clip_pct.g}% · B {st.channel_clip_pct.b}%</div>
            <div className="kbd">Bão hòa TB {f(st.saturation_mean)} · màu: {st.cast} · da {st.skin_tone_pct}%</div>
            <div className="kbd">Lệch màu tổng thể: Cb {f(st.chroma_cb)} · Cr {f(st.chroma_cr)}</div>
            <div className="zonebar" title="Phân bố theo vùng sáng">
              {[['#000', z.black], ['#2a2f3a', z.shadows], ['#5b6475', z.mids], ['#a7aebf', z.highlights], ['#fff', z.white]].map(([col, v], i) => <i key={i} style={{ background: col as string, flexGrow: Math.max(0.0001, v as number) }} />)}
            </div>
            <div className="kbd">Vùng: đen {z.black}% · tối {z.shadows}% · giữa {z.mids}% · sáng {z.highlights}% · trắng {z.white}%</div>
          </div>
        </Section>
      )}
    </div>
  );
}
