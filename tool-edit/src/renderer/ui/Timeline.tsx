// Timeline kieu CapCut: ruler, track, clip keo/trim co snap, playhead, tha tu kho media, zoom, waveform.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { timelineEnd, type Clip, type Op, type Project } from '../../core/schema';
import { diffProjects } from '../../core/diff';
import { TRANSITION_LABEL } from '../../core/transition';
import { CHART_LABEL } from '../../core/chart';
import { Icon } from './Icon';
import { addMediaToTimeline, addTrack, commit, copyClips, deleteSelection, toggleDisableSelection, duplicateClips, groupSelection, select, separateAudio, setLayout, setZoom, splitAtPlayhead, ungroupSelection } from '../actions';
import { audio, PEAKS_PER_SEC } from '../audio';
import { player } from '../player';
import { store, useStore } from '../store';
import { expandGroups, nextTrackName, freshIds, formatTime, maxDurationFor, rulerStep, snapMoveDelta, snapPoints, snapValue, trimLeft, trimRight, type ClipRect } from '../timeline-math';

const HEAD_W = 104;
const NEW_ROW = '__new__'; // hàng ảo "track mới" khi kéo clip ra ngoài mép
const ROW_H = { video: 58, audio: 46 };

interface Drag {
  mode: 'move' | 'trimL' | 'trimR';
  lead: string; // clip dang cam
  ids: string[];
  startX: number;
  startY: number;
  moved: boolean;
  orig: Record<string, ClipRect>;
  preview: Record<string, ClipRect>;
}

function WaveCanvas({ mediaId, inSec, dur, w, h }: { mediaId: string; inSec: number; dur: number; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ver = useStore((s) => s.peaksVersion);
  useEffect(() => {
    const cv = ref.current;
    const peaks = audio.peaks.get(mediaId);
    if (!cv || !peaks) return;
    const W = Math.max(1, Math.min(2000, Math.round(w)));
    cv.width = W;
    cv.height = Math.max(1, Math.round(h));
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    const mid = cv.height / 2;
    for (let x = 0; x < W; x++) {
      const t0 = inSec + (x / W) * dur,
        t1 = inSec + ((x + 1) / W) * dur;
      const i0 = Math.floor(t0 * PEAKS_PER_SEC),
        i1 = Math.max(i0 + 1, Math.ceil(t1 * PEAKS_PER_SEC));
      let mx = 0;
      for (let i = i0; i < i1 && i < peaks.length; i++) if (peaks[i] > mx) mx = peaks[i];
      const hh = Math.max(1, mx * mid * 0.95);
      ctx.fillRect(x, mid - hh, 1, hh * 2);
    }
  }, [mediaId, inSec, dur, w, h, ver]);
  return <canvas ref={ref} className="wave" />;
}

interface ClipViewProps {
  clip: Clip;
  rect: ClipRect;
  kind: 'video' | 'audio' | 'image' | 'text';
  label: string;
  selected: boolean;
  dragging: boolean;
  pending: boolean;
  zoom: number;
  height: number;
  hasAudio: boolean;
  kfTimes: number[];
  onKf: (t: number) => void;
  onDown: (e: React.PointerEvent, clip: Clip, mode: Drag['mode']) => void;
  onCtx: (e: React.MouseEvent, clip: Clip) => void;
}

const ClipView = memo(function ClipView({ clip, rect, kind, label, selected, dragging, pending, zoom, height, hasAudio, kfTimes, onKf, onDown, onCtx }: ClipViewProps) {
  const w = Math.max(3, rect.duration * zoom);
  const showWave = hasAudio && (kind === 'audio' || w > 40);
  return (
    <div
      className={`clip ${kind}${selected ? ' sel' : ''}${clip.group ? ' grouped' : ''}${clip.disabled ? ' off' : ''}${dragging ? ' dragging' : ''}${pending ? ' pending' : ''}`}
      data-clip={clip.id}
      style={{ left: HEAD_W + rect.start * zoom, width: w }}
      onPointerDown={(e) => onDown(e, clip, 'move')}
      onContextMenu={(e) => onCtx(e, clip)}
    >
      {clip.transition && <i className="trn" data-testid="trn-mark" title={`Chuyển cảnh vào: ${TRANSITION_LABEL[clip.transition.kind]} ${clip.transition.duration}s`} style={{ width: Math.min(w, clip.transition.duration * zoom) }} />}
      {showWave && clip.src.type === 'media' && <WaveCanvas mediaId={clip.src.mediaId} inSec={rect.in} dur={rect.duration} w={w} h={height - 8} />}
      <div className="lbl">{clip.disabled && <Icon n="eyeoff" size={11} />}{clip.group && <Icon n="link" size={11} />} {label}{pending ? ' (đang chuẩn bị)' : ''}</div>
      {kfTimes.map((t) => <i key={t} className="kfm" data-kf={t} title={`Keyframe ${t.toFixed(2)}s`} style={{ left: t * zoom }} onPointerDown={(e) => { e.stopPropagation(); onKf(t); }} />)}
      <div className="h l" onPointerDown={(e) => onDown(e, clip, 'trimL')} />
      <div className="h r" onPointerDown={(e) => onDown(e, clip, 'trimR')} />
    </div>
  );
});

function Playhead({ scroller }: { scroller: React.RefObject<HTMLDivElement | null> }) {
  const t = useStore((s) => s.playhead);
  const zoom = useStore((s) => s.zoom);
  const playing = useStore((s) => s.playing);
  useEffect(() => {
    const sc = scroller.current;
    if (!sc || !playing) return;
    const x = HEAD_W + t * zoom;
    if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft + HEAD_W) sc.scrollLeft = Math.max(0, x - HEAD_W - 60);
  }, [t, zoom, playing, scroller]);
  return <div className="playhead" style={{ left: HEAD_W + t * zoom }} />;
}

