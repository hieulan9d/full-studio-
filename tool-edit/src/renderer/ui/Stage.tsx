// Khung xem co zoom / keo (pan) va tuong tac truc tiep: chon clip, keo de doi vi tri, keo goc de doi co, xoay, snap. F-94, F-95.
import { useEffect, useMemo, useRef } from 'react';
import { resolveClip } from '../../core/anim';
import type { Clip, Op, Transform } from '../../core/schema';
import { beginGesture, commit, endGesture, select } from '../actions';
import { boxOf, boxesAt, bounds, corners, frameSize, hit, snapMove, type Box } from '../clip-geom';
import { previewCfg } from '../engine';
import { player } from '../player';
import { PV_MAX, PV_MIN, effZoom, fitZoom, pvActual, pvFit, pvPanBy, pvZoomBy, pvZoomTo, previewScaleFor } from '../pview';
import { store, useStore } from '../store';
import { viText } from '../vi-runtime';

const HANDLE = 10; // px man hinh
const ROT_OFF = 30; // khoang cach tay xoay phia tren hop (px man hinh)

type Drag =
  | { kind: 'pan'; lx: number; ly: number; empty: boolean; dist: number }
  | { kind: 'move'; sx: number; sy: number; items: { clip: Clip; tf: Transform; box: Box }[]; moved: boolean }
  | { kind: 'scale'; clip: Clip; tf: Transform; box: Box; handle: number; dist0: number }
  | { kind: 'rotate'; clip: Clip; tf: Transform; box: Box; a0: number };

/** Dua gia tri moi cua cac thuoc tinh bien doi thanh op: co keyframe thi ghi keyframe tai con tro, khong thi doi gia tri nen. */
export function transformOps(clip: Clip, vals: Partial<Pick<Transform, 'x' | 'y' | 'scale' | 'rotation'>>, playhead: number): Op[] {
  const ops: Op[] = [];
  const base: Partial<Transform> = {};
  const lt = Math.min(clip.duration, Math.max(0, Math.round((playhead - clip.start) * 1e6) / 1e6));
  for (const [k, v] of Object.entries(vals) as [keyof Transform, number][]) {
    const prop = `transform.${k}`;
    if (clip.keyframes[prop]?.length) ops.push({ op: 'set_keyframe', id: clip.id, prop, t: lt, v });
    else (base as Record<string, number>)[k] = v;
  }
  if (Object.keys(base).length) ops.unshift({ op: 'set_transform', id: clip.id, patch: base });
  return ops;
}

// Day lenh theo kieu "moi nhat thang": chi mot yeu cau dang bay, ket qua cuoi cung luon duoc gui.
let inflight: Promise<void> | null = null;
let pendingOps: Op[] | null = null;
function pushOps(ops: Op[]) {
  pendingOps = ops;
  if (inflight) return;
  inflight = (async () => {
    while (pendingOps) {
      const o = pendingOps;
      pendingOps = null;
      await commit(o);
    }
    inflight = null;
  })();
}
async function flushOps() {
  while (inflight) await inflight;
}

