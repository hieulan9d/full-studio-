// Graph editor: duong gia tri theo thoi gian cua mot thuoc tinh co keyframe; keo diem keyframe; chinh ease bang bezier (2 tay nam);
// preset ease; sao chep/dan keyframe. Moi thay doi gui bang op khi tha chuot.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ANIM_PROPS, EASE_NAMES, EASE_PRESETS, PROP_LABEL, bezierAt, easeName, evalTrack, isAnimatable, type Ease } from '../../core/anim';
import { copyKeys, moveKey, pasteKeys, removeKey, setEaseMany, setKeyEase, toggleKeyframe, clipLocal } from '../actions';
import { player } from '../player';
import { store, useStore } from '../store';
import { NumField } from './fields';

const W = 312,
  H = 200,
  PL = 36,
  PR = 10,
  PT = 12,
  PB = 22;
const EBOX = 150;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

interface Dragging {
  index: number;
  t: number;
  v: number;
}

export function Graph() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const graphProp = useStore((s) => s.graphProp);
  const graphKey = useStore((s) => s.graphKey);
  const clipboard = useStore((s) => s.clipboard);
  const ph = useStore((s) => (s.playing ? Math.floor(s.playhead * 4) / 4 : s.playhead));
  const clip = selection.length === 1 ? project.clips.find((c) => c.id === selection[0]) : undefined;
  const svgRef = useRef<SVGSVGElement>(null);
  const eRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Dragging | null>(null);
  const [easeDraft, setEaseDraft] = useState<Ease | null>(null);

  const props = clip ? Object.keys(clip.keyframes).filter((p) => clip.keyframes[p]?.length) : [];
  const prop = clip ? (graphProp && props.includes(graphProp) ? graphProp : props[0] ?? null) : null;
  const keys = clip && prop ? clip.keyframes[prop] : [];

  // phim tat sao chep/dan khi dang o tab nay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
      if (!clip || !prop) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyKeys(clip, prop, graphKey);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        void pasteKeys(clip);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clip, prop, graphKey]);

  const view = useMemo(() => {
    if (!clip || !keys.length) return null;
    const tMax = Math.max(clip.duration, keys[keys.length - 1].t, 0.1);
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i <= 80; i++) {
      const v = evalTrack(keys, (i / 80) * tMax);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    for (const k of keys) {
      lo = Math.min(lo, k.v);
      hi = Math.max(hi, k.v);
    }
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    const m = (hi - lo) * 0.12;
    return { tMax, lo: lo - m, hi: hi + m };
  }, [clip, keys]);

  if (!clip) return <div className="scroll"><div className="empty">Chọn một clip để xem đường cong keyframe.</div></div>;

  const addable = ANIM_PROPS.filter((p) => isAnimatable(p, clip) && !props.includes(p));

  if (!prop || !view) {
    return (
      <div className="scroll" data-testid="graph">
        <div className="empty">Clip này chưa có keyframe.<br />Bấm ◇ cạnh một ô số (tab Thuộc tính), hoặc chọn thuộc tính dưới đây để thêm keyframe tại con trỏ.</div>
        <div style={{ padding: '0 12px' }}>
          <select data-testid="graph-add-prop" value="" onChange={(e) => { if (e.target.value) { store.set({ graphProp: e.target.value }); void toggleKeyframe(clip, e.target.value); } }} style={{ width: '100%' }}>
            <option value="">+ Thêm keyframe cho thuộc tính...</option>
            {addable.map((p) => <option key={p} value={p}>{PROP_LABEL[p] ?? p}</option>)}
          </select>
        </div>
      </div>
    );
  }

  const X = (t: number) => PL + (t / view.tMax) * (W - PL - PR);
  const Y = (v: number) => PT + (1 - (v - view.lo) / (view.hi - view.lo)) * (H - PT - PB);
  const tOf = (cx: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((cx - r.left) / r.width) * W;
    return clamp(((px - PL) / (W - PL - PR)) * view.tMax, 0, view.tMax);
  };
  const vOf = (cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const py = ((cy - r.top) / r.height) * H;
    return view.lo + (1 - (py - PT) / (H - PT - PB)) * (view.hi - view.lo);
  };

  const shown = keys.map((k, i) => (drag && drag.index === i ? { ...k, t: drag.t, v: drag.v } : k));
  const sorted = [...shown].sort((a, b) => a.t - b.t);
  const curve = Array.from({ length: 121 }, (_, i) => {
    const t = (i / 120) * view.tMax;
    return `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(evalTrack(sorted, t)).toFixed(1)}`;
  }).join(' ');
  const lt = ph - clip.start;

  const startDrag = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    store.set({ graphKey: index });
    const k0 = keys[index];
    let moved = false;
    let cur: Dragging = { index, t: k0.t, v: k0.v };
    const move = (ev: PointerEvent) => {
      moved = true;
      cur = { index, t: Math.round(tOf(ev.clientX) * 1e3) / 1e3, v: vOf(ev.clientY) };
      setDrag(cur);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      if (moved) void moveKey(clip, prop, index, cur.t, cur.v);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const sel = graphKey != null && graphKey < keys.length ? graphKey : null;
  const selKey = sel != null ? keys[sel] : null;
  const ease: Ease | null = selKey ? easeDraft ?? selKey.ease : null;
  const hasNext = sel != null && sel < keys.length - 1;

  // --- editor ease (o vuong): x 0..1, y -0.5..1.5 ---
  const EY0 = -0.5,
    EY1 = 1.5;
  const ex = (x: number) => 10 + x * EBOX;
  const ey = (y: number) => 10 + (1 - (y - EY0) / (EY1 - EY0)) * EBOX;
  const handles = ease && ease.kind === 'bezier' ? ease : ease ? { x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 } : null;
  const dragHandle = (e: React.PointerEvent, which: 1 | 2) => {
    e.stopPropagation();
    if (sel == null || !ease) return;
    const base = ease.kind === 'bezier' ? ease : { kind: 'bezier' as const, x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 };
    let cur: Ease = { ...base };
    const move = (ev: PointerEvent) => {
      const r = eRef.current!.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * (EBOX + 20);
      const py = ((ev.clientY - r.top) / r.height) * (EBOX + 20);
      const x = clamp((px - 10) / EBOX, 0, 1);
      const y = clamp(EY0 + (1 - (py - 10) / EBOX) * (EY1 - EY0), EY0, EY1);
      cur = which === 1 ? { ...cur, x1: Math.round(x * 100) / 100, y1: Math.round(y * 100) / 100 } : { ...cur, x2: Math.round(x * 100) / 100, y2: Math.round(y * 100) / 100 };
      setEaseDraft(cur);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setEaseDraft(null);
      void setKeyEase(clip, prop, sel, cur);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const easeCurve = ease && ease.kind !== 'hold' ? Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${ex(i / 40).toFixed(1)},${ey(bezierAt(ease, i / 40)).toFixed(1)}`).join(' ') : ease ? `M${ex(0)},${ey(0)} L${ex(1)},${ey(0)} L${ex(1)},${ey(1)}` : '';

  return (
    <div className="scroll" data-testid="graph">
      <div className="graph-bar">
        <select data-testid="graph-prop" value={prop} onChange={(e) => store.set({ graphProp: e.target.value, graphKey: null })}>
          {props.map((p) => <option key={p} value={p}>{PROP_LABEL[p] ?? p} ({clip.keyframes[p].length})</option>)}
        </select>
        <select data-testid="graph-add-prop" value="" onChange={(e) => { if (e.target.value) { store.set({ graphProp: e.target.value, graphKey: null }); void toggleKeyframe(clip, e.target.value); } }} title="Thêm thuộc tính có keyframe">
          <option value="">+ thuộc tính</option>
          {addable.map((p) => <option key={p} value={p}>{PROP_LABEL[p] ?? p}</option>)}
        </select>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="graph" data-testid="graph-svg" onPointerDown={(e) => {
        const r = svgRef.current!.getBoundingClientRect();
        const t = clamp(((((e.clientX - r.left) / r.width) * W - PL) / (W - PL - PR)) * view.tMax, 0, view.tMax);
        player.seek(clip.start + t);
        store.set({ graphKey: null }); // bam nen = bo chon keyframe (cac diem da stopPropagation)
      }}>
        <rect x={PL} y={PT} width={W - PL - PR} height={H - PT - PB} fill="#0c0d10" stroke="#2a2e38" />
        {[0, 0.5, 1].map((f) => {
          const v = view.lo + f * (view.hi - view.lo);
          return <g key={f}><line x1={PL} x2={W - PR} y1={Y(v)} y2={Y(v)} stroke="#1c2029" /><text x={PL - 4} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="#8b91a0">{(+v.toFixed(2)).toString()}</text></g>;
        })}
        {[0, 0.5, 1].map((f) => <text key={f} x={X(f * view.tMax)} y={H - 6} textAnchor="middle" fontSize="9" fill="#8b91a0">{(f * view.tMax).toFixed(1)}s</text>)}
        {lt >= 0 && lt <= view.tMax && <line x1={X(lt)} x2={X(lt)} y1={PT} y2={H - PB} stroke="#ff5d5d" strokeWidth="1.5" />}
        <path d={curve} fill="none" stroke="#3ea6ff" strokeWidth="2" data-testid="graph-curve" />
        {shown.map((k, i) => (
          <circle key={i} cx={X(k.t)} cy={Y(k.v)} r={sel === i ? 6 : 5} fill={sel === i ? '#ffd166' : '#fff'} stroke="#0c0d10" strokeWidth="1.5" style={{ cursor: 'grab' }} data-testid={`key-dot-${i}`} onPointerDown={(e) => startDrag(e, i)} />
        ))}
      </svg>

      <div className="graph-bar">
        <button data-testid="graph-add-key" onClick={() => void toggleKeyframe(clip, prop)} title="Thêm/xóa keyframe tại con trỏ">◆ Tại con trỏ</button>
        <button data-testid="graph-copy" onClick={() => copyKeys(clip, prop, sel)} title="Sao chép (Ctrl+C)">Sao chép</button>
        <button data-testid="graph-paste" disabled={!clipboard} onClick={() => void pasteKeys(clip)} title="Dán tại con trỏ (Ctrl+V)">Dán</button>
        <button data-testid="key-delete" disabled={sel == null} onClick={() => sel != null && void removeKey(clip, prop, sel)}>Xóa</button>
      </div>

      <div className="graph-bar" data-testid="ease-quick">
        {([['Ease In', 'ease-in', 'ease-in'], ['Ease Out', 'ease-out', 'ease-out'], ['Easy Ease', 'ease-in-out', 'ease-in-out'], ['Tuyến tính', 'linear', 'linear']] as const).map(([label, id, preset]) => (
          <button key={id} data-testid={`ease-quick-${id}`} title={`${label}: ${sel != null ? 'áp cho keyframe đang chọn' : 'áp cho mỗi đoạn của thuộc tính'}`} onClick={() => void setEaseMany(clip, prop, sel != null ? [sel] : null, preset)}>{label}</button>
        ))}
        <span className="kbd" style={{ alignSelf: 'center' }}>{sel != null ? `áp cho keyframe ${sel + 1}` : 'áp cho tất cả'}</span>
      </div>

      {selKey && sel != null ? (
        <div className="group">
          <h4>Keyframe {sel + 1}/{keys.length}</h4>
          <div className="field"><label>Thời gian (s)</label><NumField testid="key-t" value={selKey.t} step={0.05} min={0} onCommit={(n) => void moveKey(clip, prop, sel, n, selKey.v)} /></div>
          <div className="field"><label>Giá trị</label><NumField testid="key-v" value={selKey.v} step={0.1} onCommit={(n) => void moveKey(clip, prop, sel, selKey.t, n)} /></div>
          <div className="field"><label>Đường cong</label>
            <select data-testid="ease-select" value={easeName(ease!)} onChange={(e) => e.target.value !== 'custom' && void setKeyEase(clip, prop, sel, e.target.value)} disabled={!hasNext}>
              {EASE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="custom" disabled>tùy chỉnh</option>
            </select>
          </div>
          {hasNext ? (
            <svg ref={eRef} viewBox={`0 0 ${EBOX + 20} ${EBOX + 20}`} className="easebox" data-testid="ease-svg">
              <rect x={10} y={ey(1)} width={EBOX} height={ey(0) - ey(1)} fill="#0c0d10" stroke="#2a2e38" />
              <line x1={ex(0)} y1={ey(0)} x2={ex(1)} y2={ey(1)} stroke="#2a2e38" strokeDasharray="3 3" />
              {handles && ease && ease.kind !== 'hold' && (
                <>
                  <line x1={ex(0)} y1={ey(0)} x2={ex(handles.x1)} y2={ey(handles.y1)} stroke="#7c5cff" />
                  <line x1={ex(1)} y1={ey(1)} x2={ex(handles.x2)} y2={ey(handles.y2)} stroke="#7c5cff" />
                </>
              )}
              <path d={easeCurve} fill="none" stroke="#3ea6ff" strokeWidth="2" />
              {handles && ease && ease.kind !== 'hold' && (
                <>
                  <circle cx={ex(handles.x1)} cy={ey(handles.y1)} r="6" fill="#7c5cff" style={{ cursor: 'grab' }} data-testid="ease-h1" onPointerDown={(e) => dragHandle(e, 1)} />
                  <circle cx={ex(handles.x2)} cy={ey(handles.y2)} r="6" fill="#7c5cff" style={{ cursor: 'grab' }} data-testid="ease-h2" onPointerDown={(e) => dragHandle(e, 2)} />
                </>
              )}
            </svg>
          ) : <div className="kbd" style={{ padding: '0 12px' }}>Keyframe cuối không có đường cong (đường cong thuộc về đoạn đi tối keyframe sau).</div>}
          {ease && ease.kind === 'bezier' && <div className="kbd" style={{ padding: '4px 12px' }} data-testid="ease-values">cubic-bezier({ease.x1}, {ease.y1}, {ease.x2}, {ease.y2})</div>}
        </div>
      ) : <div className="empty">Chọn một điểm keyframe trên đồ thị để chỉnh giá trị, thời gian và đường cong.</div>}
      <div className="kbd" style={{ padding: '4px 12px 12px' }}>Kéo điểm để đổi (t, giá trị) · Kéo 2 tay nắm tìm để chỉnh bezier · Ctrl+C / Ctrl+V sao chép/dán keyframe tại con trỏ</div>
    </div>
  );
}

void EASE_PRESETS;
void clipLocal;