function Ruler({ zoom, width, onSeek }: { zoom: number; width: number; onSeek: (clientX: number) => void }) {
  const step = rulerStep(zoom);
  const ticks: number[] = [];
  for (let t = 0; t * zoom < width; t += step) ticks.push(t);
  const fps = useStore((s) => s.project.fps);
  const markers = useStore((s) => s.project.markers);
  const down = (e: React.PointerEvent) => {
    onSeek(e.clientX);
    const move = (ev: PointerEvent) => onSeek(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="ruler" data-testid="ruler" style={{ width }} onPointerDown={down}>
      {markers.map((m, i) => <i key={'m' + i} className={`mk ${m.kind}`} data-marker={m.t} title={`${m.kind === 'beat' ? 'Nhịp' : m.kind === 'sfx' ? 'SFX' : 'Marker'} ${m.t.toFixed(2)}s${m.label ? ' · ' + m.label : ''}`} style={{ left: HEAD_W + m.t * zoom }} />)}
      {ticks.map((t) => (
        <div key={t} className="tick" style={{ left: HEAD_W + t * zoom }}>{step >= 1 ? formatTime(t, fps).slice(0, 5) : formatTime(t, fps)}</div>
      ))}
    </div>
  );
}

export function Timeline() {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const zoom = useStore((s) => s.zoom);
  const draft = useStore((s) => s.draft);
  const guide = useStore((s) => s.snapGuide);
  const trackH = useStore((s) => s.layout.trackH);
  const maxedTl = useStore((s) => s.layout.maxed === 'timeline');
  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const rowEls = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const [marq, setMarq] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string } | null>(null);

  const end = timelineEnd(project);
  const totalSec = Math.max(40, end + 20);
  const width = HEAD_W + totalSec * zoom;

  const rows = useMemo(() => {
    const vids = project.tracks.filter((t) => t.kind === 'video').reverse(); // track cao nhat o tren cung
    const auds = project.tracks.filter((t) => t.kind === 'audio');
    return [...vids, ...auds];
  }, [project.tracks]);

  const diff = useMemo(() => (draft ? diffProjects(project, draft.project) : null), [draft, project]);

  const timeAt = (clientX: number) => {
    const r = inner.current!.getBoundingClientRect();
    return Math.max(0, (clientX - r.left - HEAD_W) / zoom);
  };

  const onDown = (e: React.PointerEvent, clip: Clip, mode: Drag['mode']) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const s = store.get();
    let sel = s.selection;
    const grp = expandGroups(s.project, [clip.id]); // clip ghép: chọn cả nhóm
    if (e.shiftKey) {
      sel = sel.includes(clip.id) ? sel.filter((x) => !grp.includes(x)) : [...new Set([...sel, ...grp])];
    } else if (!sel.includes(clip.id) || mode !== 'move') {
      sel = mode === 'move' ? grp : [clip.id];
    }
    store.set({ selection: sel });
    if (!sel.includes(clip.id)) return;
    const ids = mode === 'move' ? sel : [clip.id];
    const orig: Record<string, ClipRect> = {};
    for (const id of ids) {
      const c = s.project.clips.find((x) => x.id === id);
      if (c) orig[id] = { start: c.start, duration: c.duration, in: c.in, track: c.track };
    }
    const d: Drag = { mode, lead: clip.id, ids, startX: e.clientX, startY: e.clientY, moved: false, orig, preview: { ...orig } };
    dragRef.current = d;
    const move = (ev: PointerEvent) => onMove(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      void onUp();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onMove = (ev: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const s = store.get();
    const p = s.project;
    const dx = ev.clientX - d.startX;
    const dy = ev.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 3) return; // chua coi la keo
    d.moved = true;
    const dt = dx / s.zoom;
    const thr = ev.altKey ? 0 : 8 / s.zoom; // giu Alt de tat snap
    const pts = snapPoints(p, new Set(d.ids), s.playhead);
    const preview: Record<string, ClipRect> = {};
    let g: number | null = null;
    if (d.mode === 'move') {
      const group = d.ids.map((id) => d.orig[id]);
      const r = snapMoveDelta(group, dt, pts, thr);
      if (r.snapped) {
        // tim moc vua bam de ve duong dan
        for (const o of group) for (const edge of [o.start + r.dt, o.start + o.duration + r.dt]) for (const q of pts) if (Math.abs(q - edge) < 1e-6) g = q;
      }
      // đổi track: kéo lên/xuống tự do trong CÙNG loại (video chỉ trong video, audio chỉ trong audio); nhiều clip thì cùng dịch số hàng.
      // Kéo ra ngoài mép (vùng "track mới") để tạo Video/Audio mới.
      const kindOf = (tid: string) => p.tracks.find((t) => t.id === tid)?.kind;
      const leadClip = p.clips.find((c) => c.id === d.lead) ?? p.clips.find((c) => c.id === d.ids[0])!;
      const leadKind = kindOf(leadClip.track)!;
      const order = rows.filter((t) => t.kind === leadKind).map((t) => t.id);
      let targetId: string | null = null;
      for (const [id, el] of rowEls.current) {
        const rc = el.getBoundingClientRect();
        if (ev.clientY >= rc.top && ev.clientY < rc.bottom) targetId = id;
      }
      let delta = 0;
      let toNew = false;
      if (targetId === NEW_ROW) toNew = d.ids.filter((id) => kindOf(d.orig[id].track) === leadKind).length === 1;
      else if (targetId && order.includes(targetId)) delta = order.indexOf(targetId) - order.indexOf(leadClip.track);
      for (const id of d.ids) {
        const o = d.orig[id];
        let tr = o.track;
        if (kindOf(o.track) === leadKind) {
          if (toNew) tr = NEW_ROW;
          else {
            const i = order.indexOf(o.track);
            tr = order[Math.max(0, Math.min(order.length - 1, i + delta))] ?? o.track;
          }
        }
        preview[id] = { ...o, start: Math.max(0, o.start + r.dt), track: tr };
      }
    } else {
      const id = d.ids[0];
      const o = d.orig[id];
      const clip = p.clips.find((c) => c.id === id)!;
      if (d.mode === 'trimL') {
        const sv = snapValue(o.start + dt, pts, thr);
        if (sv.snapped) g = sv.value;
        preview[id] = clip.keyframes?.speed?.length ? o : trimLeft(o, sv.value, p.fps, clip.speed ?? 1); // speed ramp: khong trim dau
      } else {
        const sv = snapValue(o.start + o.duration + dt, pts, thr);
        if (sv.snapped) g = sv.value;
        preview[id] = trimRight(o, sv.value, p.fps, maxDurationFor(p, clip));
      }
    }
    d.preview = preview;
    setDrag({ ...d, preview });
    if (store.get().snapGuide !== g) store.set({ snapGuide: g });
  };

  const onUp = async () => {
    const d = dragRef.current;
    dragRef.current = null;
    store.set({ snapGuide: null });
    if (!d || !d.moved) {
      setDrag(null);
      return;
    }
    const cur = store.get().project;
    const newKind = d.ids.some((id) => d.preview[id].track === NEW_ROW) ? cur.tracks.find((t) => t.id === d.orig[d.lead]?.track)?.kind : undefined;
    const newId = newKind ? freshIds(cur, newKind === 'video' ? 'v' : 'a', 1)[0] : '';
    const ops: Op[] = d.ids
      .map((id) => {
        const o = d.orig[id],
          n = d.preview[id];
        const patch: Record<string, number | string> = {};
        if (Math.abs(n.start - o.start) > 1e-9) patch.start = n.start;
        if (Math.abs(n.duration - o.duration) > 1e-9) patch.duration = n.duration;
        if (Math.abs(n.in - o.in) > 1e-9) patch.in = n.in;
        if (n.track !== o.track) patch.track = n.track === NEW_ROW ? newId : n.track;
        return Object.keys(patch).length ? { op: 'set_clip' as const, id, patch } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    if (newKind && ops.length) ops.unshift({ op: 'add_track', track: { id: newId, kind: newKind, name: nextTrackName(cur, newKind) } });
    if (ops.length) await commit(ops);
    setDrag(null);
  };

  const seekFromX = (clientX: number) => player.seek(timeAt(clientX));

  // Kéo chuột trái trên vùng trống để quét chọn nhiều clip (giữ Shift để cộng thêm). Bấm không kéo = bỏ chọn + đặt con trỏ.
  const onAreaDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!(t === e.currentTarget || t.classList.contains('tl-inner') || t.classList.contains('row'))) return;
    const sc = scroller.current!;
    const sr = sc.getBoundingClientRect();
    if (e.clientX > sr.left + sc.clientWidth || e.clientY > sr.top + sc.clientHeight) return; // bấm vào thanh cuộn
    setCtx(null);
    const x0 = e.clientX, y0 = e.clientY;
    const base = e.shiftKey ? store.get().selection : [];
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
      moved = true;
      const l = Math.min(x0, ev.clientX), r = Math.max(x0, ev.clientX), tp = Math.min(y0, ev.clientY), b = Math.max(y0, ev.clientY);
      setMarq({ x0, y0, x1: ev.clientX, y1: ev.clientY });
      const hit: string[] = [];
      inner.current?.querySelectorAll<HTMLElement>('[data-clip]').forEach((el) => {
        const rc = el.getBoundingClientRect();
        if (rc.left < r && rc.right > l && rc.top < b && rc.bottom > tp) hit.push(el.dataset.clip!);
      });
      store.set({ selection: expandGroups(store.get().project, [...new Set([...base, ...hit])]) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setMarq(null);
      if (!moved) {
        if (!e.shiftKey) select([]);
        seekFromX(x0);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onCtx = (e: React.MouseEvent, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    const s = store.get();
    if (!s.selection.includes(clip.id)) store.set({ selection: expandGroups(s.project, [clip.id]) });
    setCtx({ x: e.clientX, y: e.clientY, id: clip.id });
  };
  useEffect(() => {
    if (!ctx) return;
    const close = (ev: Event) => {
      if (ev instanceof KeyboardEvent && ev.key !== 'Escape') return;
      if (ev instanceof PointerEvent && (ev.target as HTMLElement).closest?.('.ctx')) return;
      setCtx(null);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('blur', close as EventListener);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('blur', close as EventListener);
    };
  }, [ctx]);

  // con lăn: Ctrl = phóng to/thu nhỏ quanh vị trí chuột; Alt hoặc Shift = cuộn ngang; thường = cuộn track lên/xuống.
  // Dùng listener gốc (không thụ động) để chặn được cuộn mặc định.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const z0 = store.get().zoom;
        const z1 = Math.max(8, Math.min(600, z0 * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const tUnder = (el.scrollLeft + x - HEAD_W) / z0; // thời điểm dưới con trỏ chuột: giữ nguyên sau khi đổi zoom
        setZoom(z1);
        requestAnimationFrame(() => {
          el.scrollLeft = Math.max(0, HEAD_W + tUnder * z1 - x);
        });
      } else if (e.altKey || e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += (e.deltaY || e.deltaX) * 1.2;
      }
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, []);

  // thả media: lên track nào cũng được, app tự đưa vào track đúng loại (video/ảnh -> video, âm thanh -> audio); thả ra ngoài track cũng được
  const dropOn = (e: React.DragEvent, trackId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropRow(null);
    const mediaId = e.dataTransfer.getData('application/x-tool-edit-media');
    if (mediaId) void addMediaToTimeline(mediaId, { track: trackId, start: timeAt(e.clientX) });
  };

  const sel = new Set(selection);
  // đang kéo clip: hiện thêm vùng "track mới" ở mép (video: ngay dưới thước; audio: dưới hàng audio cuối)
  const dragKind = drag?.moved && drag.mode === 'move' ? project.tracks.find((t) => t.id === drag.orig[drag.lead]?.track)?.kind : undefined;
  const zone = dragKind ? { id: NEW_ROW, kind: dragKind, name: dragKind === 'video' ? 'Video mới' : 'Audio mới' } : null;
  const shownRows = zone ? (zone.kind === 'video' ? [...rows, zone] : [...rows, zone]) : rows;
  useEffect(() => {
    if (dragKind === 'audio' && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; // vùng "Audio mới" ở đáy: cuộn xuống cho thấy
  }, [dragKind]);

  return (
    <div className="panel tl" data-testid="timeline">
      <div className="tl-bar">
        <button onClick={() => void splitAtPlayhead()} title="Cắt tại con trỏ (S)"><Icon n="scissors" />Cắt <span className="kbd">S</span></button>
        <button data-testid="toggle-clip" onClick={() => void toggleDisableSelection()} disabled={!selection.length} title="Vô hiệu hóa / bật lại clip (V)"><Icon n={project.clips.some((c) => selection.includes(c.id) && !c.disabled) || !selection.length ? 'eyeoff' : 'eye'} />{project.clips.some((c) => selection.includes(c.id) && !c.disabled) || !selection.length ? 'Tắt clip' : 'Bật clip'} <span className="kbd">V</span></button>
        <button onClick={() => void deleteSelection(false)} disabled={!selection.length} title="Xóa (Delete)"><Icon n="trash" />Xóa <span className="kbd">Del</span></button>
        <button onClick={() => void deleteSelection(true)} disabled={!selection.length} title="Xóa và kéo liền (Shift+Delete)">Xóa liền <span className="kbd">Shift+Del</span></button>
        <span className="grow" />
        <button data-testid="max-timeline" onClick={() => setLayout({ maxed: store.get().layout.maxed === 'timeline' ? 'none' : 'timeline' }, false)} title="Phóng to / thu lại timeline (Shift+T)"><Icon n={maxedTl ? 'minimize' : 'maximize'} />{maxedTl ? 'Thu lại' : 'Phóng to'}</button>
        <button onClick={() => void addTrack('video')}><Icon n="plus" />Track video</button>
        <button onClick={() => void addTrack('audio')}><Icon n="plus" />Track audio</button>
        <span style={{ color: 'var(--dim)' }}>Cao track</span>
        <input type="range" min={0.6} max={2.6} step={0.1} value={trackH} onChange={(e) => setLayout({ trackH: Number(e.target.value) })} data-testid="track-h" style={{ width: 90 }} />
        <span style={{ color: 'var(--dim)' }}>Zoom</span>
        <input type="range" min={8} max={600} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} data-testid="zoom" />
      </div>
      <div className="tl-scroll" ref={scroller} onPointerDown={onAreaDown} onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-tool-edit-media')) e.preventDefault(); }} onDrop={(e) => dropOn(e)}>
        <div className="tl-inner" ref={inner} style={{ width }}>
          <Ruler zoom={zoom} width={width} onSeek={seekFromX} />
          {shownRows.map((tr) => {
            const isNew = tr.id === NEW_ROW;
            const H = isNew ? 34 : Math.round(ROW_H[tr.kind] * trackH);
            const clips = project.clips.filter((c) => c.track === tr.id || (drag && drag.preview[c.id]?.track === tr.id));
            return (
              <div
                key={tr.id}
                className={`row${dropRow === tr.id ? ' drop' : ''}${isNew ? ' newzone' : ''}`}
                data-track={tr.id}
                style={isNew && tr.kind === 'video' ? { height: H, width, position: 'absolute', top: 26, left: 0, zIndex: 8, pointerEvents: 'none' } : { height: H, width }}
                ref={(el) => {
                  if (el) rowEls.current.set(tr.id, el);
                  else rowEls.current.delete(tr.id);
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes('application/x-tool-edit-media')) {
                    e.preventDefault();
                    if (dropRow !== tr.id) setDropRow(tr.id);
                  }
                }}
                onDragLeave={() => setDropRow((r) => (r === tr.id ? null : r))}
                onDrop={(e) => dropOn(e, tr.id)}
              >
                <div className="head"><b><Icon n={isNew ? 'plus' : tr.kind === 'video' ? 'film' : 'wave'} size={13} />{tr.name}</b>{isNew ? 'thả vào đây' : tr.kind === 'video' ? 'hình' : 'tiếng'}</div>
                {clips.map((c) => {
                  const rect = drag?.preview[c.id] ?? { start: c.start, duration: c.duration, in: c.in, track: c.track };
                  if (rect.track !== tr.id) return null;
                  const m = c.src.type === 'media' ? project.media.find((x) => x.id === (c.src as { mediaId: string }).mediaId) : undefined;
                  const kind: 'video' | 'audio' | 'image' | 'text' = tr.kind === 'audio' ? 'audio' : c.src.type === 'text' || c.src.type === 'shape' || c.src.type === 'chart' ? 'text' : m?.kind === 'image' ? 'image' : 'video';
                  const kfTimes = [...new Set(Object.values(c.keyframes ?? {}).flat().map((k) => Math.round(k.t * 1e4) / 1e4))].filter((t) => t >= 0 && t <= rect.duration).sort((a, b) => a - b);
                  const label = m ? m.path.split(/[\\/]/).pop()! : c.src.type === 'gen' ? `gen:${c.src.kind}` : c.src.type === 'text' ? 'Chữ: ' + c.src.text.content.split(String.fromCharCode(10))[0].slice(0, 40) : c.src.type === 'shape' ? 'Hình: ' + c.src.shape.kind : c.src.type === 'chart' ? 'Biểu đồ: ' + CHART_LABEL[c.src.chart.kind] + (c.src.chart.title ? ' · ' + c.src.chart.title.slice(0, 30) : '') : c.id;
                  const pending = !!m && m.kind !== 'audio' && m.cache?.status !== 'ready';
                  return <ClipView key={c.id} clip={c} rect={rect} kind={kind} label={label} selected={sel.has(c.id)} dragging={!!drag?.moved && drag.ids.includes(c.id)} pending={pending} zoom={zoom} height={H} hasAudio={!!m?.hasAudio || m?.kind === 'audio'} kfTimes={kfTimes} onKf={(t) => player.seek(c.start + t)} onDown={onDown} onCtx={onCtx} />;
                })}
                {diff?.addedClips.filter((c) => c.track === tr.id).map((c) => (
                  <div key={'g' + c.id} className="tlghost" style={{ left: HEAD_W + c.start * zoom, width: Math.max(4, c.duration * zoom) }}>+ {c.id}</div>
                ))}
                {diff?.removedClips.filter((c) => c.track === tr.id).map((c) => (
                  <div key={'d' + c.id} className="tlghost del" style={{ left: HEAD_W + c.start * zoom, width: Math.max(4, c.duration * zoom) }}>- {c.id}</div>
                ))}
              </div>
            );
          })}
          <Playhead scroller={scroller} />
          {guide != null && <div className="guide" style={{ left: HEAD_W + guide * zoom }} />}
        </div>
      </div>
      {marq && <div className="marquee" style={{ left: Math.min(marq.x0, marq.x1), top: Math.min(marq.y0, marq.y1), width: Math.abs(marq.x1 - marq.x0), height: Math.abs(marq.y1 - marq.y0) }} />}
      {ctx && <ClipMenu x={ctx.x} y={ctx.y} id={ctx.id} onClose={() => setCtx(null)} />}
    </div>
  );
}

function ClipMenu({ x, y, id, onClose }: { x: number; y: number; id: string; onClose: () => void }) {
  const project = useStore((s) => s.project);
  const selection = useStore((s) => s.selection);
  const keymap = useStore((s) => s.keymap);
  const clip = project.clips.find((c) => c.id === id);
  if (!clip) return null;
  const m = clip.src.type === 'media' ? project.media.find((q) => q.id === (clip.src as { mediaId: string }).mediaId) : undefined;
  const canSep = selection.some((cid) => {
    const c = project.clips.find((q) => q.id === cid);
    const mm = c?.src.type === 'media' ? project.media.find((q) => q.id === (c.src as { mediaId: string }).mediaId) : undefined;
    return !!c && mm?.kind === 'video' && !!mm.hasAudio && project.tracks.find((t) => t.id === c.track)?.kind === 'video';
  });
  const nSel = selection.length;
  const anyGroup = project.clips.some((c) => selection.includes(c.id) && c.group);
  const k = (a: string) => keymap[a] || '';
  const item = (label: string, act: () => void, opts: { on?: boolean; key?: string; testid?: string } = {}) => (
    <button disabled={opts.on === false} data-testid={opts.testid} onClick={() => { onClose(); act(); }}>
      <span>{label}</span>{opts.key ? <span className="kbd">{opts.key}</span> : null}
    </button>
  );
  void m;
  return (
    <div className="ctx" data-testid="clip-menu" style={{ left: Math.min(x, window.innerWidth - 250), top: Math.min(y, window.innerHeight - 270) }}>
      {item('Tách video và âm thanh', () => void separateAudio(), { on: canSep, key: k('separateAudio'), testid: 'ctx-separate' })}
      {item(project.clips.filter((c) => selection.includes(c.id)).every((c) => c.disabled) ? 'Bật lại clip' : 'Vô hiệu hóa clip', () => void toggleDisableSelection(), { key: k('toggleClip'), testid: 'ctx-toggle' })}
      <hr />
      {item('Ghép thành clip ghép', () => void groupSelection(), { on: nSel >= 2, key: k('groupClips'), testid: 'ctx-group' })}
      {item('Hủy clip ghép', () => void ungroupSelection(), { on: anyGroup, key: k('ungroupClips'), testid: 'ctx-ungroup' })}
      <hr />
      {item('Cắt tại con trỏ', () => void splitAtPlayhead(), { key: k('split') })}
      {item('Sao chép', () => void copyClips(false), { key: k('copy') })}
      {item('Nhân đôi', () => void duplicateClips(), { key: k('duplicate') })}
      {item('Xóa', () => void deleteSelection(false), { key: k('delete') })}
    </div>
  );
}

export type { Project };