export function Stage() {
  const aspect = useStore((s) => s.aspect);
  const project = useStore((s) => s.project);
  const draft = useStore((s) => s.draft);
  const playing = useStore((s) => s.playing);
  const playhead = useStore((s) => (s.playing ? 0 : s.playhead));
  const selection = useStore((s) => s.selection);
  const pv = useStore((s) => s.pv);
  const safe = useStore((s) => s.safeGuides);
  const guides = useStore((s) => s.guides);
  const err = useStore((s) => s.previewError);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const { W, H } = frameSize(project, aspect);

  // do kich thuoc vung xem
  useEffect(() => {
    const el = stageRef.current!;
    const ro = new ResizeObserver(() => {
      const cur = store.get().pv;
      if (cur.sw !== el.clientWidth || cur.sh !== el.clientHeight) store.set({ pv: { ...cur, sw: el.clientWidth, sh: el.clientHeight } });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoom = pv.fit ? fitZoom() : pv.zoom;
  const px = pv.fit ? 0 : pv.x,
    py = pv.fit ? 0 : pv.y;
  // doi ti le: ve lai khung
  useEffect(() => {
    pvFit();
  }, [aspect]);
  // do phan giai preview theo zoom
  const scale = previewScaleFor(zoom);
  useEffect(() => {
    if (previewCfg.scale !== scale) {
      previewCfg.scale = scale;
      player.requestRender();
    }
  }, [scale]);

  // cuon chuot = zoom quanh con tro (listener rieng de chan cuon trang)
  useEffect(() => {
    const el = stageRef.current!;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.pvbar')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      pvZoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const cur = draft?.project ?? project;
  const boxes = useMemo(() => (playing ? [] : boxesAt(cur, W, H, playhead)), [cur, W, H, playhead, playing]);
  const selBoxes = boxes.filter((b) => selection.includes(b.clipId));
  const single = selBoxes.length === 1 ? selBoxes[0] : null;

  const toFrame = (cx: number, cy: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: (cx - r.left) / zoom, y: (cy - r.top) / zoom };
  };

  const startDrag = (e: React.PointerEvent) => {
    if (playing) return;
    const stage = stageRef.current!;
    const target = e.target as HTMLElement | SVGElement;
    if ((target as HTMLElement).closest?.('.pvbar')) return;
    stage.setPointerCapture(e.pointerId);
    const s = store.get();
    const p = s.draft?.project ?? s.project;
    const pt = toFrame(e.clientX, e.clientY);
    const hd = (target as SVGElement).dataset?.handle;
    if (e.button === 1) {
      e.preventDefault();
      drag.current = { kind: 'pan', lx: e.clientX, ly: e.clientY, empty: false, dist: 0 };
      return;
    }
    if (e.button !== 0) return;
    const ph = s.playhead;
    const tfOf = (c: Clip) => resolveClip(c, Math.min(c.duration, Math.max(0, ph - c.start))).transform;
    if (hd && single) {
      const clip = p.clips.find((c) => c.id === single.clipId)!;
      const tf = tfOf(clip);
      beginGesture('pv');
      if (hd === 'rot') drag.current = { kind: 'rotate', clip, tf, box: single, a0: Math.atan2(pt.y - single.cy, pt.x - single.cx) };
      else {
        const i = Number(hd);
        const c = corners(single)[i];
        drag.current = { kind: 'scale', clip, tf, box: single, handle: i, dist0: Math.hypot(c[0] - single.cx, c[1] - single.cy) || 1 };
      }
      return;
    }
    // chon bang cach bam vao clip: uu tien clip dang chon, roi tu tren xuong
    const slop = 3 / zoom;
    let hitBox = boxes.filter((b) => selection.includes(b.clipId) && hit(b, pt.x, pt.y, slop)).pop();
    if (!hitBox) hitBox = [...boxes].reverse().find((b) => hit(b, pt.x, pt.y, slop));
    if (!hitBox) {
      // vung trong: keo = di chuyen khung xem; bam khong keo = bo chon
      drag.current = { kind: 'pan', lx: e.clientX, ly: e.clientY, empty: true, dist: 0 };
      return;
    }
    if (e.shiftKey) {
      select([hitBox.clipId], true);
      return;
    }
    if (!selection.includes(hitBox.clipId)) select([hitBox.clipId]);
    store.set({ rightTab: 'props' });
    // keo di chuyen: ca nhom dang chon (nhom ghep da duoc mo rong boi select)
    const ids = new Set(store.get().selection);
    const items = boxes
      .filter((b) => ids.has(b.clipId))
      .map((b) => {
        const clip = p.clips.find((c) => c.id === b.clipId)!;
        return { clip, tf: tfOf(clip), box: b };
      });
    beginGesture('pv');
    drag.current = { kind: 'move', sx: pt.x, sy: pt.y, items, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      const dx = e.clientX - d.lx,
        dy = e.clientY - d.ly;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        d.dist += Math.abs(dx) + Math.abs(dy);
        if (d.empty && d.dist < 4) return; // con coi la bam (chua keo)
        pvPanBy(dx, dy);
        d.lx = e.clientX;
        d.ly = e.clientY;
      }
      return;
    }
    const s = store.get();
    const pt = toFrame(e.clientX, e.clientY);
    const ph = s.playhead;
    if (d.kind === 'move') {
      let dx = pt.x - d.sx,
        dy = pt.y - d.sy;
      if (!d.moved && Math.hypot(dx, dy) * zoom < 3) return; // chua keo (tranh dich nho khi chi bam)
      d.moved = true;
      let g: { v: number[]; h: number[] } | null = null;
      if (s.snapOn && !e.altKey) {
        // snap theo hop bao cua ca nhom
        const bbs = d.items.map((it) => bounds(it.box));
        const bb = { x0: Math.min(...bbs.map((b) => b.x0)), x1: Math.max(...bbs.map((b) => b.x1)), y0: Math.min(...bbs.map((b) => b.y0)), y1: Math.max(...bbs.map((b) => b.y1)) };
        const r = snapMove(bb, dx, dy, W, H, 6 / zoom, s.safeGuides);
        dx = r.dx;
        dy = r.dy;
        g = r.vlines.length || r.hlines.length ? { v: r.vlines, h: r.hlines } : null;
      }
      if (e.shiftKey) {
        // giu truc: chi doi theo phuong dai hon
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      store.set({ guides: g });
      const ops: Op[] = [];
      for (const it of d.items) ops.push(...transformOps(it.clip, { x: round6(it.tf.x + dx / W), y: round6(it.tf.y + dy / H) }, ph));
      pushOps(ops);
    } else if (d.kind === 'scale') {
      const dist = Math.hypot(pt.x - d.box.cx, pt.y - d.box.cy);
      let sc = Math.min(50, Math.max(0.02, d.tf.scale * (dist / d.dist0)));
      if (!e.altKey && Math.abs(sc - 1) < 0.03) sc = 1; // bam ve 100%
      const p = (s.draft?.project ?? s.project);
      const nb = boxOf(p, d.clip, W, H, ph, { ...d.tf, scale: sc });
      // giu nguyen TAM hop khi doi co (neo trai/phai se dich tam theo co)
      const ox = nb ? (d.box.cx - nb.cx) / W : 0,
        oy = nb ? (d.box.cy - nb.cy) / H : 0;
      pushOps(transformOps(d.clip, { scale: round6(sc), x: round6(d.tf.x + ox), y: round6(d.tf.y + oy) }, ph));
    } else if (d.kind === 'rotate') {
      let a = Math.atan2(pt.y - d.box.cy, pt.x - d.box.cx) - d.a0;
      let deg = (a * 180) / Math.PI;
      deg = ((deg + 540) % 360) - 180; // (-180, 180]
      let rot = d.tf.rotation + deg;
      if (e.shiftKey) rot = Math.round(rot / 15) * 15;
      else if (!e.altKey) {
        const near = Math.round(rot / 90) * 90;
        if (Math.abs(rot - near) < 3) rot = near; // bam goc vuong
      }
      pushOps(transformOps(d.clip, { rotation: round6(rot) }, ph));
    }
  };

  const onUp = async (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* da tha */
    }
    if (!d) return;
    if (d.kind === 'pan') {
      if (d.empty && d.dist < 4) select([]);
      return;
    }
    await flushOps();
    endGesture();
    store.set({ guides: null });
  };

  // ---- ve hop chon ----
  const sw = HANDLE / zoom; // kich thuoc tay nam theo don vi khung
  const rotTip = single ? { x: single.cx + (Math.sin((single.rot * Math.PI) / 180) * (single.h / 2 + ROT_OFF / zoom)), y: single.cy - Math.cos((single.rot * Math.PI) / 180) * (single.h / 2 + ROT_OFF / zoom) } : null;
  const topMid = single ? { x: single.cx + Math.sin((single.rot * Math.PI) / 180) * (single.h / 2), y: single.cy - Math.cos((single.rot * Math.PI) / 180) * (single.h / 2) } : null;
  const stroke = 1.5 / zoom;
  const m = Math.min(W, H);

  return (
    <div
      className="stage"
      ref={stageRef}
      data-testid="stage"
      onPointerDown={startDrag}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onAuxClick={(e) => e.preventDefault()}
      style={{ cursor: drag.current?.kind === 'pan' ? 'grabbing' : undefined }}
    >
      <div
        className="pvwrap"
        ref={wrapRef}
        data-testid="pvwrap"
        data-zoom={zoom.toFixed(4)}
        style={{ left: pv.sw / 2 + px - (W * zoom) / 2, top: pv.sh / 2 + py - (H * zoom) / 2, width: W * zoom, height: H * zoom }}
      >
        <canvas ref={(el) => { if (el !== canvasRef.current) { canvasRef.current = el; player.attach(el); } }} data-testid="canvas" style={{ width: '100%', height: '100%' }} />
        <svg className="pvov" data-testid="pvov" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {safe && (
            <g className="safe" data-testid="safe-guides">
              <rect x={0.05 * m} y={0.05 * m} width={W - 0.1 * m} height={H - 0.1 * m} fill="none" stroke="#ffd34d" strokeWidth={stroke} strokeDasharray={`${6 / zoom} ${4 / zoom}`} />
              <rect x={0.1 * m} y={0.1 * m} width={W - 0.2 * m} height={H - 0.2 * m} fill="none" stroke="#ffd34d" strokeOpacity={0.55} strokeWidth={stroke} strokeDasharray={`${3 / zoom} ${5 / zoom}`} />
              <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#fff" strokeOpacity={0.35} strokeWidth={stroke} />
              <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#fff" strokeOpacity={0.35} strokeWidth={stroke} />
            </g>
          )}
          {selBoxes.map((b) => (
            <polygon key={b.clipId} className="selbox" data-testid="selbox" data-clip={b.clipId} points={corners(b).map((c) => c.join(',')).join(' ')} fill="none" stroke="#37a1ff" strokeWidth={stroke * 1.4} />
          ))}
          {single && topMid && rotTip && (
            <>
              <line x1={topMid.x} y1={topMid.y} x2={rotTip.x} y2={rotTip.y} stroke="#37a1ff" strokeWidth={stroke} />
              <circle data-handle="rot" data-testid="h-rot" cx={rotTip.x} cy={rotTip.y} r={sw * 0.62} fill="#fff" stroke="#37a1ff" strokeWidth={stroke} style={{ cursor: 'grab' }} />
              {corners(single).map((c, i) => (
                <rect key={i} data-handle={String(i)} data-testid={`h-${i}`} x={c[0] - sw / 2} y={c[1] - sw / 2} width={sw} height={sw} fill="#fff" stroke="#37a1ff" strokeWidth={stroke} style={{ cursor: i % 2 ? 'nesw-resize' : 'nwse-resize' }} />
              ))}
            </>
          )}
          {guides?.v.map((x, i) => <line key={`v${i}`} data-testid="guide-v" x1={x} y1={0} x2={x} y2={H} stroke="#ff3da5" strokeWidth={stroke} />)}
          {guides?.h.map((y, i) => <line key={`h${i}`} data-testid="guide-h" x1={0} y1={y} x2={W} y2={y} stroke="#ff3da5" strokeWidth={stroke} />)}
        </svg>
      </div>
      {draft && <div className="draft">Đang xem thử đề xuất {draft.id}</div>}
      {err && <div className="err" data-testid="preview-error">{viText(err)}</div>}
      <ZoomBar />
    </div>
  );
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

function ZoomBar() {
  const pv = useStore((s) => s.pv);
  const aspect = useStore((s) => s.aspect);
  const project = useStore((s) => s.project);
  void aspect;
  void project;
  const safe = useStore((s) => s.safeGuides);
  const snapOn = useStore((s) => s.snapOn);
  const z = pv.fit ? fitZoom() : pv.zoom;
  const lo = Math.log(PV_MIN),
    hi = Math.log(PV_MAX);
  return (
    <div className="pvbar" data-testid="pvbar" onPointerDown={(e) => e.stopPropagation()}>
      <button className="plain" data-testid="pv-out" title="Thu nhỏ (Alt+-, hoặc cuộn chuột)" onClick={() => pvZoomBy(1 / 1.25)}>−</button>
      <input type="range" data-testid="pv-range" min={0} max={1000} value={Math.round(((Math.log(z) - lo) / (hi - lo)) * 1000)} onChange={(e) => pvZoomTo(Math.exp(lo + (Number(e.target.value) / 1000) * (hi - lo)))} />
      <button className="plain" data-testid="pv-in" title="Phóng to (Alt+=, hoặc cuộn chuột)" onClick={() => pvZoomBy(1.25)}>+</button>
      <span className="pvpct" data-testid="pv-pct">{Math.round(z * 100)}%</span>
      <button className={pv.fit ? 'on' : ''} data-testid="pv-fit" title="Vừa khung (Alt+0)" onClick={pvFit}>Vừa</button>
      <button className={!pv.fit && Math.abs(z - 1) < 0.005 ? 'on' : ''} data-testid="pv-100" title="100%: 1 điểm ảnh khung = 1 điểm ảnh màn hình (Alt+1)" onClick={pvActual}>100%</button>
      <button className={safe ? 'on' : ''} data-testid="pv-safe" title="Vùng an toàn + đường giữa (Alt+G)" onClick={() => store.set({ safeGuides: !safe })}>An toàn</button>
      <button className={snapOn ? 'on' : ''} data-testid="pv-snap" title="Bám vào giữa / mép khung / vùng an toàn khi kéo (giữ Alt để tắt tạm)" onClick={() => store.set({ snapOn: !snapOn })}>Bám</button>
    </div>
  );
}

export { effZoom };
